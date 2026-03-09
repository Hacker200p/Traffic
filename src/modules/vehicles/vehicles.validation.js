"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.vehicleQuerySchema = exports.updateVehicleSchema = exports.createVehicleSchema = void 0;
const zod_1 = require("zod");
exports.createVehicleSchema = zod_1.z.object({
    plateNumber: zod_1.z.string().min(1, 'Plate number is required').max(20),
    type: zod_1.z.enum(['car', 'truck', 'motorcycle', 'bus', 'emergency', 'bicycle']),
    make: zod_1.z.string().max(100).optional(),
    model: zod_1.z.string().max(100).optional(),
    color: zod_1.z.string().max(50).optional(),
    year: zod_1.z.number().int().min(1900).max(2030).optional(),
    ownerName: zod_1.z.string().max(200).optional(),
    ownerContact: zod_1.z.string().max(100).optional(),
    isBlacklisted: zod_1.z.boolean().default(false),
    notes: zod_1.z.string().max(1000).optional(),
});
exports.updateVehicleSchema = exports.createVehicleSchema.partial();
exports.vehicleQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().positive().max(100).default(20),
    type: zod_1.z.enum(['car', 'truck', 'motorcycle', 'bus', 'emergency', 'bicycle']).optional(),
    plateNumber: zod_1.z.string().optional(),
    isBlacklisted: zod_1.z.coerce.boolean().optional(),
});
