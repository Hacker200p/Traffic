"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifPrefsService = exports.NotifPrefsService = void 0;
const uuid_1 = require("uuid");
const connection_1 = require("../../database/connection");

class NotifPrefsService {
    async getForUser(userId) {
        const result = await connection_1.db.query(
            `SELECT id, alert_type, sms, push, email, updated_at
             FROM notification_preferences
             WHERE user_id = $1
             ORDER BY alert_type`,
            [userId]
        );
        return result.rows;
    }

    async upsert(userId, alertType, channels) {
        const id = (0, uuid_1.v4)();
        const result = await connection_1.db.query(
            `INSERT INTO notification_preferences (id, user_id, alert_type, sms, push, email, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
             ON CONFLICT (user_id, alert_type)
             DO UPDATE SET sms = $4, push = $5, email = $6, updated_at = NOW()
             RETURNING id, alert_type, sms, push, email, updated_at`,
            [id, userId, alertType, channels.sms ?? false, channels.push ?? true, channels.email ?? false]
        );
        return result.rows[0];
    }

    async bulkUpsert(userId, preferences) {
        const results = [];
        for (const pref of preferences) {
            const row = await this.upsert(userId, pref.alertType, pref);
            results.push(row);
        }
        return results;
    }

    async remove(userId, alertType) {
        await connection_1.db.query(
            'DELETE FROM notification_preferences WHERE user_id = $1 AND alert_type = $2',
            [userId, alertType]
        );
    }
}

exports.NotifPrefsService = NotifPrefsService;
exports.notifPrefsService = new NotifPrefsService();
