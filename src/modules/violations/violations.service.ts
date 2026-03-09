import { v4 as uuidv4 } from 'uuid';
import { db } from '../../database/connection';
import { NotFoundError } from '../../common/errors';
import { logger } from '../../common/logger';
import { redis } from '../../config/redis';
import { CreateViolationInput, UpdateViolationInput, ViolationQuery } from './violations.validation';

export class ViolationsService {
  async create(input: CreateViolationInput) {
    const id = uuidv4();
    const result = await db.query(
      `INSERT INTO violations (id, vehicle_id, type, description, location, speed, speed_limit, evidence_url, signal_id, severity, fine_amount, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint($5, $6), 4326), $7, $8, $9, $10, $11, $12, 'pending', NOW(), NOW())
       RETURNING id, vehicle_id, type, description, ST_X(location::geometry) as longitude, ST_Y(location::geometry) as latitude, speed, speed_limit, evidence_url, signal_id, severity, fine_amount, status, created_at`,
      [id, input.vehicleId, input.type, input.description, input.longitude, input.latitude, input.speed, input.speedLimit, input.evidenceUrl, input.signalId, input.severity, input.fineAmount]
    );

    // Publish violation event for real-time alerts
    await redis.publish('violations:new', JSON.stringify(result.rows[0]));

    logger.info('Violation created', { violationId: id, type: input.type, vehicleId: input.vehicleId });
    return result.rows[0];
  }

  async findAll(query: ViolationQuery) {
    const { page, limit, type, status, severity, vehicleId, startDate, endDate } = query;
    const offset = (page - 1) * limit;
    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (type) { conditions.push(`v.type = $${idx++}`); params.push(type); }
    if (status) { conditions.push(`v.status = $${idx++}`); params.push(status); }
    if (severity) { conditions.push(`v.severity = $${idx++}`); params.push(severity); }
    if (vehicleId) { conditions.push(`v.vehicle_id = $${idx++}`); params.push(vehicleId); }
    if (startDate) { conditions.push(`v.created_at >= $${idx++}`); params.push(startDate); }
    if (endDate) { conditions.push(`v.created_at <= $${idx++}`); params.push(endDate); }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await db.query(`SELECT COUNT(*) FROM violations v ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count, 10);

    const dataResult = await db.query(
      `SELECT v.id, v.vehicle_id, veh.plate_number, v.type, v.description,
              ST_X(v.location::geometry) as longitude, ST_Y(v.location::geometry) as latitude,
              v.speed, v.speed_limit, v.evidence_url, v.signal_id, v.severity, v.fine_amount,
              v.status, v.reviewed_by, v.review_notes, v.created_at, v.updated_at
       FROM violations v
       LEFT JOIN vehicles veh ON v.vehicle_id = veh.id
       ${whereClause}
       ORDER BY v.created_at DESC
       LIMIT $${idx++} OFFSET $${idx}`,
      [...params, limit, offset]
    );

    return { data: dataResult.rows, total, page, limit };
  }

  async findById(id: string) {
    const result = await db.query(
      `SELECT v.*, ST_X(v.location::geometry) as longitude, ST_Y(v.location::geometry) as latitude,
              veh.plate_number, veh.type as vehicle_type, veh.make, veh.model, veh.color
       FROM violations v
       LEFT JOIN vehicles veh ON v.vehicle_id = veh.id
       WHERE v.id = $1`,
      [id]
    );
    if (result.rows.length === 0) throw new NotFoundError('Violation');
    return result.rows[0];
  }

  async update(id: string, input: UpdateViolationInput) {
    await this.findById(id);

    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (input.status) { fields.push(`status = $${idx++}`); values.push(input.status); }
    if (input.reviewedBy) { fields.push(`reviewed_by = $${idx++}`); values.push(input.reviewedBy); }
    if (input.reviewNotes) { fields.push(`review_notes = $${idx++}`); values.push(input.reviewNotes); }
    if (input.fineAmount) { fields.push(`fine_amount = $${idx++}`); values.push(input.fineAmount); }

    if (fields.length === 0) return this.findById(id);

    fields.push(`updated_at = NOW()`);
    values.push(id);

    await db.query(`UPDATE violations SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`, values);

    logger.info('Violation updated', { violationId: id, status: input.status });
    return this.findById(id);
  }

  async getStats(startDate?: string, endDate?: string) {
    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (startDate) { conditions.push(`created_at >= $${idx++}`); params.push(startDate); }
    if (endDate) { conditions.push(`created_at <= $${idx++}`); params.push(endDate); }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await db.query(
      `SELECT
         COUNT(*) as total,
         COUNT(*) FILTER (WHERE status = 'pending') as pending,
         COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed,
         COUNT(*) FILTER (WHERE severity = 'critical') as critical,
         SUM(COALESCE(fine_amount, 0)) FILTER (WHERE status = 'confirmed') as total_fines,
         json_agg(json_build_object('type', type, 'count', cnt)) as by_type
       FROM violations ${whereClause},
       LATERAL (SELECT type, COUNT(*) as cnt FROM violations ${whereClause} GROUP BY type) sub`,
      params
    );

    // Simpler stats query
    const byType = await db.query(
      `SELECT type, COUNT(*) as count FROM violations ${whereClause} GROUP BY type ORDER BY count DESC`,
      params
    );

    const bySeverity = await db.query(
      `SELECT severity, COUNT(*) as count FROM violations ${whereClause} GROUP BY severity`,
      params
    );

    const totals = await db.query(
      `SELECT COUNT(*) as total,
              COUNT(*) FILTER (WHERE status = 'pending') as pending,
              COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed,
              COUNT(*) FILTER (WHERE severity = 'critical') as critical,
              COALESCE(SUM(fine_amount) FILTER (WHERE status = 'confirmed'), 0) as total_fines
       FROM violations ${whereClause}`,
      params
    );

    return {
      ...totals.rows[0],
      byType: byType.rows,
      bySeverity: bySeverity.rows,
    };
  }
}

export const violationsService = new ViolationsService();
