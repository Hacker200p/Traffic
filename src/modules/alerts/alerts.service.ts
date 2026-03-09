import { v4 as uuidv4 } from 'uuid';
import { db } from '../../database/connection';
import { NotFoundError } from '../../common/errors';
import { logger } from '../../common/logger';
import { redis } from '../../config/redis';
import { CreateAlertInput, UpdateAlertInput, AlertQuery } from './alerts.validation';

export class AlertsService {
  async create(input: CreateAlertInput, createdBy: string) {
    const id = uuidv4();
    const result = await db.query(
      `INSERT INTO alerts (id, type, priority, title, description, location, radius, vehicle_id, signal_id, status, created_by, expires_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, ST_SetSRID(ST_MakePoint($6, $7), 4326), $8, $9, $10, 'active', $11, $12::timestamptz, NOW(), NOW())
       RETURNING id, type, priority, title, description,
                 ST_X(location::geometry) as longitude, ST_Y(location::geometry) as latitude,
                 radius, vehicle_id, signal_id, status, created_by, expires_at, created_at`,
      [id, input.type, input.priority, input.title, input.description, input.longitude, input.latitude, input.radius, input.vehicleId, input.signalId, createdBy, input.expiresAt]
    );

    const alert = result.rows[0];

    // Publish real-time alert
    await redis.publish('alerts:new', JSON.stringify(alert));

    // Cache active critical alerts
    if (input.priority === 'critical') {
      await redis.setJSON(`alert:critical:${id}`, alert, 3600);
    }

    logger.info('Alert created', { alertId: id, type: input.type, priority: input.priority });
    return alert;
  }

  async findAll(query: AlertQuery) {
    const { page, limit, type, priority, status, activeOnly } = query;
    const offset = (page - 1) * limit;
    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (type) { conditions.push(`a.type = $${idx++}`); params.push(type); }
    if (priority) { conditions.push(`a.priority = $${idx++}`); params.push(priority); }
    if (status) { conditions.push(`a.status = $${idx++}`); params.push(status); }
    if (activeOnly) {
      conditions.push(`a.status = 'active'`);
      conditions.push(`(a.expires_at IS NULL OR a.expires_at > NOW())`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await db.query(`SELECT COUNT(*) FROM alerts a ${where}`, params);
    const total = parseInt(countResult.rows[0].count, 10);

    const dataResult = await db.query(
      `SELECT a.id, a.type, a.priority, a.title, a.description,
              ST_X(a.location::geometry) as longitude, ST_Y(a.location::geometry) as latitude,
              a.radius, a.vehicle_id, a.signal_id, a.status, a.created_by,
              a.resolved_by, a.resolved_notes, a.expires_at, a.created_at, a.updated_at,
              u.first_name || ' ' || u.last_name as creator_name
       FROM alerts a
       LEFT JOIN users u ON a.created_by = u.id
       ${where}
       ORDER BY
         CASE a.priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
         a.created_at DESC
       LIMIT $${idx++} OFFSET $${idx}`,
      [...params, limit, offset]
    );

    return { data: dataResult.rows, total, page, limit };
  }

  async findById(id: string) {
    const result = await db.query(
      `SELECT a.*, ST_X(a.location::geometry) as longitude, ST_Y(a.location::geometry) as latitude,
              u.first_name || ' ' || u.last_name as creator_name
       FROM alerts a
       LEFT JOIN users u ON a.created_by = u.id
       WHERE a.id = $1`,
      [id]
    );
    if (result.rows.length === 0) throw new NotFoundError('Alert');
    return result.rows[0];
  }

  async update(id: string, input: UpdateAlertInput, userId: string) {
    await this.findById(id);

    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (input.status) { fields.push(`status = $${idx++}`); values.push(input.status); }
    if (input.priority) { fields.push(`priority = $${idx++}`); values.push(input.priority); }
    if (input.status === 'resolved') {
      fields.push(`resolved_by = $${idx++}`); values.push(userId);
      if (input.resolvedNotes) { fields.push(`resolved_notes = $${idx++}`); values.push(input.resolvedNotes); }
    }

    if (fields.length === 0) return this.findById(id);

    fields.push(`updated_at = NOW()`);
    values.push(id);

    await db.query(`UPDATE alerts SET ${fields.join(', ')} WHERE id = $${idx}`, values);

    const updated = await this.findById(id);

    // Publish alert update
    await redis.publish('alerts:update', JSON.stringify(updated));

    logger.info('Alert updated', { alertId: id, status: input.status });
    return updated;
  }

  async getActiveCount() {
    const result = await db.query(
      `SELECT
         COUNT(*) FILTER (WHERE priority = 'critical') as critical,
         COUNT(*) FILTER (WHERE priority = 'high') as high,
         COUNT(*) FILTER (WHERE priority = 'medium') as medium,
         COUNT(*) FILTER (WHERE priority = 'low') as low,
         COUNT(*) as total
       FROM alerts
       WHERE status = 'active' AND (expires_at IS NULL OR expires_at > NOW())`
    );
    return result.rows[0];
  }
}

export const alertsService = new AlertsService();
