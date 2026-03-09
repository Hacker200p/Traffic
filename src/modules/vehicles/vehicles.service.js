"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.vehiclesService = exports.VehiclesService = void 0;
const uuid_1 = require("uuid");
const connection_1 = require("../../database/connection");
const errors_1 = require("../../common/errors");
const logger_1 = require("../../common/logger");
class VehiclesService {
    async create(input) {
        const existing = await connection_1.db.query('SELECT id FROM vehicles WHERE plate_number = $1', [input.plateNumber]);
        if (existing.rows.length > 0) {
            throw new errors_1.ConflictError('Vehicle with this plate number already exists');
        }
        const id = (0, uuid_1.v4)();
        const result = await connection_1.db.query(`INSERT INTO vehicles (id, plate_number, type, make, model, color, year, owner_name, owner_contact, is_blacklisted, notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
       RETURNING *`, [id, input.plateNumber, input.type, input.make, input.model, input.color, input.year, input.ownerName, input.ownerContact, input.isBlacklisted, input.notes]);
        logger_1.logger.info('Vehicle created', { vehicleId: id, plateNumber: input.plateNumber });
        return result.rows[0];
    }
    async findAll(query) {
        const { page, limit, type, plateNumber, isBlacklisted } = query;
        const offset = (page - 1) * limit;
        const conditions = [];
        const params = [];
        let paramIdx = 1;
        if (type) {
            conditions.push(`type = $${paramIdx++}`);
            params.push(type);
        }
        if (plateNumber) {
            conditions.push(`plate_number ILIKE $${paramIdx++}`);
            params.push(`%${plateNumber}%`);
        }
        if (isBlacklisted !== undefined) {
            conditions.push(`is_blacklisted = $${paramIdx++}`);
            params.push(isBlacklisted);
        }
        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const countResult = await connection_1.db.query(`SELECT COUNT(*) FROM vehicles ${whereClause}`, params);
        const total = parseInt(countResult.rows[0].count, 10);
        const dataResult = await connection_1.db.query(`SELECT * FROM vehicles ${whereClause} ORDER BY created_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx}`, [...params, limit, offset]);
        return { data: dataResult.rows, total, page, limit };
    }
    async findById(id) {
        const result = await connection_1.db.query('SELECT * FROM vehicles WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            throw new errors_1.NotFoundError('Vehicle');
        }
        return result.rows[0];
    }
    async findByPlate(plateNumber) {
        const result = await connection_1.db.query('SELECT * FROM vehicles WHERE plate_number = $1', [plateNumber]);
        if (result.rows.length === 0) {
            throw new errors_1.NotFoundError('Vehicle');
        }
        return result.rows[0];
    }
    async update(id, input) {
        const existing = await this.findById(id);
        if (input.plateNumber && input.plateNumber !== existing.plate_number) {
            const dup = await connection_1.db.query('SELECT id FROM vehicles WHERE plate_number = $1 AND id != $2', [input.plateNumber, id]);
            if (dup.rows.length > 0) {
                throw new errors_1.ConflictError('Another vehicle with this plate number already exists');
            }
        }
        const fields = [];
        const values = [];
        let idx = 1;
        const fieldMap = {
            plateNumber: 'plate_number', type: 'type', make: 'make', model: 'model',
            color: 'color', year: 'year', ownerName: 'owner_name', ownerContact: 'owner_contact',
            isBlacklisted: 'is_blacklisted', notes: 'notes',
        };
        for (const [key, col] of Object.entries(fieldMap)) {
            if (input[key] !== undefined) {
                fields.push(`${col} = $${idx++}`);
                values.push(input[key]);
            }
        }
        if (fields.length === 0)
            return existing;
        fields.push(`updated_at = NOW()`);
        values.push(id);
        const result = await connection_1.db.query(`UPDATE vehicles SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`, values);
        logger_1.logger.info('Vehicle updated', { vehicleId: id });
        return result.rows[0];
    }
    async delete(id) {
        await this.findById(id);
        await connection_1.db.query('DELETE FROM vehicles WHERE id = $1', [id]);
        logger_1.logger.info('Vehicle deleted', { vehicleId: id });
    }
}
exports.VehiclesService = VehiclesService;
exports.vehiclesService = new VehiclesService();
