"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.geofenceQuerySchema = exports.trackingQuerySchema = exports.trackingBatchSchema = exports.trackingPointSchema = void 0;
const zod_1 = require("zod");
exports.trackingPointSchema = zod_1.z.object({
    vehicleId: zod_1.z.string().uuid('Invalid vehicle ID'),
    latitude: zod_1.z.number().min(-90).max(90),
    longitude: zod_1.z.number().min(-180).max(180),
    speed: zod_1.z.number().min(0).optional(),
    heading: zod_1.z.number().min(0).max(360).optional(),
    accuracy: zod_1.z.number().positive().optional(),
    timestamp: zod_1.z.string().datetime().optional(),
});
exports.trackingBatchSchema = zod_1.z.object({
    points: zod_1.z.array(exports.trackingPointSchema).min(1).max(100),
});
exports.trackingQuerySchema = zod_1.z.object({
    vehicleId: zod_1.z.string().uuid().optional(),
    startDate: zod_1.z.string().datetime().optional(),
    endDate: zod_1.z.string().datetime().optional(),
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().positive().max(500).default(50),
});
exports.geofenceQuerySchema = zod_1.z.object({
    latitude: zod_1.z.coerce.number().min(-90).max(90),
    longitude: zod_1.z.coerce.number().min(-180).max(180),
    radiusMeters: zod_1.z.coerce.number().positive().max(50000).default(1000),
});
