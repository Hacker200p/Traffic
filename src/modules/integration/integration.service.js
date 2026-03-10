"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.integrationService = exports.IntegrationService = void 0;
const uuid_1 = require("uuid");
const connection_1 = require("../../database/connection");
const redis_1 = require("../../config/redis");
const logger_1 = require("../../common/logger");
const tracking_service_1 = require("../tracking/tracking.service");
const movement_service_1 = require("../tracking/movement.service");
const alerts_service_1 = require("../alerts/alerts.service");
const signals_service_1 = require("../traffic-signals/signals.service");
const restricted_zones_service_1 = require("../restricted-zones/restricted-zones.service");
/**
 * Integration service — transforms AI microservice payloads into the shapes
 * expected by domain services, handles vehicle auto-lookup / auto-creation,
 * and delegates to the existing service layer for DB writes + Redis publish.
 */
class IntegrationService {
    // ── Violations ──────────────────────────────────────────────────────────
    async ingestViolation(input) {
        // Try to resolve vehicleId from plate text
        let vehicleId = null;
        if (input.plate_text) {
            vehicleId = await this.resolveVehicleByPlate(input.plate_text);
        }
        // Insert violation directly (supports nullable vehicle_id after migration)
        const id = (0, uuid_1.v4)();
        const result = await connection_1.db.query(`INSERT INTO violations
        (id, vehicle_id, type, description, latitude, longitude, speed, speed_limit,
         evidence_url, signal_id, severity, fine_amount, status, created_at, updated_at)
       VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8,
         $9, $10, $11, $12, 'pending', NOW(), NOW())
       RETURNING id, vehicle_id, type, description,
                 longitude, latitude,
                 speed, speed_limit, evidence_url, signal_id,
                 severity, fine_amount, status, created_at`, [
            id,
            vehicleId,
            input.type,
            input.description || '',
            input.latitude,
            input.longitude,
            input.speed ?? null,
            input.speed_limit ?? null,
            input.evidence_url ?? null,
            input.signal_id ?? null,
            input.severity,
            input.fine_amount ?? null,
        ]);
        const violation = result.rows[0];
        // Enrich with plate_text for downstream consumers
        if (input.plate_text) {
            violation.plate_text = input.plate_text;
        }
        // Publish for real-time WebSocket broadcast
        await redis_1.redis.publish('violations:new', JSON.stringify(violation));
        // Auto-create an alert for all detected violations
        try {
            await this.autoCreateViolationAlert(violation, input);
        }
        catch (err) {
            logger_1.logger.warn('Failed to auto-create alert for violation', { violationId: id, err });
        }
        logger_1.logger.info('AI violation ingested', {
            violationId: id,
            type: input.type,
            plate: input.plate_text ?? 'unknown',
            vehicleId,
        });
        return violation;
    }
    // ── Tracking ────────────────────────────────────────────────────────────
    async ingestTracking(input) {
        const result = await tracking_service_1.trackingService.recordPoint({
            vehicleId: input.vehicle_id,
            latitude: input.latitude,
            longitude: input.longitude,
            speed: input.speed,
            heading: input.heading,
            accuracy: input.accuracy,
            timestamp: input.timestamp,
        });

        // Check restricted zone entry for GPS tracking points
        if (input.latitude && input.longitude) {
            this._checkRestrictedZones({
                latitude: input.latitude,
                longitude: input.longitude,
                plate_text: null,
                vehicle_id: input.vehicle_id,
            }).catch(err => {
                logger_1.logger.error('Restricted zone check on tracking failed', { err: err.message });
            });
        }

        return result;
    }
    async ingestTrackingBatch(input) {
        return tracking_service_1.trackingService.recordBatch({
            points: input.points.map((p) => ({
                vehicleId: p.vehicle_id,
                latitude: p.latitude,
                longitude: p.longitude,
                speed: p.speed,
                heading: p.heading,
                accuracy: p.accuracy,
                timestamp: p.timestamp,
            })),
        });
    }
    // ── Alerts ──────────────────────────────────────────────────────────────
    async ingestAlert(input, systemUserId) {
        return alerts_service_1.alertsService.create({
            type: input.type,
            priority: input.priority,
            title: input.title,
            description: input.description || '',
            latitude: input.latitude,
            longitude: input.longitude,
            radius: input.radius,
            vehicleId: input.vehicle_id,
            signalId: input.signal_id,
        }, systemUserId);
    }
    // ── Signal State ────────────────────────────────────────────────────────
    async ingestSignalState(signalId, input, systemUserId) {
        return signals_service_1.signalsService.changeState(signalId, {
            state: input.state,
            reason: input.reason || `AI auto-adjustment (duration=${input.duration}s)`,
        }, systemUserId);
    }
    // ── Helpers ─────────────────────────────────────────────────────────────
    /**
     * Look up vehicle by plate number. If found return id.
     * If not found, auto-register it as an "unknown" vehicle and return its id.
     */
    async resolveVehicleByPlate(plateText, context) {
        // Try existing
        const existing = await connection_1.db.query('SELECT id, is_blacklisted FROM vehicles WHERE plate_number = $1', [plateText]);
        if (existing.rows.length > 0) {
            const vehicle = existing.rows[0];
            // If blacklisted, fire a critical alert
            if (vehicle.is_blacklisted) {
                logger_1.logger.warn('Blacklisted vehicle detected by AI', { plateNumber: plateText, vehicleId: vehicle.id });
                this._fireBlacklistAlert(vehicle.id, plateText, context).catch(err => {
                    logger_1.logger.error('Failed to create blacklist alert', { err: err.message });
                });
            }
            return vehicle.id;
        }
        // Auto-register unknown vehicle
        const id = (0, uuid_1.v4)();
        await connection_1.db.query(`INSERT INTO vehicles
        (id, plate_number, type, is_blacklisted, notes, created_at, updated_at)
       VALUES ($1, $2, 'unknown', false, 'Auto-registered by AI detection', NOW(), NOW())`, [id, plateText]);
        logger_1.logger.info('Auto-registered vehicle from AI detection', { vehicleId: id, plateNumber: plateText });
        return id;
    }
    // ── Emergency Priority ────────────────────────────────────────────────────
    /**
     * Look up a vehicle by plate and, if it is an emergency vehicle,
     * override the given signal to green and broadcast an alert.
     */
    async handleEmergencyPriority(input, systemUserId) {
        const { plate_text, signal_id, camera_id, latitude, longitude } = input;

        // Resolve vehicle from plate
        const vehicle = await connection_1.db.query(
            'SELECT id, type, plate_number, owner_name FROM vehicles WHERE plate_number = $1',
            [plate_text]
        );

        if (vehicle.rows.length === 0) {
            return { emergency: false, reason: 'Vehicle not found' };
        }

        const v = vehicle.rows[0];
        if (v.type !== 'emergency') {
            return { emergency: false, vehicleId: v.id, vehicleType: v.type };
        }

        logger_1.logger.warn('Emergency vehicle detected — triggering priority override', {
            plateNumber: plate_text,
            vehicleId: v.id,
            signalId: signal_id,
        });

        // Override signal to green if signal_id is provided
        let signalResult = null;
        if (signal_id) {
            const overrideUntil = new Date(Date.now() + 120_000).toISOString(); // 2 min override
            signalResult = await signals_service_1.signalsService.changeState(signal_id, {
                state: 'green',
                reason: `Emergency vehicle priority: plate ${plate_text}`,
                overrideUntil,
            }, systemUserId);
        }

        // Create emergency alert
        try {
            await alerts_service_1.alertsService.create({
                type: 'emergency',
                priority: 'critical',
                title: `Emergency Vehicle Detected: ${plate_text}`,
                description: `Emergency vehicle (plate: ${plate_text}) detected at camera ${camera_id || 'unknown'}. Signal override activated.`,
                latitude: latitude || 0,
                longitude: longitude || 0,
                vehicleId: v.id,
                signalId: signal_id,
            }, systemUserId);
        } catch (err) {
            logger_1.logger.warn('Failed to create emergency alert', { err });
        }

        return {
            emergency: true,
            vehicleId: v.id,
            plateNumber: plate_text,
            signalOverride: signalResult ? true : false,
            signalId: signal_id,
        };
    }
    // ── Vehicle Lookup ──────────────────────────────────────────────────────
    async lookupVehicleByPlate(plateText) {
        const result = await connection_1.db.query(
            'SELECT id, plate_number, type, owner_name, is_blacklisted FROM vehicles WHERE plate_number = $1',
            [plateText]
        );
        if (result.rows.length === 0) {
            return null;
        }
        return result.rows[0];
    }
    /**
     * Auto-create a high-priority alert when a severe violation is detected.
     */
    async autoCreateViolationAlert(violation, input) {
        const alertPayload = {
            type: 'violation',
            priority: input.severity,
            title: `${input.severity.toUpperCase()} Violation: ${input.type.replace(/_/g, ' ')}`,
            description: input.description || `AI-detected ${input.type} violation`,
            latitude: input.latitude,
            longitude: input.longitude,
            signalId: input.signal_id,
        };
        await alerts_service_1.alertsService.create(alertPayload, violation.created_by || 'system');
    }
    // ── Vehicle Sighting (plate detection at camera) ──────────────────────
    async ingestSighting(input) {
        const sighting = await movement_service_1.movementService.ingestSighting(input);

        // Check if this vehicle is on the blacklist (lost/stolen)
        if (input.plate_text) {
            const veh = await connection_1.db.query(
                'SELECT id, is_blacklisted FROM vehicles WHERE plate_number = $1',
                [input.plate_text]
            );
            if (veh.rows.length > 0 && veh.rows[0].is_blacklisted) {
                this._fireBlacklistAlert(veh.rows[0].id, input.plate_text, {
                    latitude: input.latitude,
                    longitude: input.longitude,
                    camera_id: input.camera_id,
                }).catch(err => {
                    logger_1.logger.error('Failed to create blacklist alert from sighting', { err: err.message });
                });
            }
        }

        // Check if vehicle entered a restricted zone
        if (input.latitude && input.longitude) {
            this._checkRestrictedZones(input).catch(err => {
                logger_1.logger.error('Restricted zone check failed', { err: err.message });
            });
        }

        return sighting;
    }

