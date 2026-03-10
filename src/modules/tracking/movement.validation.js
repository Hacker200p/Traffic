"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCameraSchema = exports.movementQuerySchema = void 0;
const zod_1 = require("zod");

exports.movementQuerySchema = zod_1.z.object({
    plateNumber: zod_1.z.string().min(1, 'Plate number is required').max(20),
    startDate: zod_1.z.string().datetime().optional(),
    endDate: zod_1.z.string().datetime().optional(),
});

exports.createCameraSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(200),
    intersectionName: zod_1.z.string().max(300).optional(),
    latitude: zod_1.z.number().min(-90).max(90),
    longitude: zod_1.z.number().min(-180).max(180),
    cameraType: zod_1.z.enum(['fixed', 'dome', 'ptz', 'anpr']).default('fixed'),
    streamUrl: zod_1.z.string().url().optional(),
    signalId: zod_1.z.string().uuid().optional(),
    isOnline: zod_1.z.boolean().default(true),
});
