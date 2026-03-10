"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.movementService = exports.MovementService = void 0;
const uuid_1 = require("uuid");
const connection_1 = require("../../database/connection");
const errors_1 = require("../../common/errors");
const logger_1 = require("../../common/logger");

class MovementService {
    // ── Camera CRUD ─────────────────────────────────────────────────────
    async createCamera(input) {
        const id = (0, uuid_1.v4)();
        const result = await connection_1.db.query(
            `INSERT INTO cameras (id, name, intersection_name, latitude, longitude, camera_type, stream_url, signal_id, is_online, created_at, updated_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW())
             RETURNING *`,
            [id, input.name, input.intersectionName, input.latitude, input.longitude, input.cameraType || 'fixed', input.streamUrl, input.signalId, input.isOnline ?? true]
        );
        return result.rows[0];
    }

    async findAllCameras() {
        const result = await connection_1.db.query(
            `SELECT c.*, ts.name as signal_name
             FROM cameras c
             LEFT JOIN traffic_signals ts ON c.signal_id = ts.id
             ORDER BY c.name`
        );
        return result.rows;
    }

    async findCameraById(id) {
        const result = await connection_1.db.query('SELECT * FROM cameras WHERE id = $1', [id]);
        if (result.rows.length === 0) throw new errors_1.NotFoundError('Camera');
        return result.rows[0];
    }

    // ── Record a vehicle sighting (plate detection at a camera) ─────────
    async recordSighting(input) {
        const id = (0, uuid_1.v4)();
        const result = await connection_1.db.query(
            `INSERT INTO vehicle_sightings
             (id, vehicle_id, camera_id, plate_text, confidence, latitude, longitude, speed, heading, detected_at, created_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, COALESCE($10::timestamptz, NOW()), NOW())
             RETURNING *`,
            [id, input.vehicleId, input.cameraId, input.plateText, input.confidence, input.latitude, input.longitude, input.speed, input.heading, input.detectedAt]
        );
        logger_1.logger.info('Vehicle sighting recorded', { sightingId: id, plate: input.plateText, cameraId: input.cameraId });
        return result.rows[0];
    }

    // ── Vehicle Movement (the core feature) ─────────────────────────────
    /**
     * Given a plate number and time range, returns:
     * - route (ordered GPS points)
     * - timeline (events with camera names + timestamps)
     * - speedData (time→speed for graph)
     * - visitedCameras (unique cameras with first/last seen)
     */
    async getVehicleMovement(plateNumber, startDate, endDate) {
        // 1. Resolve vehicle
        const veh = await connection_1.db.query(
            'SELECT id, plate_number, type, make, model, color, owner_name FROM vehicles WHERE plate_number = $1',
            [plateNumber]
        );
        if (veh.rows.length === 0) throw new errors_1.NotFoundError('Vehicle');
        const vehicle = veh.rows[0];
        const vehicleId = vehicle.id;

        // 2. Build time conditions
        const conditions = ['vehicle_id = $1'];
        const params = [vehicleId];
        let idx = 2;
        if (startDate) { conditions.push(`detected_at >= $${idx++}`); params.push(startDate); }
        if (endDate) { conditions.push(`detected_at <= $${idx++}`); params.push(endDate); }
        const where = conditions.join(' AND ');

        // 3. Fetch sightings ordered by time
        const sightings = await connection_1.db.query(
            `SELECT vs.id, vs.camera_id, vs.plate_text, vs.confidence,
                    vs.latitude, vs.longitude, vs.speed, vs.heading, vs.detected_at,
                    c.name as camera_name, c.intersection_name, c.camera_type
             FROM vehicle_sightings vs
             LEFT JOIN cameras c ON vs.camera_id = c.id
             WHERE ${where}
             ORDER BY vs.detected_at ASC`,
            params
        );

        // 4. Also fetch tracking points in the same window
        const tpConditions = ['tp.vehicle_id = $1'];
        const tpParams = [vehicleId];
        let tpIdx = 2;
        if (startDate) { tpConditions.push(`tp.recorded_at >= $${tpIdx++}`); tpParams.push(startDate); }
        if (endDate) { tpConditions.push(`tp.recorded_at <= $${tpIdx++}`); tpParams.push(endDate); }
        const tpWhere = tpConditions.join(' AND ');

        const trackingPoints = await connection_1.db.query(
            `SELECT tp.latitude, tp.longitude, tp.speed, tp.heading, tp.recorded_at,
                    tp.camera_id, c.name as camera_name
             FROM tracking_points tp
             LEFT JOIN cameras c ON tp.camera_id = c.id
             WHERE ${tpWhere}
             ORDER BY tp.recorded_at ASC`,
            tpParams
        );

        // 5. Merge into a unified, chronological route
        const route = [];
        for (const s of sightings.rows) {
            route.push({
                latitude: s.latitude,
                longitude: s.longitude,
                speed: s.speed ? parseFloat(s.speed) : null,
                heading: s.heading ? parseFloat(s.heading) : null,
                timestamp: s.detected_at,
                source: 'camera',
                cameraId: s.camera_id,
                cameraName: s.camera_name,
            });
        }
        for (const tp of trackingPoints.rows) {
            route.push({
                latitude: tp.latitude,
                longitude: tp.longitude,
                speed: tp.speed ? parseFloat(tp.speed) : null,
                heading: tp.heading ? parseFloat(tp.heading) : null,
                timestamp: tp.recorded_at,
                source: tp.camera_id ? 'camera' : 'gps',
                cameraId: tp.camera_id,
                cameraName: tp.camera_name,
            });
        }
        // Sort chronologically and deduplicate close timestamps
        route.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        // 6. Build movement timeline (camera-based events)
        const timeline = sightings.rows.map(s => ({
            time: s.detected_at,
            cameraId: s.camera_id,
            cameraName: s.camera_name || 'Unknown Camera',
            intersection: s.intersection_name,
            speed: s.speed ? parseFloat(s.speed) : null,
            confidence: s.confidence ? parseFloat(s.confidence) : null,
        }));

        // 7. Build speed data for graphing
        const speedData = route
            .filter(p => p.speed != null)
            .map(p => ({
                time: p.timestamp,
                speed: p.speed,
            }));

        // 8. Aggregate visited cameras
        const cameraMap = new Map();
        for (const s of sightings.rows) {
            if (!s.camera_id) continue;
            const existing = cameraMap.get(s.camera_id);
            if (!existing) {
                cameraMap.set(s.camera_id, {
                    cameraId: s.camera_id,
                    cameraName: s.camera_name || 'Unknown',
                    intersection: s.intersection_name,
                    cameraType: s.camera_type,
                    latitude: s.latitude,
                    longitude: s.longitude,
                    firstSeen: s.detected_at,
                    lastSeen: s.detected_at,
                    count: 1,
                });
            } else {
                existing.lastSeen = s.detected_at;
                existing.count += 1;
            }
        }
        const visitedCameras = Array.from(cameraMap.values());

        return {
            vehicle,
            route,
            timeline,
            speedData,
            visitedCameras,
            totalSightings: sightings.rows.length,
            totalTrackingPoints: trackingPoints.rows.length,
        };
    }

