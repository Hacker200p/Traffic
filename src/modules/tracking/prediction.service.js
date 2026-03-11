"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.predictionService = exports.PredictionService = void 0;
const connection_1 = require("../../database/connection");
const errors_1 = require("../../common/errors");
const logger_1 = require("../../common/logger");

/**
 * Predictive Route Analysis Service
 *
 * For stolen / blacklisted vehicles:
 *   1. Fetch recent sighting history (camera detections + GPS tracking)
 *   2. Compute movement vector (average heading, speed, direction of travel)
 *   3. Project likely future positions along the current trajectory
 *   4. Find cameras & intersections near the projected path
 *   5. Rank interception points by likelihood and distance
 *   6. Estimate time-of-arrival at each intersection
 */
class PredictionService {

    static EARTH_RADIUS_KM = 6371;
    static DEFAULT_PROJECTION_MINUTES = 15;
    static MAX_SIGHTING_AGE_HOURS = 24;
    static CORRIDOR_WIDTH_KM = 1.5;          // search within 1.5 km of projected path
    static PROJECTION_STEP_KM = 0.5;         // generate a waypoint every 500 m
    static MAX_PROJECTION_KM = 20;            // don't project further than 20 km

    // ── Main prediction entry point ─────────────────────────────────────
    async predictRoute(vehicleId) {
        // 1. Verify vehicle exists and is blacklisted
        const veh = await connection_1.db.query(
            `SELECT id, plate_number, type, make, model, color, is_blacklisted, risk_score
             FROM vehicles WHERE id = $1`,
            [vehicleId]
        );
        if (veh.rows.length === 0) throw new errors_1.NotFoundError('Vehicle');
        const vehicle = veh.rows[0];

        // 2. Fetch recent sightings (last 24 h, ordered chronologically)
        const cutoff = new Date(Date.now() - PredictionService.MAX_SIGHTING_AGE_HOURS * 3600 * 1000).toISOString();
        const sightings = await connection_1.db.query(
            `SELECT vs.latitude, vs.longitude, vs.speed, vs.heading, vs.detected_at,
                    vs.camera_id, c.name AS camera_name, c.intersection_name
             FROM vehicle_sightings vs
             LEFT JOIN cameras c ON vs.camera_id = c.id
             WHERE vs.vehicle_id = $1 AND vs.detected_at >= $2
             ORDER BY vs.detected_at ASC`,
            [vehicleId, cutoff]
        );

        // Also grab GPS tracking points
        const gpsPoints = await connection_1.db.query(
            `SELECT tp.latitude, tp.longitude, tp.speed, tp.heading, tp.recorded_at AS detected_at
             FROM tracking_points tp
             WHERE tp.vehicle_id = $1 AND tp.recorded_at >= $2
             ORDER BY tp.recorded_at ASC`,
            [vehicleId, cutoff]
        );

        // Merge and sort chronologically
        const allPoints = [
            ...sightings.rows.map(r => ({ ...r, source: 'camera' })),
            ...gpsPoints.rows.map(r => ({ ...r, source: 'gps' })),
        ].sort((a, b) => new Date(a.detected_at) - new Date(b.detected_at));

        if (allPoints.length < 2) {
            return {
                vehicle: this._formatVehicle(vehicle),
                prediction: null,
                message: 'Insufficient data — need at least 2 sightings to predict route',
            };
        }

        // 3. Compute movement vector from the last N points
        const movementVector = this._computeMovementVector(allPoints);

        // 4. Project future positions along the trajectory
        const projectedPath = this._projectPath(movementVector);

        // 5. Find nearby cameras & intersections along the projected path
        const cameras = await this._findCamerasAlongPath(projectedPath);
        const intersections = await this._findIntersectionsAlongPath(projectedPath);

        // 6. Build interception suggestions (merge cameras + intersections, ranked)
        const interceptionPoints = this._buildInterceptionPoints(
            cameras, intersections, movementVector, projectedPath
        );

        // 7. Build the history trail for context
        const historyTrail = allPoints.map(p => ({
            latitude: parseFloat(p.latitude),
            longitude: parseFloat(p.longitude),
            speed: p.speed ? parseFloat(p.speed) : null,
            heading: p.heading ? parseFloat(p.heading) : null,
            timestamp: p.detected_at,
            source: p.source,
            cameraName: p.camera_name || null,
            intersection: p.intersection_name || null,
        }));

        logger_1.logger.info('Route prediction generated', {
            vehicleId,
            plate: vehicle.plate_number,
            pointsUsed: allPoints.length,
            interceptionCount: interceptionPoints.length,
        });

        return {
            vehicle: this._formatVehicle(vehicle),
            prediction: {
                movementVector,
                projectedPath,
                interceptionPoints,
                historyTrail,
                generatedAt: new Date().toISOString(),
            },
        };
    }

