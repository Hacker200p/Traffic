"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationService = exports.NotificationService = void 0;
const uuid_1 = require("uuid");
const logger_1 = require("../../common/logger");
const config_1 = require("../../config");
const connection_1 = require("../../database/connection");

/**
 * Notification service — sends alerts to vehicle owners via available channels.
 *
 * Channels are activated by environment variables:
 *   - SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS  → email
 *   - SMS_API_KEY / SMS_API_URL                        → SMS
 *   - FIREBASE_CREDENTIALS                             → push notification
 *
 * When a channel is not configured the service logs the notification instead
 * of failing, so the system works without external providers during development.
 */
class NotificationService {
    // ── Email ───────────────────────────────────────────────────────────────
    async sendEmail(to, subject, body) {
        const smtpHost = process.env.SMTP_HOST;
        if (!smtpHost) {
            logger_1.logger.info('[Notification] Email not configured — logging instead', { to, subject });
            return { channel: 'email', status: 'skipped', reason: 'SMTP not configured' };
        }

        try {
            // Dynamic import so the app doesn't crash when nodemailer isn't installed
            const nodemailer = require('nodemailer');
            const transporter = nodemailer.createTransport({
                host: smtpHost,
                port: parseInt(process.env.SMTP_PORT || '587', 10),
                secure: process.env.SMTP_SECURE === 'true',
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS,
                },
            });

            await transporter.sendMail({
                from: process.env.SMTP_FROM || 'traffic-system@noreply.com',
                to,
                subject,
                html: body,
            });

            logger_1.logger.info('[Notification] Email sent', { to, subject });
            return { channel: 'email', status: 'sent' };
        } catch (err) {
            logger_1.logger.error('[Notification] Email failed', { to, error: err.message });
            return { channel: 'email', status: 'failed', reason: err.message };
        }
    }

    // ── SMS ─────────────────────────────────────────────────────────────────
    async sendSMS(phoneNumber, message) {
        const smsApiUrl = process.env.SMS_API_URL;
        const smsApiKey = process.env.SMS_API_KEY;

        if (!smsApiUrl || !smsApiKey) {
            logger_1.logger.info('[Notification] SMS not configured — logging instead', { phoneNumber, message });
            return { channel: 'sms', status: 'skipped', reason: 'SMS not configured' };
        }

        try {
            const response = await fetch(smsApiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${smsApiKey}`,
                },
                body: JSON.stringify({ to: phoneNumber, message }),
            });

            if (!response.ok) {
                throw new Error(`SMS API returned ${response.status}`);
            }

            logger_1.logger.info('[Notification] SMS sent', { phoneNumber });
            return { channel: 'sms', status: 'sent' };
        } catch (err) {
            logger_1.logger.error('[Notification] SMS failed', { phoneNumber, error: err.message });
            return { channel: 'sms', status: 'failed', reason: err.message };
        }
    }

    // ── Push Notification ───────────────────────────────────────────────────
    async sendPush(userId, title, body) {
        const firebaseCreds = process.env.FIREBASE_CREDENTIALS;
        if (!firebaseCreds) {
            logger_1.logger.info('[Notification] Push not configured — logging instead', { userId, title });
            return { channel: 'push', status: 'skipped', reason: 'Firebase not configured' };
        }

        try {
            const admin = require('firebase-admin');
            if (!admin.apps.length) {
                admin.initializeApp({
                    credential: admin.credential.cert(JSON.parse(firebaseCreds)),
                });
            }

            await admin.messaging().send({
                topic: `user_${userId}`,
                notification: { title, body },
            });

            logger_1.logger.info('[Notification] Push sent', { userId, title });
            return { channel: 'push', status: 'sent' };
        } catch (err) {
            logger_1.logger.error('[Notification] Push failed', { userId, error: err.message });
            return { channel: 'push', status: 'failed', reason: err.message };
        }
    }

    // ── Challan notification (all channels) ─────────────────────────────────
    /**
     * Send an e-challan notification through all available channels.
     *
     * @param {object} challan - The challan record
     * @param {object} owner   - { name, contact, vehicleId }
     * @returns {object} Results per channel
     */
    async sendChallanNotification(challan, owner) {
        const results = [];
        const channels = [];

        const subject = `Traffic E-Challan: ${challan.challan_number}`;

        const htmlBody = `
            <h2>Traffic E-Challan Notice</h2>
            <p>Dear ${owner.name || 'Vehicle Owner'},</p>
            <p>A traffic violation has been recorded against your vehicle.</p>
            <table style="border-collapse:collapse;width:100%;max-width:500px">
                <tr><td style="padding:8px;border:1px solid #ddd"><strong>Challan No.</strong></td>
                    <td style="padding:8px;border:1px solid #ddd">${challan.challan_number}</td></tr>
                <tr><td style="padding:8px;border:1px solid #ddd"><strong>Vehicle No.</strong></td>
                    <td style="padding:8px;border:1px solid #ddd">${challan.plate_number}</td></tr>
                <tr><td style="padding:8px;border:1px solid #ddd"><strong>Violation</strong></td>
                    <td style="padding:8px;border:1px solid #ddd">${challan.violation_type.replace(/_/g, ' ')}</td></tr>
                <tr><td style="padding:8px;border:1px solid #ddd"><strong>Fine Amount</strong></td>
                    <td style="padding:8px;border:1px solid #ddd">₹${challan.fine_amount}</td></tr>
                <tr><td style="padding:8px;border:1px solid #ddd"><strong>Due Date</strong></td>
                    <td style="padding:8px;border:1px solid #ddd">${new Date(challan.due_date).toLocaleDateString()}</td></tr>
            </table>
            <p>Please pay the fine before the due date to avoid further penalties.</p>
        `;

        const smsText =
            `E-Challan ${challan.challan_number}: ` +
            `Vehicle ${challan.plate_number}, ` +
            `Violation: ${challan.violation_type.replace(/_/g, ' ')}, ` +
            `Fine: Rs.${challan.fine_amount}, ` +
            `Due: ${new Date(challan.due_date).toLocaleDateString()}`;

        // Try email if contact looks like an email
        if (owner.contact && owner.contact.includes('@')) {
            const emailResult = await this.sendEmail(owner.contact, subject, htmlBody);
            results.push(emailResult);
            if (emailResult.status === 'sent') channels.push('email');
        }

        // Try SMS if contact looks like a phone number
        if (owner.contact && /^\+?\d{7,15}$/.test(owner.contact.replace(/[\s-]/g, ''))) {
            const smsResult = await this.sendSMS(owner.contact, smsText);
            results.push(smsResult);
            if (smsResult.status === 'sent') channels.push('sms');
        }

        // Try push notification if we have a vehicleId (used as topic)
        if (owner.vehicleId) {
            const pushResult = await this.sendPush(
                owner.vehicleId,
                subject,
                smsText
            );
            results.push(pushResult);
            if (pushResult.status === 'sent') channels.push('push');
        }

        return { results, channels };
    }

    // ── Alert notification (multi-channel dispatch) ─────────────────────────
    /**
     * Dispatch an alert to all users whose notification_preferences match
     * the alert type. Sends via SMS, push, and/or email based on each
     * user's preferences and logs every attempt to notification_log.
     *
     * This runs asynchronously — callers should fire-and-forget.
     */
    async sendAlertNotification(alert) {
        try {
            // Look up users who want notifications for this alert type
            const prefs = await connection_1.db.query(
                `SELECT np.user_id, np.sms, np.push, np.email,
                        u.email AS user_email, u.phone_number, u.first_name, u.last_name
                 FROM notification_preferences np
                 JOIN users u ON u.id = np.user_id AND u.is_active = TRUE
                 WHERE np.alert_type = $1`,
                [alert.type]
            );

            if (prefs.rows.length === 0) {
                // No subscribers — log dashboard-only delivery
                await this._logNotification(alert.id, null, 'dashboard', 'sent', null, null);
                return;
            }

            for (const pref of prefs.rows) {
                const title = `[${alert.priority?.toUpperCase()}] ${alert.title}`;
                const body = alert.description || alert.title;

                // SMS
                if (pref.sms && pref.phone_number) {
                    const smsResult = await this.sendSMS(pref.phone_number, `${title}\n${body}`);
                    await this._logNotification(
                        alert.id, pref.user_id, 'sms', smsResult.status,
                        pref.phone_number, smsResult.reason
                    );
                }

                // Push
                if (pref.push) {
                    const pushResult = await this.sendPush(pref.user_id, title, body);
                    await this._logNotification(
                        alert.id, pref.user_id, 'push', pushResult.status,
                        pref.user_id, pushResult.reason
                    );
                }

                // Email
                if (pref.email && pref.user_email) {
                    const htmlBody = `
                        <h3>${title}</h3>
                        <p>${body}</p>
                        <p><strong>Priority:</strong> ${alert.priority}</p>
                        <p><strong>Location:</strong> ${alert.latitude?.toFixed(5)}, ${alert.longitude?.toFixed(5)}</p>
                        <p><small>Alert ID: ${alert.id}</small></p>
                    `;
                    const emailResult = await this.sendEmail(pref.user_email, title, htmlBody);
                    await this._logNotification(
                        alert.id, pref.user_id, 'email', emailResult.status,
                        pref.user_email, emailResult.reason
                    );
                }
            }

            logger_1.logger.info('[Notification] Alert dispatched', {
                alertId: alert.id,
                type: alert.type,
                recipientCount: prefs.rows.length,
            });
        } catch (err) {
            logger_1.logger.error('[Notification] Alert dispatch failed', {
                alertId: alert.id,
                error: err.message,
            });
        }
    }

    // ── Log helper ──────────────────────────────────────────────────────────
    async _logNotification(alertId, userId, channel, status, recipient, error) {
        try {
            const id = (0, uuid_1.v4)();
            await connection_1.db.query(
                `INSERT INTO notification_log (id, alert_id, user_id, channel, status, recipient, error, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
                [id, alertId, userId, channel, status, recipient ?? null, error ?? null]
            );
        } catch (err) {
            logger_1.logger.error('[Notification] Failed to log notification', { err: err.message });
        }
    }
}
exports.NotificationService = NotificationService;
exports.notificationService = new NotificationService();
