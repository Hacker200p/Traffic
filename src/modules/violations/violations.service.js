"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.violationsService = exports.ViolationsService = void 0;
const uuid_1 = require("uuid");
const connection_1 = require("../../database/connection");
const errors_1 = require("../../common/errors");
const logger_1 = require("../../common/logger");
const redis_1 = require("../../config/redis");
const challan_service_1 = require("../challans/challan.service");
const audit_service_1 = require("../../common/audit.service");
class ViolationsService {
    async create(input) {
        const id = (0, uuid_1.v4)();
        const result = await connection_1.db.query(`INSERT INTO violations (id, vehicle_id, type, description, latitude, longitude, speed, speed_limit, evidence_url, signal_id, severity, fine_amount, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pending', NOW(), NOW())
       RETURNING id, vehicle_id, type, description, longitude, latitude, speed, speed_limit, evidence_url, signal_id, severity, fine_amount, status, created_at`, [id, input.vehicleId, input.type, input.description, input.latitude, input.longitude, input.speed, input.speedLimit, input.evidenceUrl, input.signalId, input.severity, input.fineAmount]);
        // Publish violation event for real-time alerts
        await redis_1.redis.publish('violations:new', JSON.stringify(result.rows[0]));
        logger_1.logger.info('Violation created', { violationId: id, type: input.type, vehicleId: input.vehicleId });
        return result.rows[0];
    }
    async findAll(query) {
        const { page, limit, type, status, severity, vehicleId, startDate, endDate } = query;
        const offset = (page - 1) * limit;
        const conditions = [];
        const params = [];
        let idx = 1;
        if (type) {
            conditions.push(`v.type = $${idx++}`);
            params.push(type);
        }
        if (status) {
            conditions.push(`v.status = $${idx++}`);
            params.push(status);
        }
        if (severity) {
            conditions.push(`v.severity = $${idx++}`);
            params.push(severity);
        }
        if (vehicleId) {
            conditions.push(`v.vehicle_id = $${idx++}`);
            params.push(vehicleId);
        }
        if (startDate) {
            conditions.push(`v.created_at >= $${idx++}`);
            params.push(startDate);
        }
        if (endDate) {
            conditions.push(`v.created_at <= $${idx++}`);
            params.push(endDate);
        }
        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const countResult = await connection_1.db.query(`SELECT COUNT(*) FROM violations v ${whereClause}`, params);
        const total = parseInt(countResult.rows[0].count, 10);
        const dataResult = await connection_1.db.query(`SELECT v.id, v.vehicle_id, veh.plate_number, v.type, v.description,
              v.longitude, v.latitude,
              v.speed, v.speed_limit, v.evidence_url, v.signal_id, v.severity, v.fine_amount,
              v.status, v.reviewed_by, v.review_notes, v.created_at, v.updated_at
       FROM violations v
       LEFT JOIN vehicles veh ON v.vehicle_id = veh.id
       ${whereClause}
       ORDER BY v.created_at DESC
       LIMIT $${idx++} OFFSET $${idx}`, [...params, limit, offset]);
        return { data: dataResult.rows, total, page, limit };
    }
    async findById(id) {
        const result = await connection_1.db.query(`SELECT v.*, v.longitude, v.latitude,
              veh.plate_number, veh.type as vehicle_type, veh.make, veh.model, veh.color
       FROM violations v
       LEFT JOIN vehicles veh ON v.vehicle_id = veh.id
       WHERE v.id = $1`, [id]);
        if (result.rows.length === 0)
            throw new errors_1.NotFoundError('Violation');
        return result.rows[0];
    }
    async update(id, input) {
        await this.findById(id);
        const fields = [];
        const values = [];
        let idx = 1;
        if (input.status) {
            fields.push(`status = $${idx++}`);
            values.push(input.status);
        }
        if (input.reviewedBy) {
            fields.push(`reviewed_by = $${idx++}`);
            values.push(input.reviewedBy);
            fields.push(`reviewed_at = NOW()`);
        }
        if (input.reviewNotes) {
            fields.push(`review_notes = $${idx++}`);
            values.push(input.reviewNotes);
        }
        if (input.fineAmount) {
            fields.push(`fine_amount = $${idx++}`);
            values.push(input.fineAmount);
        }
        if (fields.length === 0)
            return this.findById(id);
        fields.push(`updated_at = NOW()`);
        values.push(id);
        await connection_1.db.query(`UPDATE violations SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`, values);
        logger_1.logger.info('Violation updated', { violationId: id, status: input.status });
        // Audit log for violation review
        if (input.status && input.reviewedBy) {
            audit_service_1.auditService.log({
                userId: input.reviewedBy,
                action: `violation_${input.status}`,
                entityType: 'violation',
                entityId: id,
                newValues: { status: input.status, reviewNotes: input.reviewNotes, fineAmount: input.fineAmount },
            }).catch(() => {});
        }
        // Auto-generate e-challan when violation is confirmed
        if (input.status === 'confirmed') {
            challan_service_1.challanService.generateForViolation(id, input.fineAmount).catch(err => {
                logger_1.logger.error('Auto-challan generation failed', { violationId: id, error: err.message });
            });
        }
        return this.findById(id);
    }
    async getStats(startDate, endDate) {
        const conditions = [];
        const params = [];
        let idx = 1;
        if (startDate) {
            conditions.push(`created_at >= $${idx++}`);
            params.push(startDate);
        }
        if (endDate) {
            conditions.push(`created_at <= $${idx++}`);
            params.push(endDate);
        }
        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const byType = await connection_1.db.query(`SELECT type, COUNT(*) as count FROM violations ${whereClause} GROUP BY type ORDER BY count DESC`, params);
        const bySeverity = await connection_1.db.query(`SELECT severity, COUNT(*) as count FROM violations ${whereClause} GROUP BY severity`, params);
        const totals = await connection_1.db.query(`SELECT COUNT(*) as total,
              COUNT(*) FILTER (WHERE status = 'pending') as pending,
              COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed,
              COUNT(*) FILTER (WHERE severity = 'critical') as critical,
              COALESCE(SUM(fine_amount) FILTER (WHERE status = 'confirmed'), 0) as total_fines
       FROM violations ${whereClause}`, params);
        return {
            ...totals.rows[0],
            byType: byType.rows,
            bySeverity: bySeverity.rows,
        };
    }
}
exports.ViolationsService = ViolationsService;
exports.violationsService = new ViolationsService();