    // ── Compute movement vector from recent points ──────────────────────
    _computeMovementVector(points) {
        // Use the last 10 points (or fewer) for direction analysis
        const recent = points.slice(-10);
        const last = recent[recent.length - 1];
        const first = recent[0];

        // Average speed from points that have speed data
        const speeds = recent.filter(p => p.speed).map(p => parseFloat(p.speed));
        const avgSpeed = speeds.length > 0
            ? speeds.reduce((a, b) => a + b, 0) / speeds.length
            : 40; // default 40 km/h if no speed data

        // Compute bearing from first to last point
        const bearing = this._computeBearing(
            parseFloat(first.latitude), parseFloat(first.longitude),
            parseFloat(last.latitude), parseFloat(last.longitude)
        );

        // Heading from last point (if available), otherwise use computed bearing
        const headings = recent.filter(p => p.heading).map(p => parseFloat(p.heading));
        const avgHeading = headings.length > 0
            ? this._averageAngle(headings)
            : bearing;

        // Time span
        const timeSpanMs = new Date(last.detected_at) - new Date(first.detected_at);
        const timeSpanMin = timeSpanMs / 60000;

        return {
            lastPosition: {
                latitude: parseFloat(last.latitude),
                longitude: parseFloat(last.longitude),
            },
            lastSeen: last.detected_at,
            heading: Math.round(avgHeading * 10) / 10,
            bearing: Math.round(bearing * 10) / 10,
            avgSpeedKmh: Math.round(avgSpeed * 10) / 10,
            pointsAnalysed: recent.length,
            timeSpanMinutes: Math.round(timeSpanMin * 10) / 10,
        };
    }

    // ── Project future path from current position + heading ─────────────
    _projectPath(vector) {
        const { lastPosition, heading, avgSpeedKmh } = vector;
        const waypoints = [];
        const maxKm = Math.min(
            PredictionService.MAX_PROJECTION_KM,
            avgSpeedKmh * (PredictionService.DEFAULT_PROJECTION_MINUTES / 60)
        );

        for (let dist = PredictionService.PROJECTION_STEP_KM; dist <= maxKm; dist += PredictionService.PROJECTION_STEP_KM) {
            const point = this._destinationPoint(
                lastPosition.latitude, lastPosition.longitude, heading, dist
            );
            const etaMinutes = (dist / avgSpeedKmh) * 60;
            waypoints.push({
                latitude: Math.round(point.latitude * 1e6) / 1e6,
                longitude: Math.round(point.longitude * 1e6) / 1e6,
                distanceKm: Math.round(dist * 100) / 100,
                etaMinutes: Math.round(etaMinutes * 10) / 10,
            });
        }

        return waypoints;
    }