    // ── Blacklist alert helper ───────────────────────────────────────────
    async _fireBlacklistAlert(vehicleId, plateText, context) {
        const lat = context?.latitude || 0;
        const lng = context?.longitude || 0;
        const cameraId = context?.camera_id;

        // Avoid duplicate alerts: don't fire if one was created in the last 5 minutes
        const recent = await connection_1.db.query(
            `SELECT id FROM alerts
             WHERE type = 'blacklisted_vehicle' AND vehicle_id = $1
               AND created_at > NOW() - INTERVAL '5 minutes'
             LIMIT 1`,
            [vehicleId]
        );
        if (recent.rows.length > 0) return;

        const cameraLabel = cameraId || 'unknown camera';
        await alerts_service_1.alertsService.create({
            type: 'blacklisted_vehicle',
            priority: 'critical',
            title: `Stolen Vehicle Detected: ${plateText}`,
            description: `Lost/stolen vehicle (plate: ${plateText}) detected at camera ${cameraLabel}. Location: ${lat.toFixed(5)}, ${lng.toFixed(5)}.`,
            latitude: lat,
            longitude: lng,
            vehicleId,
        }, 'system');

        // Also broadcast a dedicated Redis event for real-time UI
        await redis_1.redis.publish('vehicle:blacklisted:spotted', JSON.stringify({
            vehicleId,
            plateNumber: plateText,
            latitude: lat,
            longitude: lng,
            cameraId: cameraId || null,
            detectedAt: new Date().toISOString(),
        }));

        logger_1.logger.warn('Blacklist alert created for stolen vehicle', { vehicleId, plateText, cameraId });
    }

