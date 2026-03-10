"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.alertsService = exports.AlertsService = void 0;
const uuid_1 = require("uuid");
const connection_1 = require("../../database/connection");
const errors_1 = require("../../common/errors");
const logger_1 = require("../../common/logger");
const redis_1 = require("../../config/redis");
const notification_service_1 = require("../notifications/notification.service");
class AlertsService {
    async create(input, createdBy) {
        const id = (0, uuid_1.v4)();
        const result = await connection_1.db.query(`INSERT INTO alerts (id, type, priority, title, description, latitude, longitude, radius, vehicle_id, signal_id, status, created_by, expires_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active', $11, $12::timestamptz, NOW(), NOW())
       RETURNING id, type, priority, title, description,
                 longitude, latitude,
                 radius, vehicle_id, signal_id, status, created_by, expires_at, created_at`, [id, input.type, input.priority, input.title, input.description, input.latitude, input.longitude, input.radius, input.vehicleId, input.signalId, createdBy, input.expiresAt]);
        const alert = result.rows[0];
        // Publish real-time alert
        await redis_1.redis.publish('alerts:new', JSON.stringify(alert));
        // Cache active critical alerts
        if (input.priority === 'critical') {
            await redis_1.redis.setJSON(`alert:critical:${id}`, alert, 3600);
        }
        logger_1.logger.info('Alert created', { alertId: id, type: input.type, priority: input.priority });
        // Dispatch SMS / push / email notifications (fire-and-forget)
        notification_service_1.notificationService.sendAlertNotification(alert).catch(err => {
            logger_1.logger.error('Alert notification dispatch failed', { alertId: id, err: err.message });
        });
        return alert;
    }
    async findAll(query) {
        const { page, limit, type, priority, status, activeOnly } = query;
        const offset = (page - 1) * limit;
        const conditions = [];
        const params = [];
        let idx = 1;
        if (type) {
            conditions.push(`a.type = $${idx++}`);
            params.push(type);
        }
        if (priority) {
            conditions.push(`a.priority = $${idx++}`);
            params.push(priority);
        }
        if (status) {
            conditions.push(`a.status = $${idx++}`);
            params.push(status);
        }
        if (activeOnly) {
            conditions.push(`a.status = 'active'`);
            conditions.push(`(a.expires_at IS NULL OR a.expires_at > NOW())`);
        }
        const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const countResult = await connection_1.db.query(`SELECT COUNT(*) FROM alerts a ${where}`, params);
        const total = parseInt(countResult.rows[0].count, 10);
        const dataResult = await connection_1.db.query(`SELECT a.id, a.type, a.priority, a.title, a.description,
              a.longitude, a.latitude,
              a.radius, a.vehicle_id, a.signal_id, a.status, a.created_by,
              a.resolved_by, a.resolved_notes, a.expires_at, a.created_at, a.updated_at,
              u.first_name || ' ' || u.last_name as creator_name
       FROM alerts a
       LEFT JOIN users u ON a.created_by = u.id
       ${where}
       ORDER BY
         CASE a.priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
         a.created_at DESC
       LIMIT $${idx++} OFFSET $${idx}`, [...params, limit, offset]);
        return { data: dataResult.rows, total, page, limit };
    }
    async findById(id) {
        const result = await connection_1.db.query(`SELECT a.*, a.longitude, a.latitude,
              u.first_name || ' ' || u.last_name as creator_name
       FROM alerts a
       LEFT JOIN users u ON a.created_by = u.id
       WHERE a.id = $1`, [id]);
        if (result.rows.length === 0)
            throw new errors_1.NotFoundError('Alert');
        return result.rows[0];
    }
    async update(id, input, userId) {
        await this.findById(id);
        const fields = [];
        const values = [];
        let idx = 1;
        if (input.status) {
            fields.push(`status = $${idx++}`);
            values.push(input.status);
        }
        if (input.priority) {
            fields.push(`priority = $${idx++}`);
            values.push(input.priority);
        }
        if (input.status === 'resolved') {
            fields.push(`resolved_by = $${idx++}`);
            values.push(userId);
            if (input.resolvedNotes) {
                fields.push(`resolved_notes = $${idx++}`);
                values.push(input.resolvedNotes);
            }
        }
        if (fields.length === 0)
            return this.findById(id);
        fields.push(`updated_at = NOW()`);
        values.push(id);
        await connection_1.db.query(`UPDATE alerts SET ${fields.join(', ')} WHERE id = $${idx}`, values);
        const updated = await this.findById(id);
        // Publish alert update
        await redis_1.redis.publish('alerts:update', JSON.stringify(updated));
        logger_1.logger.info('Alert updated', { alertId: id, status: input.status });
        return updated;
    }
    async getActiveCount() {
        const result = await connection_1.db.query(`SELECT
         COUNT(*) FILTER (WHERE priority = 'critical') as critical,
         COUNT(*) FILTER (WHERE priority = 'high') as high,
         COUNT(*) FILTER (WHERE priority = 'medium') as medium,
         COUNT(*) FILTER (WHERE priority = 'low') as low,
         COUNT(*) as total
       FROM alerts
       WHERE status = 'active' AND (expires_at IS NULL OR expires_at > NOW())`);
        return result.rows[0];
    }
}
exports.AlertsService = AlertsService;
exports.alertsService = new AlertsService();