    // ── Find cameras near the projected path ────────────────────────────
    async _findCamerasAlongPath(projectedPath) {
        if (projectedPath.length === 0) return [];

        // Build a bounding box from the path with corridor width margin
        const lats = projectedPath.map(p => p.latitude);
        const lngs = projectedPath.map(p => p.longitude);
        const margin = PredictionService.CORRIDOR_WIDTH_KM / 111; // ~1 degree latitude = 111 km
        const minLat = Math.min(...lats) - margin;
        const maxLat = Math.max(...lats) + margin;
        const minLng = Math.min(...lngs) - margin;
        const maxLng = Math.max(...lngs) + margin;

        const result = await connection_1.db.query(
            `SELECT c.id, c.name, c.intersection_name, c.latitude, c.longitude,
                    c.camera_type, c.is_online,
                    ts.name AS signal_name
             FROM cameras c
             LEFT JOIN traffic_signals ts ON c.signal_id = ts.id
             WHERE c.latitude BETWEEN $1 AND $2
               AND c.longitude BETWEEN $3 AND $4`,
            [minLat, maxLat, minLng, maxLng]
        );

        // Filter: only cameras within corridor width of at least one projected waypoint
        const corridorM = PredictionService.CORRIDOR_WIDTH_KM * 1000;
        return result.rows.filter(cam => {
            const camLat = parseFloat(cam.latitude);
            const camLng = parseFloat(cam.longitude);
            return projectedPath.some(wp =>
                this._haversineM(wp.latitude, wp.longitude, camLat, camLng) <= corridorM
            );
        }).map(cam => ({
            id: cam.id,
            name: cam.name,
            intersection: cam.intersection_name,
            latitude: parseFloat(cam.latitude),
            longitude: parseFloat(cam.longitude),
            cameraType: cam.camera_type,
            isOnline: cam.is_online,
            signalName: cam.signal_name,
        }));
    }

    // ── Find traffic signal intersections near the projected path ────────
    async _findIntersectionsAlongPath(projectedPath) {
        if (projectedPath.length === 0) return [];

        const lats = projectedPath.map(p => p.latitude);
        const lngs = projectedPath.map(p => p.longitude);
        const margin = PredictionService.CORRIDOR_WIDTH_KM / 111;
        const minLat = Math.min(...lats) - margin;
        const maxLat = Math.max(...lats) + margin;
        const minLng = Math.min(...lngs) - margin;
        const maxLng = Math.max(...lngs) + margin;

        const result = await connection_1.db.query(
            `SELECT id, name, intersection_name, latitude, longitude, direction, status
             FROM traffic_signals
             WHERE latitude BETWEEN $1 AND $2
               AND longitude BETWEEN $3 AND $4`,
            [minLat, maxLat, minLng, maxLng]
        );

        const corridorM = PredictionService.CORRIDOR_WIDTH_KM * 1000;
        return result.rows.filter(sig => {
            const sLat = parseFloat(sig.latitude);
            const sLng = parseFloat(sig.longitude);
            return projectedPath.some(wp =>
                this._haversineM(wp.latitude, wp.longitude, sLat, sLng) <= corridorM
            );
        }).map(sig => ({
            id: sig.id,
            name: sig.name,
            intersection: sig.intersection_name,
            latitude: parseFloat(sig.latitude),
            longitude: parseFloat(sig.longitude),
            direction: sig.direction,
            status: sig.status,
        }));
    }

    // ── Build ranked interception points ─────────────────────────────────
    _buildInterceptionPoints(cameras, intersections, vector, projectedPath) {
        const points = [];

        // Add cameras as interception candidates
        for (const cam of cameras) {
            const distFromVehicle = this._haversineKm(
                vector.lastPosition.latitude, vector.lastPosition.longitude,
                cam.latitude, cam.longitude
            );
            // ETA based on average speed
            const etaMinutes = vector.avgSpeedKmh > 0
                ? (distFromVehicle / vector.avgSpeedKmh) * 60
                : null;

            points.push({
                type: 'camera',
                id: cam.id,
                name: cam.name,
                intersection: cam.intersection,
                latitude: cam.latitude,
                longitude: cam.longitude,
                distanceKm: Math.round(distFromVehicle * 100) / 100,
                etaMinutes: etaMinutes ? Math.round(etaMinutes * 10) / 10 : null,
                isOnline: cam.isOnline,
                cameraType: cam.cameraType,
                confidence: this._computeConfidence(cam, vector, projectedPath),
            });
        }

        // Add signal intersections as interception candidates
        for (const sig of intersections) {
            const distFromVehicle = this._haversineKm(
                vector.lastPosition.latitude, vector.lastPosition.longitude,
                sig.latitude, sig.longitude
            );
            const etaMinutes = vector.avgSpeedKmh > 0
                ? (distFromVehicle / vector.avgSpeedKmh) * 60
                : null;

            // Skip if already covered by a camera at the same intersection
            const alreadyCovered = points.some(p =>
                p.intersection && p.intersection === sig.intersection
            );
            if (alreadyCovered) continue;

            points.push({
                type: 'intersection',
                id: sig.id,
                name: sig.name,
                intersection: sig.intersection,
                latitude: sig.latitude,
                longitude: sig.longitude,
                distanceKm: Math.round(distFromVehicle * 100) / 100,
                etaMinutes: etaMinutes ? Math.round(etaMinutes * 10) / 10 : null,
                direction: sig.direction,
                confidence: this._computeConfidence(sig, vector, projectedPath),
            });
        }

        // Sort by confidence descending, then distance ascending
        points.sort((a, b) => b.confidence - a.confidence || a.distanceKm - b.distanceKm);

        return points;
    }

