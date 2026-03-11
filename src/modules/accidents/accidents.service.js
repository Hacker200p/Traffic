"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.accidentsService = exports.AccidentsService = void 0;
const uuid_1 = require("uuid");
const connection_1 = require("../../database/connection");
const errors_1 = require("../../common/errors");
const logger_1 = require("../../common/logger");
const redis_1 = require("../../config/redis");
const alerts_service_1 = require("../alerts/alerts.service");
const tracking_service_1 = require("../tracking/tracking.service");
const notification_service_1 = require("../notifications/notification.service");
const audit_service_1 = require("../../common/audit.service");

/**
 * Accident Detection Service
 *
 * Detects accidents from GPS telemetry using three algorithms:
 *   1. Sudden stop  — speed drops from >30 km/h to <5 km/h within 2 seconds
 *   2. Collision     — two vehicles occupy overlapping positions simultaneously
 *   3. Unusual motion — erratic heading changes (>120° within 3 data points)
 *
 * On detection:  create accident record → create alert → notify police → notify hospitals → broadcast via WebSocket
 */
class AccidentsService {

    // ── Thresholds ────────────────────────────────────────────────────────
    static SUDDEN_STOP_SPEED_FROM = 30;  // km/h — must be above this before stop
    static SUDDEN_STOP_SPEED_TO   = 5;   // km/h — must drop below this
    static SUDDEN_STOP_WINDOW_MS  = 3000; // 3 seconds
    static COLLISION_RADIUS_M     = 5;   // meters
    static COLLISION_TIME_MS      = 2000; // simultaneous within 2 seconds
    static ERRATIC_HEADING_DEG    = 120; // degrees change in short window

    // ══════════════════════════════════════════════════════════════════════
    //  DETECTION ALGORITHMS  (called from integration layer or AI service)
    // ══════════════════════════════════════════════════════════════════════

    /**
     * Analyse a stream of recent GPS points for a single vehicle and detect
     * sudden-stop or unusual-motion patterns.
     *
     * @param {string}   vehicleId  — UUID of the vehicle
     * @param {{ latitude: number, longitude: number, speed: number, heading: number, timestamp: string }[]} points
     * @returns {{ detected: boolean, type?: string, severity?: string, data?: object }}
     */
    analyseVehicleTelemetry(vehicleId, points) {
        if (!points || points.length < 2) return { detected: false };

        // Sort chronologically
        const sorted = [...points].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        // 1. Sudden stop detection
        for (let i = 1; i < sorted.length; i++) {
            const prev = sorted[i - 1];
            const curr = sorted[i];
            const dt = new Date(curr.timestamp) - new Date(prev.timestamp);

            if (
                dt <= AccidentsService.SUDDEN_STOP_WINDOW_MS &&
                prev.speed >= AccidentsService.SUDDEN_STOP_SPEED_FROM &&
                curr.speed <= AccidentsService.SUDDEN_STOP_SPEED_TO
            ) {
                return {
                    detected: true,
                    type: 'sudden_stop',
                    severity: prev.speed > 60 ? 'critical' : 'high',
                    data: {
                        vehicleId,
                        speedBefore: prev.speed,
                        speedAfter: curr.speed,
                        decelerationWindow: dt,
                        location: { latitude: curr.latitude, longitude: curr.longitude },
                        timestamp: curr.timestamp,
                    },
                };
            }
        }

        // 2. Unusual motion (erratic heading)
        if (sorted.length >= 3) {
            for (let i = 2; i < sorted.length; i++) {
                const h1 = sorted[i - 2].heading ?? 0;
                const h2 = sorted[i - 1].heading ?? 0;
                const h3 = sorted[i].heading ?? 0;
                const delta1 = Math.abs(((h2 - h1 + 540) % 360) - 180);
                const delta2 = Math.abs(((h3 - h2 + 540) % 360) - 180);

                if (delta1 + delta2 >= AccidentsService.ERRATIC_HEADING_DEG && sorted[i].speed > 10) {
                    return {
                        detected: true,
                        type: 'unusual_motion',
                        severity: 'high',
                        data: {
                            vehicleId,
                            headingChanges: [delta1, delta2],
                            speed: sorted[i].speed,
                            location: { latitude: sorted[i].latitude, longitude: sorted[i].longitude },
                            timestamp: sorted[i].timestamp,
                        },
                    };
                }
            }
        }

        return { detected: false };
    }