    // ── Integration: ingest sighting from AI ────────────────────────────
    /**
     * Called by integration service when AI detects a plate at a camera.
     * Resolves vehicle and stores the sighting.
     */
    async ingestSighting(input) {
        // Resolve vehicle
        let vehicleId = null;
        if (input.plate_text) {
            const existing = await connection_1.db.query('SELECT id FROM vehicles WHERE plate_number = $1', [input.plate_text]);
            if (existing.rows.length > 0) {
                vehicleId = existing.rows[0].id;
            }
        }

        return this.recordSighting({
            vehicleId,
            cameraId: input.camera_id || null,
            plateText: input.plate_text,
            confidence: input.confidence,
            latitude: input.latitude,
            longitude: input.longitude,
            speed: input.speed || null,
            heading: input.heading || null,
            detectedAt: input.detected_at || null,
        });
    }

    // ── Last sighting per vehicle (for lost-vehicle page) ───────────────
    /**
     * Returns the most recent sighting for a vehicle (by vehicle_id).
     * Includes camera info if available.
     */
    async getLastSighting(vehicleId) {
        const result = await connection_1.db.query(
            `SELECT vs.id, vs.camera_id, vs.plate_text, vs.confidence,
                    vs.latitude, vs.longitude, vs.speed, vs.detected_at,
                    c.name as camera_name, c.intersection_name
             FROM vehicle_sightings vs
             LEFT JOIN cameras c ON vs.camera_id = c.id
             WHERE vs.vehicle_id = $1
             ORDER BY vs.detected_at DESC
             LIMIT 1`,
            [vehicleId]
        );
        return result.rows[0] || null;
    }

    /**
     * Returns most recent sightings for multiple vehicles at once.
     * Used by LostVehiclePage to show last-seen data for all blacklisted vehicles.
     */
    async getLastSightingsForVehicles(vehicleIds) {
        if (!vehicleIds.length) return [];
        const result = await connection_1.db.query(
            `SELECT DISTINCT ON (vs.vehicle_id)
                    vs.vehicle_id, vs.camera_id, vs.plate_text, vs.confidence,
                    vs.latitude, vs.longitude, vs.speed, vs.detected_at,
                    c.name as camera_name, c.intersection_name
             FROM vehicle_sightings vs
             LEFT JOIN cameras c ON vs.camera_id = c.id
             WHERE vs.vehicle_id = ANY($1)
             ORDER BY vs.vehicle_id, vs.detected_at DESC`,
            [vehicleIds]
        );
        return result.rows;
    }
}

exports.MovementService = MovementService;
exports.movementService = new MovementService();