    // ── Confidence scoring ──────────────────────────────────────────────
    _computeConfidence(point, vector, projectedPath) {
        // Find closest projected waypoint
        let minDist = Infinity;
        for (const wp of projectedPath) {
            const d = this._haversineKm(wp.latitude, wp.longitude, point.latitude, point.longitude);
            if (d < minDist) minDist = d;
        }

        // Confidence: 100% if directly on path, decreasing with distance
        // Falls to 0 at corridor boundary
        const maxDist = PredictionService.CORRIDOR_WIDTH_KM;
        const confidence = Math.max(0, 1 - (minDist / maxDist));
        return Math.round(confidence * 100);
    }

    // ── Geo utilities ───────────────────────────────────────────────────
    _haversineKm(lat1, lng1, lat2, lng2) {
        const R = PredictionService.EARTH_RADIUS_KM;
        const dLat = this._toRad(lat2 - lat1);
        const dLng = this._toRad(lng2 - lng1);
        const a = Math.sin(dLat / 2) ** 2
            + Math.cos(this._toRad(lat1)) * Math.cos(this._toRad(lat2))
            * Math.sin(dLng / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    _haversineM(lat1, lng1, lat2, lng2) {
        return this._haversineKm(lat1, lng1, lat2, lng2) * 1000;
    }

    _computeBearing(lat1, lng1, lat2, lng2) {
        const dLng = this._toRad(lng2 - lng1);
        const y = Math.sin(dLng) * Math.cos(this._toRad(lat2));
        const x = Math.cos(this._toRad(lat1)) * Math.sin(this._toRad(lat2))
            - Math.sin(this._toRad(lat1)) * Math.cos(this._toRad(lat2)) * Math.cos(dLng);
        return (this._toDeg(Math.atan2(y, x)) + 360) % 360;
    }

    _destinationPoint(lat, lng, bearingDeg, distKm) {
        const R = PredictionService.EARTH_RADIUS_KM;
        const d = distKm / R;
        const brng = this._toRad(bearingDeg);
        const lat1 = this._toRad(lat);
        const lng1 = this._toRad(lng);

        const lat2 = Math.asin(
            Math.sin(lat1) * Math.cos(d)
            + Math.cos(lat1) * Math.sin(d) * Math.cos(brng)
        );
        const lng2 = lng1 + Math.atan2(
            Math.sin(brng) * Math.sin(d) * Math.cos(lat1),
            Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
        );

        return { latitude: this._toDeg(lat2), longitude: this._toDeg(lng2) };
    }

    _averageAngle(angles) {
        let sinSum = 0, cosSum = 0;
        for (const a of angles) {
            sinSum += Math.sin(this._toRad(a));
            cosSum += Math.cos(this._toRad(a));
        }
        return (this._toDeg(Math.atan2(sinSum / angles.length, cosSum / angles.length)) + 360) % 360;
    }

    _toRad(deg) { return deg * Math.PI / 180; }
    _toDeg(rad) { return rad * 180 / Math.PI; }

    _formatVehicle(v) {
        return {
            id: v.id,
            plateNumber: v.plate_number,
            type: v.type,
            make: v.make,
            model: v.model,
            color: v.color,
            isBlacklisted: v.is_blacklisted,
            riskScore: v.risk_score,
        };
    }
}

exports.PredictionService = PredictionService;
exports.predictionService = new PredictionService();