    /**
     * Detect potential collisions between two vehicles whose GPS points are
     * within COLLISION_RADIUS_M of each other at approximately the same time.
     *
     * @param {{ vehicleId: string, latitude: number, longitude: number, speed: number, timestamp: string }[]} pointsA
     * @param {{ vehicleId: string, latitude: number, longitude: number, speed: number, timestamp: string }[]} pointsB
     */
    detectCollision(pointsA, pointsB) {
        for (const a of pointsA) {
            for (const b of pointsB) {
                const timeDiff = Math.abs(new Date(a.timestamp) - new Date(b.timestamp));
                if (timeDiff > AccidentsService.COLLISION_TIME_MS) continue;

                const dist = this._haversineMeters(a.latitude, a.longitude, b.latitude, b.longitude);
                if (dist <= AccidentsService.COLLISION_RADIUS_M) {
                    return {
                        detected: true,
                        type: 'collision',
                        severity: 'critical',
                        data: {
                            vehicleA: { vehicleId: a.vehicleId, speed: a.speed },
                            vehicleB: { vehicleId: b.vehicleId, speed: b.speed },
                            distance: dist,
                            location: { latitude: (a.latitude + b.latitude) / 2, longitude: (a.longitude + b.longitude) / 2 },
                            timestamp: a.timestamp,
                        },
                    };
                }
            }
        }
        return { detected: false };
    }

    // ══════════════════════════════════════════════════════════════════════
    //  CREATE ACCIDENT  (record + alert + notifications)
    // ══════════════════════════════════════════════════════════════════════

    async create(input, createdBy) {
        const id = (0, uuid_1.v4)();
        const vehicleIds = input.vehicleIds || [];

        const result = await connection_1.db.query(
            `INSERT INTO accidents
                (id, detection_type, severity, status, latitude, longitude,
                 description, evidence_url, vehicle_ids, detection_data,
                 created_at, updated_at)
             VALUES ($1, $2, $3, 'detected', $4, $5, $6, $7, $8, $9, NOW(), NOW())
             RETURNING *`,
            [
                id,
                input.detectionType,
                input.severity || 'high',
                input.latitude,
                input.longitude,
                input.description || `Accident detected: ${input.detectionType}`,
                input.evidenceUrl || null,
                vehicleIds,
                JSON.stringify(input.detectionData || {}),
            ]
        );

        const accident = result.rows[0];

        // 1. Create a critical alert linked to this accident
        let alert = null;
        try {
            alert = await alerts_service_1.alertsService.create({
                type: 'accident',
                priority: input.severity === 'critical' ? 'critical' : 'high',
                title: `Accident Detected: ${input.detectionType.replace(/_/g, ' ')}`,
                description: input.description || `Automatic accident detection (${input.detectionType})`,
                latitude: input.latitude,
                longitude: input.longitude,
                radius: 200,
            }, createdBy);

            // Link alert to accident
            await connection_1.db.query('UPDATE accidents SET alert_id = $1 WHERE id = $2', [alert.id, id]);
            accident.alert_id = alert.id;
        } catch (err) {
            logger_1.logger.error('Failed to create accident alert', { accidentId: id, err: err.message });
        }

        // 2. Notify traffic police (via WebSocket + push/SMS)
        this._notifyPolice(accident).catch(err => {
            logger_1.logger.error('Police notification failed', { accidentId: id, err: err.message });
        });

        // 3. Notify nearby hospitals
        this._notifyHospitals(accident).catch(err => {
            logger_1.logger.error('Hospital notification failed', { accidentId: id, err: err.message });
        });

        // 4. Publish for real-time WebSocket broadcast
        await redis_1.redis.publish('accidents:new', JSON.stringify(accident));

        // 5. Audit log
        audit_service_1.auditService.log({
            userId: createdBy,
            action: 'accident_detected',
            entityType: 'accident',
            entityId: id,
            newValues: { detectionType: input.detectionType, severity: input.severity, latitude: input.latitude, longitude: input.longitude },
        }).catch(() => {});

        logger_1.logger.warn('ACCIDENT DETECTED', {
            accidentId: id,
            type: input.detectionType,
            severity: input.severity,
            lat: input.latitude,
            lng: input.longitude,
            vehicles: vehicleIds.length,
        });

        return accident;
    }

    // ══════════════════════════════════════════════════════════════════════
    //  CRUD
    // ══════════════════════════════════════════════════════════════════════

