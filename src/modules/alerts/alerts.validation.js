"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.alertQuerySchema = exports.updateAlertSchema = exports.createAlertSchema = void 0;
const zod_1 = require("zod");
exports.createAlertSchema = zod_1.z.object({
    type: zod_1.z.enum(['accident', 'congestion', 'signal_malfunction', 'blacklisted_vehicle', 'emergency', 'road_closure', 'weather', 'restricted_zone', 'violation', 'other']),
    priority: zod_1.z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
    title: zod_1.z.string().min(1).max(200),
    description: zod_1.z.string().max(2000).optional(),
    latitude: zod_1.z.number().min(-90).max(90),
    longitude: zod_1.z.number().min(-180).max(180),
    radius: zod_1.z.number().positive().optional(),
    vehicleId: zod_1.z.string().uuid().optional(),
    signalId: zod_1.z.string().uuid().optional(),
    expiresAt: zod_1.z.string().datetime().optional(),
});
exports.updateAlertSchema = zod_1.z.object({
    status: zod_1.z.enum(['active', 'acknowledged', 'resolved', 'expired']).optional(),
    resolvedBy: zod_1.z.string().uuid().optional(),
    resolvedNotes: zod_1.z.string().max(1000).optional(),
    priority: zod_1.z.enum(['low', 'medium', 'high', 'critical']).optional(),
});
exports.alertQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().positive().max(100).default(20),
    type: zod_1.z.enum(['accident', 'congestion', 'signal_malfunction', 'blacklisted_vehicle', 'emergency', 'road_closure', 'weather', 'restricted_zone', 'violation', 'other']).optional(),
    priority: zod_1.z.enum(['low', 'medium', 'high', 'critical']).optional(),
    status: zod_1.z.enum(['active', 'acknowledged', 'resolved', 'expired']).optional(),
    activeOnly: zod_1.z.coerce.boolean().optional(),
});
