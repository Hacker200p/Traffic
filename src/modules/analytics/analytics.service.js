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
     * Peak traffic hours — identifies the busiest hours by day-of-week.
     */
    async getPeakTrafficHours(query) {
        const days = parseInt(query.days || '30', 10);
        const result = await connection_1.db.query(`
            SELECT
                EXTRACT(DOW FROM recorded_at)::int   AS day_of_week,
                EXTRACT(HOUR FROM recorded_at)::int  AS hour,
                COUNT(*)                             AS point_count,
                COUNT(DISTINCT vehicle_id)            AS vehicle_count,
                ROUND(AVG(speed)::numeric, 2)         AS avg_speed
            FROM tracking_points
            WHERE recorded_at >= NOW() - make_interval(days => $1)
            GROUP BY day_of_week, hour
            ORDER BY day_of_week, hour
        `, [days]);

        return result.rows.map(r => ({
            dayOfWeek: parseInt(r.day_of_week, 10),
            hour: parseInt(r.hour, 10),
            vehicleCount: parseInt(r.vehicle_count, 10),
            avgSpeed: parseFloat(r.avg_speed) || 0,
        }));
    }

    /**
     * Accident-prone zones — clusters alerts of type accident/congestion
     * into spatial grid cells to identify hotspots.
     */
    async getAccidentProneZones(query) {
        const days = parseInt(query.days || '90', 10);
        const gridSize = parseFloat(query.gridSize || '0.005');
        const types = ['accident', 'congestion'];
        const result = await connection_1.db.query(`
            SELECT
                FLOOR(latitude  / $3) * $3   AS lat_cell,
                FLOOR(longitude / $3) * $3   AS lng_cell,
                COUNT(*)                     AS incident_count,
                COUNT(*) FILTER (WHERE type = 'accident')   AS accident_count,
                COUNT(*) FILTER (WHERE type = 'congestion')  AS congestion_count,
                COUNT(*) FILTER (WHERE severity = 'critical' OR severity = 'high') AS severe_count
            FROM alerts
            WHERE created_at >= NOW() - make_interval(days => $1)
              AND latitude IS NOT NULL AND longitude IS NOT NULL
              AND type = ANY($2)
            GROUP BY lat_cell, lng_cell
            HAVING COUNT(*) >= 2
            ORDER BY incident_count DESC
            LIMIT 200
        `, [days, types, gridSize]);

        return result.rows.map(r => {
            const lat = parseFloat(r.lat_cell);
            const lng = parseFloat(r.lng_cell);
            const count = parseInt(r.incident_count, 10);
            let risk = 'low';
            if (count >= 10) risk = 'critical';
            else if (count >= 5) risk = 'high';
            else if (count >= 3) risk = 'medium';
            return {
                incidentCount: count,
                accidentCount: parseInt(r.accident_count, 10),
                congestionCount: parseInt(r.congestion_count, 10),
                severeCount: parseInt(r.severe_count, 10),
                risk,
                bounds: [
                    { latitude: lat, longitude: lng },
                    { latitude: lat + gridSize, longitude: lng + gridSize },
                ],
            };
        });
    }

    /**
     * Monthly traffic trends — month-over-month vehicle counts, violations,
     * avg speed, and incident count.
     */
    async getMonthlyTrends(query) {
        const months = parseInt(query.months || '12', 10);
        const result = await connection_1.db.query(`
            WITH monthly_tracking AS (
                SELECT
                    date_trunc('month', recorded_at) AS month,
                    COUNT(DISTINCT vehicle_id) AS vehicle_count,
                    ROUND(AVG(speed)::numeric, 2) AS avg_speed
                FROM tracking_points
                WHERE recorded_at >= NOW() - make_interval(months => $1)
                GROUP BY month
            ),
            monthly_violations AS (
                SELECT
                    date_trunc('month', created_at) AS month,
                    COUNT(*) AS violation_count
                FROM violations
                WHERE created_at >= NOW() - make_interval(months => $1)
                GROUP BY month
            ),
            monthly_alerts AS (
                SELECT
                    date_trunc('month', created_at) AS month,
                    COUNT(*) AS alert_count,
                    COUNT(*) FILTER (WHERE type = 'accident') AS accident_count
                FROM alerts
                WHERE created_at >= NOW() - make_interval(months => $1)
                GROUP BY month
            )
            SELECT
                COALESCE(t.month, v.month, a.month) AS month,
                COALESCE(t.vehicle_count, 0)  AS vehicle_count,
                COALESCE(t.avg_speed, 0)      AS avg_speed,
                COALESCE(v.violation_count, 0) AS violation_count,
                COALESCE(a.alert_count, 0)     AS alert_count,
                COALESCE(a.accident_count, 0)  AS accident_count
            FROM monthly_tracking t
            FULL OUTER JOIN monthly_violations v ON t.month = v.month
            FULL OUTER JOIN monthly_alerts a     ON COALESCE(t.month, v.month) = a.month
            ORDER BY month
        `, [months]);

        return result.rows.map(r => ({
            month: r.month,
            vehicleCount: parseInt(r.vehicle_count, 10),
            avgSpeed: parseFloat(r.avg_speed) || 0,
            violationCount: parseInt(r.violation_count, 10),
            alertCount: parseInt(r.alert_count, 10),
            accidentCount: parseInt(r.accident_count, 10),
        }));
    }

    /**
     * Vehicle type distribution — counts vehicles grouped by type.
     */
    async getVehicleTypeDistribution() {
        const result = await connection_1.db.query(`
            SELECT
                COALESCE(type, 'unknown') AS type,
                COUNT(*) AS count
            FROM vehicles
            GROUP BY type
            ORDER BY count DESC
        `);

        return result.rows.map(r => ({
            name: r.type.charAt(0).toUpperCase() + r.type.slice(1),
            value: parseInt(r.count, 10),
        }));
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
