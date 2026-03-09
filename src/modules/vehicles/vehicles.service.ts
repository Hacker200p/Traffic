import { v4 as uuidv4 } from 'uuid';
import { db } from '../../database/connection';
import { NotFoundError, ConflictError } from '../../common/errors';
import { logger } from '../../common/logger';
import { CreateVehicleInput, UpdateVehicleInput, VehicleQuery } from './vehicles.validation';

export class VehiclesService {
  async create(input: CreateVehicleInput) {
    const existing = await db.query('SELECT id FROM vehicles WHERE plate_number = $1', [input.plateNumber]);
    if (existing.rows.length > 0) {
      throw new ConflictError('Vehicle with this plate number already exists');
    }

    const id = uuidv4();
    const result = await db.query(
      `INSERT INTO vehicles (id, plate_number, type, make, model, color, year, owner_name, owner_contact, is_blacklisted, notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
       RETURNING *`,
      [id, input.plateNumber, input.type, input.make, input.model, input.color, input.year, input.ownerName, input.ownerContact, input.isBlacklisted, input.notes]
    );

    logger.info('Vehicle created', { vehicleId: id, plateNumber: input.plateNumber });
    return result.rows[0];
  }

  async findAll(query: VehicleQuery) {
    const { page, limit, type, plateNumber, isBlacklisted } = query;
    const offset = (page - 1) * limit;
    const conditions: string[] = [];
    const params: any[] = [];
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

    const countResult = await db.query(`SELECT COUNT(*) FROM vehicles ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count, 10);

    const dataResult = await db.query(
      `SELECT * FROM vehicles ${whereClause} ORDER BY created_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx}`,
      [...params, limit, offset]
    );

    return { data: dataResult.rows, total, page, limit };
  }

  async findById(id: string) {
    const result = await db.query('SELECT * FROM vehicles WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      throw new NotFoundError('Vehicle');
    }
    return result.rows[0];
  }

  async findByPlate(plateNumber: string) {
    const result = await db.query('SELECT * FROM vehicles WHERE plate_number = $1', [plateNumber]);
    if (result.rows.length === 0) {
      throw new NotFoundError('Vehicle');
    }
    return result.rows[0];
  }

  async update(id: string, input: UpdateVehicleInput) {
    const existing = await this.findById(id);

    if (input.plateNumber && input.plateNumber !== existing.plate_number) {
      const dup = await db.query('SELECT id FROM vehicles WHERE plate_number = $1 AND id != $2', [input.plateNumber, id]);
      if (dup.rows.length > 0) {
        throw new ConflictError('Another vehicle with this plate number already exists');
      }
    }

    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    const fieldMap: Record<string, string> = {
      plateNumber: 'plate_number', type: 'type', make: 'make', model: 'model',
      color: 'color', year: 'year', ownerName: 'owner_name', ownerContact: 'owner_contact',
      isBlacklisted: 'is_blacklisted', notes: 'notes',
    };

    for (const [key, col] of Object.entries(fieldMap)) {
      if ((input as any)[key] !== undefined) {
        fields.push(`${col} = $${idx++}`);
        values.push((input as any)[key]);
      }
    }

    if (fields.length === 0) return existing;

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await db.query(
      `UPDATE vehicles SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    logger.info('Vehicle updated', { vehicleId: id });
    return result.rows[0];
  }

  async delete(id: string) {
    await this.findById(id);
    await db.query('DELETE FROM vehicles WHERE id = $1', [id]);
    logger.info('Vehicle deleted', { vehicleId: id });
  }
}

export const vehiclesService = new VehiclesService();
