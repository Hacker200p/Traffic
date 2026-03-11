"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditService = exports.AuditService = void 0;
const uuid_1 = require("uuid");
const connection_1 = require("../database/connection");
const logger_1 = require("./logger");

/**
 * Centralized audit logging service.
 * Records all significant user actions for compliance and security monitoring.
 */
class AuditService {
    /**
     * Log an auditable action.
     *
     * @param {object} entry
     * @param {string}  entry.userId      – User performing the action
     * @param {string}  entry.action      – Action label (e.g. 'login', 'approve_challan', 'change_signal_state')
     * @param {string}  entry.entityType  – Entity being acted upon (e.g. 'vehicle', 'violation', 'challan', 'signal')
     * @param {string}  [entry.entityId]  – ID of the entity
     * @param {object}  [entry.oldValues] – Previous state (for updates)
     * @param {object}  [entry.newValues] – New state (for updates)
     * @param {string}  [entry.ipAddress] – Client IP address
     * @param {string}  [entry.userAgent] – Client user agent
     */
    async log(entry) {
        try {
            const id = (0, uuid_1.v4)();
            await connection_1.db.query(
                `INSERT INTO audit_log (id, user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
                [
                    id,
                    entry.userId || null,
                    entry.action,
                    entry.entityType,
                    entry.entityId || null,
                    entry.oldValues ? JSON.stringify(entry.oldValues) : null,
                    entry.newValues ? JSON.stringify(entry.newValues) : null,
                    entry.ipAddress || null,
                    entry.userAgent ? entry.userAgent.substring(0, 255) : null,
                ]
            );
        } catch (err) {
            // Audit logging should never crash the request — log and continue
            logger_1.logger.error('Failed to write audit log', { error: err.message, entry });
        }
    }

    /**
     * Query audit logs with filters.
     */
    async findAll(query) {
        const { page = 1, limit = 50, userId, action, entityType, entityId, startDate, endDate } = query;
        const offset = (page - 1) * limit;
        const conditions = [];
        const params = [];
        let idx = 1;

        if (userId) { conditions.push(`user_id = $${idx++}`); params.push(userId); }
        if (action) { conditions.push(`action = $${idx++}`); params.push(action); }
        if (entityType) { conditions.push(`entity_type = $${idx++}`); params.push(entityType); }
        if (entityId) { conditions.push(`entity_id = $${idx++}`); params.push(entityId); }
        if (startDate) { conditions.push(`created_at >= $${idx++}`); params.push(startDate); }
        if (endDate) { conditions.push(`created_at <= $${idx++}`); params.push(endDate); }

        const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const countResult = await connection_1.db.query(
            `SELECT COUNT(*) FROM audit_log ${where}`, params
        );
        const total = parseInt(countResult.rows[0].count, 10);

        const dataResult = await connection_1.db.query(
            `SELECT al.*, u.email as user_email, u.first_name || ' ' || u.last_name as user_name
             FROM audit_log al
             LEFT JOIN users u ON al.user_id = u.id
             ${where}
             ORDER BY al.created_at DESC
             LIMIT $${idx++} OFFSET $${idx}`,
            [...params, limit, offset]
        );

        return { data: dataResult.rows, total, page, limit };
    }

    /**
     * Get audit entries for a specific entity.
     */
    async getEntityHistory(entityType, entityId, limit = 50) {
        const result = await connection_1.db.query(
            `SELECT al.*, u.email as user_email, u.first_name || ' ' || u.last_name as user_name
             FROM audit_log al
             LEFT JOIN users u ON al.user_id = u.id
             WHERE al.entity_type = $1 AND al.entity_id = $2
             ORDER BY al.created_at DESC
             LIMIT $3`,
            [entityType, entityId, limit]
        );
        return result.rows;
    }
}

exports.AuditService = AuditService;
exports.auditService = new AuditService();
