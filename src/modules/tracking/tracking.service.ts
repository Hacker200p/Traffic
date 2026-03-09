import { v4 as uuidv4 } from 'uuid';
import { db } from '../../database/connection';
import { logger } from '../../common/logger';
import { redis } from '../../config/redis';
import { TrackingPointInput, TrackingBatchInput, TrackingQuery, GeofenceQuery } from './tracking.validation';

export class TrackingService {
  async recordPoint(input: TrackingPointInput) {
    const id = uuidv4();
    const result = await db.query(
      `INSERT INTO tracking_points (id, vehicle_id, location, speed, heading, accuracy, recorded_at, created_at)
       VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326), $5, $6, $7, COALESCE($8::timestamptz, NOW()), NOW())
       RETURNING id, vehicle_id, ST_X(location::geometry) as longitude, ST_Y(location::geometry) as latitude, speed, heading, accuracy, recorded_at`,
      [id, input.vehicleId, input.longitude, input.latitude, input.speed, input.heading, input.accuracy, input.timestamp]
    );

    // Cache latest position in Redis
    await redis.setJSON(`vehicle:pos:${input.vehicleId}`, {
      vehicleId: input.vehicleId,
      latitude: input.latitude,
      longitude: input.longitude,
      speed: input.speed,
      heading: input.heading,
      timestamp: input.timestamp || new Date().toISOString(),
    }, 300); // 5 min TTL

    // Publish for real-time WebSocket updates
    await redis.publish('tracking:update', JSON.stringify(result.rows[0]));

    return result.rows[0];
  }

  async recordBatch(input: TrackingBatchInput) {
    const results = await db.transaction(async (client) => {
      const inserted = [];
      for (const point of input.points) {
        const id = uuidv4();
        const result = await client.query(
          `INSERT INTO tracking_points (id, vehicle_id, location, speed, heading, accuracy, recorded_at, created_at)
           VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326), $5, $6, $7, COALESCE($8::timestamptz, NOW()), NOW())
           RETURNING id, vehicle_id, ST_X(location::geometry) as longitude, ST_Y(location::geometry) as latitude, speed, heading, recorded_at`,
          [id, point.vehicleId, point.longitude, point.latitude, point.speed, point.heading, point.accuracy, point.timestamp]
        );
        inserted.push(result.rows[0]);

        // Cache latest per vehicle
        await redis.setJSON(`vehicle:pos:${point.vehicleId}`, {
          vehicleId: point.vehicleId,
          latitude: point.latitude,
          longitude: point.longitude,
          speed: point.speed,
          heading: point.heading,
          timestamp: point.timestamp || new Date().toISOString(),
        }, 300);
      }
      return inserted;
    });

    logger.info('Batch tracking recorded', { count: results.length });
    return results;
  }

  async getHistory(query: TrackingQuery) {
    const { page, limit, vehicleId, startDate, endDate } = query;
    const offset = (page - 1) * limit;
    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (vehicleId) { conditions.push(`tp.vehicle_id = $${idx++}`); params.push(vehicleId); }
    if (startDate) { conditions.push(`tp.recorded_at >= $${idx++}`); params.push(startDate); }
    if (endDate) { conditions.push(`tp.recorded_at <= $${idx++}`); params.push(endDate); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await db.query(`SELECT COUNT(*) FROM tracking_points tp ${where}`, params);
    const total = parseInt(countResult.rows[0].count, 10);

    const dataResult = await db.query(
      `SELECT tp.id, tp.vehicle_id, v.plate_number,
              ST_X(tp.location::geometry) as longitude, ST_Y(tp.location::geometry) as latitude,
              tp.speed, tp.heading, tp.accuracy, tp.recorded_at
       FROM tracking_points tp
       LEFT JOIN vehicles v ON tp.vehicle_id = v.id
       ${where}
       ORDER BY tp.recorded_at DESC
       LIMIT $${idx++} OFFSET $${idx}`,
      [...params, limit, offset]
    );

    return { data: dataResult.rows, total, page, limit };
  }

  async getLatestPositions() {
    const result = await db.query(
      `SELECT DISTINCT ON (tp.vehicle_id)
              tp.id, tp.vehicle_id, v.plate_number, v.type as vehicle_type,
              ST_X(tp.location::geometry) as longitude, ST_Y(tp.location::geometry) as latitude,
              tp.speed, tp.heading, tp.recorded_at
       FROM tracking_points tp
       JOIN vehicles v ON tp.vehicle_id = v.id
       ORDER BY tp.vehicle_id, tp.recorded_at DESC`
    );
    return result.rows;
  }

  async getVehiclesInRadius(query: GeofenceQuery) {
    const { latitude, longitude, radiusMeters } = query;
    const result = await db.query(
      `SELECT DISTINCT ON (tp.vehicle_id)
              tp.vehicle_id, v.plate_number, v.type as vehicle_type,
              ST_X(tp.location::geometry) as longitude, ST_Y(tp.location::geometry) as latitude,
              tp.speed, tp.heading, tp.recorded_at,
              ST_Distance(tp.location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) as distance_meters
       FROM tracking_points tp
       JOIN vehicles v ON tp.vehicle_id = v.id
       WHERE tp.recorded_at > NOW() - INTERVAL '10 minutes'
         AND ST_DWithin(tp.location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3)
       ORDER BY tp.vehicle_id, tp.recorded_at DESC`,
      [longitude, latitude, radiusMeters]
    );
    return result.rows;
  }
}

export const trackingService = new TrackingService();
