"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.challanService = exports.ChallanService = void 0;
const uuid_1 = require("uuid");
const connection_1 = require("../../database/connection");
const errors_1 = require("../../common/errors");
const logger_1 = require("../../common/logger");
const redis_1 = require("../../config/redis");
const notification_service_1 = require("../notifications/notification.service");
const audit_service_1 = require("../../common/audit.service");

/**
 * Default fine amounts by violation type (in currency units).
 * Can be overridden per-violation when creating manually.
 */
const DEFAULT_FINES = {
    red_light: 1000,
    speeding: 2000,
    wrong_way: 2000,
    illegal_parking: 500,
    no_seatbelt: 1000,
    no_helmet: 1000,
    illegal_turn: 500,
    other: 500,
};

const CHALLAN_DUE_DAYS = 30;

class ChallanService {
    /**
     * Generate a unique challan number: ECH-YYYYMMDD-XXXXX
     */
    _generateChallanNumber() {
        const date = new Date();
        const ymd = date.toISOString().slice(0, 10).replace(/-/g, '');
        const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
        return `ECH-${ymd}-${rand}`;
    }

    /**
     * Auto-generate an e-challan for a confirmed violation.
     *
     * Workflow:
     *  1. Look up the violation + vehicle owner info
     *  2. Calculate fine amount (default or override)
     *  3. Create challan record
     *  4. Link challan to violation
     *  5. Send notification to owner (all available channels)
     */
    async generateForViolation(violationId, overrideFineAmount) {
        // 1. Fetch violation with vehicle + owner details
        const vResult = await connection_1.db.query(
            `SELECT v.*, veh.plate_number, veh.owner_name, veh.owner_contact, veh.id as veh_id
             FROM violations v
             LEFT JOIN vehicles veh ON v.vehicle_id = veh.id
             WHERE v.id = $1`,
            [violationId]
        );

        if (vResult.rows.length === 0) {
            throw new errors_1.NotFoundError('Violation');
        }

        const violation = vResult.rows[0];

        // Check if challan already exists for this violation
        const existing = await connection_1.db.query(
            'SELECT id FROM challans WHERE violation_id = $1',
            [violationId]
        );
        if (existing.rows.length > 0) {
            logger_1.logger.warn('Challan already exists for violation', { violationId });
            return this.findById(existing.rows[0].id);
        }

        // 2. Calculate fine
        const fineAmount = overrideFineAmount
            || violation.fine_amount
            || DEFAULT_FINES[violation.type]
            || DEFAULT_FINES.other;

        // 3. Create challan
        const id = (0, uuid_1.v4)();
        const challanNumber = this._generateChallanNumber();
        const dueDate = new Date(Date.now() + CHALLAN_DUE_DAYS * 24 * 60 * 60 * 1000);

        const challan = await connection_1.db.query(
            `INSERT INTO challans
                (id, challan_number, violation_id, vehicle_id, plate_number,
                 owner_name, owner_contact, violation_type, fine_amount, due_date,
                 status, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending_approval', NOW(), NOW())
             RETURNING *`,
            [
                id,
                challanNumber,
                violationId,
                violation.veh_id || violation.vehicle_id,
                violation.plate_number || 'UNKNOWN',
                violation.owner_name,
                violation.owner_contact,
                violation.type,
                fineAmount,
                dueDate,
            ]
        );

        const challanRecord = challan.rows[0];

        // 4. Link challan to violation + set fine amount
        await connection_1.db.query(
            `UPDATE violations SET challan_id = $1, fine_amount = $2, updated_at = NOW() WHERE id = $3`,
            [id, fineAmount, violationId]
        );

        // Publish for real-time updates
        await redis_1.redis.publish('challans:new', JSON.stringify(challanRecord));

        logger_1.logger.info('E-Challan generated (pending approval)', {
            challanId: id,
            challanNumber,
            violationId,
            plateNumber: violation.plate_number,
            fineAmount,
        });

        return this.findById(id);
    }

