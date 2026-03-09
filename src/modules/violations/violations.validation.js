"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.violationQuerySchema = exports.updateViolationSchema = exports.createViolationSchema = void 0;
const zod_1 = require("zod");
exports.createViolationSchema = zod_1.z.object({
    vehicleId: zod_1.z.string().uuid('Invalid vehicle ID'),
    type: zod_1.z.enum(['red_light', 'speeding', 'wrong_way', 'illegal_parking', 'no_seatbelt', 'illegal_turn', 'other']),
    description: zod_1.z.string().max(1000).optional(),
    latitude: zod_1.z.number().min(-90).max(90),
    longitude: zod_1.z.number().min(-180).max(180),
    speed: zod_1.z.number().positive().optional(),
    speedLimit: zod_1.z.number().positive().optional(),
    evidenceUrl: zod_1.z.string().url().optional(),
    signalId: zod_1.z.string().uuid().optional(),
    severity: zod_1.z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
    fineAmount: zod_1.z.number().positive().optional(),
});
exports.updateViolationSchema = zod_1.z.object({
    status: zod_1.z.enum(['pending', 'reviewed', 'confirmed', 'dismissed', 'appealed']).optional(),
    reviewedBy: zod_1.z.string().uuid().optional(),
    reviewNotes: zod_1.z.string().max(1000).optional(),
    fineAmount: zod_1.z.number().positive().optional(),
});
exports.violationQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().positive().max(100).default(20),
    type: zod_1.z.enum(['red_light', 'speeding', 'wrong_way', 'illegal_parking', 'no_seatbelt', 'illegal_turn', 'other']).optional(),
    status: zod_1.z.enum(['pending', 'reviewed', 'confirmed', 'dismissed', 'appealed']).optional(),
    severity: zod_1.z.enum(['low', 'medium', 'high', 'critical']).optional(),
    vehicleId: zod_1.z.string().uuid().optional(),
    startDate: zod_1.z.string().datetime().optional(),
    endDate: zod_1.z.string().datetime().optional(),
});
