import { v4 as uuidv4 } from 'uuid';
import { db } from '../../database/connection';
import { NotFoundError, ConflictError } from '../../common/errors';
import { logger } from '../../common/logger';
import { redis } from '../../config/redis';
import { CreateSignalInput, UpdateSignalInput, SignalStateInput, SignalQuery, SignalScheduleInput } from './signals.validation';

export class SignalsService {
  async create(input: CreateSignalInput) {
    const id = uuidv4();
    const result = await db.query(
      `INSERT INTO traffic_signals (id, name, intersection_name, location, direction, type,
        default_green_duration, default_yellow_duration, default_red_duration,
        is_autonomous, group_id, camera_url, current_state, created_at, updated_at)
       VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326), $6, $7, $8, $9, $10, $11, $12, $13, 'red', NOW(), NOW())
       RETURNING id, name, intersection_name,
                 ST_X(location::geometry) as longitude, ST_Y(location::geometry) as latitude,
                 direction, type, default_green_duration, default_yellow_duration, default_red_duration,
                 is_autonomous, group_id, camera_url, current_state, created_at`,
      [id, input.name, input.intersectionName, input.longitude, input.latitude, input.direction, input.type,
       input.defaultGreenDuration, input.defaultYellowDuration, input.defaultRedDuration,
       input.isAutonomous, input.groupId, input.cameraUrl]
    );

    // Cache signal state in Redis
    await redis.setJSON(`signal:state:${id}`, { signalId: id, state: 'red', updatedAt: new Date().toISOString() });

    logger.info('Traffic signal created', { signalId: id, name: input.name });
    return result.rows[0];
  }