    async findById(id) {
        const result = await connection_1.db.query(
            `SELECT c.*,
                    v.type as violation_type_detail, v.description as violation_description,
                    v.latitude, v.longitude, v.evidence_url, v.severity
             FROM challans c
             LEFT JOIN violations v ON c.violation_id = v.id
             WHERE c.id = $1`,
            [id]
        );
        if (result.rows.length === 0) {
            throw new errors_1.NotFoundError('Challan');
        }
        return result.rows[0];
    }

    async findAll(query) {
        const { page = 1, limit = 20, status, plateNumber, startDate, endDate } = query;
        const offset = (page - 1) * limit;
        const conditions = [];
        const params = [];
        let idx = 1;

        if (status) {
            conditions.push(`c.status = $${idx++}`);
            params.push(status);
        }
        if (plateNumber) {
            conditions.push(`c.plate_number = $${idx++}`);
            params.push(plateNumber);
        }
        if (startDate) {
            conditions.push(`c.created_at >= $${idx++}`);
            params.push(startDate);
        }
        if (endDate) {
            conditions.push(`c.created_at <= $${idx++}`);
            params.push(endDate);
        }

        const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const countResult = await connection_1.db.query(
            `SELECT COUNT(*) FROM challans c ${where}`, params
        );
        const total = parseInt(countResult.rows[0].count, 10);

        const dataResult = await connection_1.db.query(
            `SELECT c.*, v.description as violation_description, v.evidence_url
             FROM challans c
             LEFT JOIN violations v ON c.violation_id = v.id
             ${where}
             ORDER BY c.created_at DESC
             LIMIT $${idx++} OFFSET $${idx}`,
            [...params, limit, offset]
        );

        return { data: dataResult.rows, total, page, limit };
    }

    async updateStatus(id, input) {
        await this.findById(id);
        const fields = [];
        const values = [];
        let idx = 1;

        if (input.status) {
            fields.push(`status = $${idx++}`);
            values.push(input.status);
        }
        if (input.paymentRef) {
            fields.push(`payment_ref = $${idx++}`);
            values.push(input.paymentRef);
        }
        if (input.status === 'paid') {
            fields.push(`payment_date = NOW()`);
        }

        if (fields.length === 0) return this.findById(id);

        fields.push(`updated_at = NOW()`);
        values.push(id);

        await connection_1.db.query(
            `UPDATE challans SET ${fields.join(', ')} WHERE id = $${idx}`,
            values
        );

        logger_1.logger.info('Challan updated', { challanId: id, status: input.status });
        return this.findById(id);
    }

    async resendNotification(id) {
        const challan = await this.findById(id);

        if (!challan.owner_contact) {
            throw new errors_1.BadRequestError('No owner contact available for this challan');
        }

        const result = await notification_service_1.notificationService.sendChallanNotification(
            challan,
            {
                name: challan.owner_name,
                contact: challan.owner_contact,
                vehicleId: challan.vehicle_id,
            }
        );

        const sentChannels = result.channels;
        const notifStatus = sentChannels.length > 0 ? 'sent' : 'failed';

        await connection_1.db.query(
            `UPDATE challans
             SET notification_channels = $1, notification_sent_at = NOW(),
                 notification_status = $2, updated_at = NOW()
             WHERE id = $3`,
            [sentChannels, notifStatus, id]
        );

        return { challanId: id, notification: result };
    }