    async findAll(query) {
        const { page, limit, status, severity, detectionType } = query;
        const offset = (page - 1) * limit;
        const conditions = [];
        const params = [];
        let idx = 1;

        if (status) { conditions.push(`a.status = $${idx++}`); params.push(status); }
        if (severity) { conditions.push(`a.severity = $${idx++}`); params.push(severity); }
        if (detectionType) { conditions.push(`a.detection_type = $${idx++}`); params.push(detectionType); }

        const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const countResult = await connection_1.db.query(`SELECT COUNT(*) FROM accidents a ${where}`, params);
        const total = parseInt(countResult.rows[0].count, 10);

        const dataResult = await connection_1.db.query(
            `SELECT a.*,
                    u.first_name || ' ' || u.last_name as responder_name
             FROM accidents a
             LEFT JOIN users u ON a.responded_by = u.id
             ${where}
             ORDER BY
               CASE a.severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
               a.created_at DESC
             LIMIT $${idx++} OFFSET $${idx}`,
            [...params, limit, offset]
        );

        return { data: dataResult.rows, total, page, limit };
    }

    async findById(id) {
        const result = await connection_1.db.query(
            `SELECT a.*,
                    u.first_name || ' ' || u.last_name as responder_name
             FROM accidents a
             LEFT JOIN users u ON a.responded_by = u.id
             WHERE a.id = $1`,
            [id]
        );
        if (result.rows.length === 0) throw new errors_1.NotFoundError('Accident');
        return result.rows[0];
    }