    // ── Restricted zone entry check ─────────────────────────────────────
    async _checkRestrictedZones(input) {
        const zones = await restricted_zones_service_1.restrictedZoneService.findZonesContaining(
            input.latitude, input.longitude
        );
        if (zones.length === 0) return;

        // Resolve vehicle if possible
        let vehicleId = input.vehicle_id || null;
        if (!vehicleId && input.plate_text) {
            const veh = await connection_1.db.query(
                'SELECT id FROM vehicles WHERE plate_number = $1',
                [input.plate_text]
            );
            if (veh.rows.length > 0) vehicleId = veh.rows[0].id;
        }

        for (const zone of zones) {
            // Deduplicate: skip if an alert was created in the last 10 minutes for this zone + vehicle
            const recent = await connection_1.db.query(
                `SELECT id FROM alerts
                 WHERE type = 'restricted_zone'
                   AND description LIKE $1
                   AND ($2::uuid IS NULL OR vehicle_id = $2)
                   AND created_at > NOW() - INTERVAL '10 minutes'
                 LIMIT 1`,
                [`%zone ${zone.id}%`, vehicleId]
            );
            if (recent.rows.length > 0) continue;

            const plateLabel = input.plate_text || 'unknown';
            await alerts_service_1.alertsService.create({
                type: 'restricted_zone',
                priority: 'high',
                title: `Vehicle Entered Restricted Zone: ${zone.name}`,
                description: `Vehicle (plate: ${plateLabel}) detected inside restricted zone ${zone.name} (zone ${zone.id}). Zone type: ${zone.zone_type}.`,
                latitude: input.latitude,
                longitude: input.longitude,
                radius: parseFloat(zone.radius),
                vehicleId,
            }, 'system');

            logger_1.logger.warn('Restricted zone entry detected', {
                plate: input.plate_text,
                zoneName: zone.name,
                zoneId: zone.id,
            });
        }
    }
}
exports.IntegrationService = IntegrationService;
exports.integrationService = new IntegrationService();