    async approveChallan(id, approvedBy, input = {}) {
        const challan = await this.findById(id);
        if (challan.status !== 'pending_approval') {
            throw new errors_1.BadRequestError('Only pending challans can be approved');
        }

        const fineAmount = input.adjustedFineAmount || challan.fine_amount;

        await connection_1.db.query(
            `UPDATE challans
             SET status = 'issued',
                 fine_amount = $1,
                 approved_by = $2,
                 approval_notes = $3,
                 approved_at = NOW(),
                 updated_at = NOW()
             WHERE id = $4`,
            [fineAmount, approvedBy, input.notes || null, id]
        );

        // Send notification after approval
        if (challan.owner_contact) {
            try {
                const updatedChallan = await this.findById(id);
                const notifResult = await notification_service_1.notificationService.sendChallanNotification(
                    updatedChallan,
                    {
                        name: challan.owner_name,
                        contact: challan.owner_contact,
                        vehicleId: challan.vehicle_id,
                    }
                );
                const sentChannels = notifResult.channels;
                const notifStatus = sentChannels.length > 0 ? 'sent' : 'failed';
                await connection_1.db.query(
                    `UPDATE challans
                     SET notification_channels = $1, notification_sent_at = NOW(),
                         notification_status = $2,
                         status = CASE WHEN $2 = 'sent' THEN 'sent' ELSE status END,
                         updated_at = NOW()
                     WHERE id = $3`,
                    [sentChannels, notifStatus, id]
                );
            } catch (err) {
                logger_1.logger.error('Failed to send notification after challan approval', { challanId: id, error: err.message });
            }
        }

        logger_1.logger.info('Challan approved', { challanId: id, approvedBy, fineAmount });
        audit_service_1.auditService.log({
            userId: approvedBy,
            action: 'challan_approved',
            entityType: 'challan',
            entityId: id,
            newValues: { fineAmount, notes: input.notes },
        }).catch(() => {});
        return this.findById(id);
    }

    async rejectChallan(id, rejectedBy, reason) {
        const challan = await this.findById(id);
        if (challan.status !== 'pending_approval') {
            throw new errors_1.BadRequestError('Only pending challans can be rejected');
        }

        await connection_1.db.query(
            `UPDATE challans
             SET status = 'rejected',
                 approved_by = $1,
                 approval_notes = $2,
                 approved_at = NOW(),
                 updated_at = NOW()
             WHERE id = $3`,
            [rejectedBy, reason, id]
        );

        logger_1.logger.info('Challan rejected', { challanId: id, rejectedBy, reason });
        audit_service_1.auditService.log({
            userId: rejectedBy,
            action: 'challan_rejected',
            entityType: 'challan',
            entityId: id,
            newValues: { reason },
        }).catch(() => {});
        return this.findById(id);
    }

    async findPendingApproval(query = {}) {
        const { page = 1, limit = 20 } = query;
        const offset = (page - 1) * limit;

        const countResult = await connection_1.db.query(
            `SELECT COUNT(*) FROM challans WHERE status = 'pending_approval'`
        );
        const total = parseInt(countResult.rows[0].count, 10);

        const dataResult = await connection_1.db.query(
            `SELECT c.*, v.description as violation_description, v.evidence_url, v.severity
             FROM challans c
             LEFT JOIN violations v ON c.violation_id = v.id
             WHERE c.status = 'pending_approval'
             ORDER BY c.created_at ASC
             LIMIT $1 OFFSET $2`,
            [limit, offset]
        );

        return { data: dataResult.rows, total, page, limit };
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

        const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const result = await connection_1.db.query(
            `SELECT
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status = 'pending_approval') as pending_approval,
                COUNT(*) FILTER (WHERE status = 'issued') as issued,
                COUNT(*) FILTER (WHERE status = 'sent') as sent,
                COUNT(*) FILTER (WHERE status = 'paid') as paid,
                COUNT(*) FILTER (WHERE status = 'overdue') as overdue,
                COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
                COALESCE(SUM(fine_amount), 0) as total_fines,
                COALESCE(SUM(fine_amount) FILTER (WHERE status = 'paid'), 0) as collected_fines
             FROM challans ${where}`,
            params
        );

        return result.rows[0];
    }
}
exports.ChallanService = ChallanService;
exports.challanService = new ChallanService();
