"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcrypt_1 = __importDefault(require("bcrypt"));
const uuid_1 = require("uuid");
const connection_1 = require("./connection");
const logger_1 = require("../common/logger");
async function seed() {
    try {
        logger_1.logger.info('Starting database seed...');
        // Create default admin user
        const adminId = (0, uuid_1.v4)();
        const adminPassword = await bcrypt_1.default.hash('Admin@123456', 12);
        await connection_1.db.query(`INSERT INTO users (id, email, password_hash, first_name, last_name, role, department, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
       ON CONFLICT (email) DO NOTHING`, [adminId, 'admin@trafficcontrol.gov', adminPassword, 'System', 'Administrator', 'admin', 'IT Department']);
        // Create police user
        const policeId = (0, uuid_1.v4)();
        const policePassword = await bcrypt_1.default.hash('Police@123456', 12);
        await connection_1.db.query(`INSERT INTO users (id, email, password_hash, first_name, last_name, role, badge_number, department, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)
       ON CONFLICT (email) DO NOTHING`, [policeId, 'officer@trafficcontrol.gov', policePassword, 'John', 'Officer', 'police', 'B-1234', 'Traffic Division']);
        // Create analyst user
        const analystId = (0, uuid_1.v4)();
        const analystPassword = await bcrypt_1.default.hash('Analyst@123456', 12);
        await connection_1.db.query(`INSERT INTO users (id, email, password_hash, first_name, last_name, role, department, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
       ON CONFLICT (email) DO NOTHING`, [analystId, 'analyst@trafficcontrol.gov', analystPassword, 'Jane', 'Analyst', 'analyst', 'Data Analytics']);
        // Create signal group (intersection)
        const groupId = (0, uuid_1.v4)();
        await connection_1.db.query(`INSERT INTO signal_groups (id, name, intersection_name, latitude, longitude, description)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT DO NOTHING`, [groupId, 'Main St & 5th Ave', 'Main Street / Fifth Avenue Intersection', 40.7484, -73.9857, 'Primary downtown intersection']);
        // Create traffic signals for the intersection
        const directions = [
            { dir: 'north', state: 'green' },
            { dir: 'south', state: 'green' },
            { dir: 'east', state: 'red' },
            { dir: 'west', state: 'red' },
        ];
        for (const { dir, state } of directions) {
            await connection_1.db.query(`INSERT INTO traffic_signals (id, name, intersection_name, latitude, longitude, direction, type, default_green_duration, default_yellow_duration, default_red_duration, is_autonomous, group_id, current_state)
         VALUES ($1, $2, $3, $4, $5, $6, 'standard', 30, 5, 30, TRUE, $7, $8)`, [(0, uuid_1.v4)(), `Main & 5th - ${dir.toUpperCase()}`, 'Main Street / Fifth Avenue', 40.7484, -73.9857, dir, groupId, state]);
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
            await connection_1.db.query(`INSERT INTO vehicles (id, plate_number, type, make, model, color, year, is_blacklisted)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (plate_number) DO NOTHING`, [(0, uuid_1.v4)(), v.plate, v.type, v.make, v.model, v.color, v.year, v.plate === 'BAD-9999']);
        }
        logger_1.logger.info('Database seeded successfully');
        logger_1.logger.info('Default credentials:');
        logger_1.logger.info('  Admin:   admin@trafficcontrol.gov / Admin@123456');
        logger_1.logger.info('  Police:  officer@trafficcontrol.gov / Police@123456');
        logger_1.logger.info('  Analyst: analyst@trafficcontrol.gov / Analyst@123456');
    }
    catch (error) {
        logger_1.logger.error('Seed failed', { error: error.message });
        throw error;
    }
    finally {
        await connection_1.db.close();
    }
}
seed().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
});