    async updateStatus(id, input, userId) {
        const existing = await this.findById(id);

        const fields = ['status = $1', 'updated_at = NOW()'];
        const values = [input.status];
        let idx = 2;

        if (input.status === 'dispatched' || input.status === 'resolved') {
            fields.push(`responded_by = $${idx++}`);
            values.push(userId);
            fields.push(`responded_at = NOW()`);
        }
        if (input.resolutionNotes) {
            fields.push(`resolution_notes = $${idx++}`);
            values.push(input.resolutionNotes);
        }

        values.push(id);
        const result = await connection_1.db.query(
            `UPDATE accidents SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
            values
        );

        const updated = result.rows[0];

        // Publish status change
        await redis_1.redis.publish('accidents:update', JSON.stringify(updated));

        audit_service_1.auditService.log({
            userId,
            action: `accident_${input.status}`,
            entityType: 'accident',
            entityId: id,
            oldValues: { status: existing.status },
            newValues: { status: input.status, resolutionNotes: input.resolutionNotes },
        }).catch(() => {});

        logger_1.logger.info('Accident status updated', { accidentId: id, status: input.status });
        return updated;
    }

    async getStats() {
        const result = await connection_1.db.query(
            `SELECT
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status = 'detected') as detected,
                COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed,
                COUNT(*) FILTER (WHERE status = 'dispatched') as dispatched,
                COUNT(*) FILTER (WHERE status = 'resolved') as resolved,
                COUNT(*) FILTER (WHERE status = 'false_alarm') as false_alarm,
                COUNT(*) FILTER (WHERE severity = 'critical') as critical,
                COUNT(*) FILTER (WHERE severity = 'high') as high,
                COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as last_24h
             FROM accidents`
        );
        return result.rows[0];
    }

    // ══════════════════════════════════════════════════════════════════════
    //  GPS-BASED DETECTION  (auto-analyse tracking points)
    // ══════════════════════════════════════════════════════════════════════

    /**
     * Called from the integration layer whenever tracking points arrive.
     * Fetches recent GPS history for the vehicle and runs detection algorithms.
     */
    async analyseFromTracking(vehicleId, latestPoint) {
        try {
            // Get last 10 tracking points for this vehicle (last 30 seconds)
            const history = await connection_1.db.query(
                `SELECT latitude, longitude, speed, heading, recorded_at as timestamp
                 FROM tracking_points
                 WHERE vehicle_id = $1 AND recorded_at > NOW() - INTERVAL '30 seconds'
                 ORDER BY recorded_at DESC
                 LIMIT 10`,
                [vehicleId]
            );

            const points = history.rows.map(r => ({
                ...r,
                latitude: parseFloat(r.latitude),
                longitude: parseFloat(r.longitude),
                speed: parseFloat(r.speed || 0),
                heading: parseFloat(r.heading || 0),
                timestamp: r.timestamp,
            }));

            const detection = this.analyseVehicleTelemetry(vehicleId, points);

            if (detection.detected) {
                // Check cooldown — don't spam alerts for same vehicle
                const cooldownKey = `accident:cooldown:${vehicleId}`;
                const hasCooldown = await redis_1.redis.get(cooldownKey);
                if (hasCooldown) return null;

                // Set 5-minute cooldown
                await redis_1.redis.set(cooldownKey, '1', 'EX', 300);

                const location = detection.data.location;
                const accident = await this.create({
                    detectionType: detection.type,
                    severity: detection.severity,
                    latitude: location.latitude,
                    longitude: location.longitude,
                    description: `Automatic detection: ${detection.type.replace(/_/g, ' ')} — vehicle speed ${detection.data.speedBefore || detection.data.speed || 0} km/h`,
                    vehicleIds: [vehicleId],
                    detectionData: detection.data,
                }, null); // system-created (no user)

                return accident;
            }
        } catch (err) {
            logger_1.logger.error('Accident analysis failed', { vehicleId, err: err.message });
        }
        return null;
    }

    // ══════════════════════════════════════════════════════════════════════
    //  PRIVATE HELPERS
    // ══════════════════════════════════════════════════════════════════════

    /** Notify all police officers via WebSocket + SMS/push */
    async _notifyPolice(accident) {
        // Mark police notified in DB
        await connection_1.db.query(
            'UPDATE accidents SET police_notified = true, police_notified_at = NOW() WHERE id = $1',
            [accident.id]
        );

        // WebSocket broadcast to all police
        await redis_1.redis.publish('accidents:police-alert', JSON.stringify({
            accidentId: accident.id,
            severity: accident.severity,
            detectionType: accident.detection_type,
            latitude: accident.latitude,
            longitude: accident.longitude,
            description: accident.description,
            timestamp: accident.created_at,
        }));

        // SMS/Push notifications to police officers
        const policeUsers = await connection_1.db.query(
            `SELECT id, email, phone_number, first_name, last_name
             FROM users WHERE role = 'police' AND is_active = true`
        );

        for (const officer of policeUsers.rows) {
            const msg = `🚨 ACCIDENT ALERT: ${accident.detection_type.replace(/_/g, ' ')} at GPS(${accident.latitude.toFixed(5)}, ${accident.longitude.toFixed(5)}). Severity: ${accident.severity}. ID: ${accident.id.slice(0, 8)}`;

            if (officer.phone_number) {
                notification_service_1.notificationService.sendSMS(officer.phone_number, msg).catch(() => {});
            }
            notification_service_1.notificationService.sendPush(officer.id, 'Accident Detected', msg).catch(() => {});
        }

        logger_1.logger.info('Police notified of accident', { accidentId: accident.id, officerCount: policeUsers.rows.length });
    }

    /** Notify nearby hospitals (configured via env or stored contacts) */
    async _notifyHospitals(accident) {
        await connection_1.db.query(
            'UPDATE accidents SET hospital_notified = true, hospital_notified_at = NOW() WHERE id = $1',
            [accident.id]
        );

        // Hospital contact numbers/emails from environment (comma-separated)
        const hospitalContacts = (process.env.HOSPITAL_CONTACTS || '').split(',').filter(Boolean);
        const hospitalEmails = (process.env.HOSPITAL_EMAILS || '').split(',').filter(Boolean);

        const msg = `TRAFFIC ACCIDENT ALERT: Type: ${accident.detection_type.replace(/_/g, ' ')}, Severity: ${accident.severity}, Location: GPS(${accident.latitude.toFixed(5)}, ${accident.longitude.toFixed(5)}). Immediate medical response may be required. Accident ID: ${accident.id.slice(0, 8)}`;

        for (const phone of hospitalContacts) {
            notification_service_1.notificationService.sendSMS(phone.trim(), msg).catch(() => {});
        }

        for (const email of hospitalEmails) {
            const htmlBody = `
                <h2>Traffic Accident Alert</h2>
                <p><strong>Type:</strong> ${accident.detection_type.replace(/_/g, ' ')}</p>
                <p><strong>Severity:</strong> ${accident.severity.toUpperCase()}</p>
                <p><strong>GPS Coordinates:</strong> ${accident.latitude.toFixed(6)}, ${accident.longitude.toFixed(6)}</p>
                <p><strong>Time:</strong> ${new Date(accident.created_at).toLocaleString()}</p>
                <p><strong>Description:</strong> ${accident.description}</p>
                <p>Immediate medical response may be required.</p>
            `;
            notification_service_1.notificationService.sendEmail(email.trim(), 'URGENT: Traffic Accident Alert', htmlBody).catch(() => {});
        }

        logger_1.logger.info('Hospitals notified of accident', {
            accidentId: accident.id,
            smsCount: hospitalContacts.length,
            emailCount: hospitalEmails.length,
        });
    }

    /** Haversine distance in meters */
    _haversineMeters(lat1, lon1, lat2, lon2) {
        const R = 6371000;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
}

exports.AccidentsService = AccidentsService;
exports.accidentsService = new AccidentsService();
