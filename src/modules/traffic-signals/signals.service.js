"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.signalsService = exports.SignalsService = void 0;
const uuid_1 = require("uuid");
const connection_1 = require("../../database/connection");
const errors_1 = require("../../common/errors");
const logger_1 = require("../../common/logger");
const redis_1 = require("../../config/redis");
const audit_service_1 = require("../../common/audit.service");
class SignalsService {
    async create(input) {
        const id = (0, uuid_1.v4)();
        const result = await connection_1.db.query(`INSERT INTO traffic_signals (id, name, intersection_name, latitude, longitude, direction, type,
        default_green_duration, default_yellow_duration, default_red_duration,
        is_autonomous, group_id, camera_url, current_state, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'red', NOW(), NOW())
       RETURNING id, name, intersection_name,
                 longitude, latitude,
                 direction, type, default_green_duration, default_yellow_duration, default_red_duration,
                 is_autonomous, group_id, camera_url, current_state, created_at`, [id, input.name, input.intersectionName, input.latitude, input.longitude, input.direction, input.type,
            input.defaultGreenDuration, input.defaultYellowDuration, input.defaultRedDuration,
            input.isAutonomous, input.groupId, input.cameraUrl]);
        // Cache signal state in Redis
        await redis_1.redis.setJSON(`signal:state:${id}`, { signalId: id, state: 'red', updatedAt: new Date().toISOString() });
        logger_1.logger.info('Traffic signal created', { signalId: id, name: input.name });
        return result.rows[0];
    }
    async findAll(query) {
        const { page, limit, type, state, isAutonomous, groupId } = query;
        const offset = (page - 1) * limit;
        const conditions = [];
        const params = [];
        let idx = 1;
        if (type) {
            conditions.push(`ts.type = $${idx++}`);
            params.push(type);
        }
        if (state) {
            conditions.push(`ts.current_state = $${idx++}`);
            params.push(state);
        }
        if (isAutonomous !== undefined) {
            conditions.push(`ts.is_autonomous = $${idx++}`);
            params.push(isAutonomous);
        }
        if (groupId) {
            conditions.push(`ts.group_id = $${idx++}`);
            params.push(groupId);
        }
        const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const countResult = await connection_1.db.query(`SELECT COUNT(*) FROM traffic_signals ts ${where}`, params);
        const total = parseInt(countResult.rows[0].count, 10);
        const dataResult = await connection_1.db.query(`SELECT ts.id, ts.name, ts.intersection_name,
              ts.longitude, ts.latitude,
              ts.direction, ts.type, ts.default_green_duration, ts.default_yellow_duration, ts.default_red_duration,
              ts.is_autonomous, ts.group_id, ts.camera_url, ts.current_state,
              ts.last_state_change, ts.override_until, ts.is_online, ts.created_at, ts.updated_at
       FROM traffic_signals ts
       ${where}
       ORDER BY ts.name
       LIMIT $${idx++} OFFSET $${idx}`, [...params, limit, offset]);
        return { data: dataResult.rows, total, page, limit };
    }
    async findById(id) {
        const result = await connection_1.db.query(`SELECT ts.*,
              ts.longitude, ts.latitude
       FROM traffic_signals ts
       WHERE ts.id = $1`, [id]);
        if (result.rows.length === 0)
            throw new errors_1.NotFoundError('Traffic signal');
        return result.rows[0];
    }
    async update(id, input) {
        await this.findById(id);
        const fieldMap = {
            name: 'name', intersectionName: 'intersection_name', direction: 'direction', type: 'type',
            defaultGreenDuration: 'default_green_duration', defaultYellowDuration: 'default_yellow_duration',
            defaultRedDuration: 'default_red_duration', isAutonomous: 'is_autonomous',
            groupId: 'group_id', cameraUrl: 'camera_url',
        };
        const fields = [];
        const values = [];
        let idx = 1;
        for (const [key, col] of Object.entries(fieldMap)) {
            if (input[key] !== undefined) {
                fields.push(`${col} = $${idx++}`);
                values.push(input[key]);
            }
        }
        // Handle location update
        if (input.latitude !== undefined && input.longitude !== undefined) {
            fields.push(`latitude = $${idx++}`);
            values.push(input.latitude);
            fields.push(`longitude = $${idx++}`);
            values.push(input.longitude);
        }
        if (fields.length === 0)
            return this.findById(id);
        fields.push(`updated_at = NOW()`);
        values.push(id);
        await connection_1.db.query(`UPDATE traffic_signals SET ${fields.join(', ')} WHERE id = $${idx}`, values);
        logger_1.logger.info('Traffic signal updated', { signalId: id });
        return this.findById(id);
    }
    async changeState(id, input, changedBy) {
        const signal = await this.findById(id);
        await connection_1.db.transaction(async (client) => {
            // Update signal state
            await client.query(`UPDATE traffic_signals
         SET current_state = $1, last_state_change = NOW(), override_until = $2, updated_at = NOW()
         WHERE id = $3`, [input.state, input.overrideUntil || null, id]);
            // Record state change in log
            await client.query(`INSERT INTO signal_state_log (id, signal_id, previous_state, new_state, changed_by, reason, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`, [(0, uuid_1.v4)(), id, signal.current_state, input.state, changedBy, input.reason]);
        });
        // Update Redis cache
        await redis_1.redis.setJSON(`signal:state:${id}`, {
            signalId: id,
            state: input.state,
            updatedAt: new Date().toISOString(),
        });
        // Publish state change for WebSocket
        await redis_1.redis.publish('signals:state-change', JSON.stringify({
            signalId: id,
            name: signal.name,
            previousState: signal.current_state,
            newState: input.state,
            changedBy,
            reason: input.reason,
            timestamp: new Date().toISOString(),
        }));
        logger_1.logger.info('Signal state changed', { signalId: id, from: signal.current_state, to: input.state });
        audit_service_1.auditService.log({
            userId: changedBy,
            action: 'signal_state_change',
            entityType: 'signal',
            entityId: id,
            oldValues: { state: signal.current_state },
            newValues: { state: input.state, reason: input.reason, overrideUntil: input.overrideUntil },
        }).catch(() => {});
        return this.findById(id);
    }
    async getStateLog(signalId, page = 1, limit = 50) {
        const offset = (page - 1) * limit;
        const countResult = await connection_1.db.query('SELECT COUNT(*) FROM signal_state_log WHERE signal_id = $1', [signalId]);
        const total = parseInt(countResult.rows[0].count, 10);
        const result = await connection_1.db.query(`SELECT ssl.*, u.first_name || ' ' || u.last_name as changed_by_name
       FROM signal_state_log ssl
       LEFT JOIN users u ON ssl.changed_by = u.id
       WHERE ssl.signal_id = $1
       ORDER BY ssl.created_at DESC
       LIMIT $2 OFFSET $3`, [signalId, limit, offset]);
        return { data: result.rows, total, page, limit };
    }
    async createSchedule(input) {
        const id = (0, uuid_1.v4)();
        const result = await connection_1.db.query(`INSERT INTO signal_schedules (id, signal_id, day_of_week, start_time, end_time, green_duration, yellow_duration, red_duration, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       RETURNING *`, [id, input.signalId, input.dayOfWeek, input.startTime, input.endTime, input.greenDuration, input.yellowDuration, input.redDuration]);
        logger_1.logger.info('Signal schedule created', { scheduleId: id, signalId: input.signalId });
        return result.rows[0];
    }
    async getSchedules(signalId) {
        const result = await connection_1.db.query('SELECT * FROM signal_schedules WHERE signal_id = $1 ORDER BY day_of_week, start_time', [signalId]);
        return result.rows;
    }
    async getGroupSignals(groupId) {
        const result = await connection_1.db.query(`SELECT ts.id, ts.name, ts.direction, ts.current_state, ts.is_online,
              ts.longitude, ts.latitude
       FROM traffic_signals ts
       WHERE ts.group_id = $1
       ORDER BY ts.direction`, [groupId]);
        return result.rows;
    }
    async getActiveOverrides() {
        const result = await connection_1.db.query(
            `SELECT ts.id, ts.name, ts.intersection_name, ts.current_state, ts.override_until,
                    ts.last_state_change, ts.is_online,
                    ssl.changed_by, ssl.reason, ssl.created_at as override_started,
                    u.first_name || ' ' || u.last_name as changed_by_name
             FROM traffic_signals ts
             LEFT JOIN LATERAL (
                 SELECT * FROM signal_state_log
                 WHERE signal_id = ts.id
                 ORDER BY created_at DESC LIMIT 1
             ) ssl ON true
             LEFT JOIN users u ON ssl.changed_by = u.id
             WHERE ts.override_until IS NOT NULL AND ts.override_until > NOW()
             ORDER BY ts.override_until ASC`
        );
        return result.rows;
    }
    async delete(id) {
        await this.findById(id);
        await connection_1.db.query('DELETE FROM traffic_signals WHERE id = $1', [id]);
        await redis_1.redis.del(`signal:state:${id}`);
        logger_1.logger.info('Traffic signal deleted', { signalId: id });
    }
}
exports.SignalsService = SignalsService;
exports.signalsService = new SignalsService();
