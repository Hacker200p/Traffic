"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsService = void 0;
const connection_1 = require("../../database/connection");

class AnalyticsService {
    async getSummary() {
        const [vehicles, violations, signals, tracking, cameras] = await Promise.all([
            connection_1.db.query(`
                SELECT
                    COUNT(*) as total_vehicles,
                    COUNT(*) FILTER (WHERE is_blacklisted = true) as blacklisted
                FROM vehicles
            `),
            connection_1.db.query(`
                SELECT
                    COUNT(*) as total_violations,
                    COUNT(*) FILTER (WHERE status = 'pending') as pending_violations,
                    COUNT(*) FILTER (WHERE severity = 'critical') as critical_violations,
                    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as today_violations
                FROM violations
            `),
            connection_1.db.query(`
                SELECT
                    COUNT(*) as total_signals,
                    COUNT(*) FILTER (WHERE is_online = true) as online_signals
                FROM traffic_signals
            `),
            connection_1.db.query(`
                SELECT COUNT(DISTINCT vehicle_id) as active_vehicles
                FROM tracking_points
                WHERE recorded_at >= NOW() - INTERVAL '1 hour'
            `),
            connection_1.db.query(`
                SELECT COUNT(*) as total_cameras
                FROM cameras
            `).catch(() => ({ rows: [{ total_cameras: 0 }] })),
        ]);
        return {
            vehicles: vehicles.rows[0],
            violations: violations.rows[0],
            signals: signals.rows[0],
            tracking: tracking.rows[0],
            cameras: cameras.rows[0],
        };
    }

    async getTrafficFlow(query) {
        const interval = query.interval || 'hour';
        const hours = parseInt(query.hours || '24', 10);
        const safeInterval = ['minute', 'hour', 'day', 'week', 'month'].includes(interval)
            ? interval
            : 'hour';

        const result = await connection_1.db.query(`
            SELECT
                date_trunc($1, recorded_at) as time_bucket,
                COUNT(*) as point_count,
                COUNT(DISTINCT vehicle_id) as vehicle_count,
                ROUND(AVG(speed)::numeric, 2) as avg_speed
            FROM tracking_points
            WHERE recorded_at >= NOW() - make_interval(hours => $2)
            GROUP BY time_bucket
            ORDER BY time_bucket
        `, [safeInterval, hours]);

        return result.rows;
    }

    async getViolationAnalytics(query) {
        const hours = parseInt(query.hours || '168', 10); // default 7 days
        const result = await connection_1.db.query(`
            SELECT
                date_trunc('day', created_at) as date,
                type,
                severity,
                COUNT(*) as count
            FROM violations
            WHERE created_at >= NOW() - make_interval(hours => $1)
            GROUP BY date, type, severity
            ORDER BY date
        `, [hours]);

        return result.rows;
    }

    async getDensityTimeline(query) {
        const hours = parseInt(query.hours || '24', 10);
        const result = await connection_1.db.query(`
            SELECT
                date_trunc('hour', recorded_at) as time_bucket,
                COUNT(*) as tracking_points,
                COUNT(DISTINCT vehicle_id) as unique_vehicles
            FROM tracking_points
            WHERE recorded_at >= NOW() - make_interval(hours => $1)
            GROUP BY time_bucket
            ORDER BY time_bucket
        `, [hours]);

        return result.rows;
    }

    async getVehicleCountTimeline(query) {
        const hours = parseInt(query.hours || '24', 10);
        const result = await connection_1.db.query(`
            SELECT
                date_trunc('hour', recorded_at) as time_bucket,
                COUNT(DISTINCT vehicle_id) as vehicle_count
            FROM tracking_points
            WHERE recorded_at >= NOW() - make_interval(hours => $1)
            GROUP BY time_bucket
            ORDER BY time_bucket
        `, [hours]);

        return result.rows;
    }

    async getSpeedTimeline(query) {
        const hours = parseInt(query.hours || '24', 10);
        const result = await connection_1.db.query(`
            SELECT
                date_trunc('hour', recorded_at) as time_bucket,
                ROUND(AVG(speed)::numeric, 2) as avg_speed,
                ROUND(MAX(speed)::numeric, 2) as max_speed,
                ROUND(MIN(speed)::numeric, 2) as min_speed
            FROM tracking_points
            WHERE recorded_at >= NOW() - make_interval(hours => $1)
              AND speed IS NOT NULL AND speed > 0
            GROUP BY time_bucket
            ORDER BY time_bucket
        `, [hours]);

        return result.rows;
    }

    /**
     * Returns spatial density zones by bucketing recent tracking points
     * into grid cells.  Each zone has a bounding box, vehicle count,
     * average speed, and a density level (low / medium / high / critical).
     */
    async getDensityZones(query) {
        const minutes = parseInt(query.minutes || '30', 10);
        // Grid size in degrees (~0.005 ≈ 500m at equator)
        const gridSize = parseFloat(query.gridSize || '0.005');

        const result = await connection_1.db.query(`
            SELECT
                FLOOR(latitude  / $2) * $2   AS lat_cell,
                FLOOR(longitude / $2) * $2   AS lng_cell,
                COUNT(*)                     AS point_count,
                COUNT(DISTINCT vehicle_id)   AS vehicle_count,
                ROUND(AVG(speed)::numeric,2) AS avg_speed
            FROM tracking_points
            WHERE recorded_at >= NOW() - make_interval(mins => $1)
              AND latitude IS NOT NULL AND longitude IS NOT NULL
            GROUP BY lat_cell, lng_cell
            ORDER BY vehicle_count DESC
            LIMIT 500
        `, [minutes, gridSize]);

        return result.rows.map(r => {
            const vc = parseInt(r.vehicle_count, 10);
            let level = 'low';
            if (vc >= 20) level = 'critical';
            else if (vc >= 10) level = 'high';
            else if (vc >= 4) level = 'medium';
            const lat = parseFloat(r.lat_cell);
            const lng = parseFloat(r.lng_cell);
            return {
                vehicleCount: vc,
                avgSpeed: parseFloat(r.avg_speed) || 0,
                level,
                occupancyRatio: Math.min(1, vc / 25),
                bounds: [
                    { latitude: lat, longitude: lng },
                    { latitude: lat + gridSize, longitude: lng + gridSize },
                ],
            };
        });
    }
}

exports.analyticsService = new AnalyticsService();
