import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { db } from './connection';
import { logger } from '../common/logger';

async function seed(): Promise<void> {
  try {
    logger.info('Starting database seed...');

    // Create default admin user
    const adminId = uuidv4();
    const adminPassword = await bcrypt.hash('Admin@123456', 12);
    await db.query(
      `INSERT INTO users (id, email, password_hash, first_name, last_name, role, department, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
       ON CONFLICT (email) DO NOTHING`,
      [adminId, 'admin@trafficcontrol.gov', adminPassword, 'System', 'Administrator', 'admin', 'IT Department']
    );

    // Create police user
    const policeId = uuidv4();
    const policePassword = await bcrypt.hash('Police@123456', 12);
    await db.query(
      `INSERT INTO users (id, email, password_hash, first_name, last_name, role, badge_number, department, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)
       ON CONFLICT (email) DO NOTHING`,
      [policeId, 'officer@trafficcontrol.gov', policePassword, 'John', 'Officer', 'police', 'B-1234', 'Traffic Division']
    );

    // Create analyst user
    const analystId = uuidv4();
    const analystPassword = await bcrypt.hash('Analyst@123456', 12);
    await db.query(
      `INSERT INTO users (id, email, password_hash, first_name, last_name, role, department, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
       ON CONFLICT (email) DO NOTHING`,
      [analystId, 'analyst@trafficcontrol.gov', analystPassword, 'Jane', 'Analyst', 'analyst', 'Data Analytics']
    );

    // Create signal group (intersection)
    const groupId = uuidv4();
    await db.query(
      `INSERT INTO signal_groups (id, name, intersection_name, location, description)
       VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint(-73.9857, 40.7484), 4326), $4)
       ON CONFLICT DO NOTHING`,
      [groupId, 'Main St & 5th Ave', 'Main Street / Fifth Avenue Intersection', 'Primary downtown intersection']
    );

    // Create traffic signals for the intersection
    const directions = [
      { dir: 'north', state: 'green' },
      { dir: 'south', state: 'green' },
      { dir: 'east', state: 'red' },
      { dir: 'west', state: 'red' },
    ];

    for (const { dir, state } of directions) {
      await db.query(
        `INSERT INTO traffic_signals (id, name, intersection_name, location, direction, type, default_green_duration, default_yellow_duration, default_red_duration, is_autonomous, group_id, current_state)
         VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint(-73.9857, 40.7484), 4326), $4, 'standard', 30, 5, 30, TRUE, $5, $6)`,
        [uuidv4(), `Main & 5th - ${dir.toUpperCase()}`, 'Main Street / Fifth Avenue', dir, groupId, state]
      );
    }

    // Create sample vehicles
    const vehicles = [
      { plate: 'NYC-1234', type: 'car', make: 'Toyota', model: 'Camry', color: 'White', year: 2023 },
      { plate: 'NYC-5678', type: 'truck', make: 'Ford', model: 'F-150', color: 'Black', year: 2022 },
      { plate: 'EMR-911', type: 'emergency', make: 'Ford', model: 'Explorer', color: 'Red', year: 2024 },
      { plate: 'BUS-001', type: 'bus', make: 'MCI', model: 'D4500', color: 'Blue', year: 2021 },
      { plate: 'BAD-9999', type: 'car', make: 'BMW', model: 'M3', color: 'Black', year: 2020 },
    ];

    for (const v of vehicles) {
      await db.query(
        `INSERT INTO vehicles (id, plate_number, type, make, model, color, year, is_blacklisted)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (plate_number) DO NOTHING`,
        [uuidv4(), v.plate, v.type, v.make, v.model, v.color, v.year, v.plate === 'BAD-9999']
      );
    }

    logger.info('Database seeded successfully');
    logger.info('Default credentials:');
    logger.info('  Admin:   admin@trafficcontrol.gov / Admin@123456');
    logger.info('  Police:  officer@trafficcontrol.gov / Police@123456');
    logger.info('  Analyst: analyst@trafficcontrol.gov / Analyst@123456');
  } catch (error: any) {
    logger.error('Seed failed', { error: error.message });
    throw error;
  } finally {
    await db.close();
  }
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