  async findAll(query: SignalQuery) {
    const { page, limit, type, state, isAutonomous, groupId } = query;
    const offset = (page - 1) * limit;
    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (type) { conditions.push(`ts.type = $${idx++}`); params.push(type); }
    if (state) { conditions.push(`ts.current_state = $${idx++}`); params.push(state); }
    if (isAutonomous !== undefined) { conditions.push(`ts.is_autonomous = $${idx++}`); params.push(isAutonomous); }
    if (groupId) { conditions.push(`ts.group_id = $${idx++}`); params.push(groupId); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await db.query(`SELECT COUNT(*) FROM traffic_signals ts ${where}`, params);
    const total = parseInt(countResult.rows[0].count, 10);

    const dataResult = await db.query(
      `SELECT ts.id, ts.name, ts.intersection_name,
              ST_X(ts.location::geometry) as longitude, ST_Y(ts.location::geometry) as latitude,
              ts.direction, ts.type, ts.default_green_duration, ts.default_yellow_duration, ts.default_red_duration,
              ts.is_autonomous, ts.group_id, ts.camera_url, ts.current_state,
              ts.last_state_change, ts.override_until, ts.is_online, ts.created_at, ts.updated_at
       FROM traffic_signals ts
       ${where}
       ORDER BY ts.name
       LIMIT $${idx++} OFFSET $${idx}`,
      [...params, limit, offset]
    );

    return { data: dataResult.rows, total, page, limit };
  }

  async findById(id: string) {
    const result = await db.query(
      `SELECT ts.*,
              ST_X(ts.location::geometry) as longitude, ST_Y(ts.location::geometry) as latitude
       FROM traffic_signals ts
       WHERE ts.id = $1`,
      [id]
    );
    if (result.rows.length === 0) throw new NotFoundError('Traffic signal');
    return result.rows[0];
  }

  async update(id: string, input: UpdateSignalInput) {
    await this.findById(id);

    const fieldMap: Record<string, string> = {
      name: 'name', intersectionName: 'intersection_name', direction: 'direction', type: 'type',
      defaultGreenDuration: 'default_green_duration', defaultYellowDuration: 'default_yellow_duration',
      defaultRedDuration: 'default_red_duration', isAutonomous: 'is_autonomous',
      groupId: 'group_id', cameraUrl: 'camera_url',
    };

    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    for (const [key, col] of Object.entries(fieldMap)) {
      if ((input as any)[key] !== undefined) {
        fields.push(`${col} = $${idx++}`);
        values.push((input as any)[key]);
      }
    }

    // Handle location update
    if (input.latitude !== undefined && input.longitude !== undefined) {
      fields.push(`location = ST_SetSRID(ST_MakePoint($${idx++}, $${idx++}), 4326)`);
      values.push(input.longitude, input.latitude);
    }

    if (fields.length === 0) return this.findById(id);

    fields.push(`updated_at = NOW()`);
    values.push(id);

    await db.query(`UPDATE traffic_signals SET ${fields.join(', ')} WHERE id = $${idx}`, values);
    logger.info('Traffic signal updated', { signalId: id });
    return this.findById(id);
  }

  async changeState(id: string, input: SignalStateInput, changedBy: string) {
    const signal = await this.findById(id);

    await db.transaction(async (client) => {
      // Update signal state
      await client.query(
        `UPDATE traffic_signals
         SET current_state = $1, last_state_change = NOW(), override_until = $2, updated_at = NOW()
         WHERE id = $3`,
        [input.state, input.overrideUntil || null, id]
      );

      // Record state change in log
      await client.query(
        `INSERT INTO signal_state_log (id, signal_id, previous_state, new_state, changed_by, reason, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [uuidv4(), id, signal.current_state, input.state, changedBy, input.reason]
      );
    });

    // Update Redis cache
    await redis.setJSON(`signal:state:${id}`, {
      signalId: id,
      state: input.state,
      updatedAt: new Date().toISOString(),
    });

    // Publish state change for WebSocket
    await redis.publish('signals:state-change', JSON.stringify({
      signalId: id,
      name: signal.name,
      previousState: signal.current_state,
      newState: input.state,
      changedBy,
      reason: input.reason,
      timestamp: new Date().toISOString(),
    }));

    logger.info('Signal state changed', { signalId: id, from: signal.current_state, to: input.state });
    return this.findById(id);
  }

  async getStateLog(signalId: string, page: number = 1, limit: number = 50) {
    const offset = (page - 1) * limit;

    const countResult = await db.query(
      'SELECT COUNT(*) FROM signal_state_log WHERE signal_id = $1',
      [signalId]
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const result = await db.query(
      `SELECT ssl.*, u.first_name || ' ' || u.last_name as changed_by_name
       FROM signal_state_log ssl
       LEFT JOIN users u ON ssl.changed_by = u.id
       WHERE ssl.signal_id = $1
       ORDER BY ssl.created_at DESC
       LIMIT $2 OFFSET $3`,
      [signalId, limit, offset]
    );

    return { data: result.rows, total, page, limit };
  }

  async createSchedule(input: SignalScheduleInput) {
    const id = uuidv4();
    const result = await db.query(
      `INSERT INTO signal_schedules (id, signal_id, day_of_week, start_time, end_time, green_duration, yellow_duration, red_duration, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       RETURNING *`,
      [id, input.signalId, input.dayOfWeek, input.startTime, input.endTime, input.greenDuration, input.yellowDuration, input.redDuration]
    );

    logger.info('Signal schedule created', { scheduleId: id, signalId: input.signalId });
    return result.rows[0];
  }

  async getSchedules(signalId: string) {
    const result = await db.query(
      'SELECT * FROM signal_schedules WHERE signal_id = $1 ORDER BY day_of_week, start_time',
      [signalId]
    );
    return result.rows;
  }

  async getGroupSignals(groupId: string) {
    const result = await db.query(
      `SELECT ts.id, ts.name, ts.direction, ts.current_state, ts.is_online,
              ST_X(ts.location::geometry) as longitude, ST_Y(ts.location::geometry) as latitude
       FROM traffic_signals ts
       WHERE ts.group_id = $1
       ORDER BY ts.direction`,
      [groupId]
    );
    return result.rows;
  }

  async delete(id: string) {
    await this.findById(id);
    await db.query('DELETE FROM traffic_signals WHERE id = $1', [id]);
    await redis.del(`signal:state:${id}`);
    logger.info('Traffic signal deleted', { signalId: id });
  }
}

export const signalsService = new SignalsService();
