"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.restrictedZoneService = exports.RestrictedZoneService = void 0;
const uuid_1 = require("uuid");
const connection_1 = require("../../database/connection");
const errors_1 = require("../../common/errors");
const logger_1 = require("../../common/logger");

class RestrictedZoneService {
    async create(input, createdBy) {
        const id = (0, uuid_1.v4)();
        const result = await connection_1.db.query(
            `INSERT INTO restricted_zones
             (id, name, description, latitude, longitude, radius, zone_type,
              is_active, start_time, end_time, created_by, created_at, updated_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW(),NOW())
             RETURNING *`,
            [
                id, input.name, input.description || null,
                input.latitude, input.longitude, input.radius,
                input.zoneType || 'restricted', input.isActive ?? true,
                input.startTime || null, input.endTime || null,
                createdBy,
            ]
        );
        logger_1.logger.info('Restricted zone created', { zoneId: id, name: input.name });
        return result.rows[0];
    }

    async findAll(query) {
        const { page = 1, limit = 20, activeOnly } = query;
        const offset = (page - 1) * limit;
        const conditions = [];
        const params = [];
        let idx = 1;

        if (activeOnly) {
            conditions.push('is_active = TRUE');
        }

        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        const countResult = await connection_1.db.query(
            `SELECT COUNT(*) FROM restricted_zones ${where}`, params
        );
        const total = parseInt(countResult.rows[0].count, 10);
        const dataResult = await connection_1.db.query(
            `SELECT * FROM restricted_zones ${where}
             ORDER BY created_at DESC
             LIMIT $${idx++} OFFSET $${idx}`,
            [...params, limit, offset]
        );
        return { data: dataResult.rows, total, page, limit };
    }

    async findById(id) {
        const result = await connection_1.db.query(
            'SELECT * FROM restricted_zones WHERE id = $1', [id]
        );
        if (result.rows.length === 0) throw new errors_1.NotFoundError('Restricted zone');
        return result.rows[0];
    }

    async update(id, input) {
        await this.findById(id);
        const fields = [];
        const values = [];
        let idx = 1;
        const mapping = {
            name: 'name', description: 'description', latitude: 'latitude',
            longitude: 'longitude', radius: 'radius', zoneType: 'zone_type',
            isActive: 'is_active', startTime: 'start_time', endTime: 'end_time',
        };
        for (const [key, col] of Object.entries(mapping)) {
            if (input[key] !== undefined) {
                fields.push(`${col} = $${idx++}`);
                values.push(input[key]);
            }
        }
        if (fields.length === 0) return this.findById(id);
        fields.push('updated_at = NOW()');
        values.push(id);
        await connection_1.db.query(
            `UPDATE restricted_zones SET ${fields.join(', ')} WHERE id = $${idx}`,
            values
        );
        return this.findById(id);
    }

    async remove(id) {
        await this.findById(id);
        await connection_1.db.query('DELETE FROM restricted_zones WHERE id = $1', [id]);
    }

    // ── Geofence check ─────────────────────────────────────────────────────
    /**
     * Return all active restricted zones that contain the given point.
     * Uses the Haversine approximation (good enough for radii < 50 km).
     */
    async findZonesContaining(latitude, longitude) {
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        const result = await connection_1.db.query(
            `SELECT * FROM restricted_zones
             WHERE is_active = TRUE
               AND (
                 6371000 * acos(
                   LEAST(1.0, cos(radians($1)) * cos(radians(latitude))
                     * cos(radians(longitude) - radians($2))
                     + sin(radians($1)) * sin(radians(latitude))
                 )) <= radius
               )
               AND (start_time IS NULL OR (start_time <= $3::time AND end_time >= $3::time))`,
            [latitude, longitude, timeStr]
        );
        return result.rows;
    }
}

exports.RestrictedZoneService = RestrictedZoneService;
exports.restrictedZoneService = new RestrictedZoneService();
