"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiSignalStateSchema = exports.aiAlertSchema = exports.aiTrackingBatchSchema = exports.aiTrackingSchema = exports.aiViolationSchema = exports.aiSightingSchema = void 0;
const zod_1 = require("zod");
// ── Violation from AI (relaxed: no vehicleId required, accepts snake_case) ──
exports.aiViolationSchema = zod_1.z.object({
    type: zod_1.z.enum([
        'red_light', 'speeding', 'wrong_way', 'illegal_parking',
        'no_seatbelt', 'illegal_turn', 'no_helmet', 'other',
    ]),
    description: zod_1.z.string().max(1000).optional().default(''),
    latitude: zod_1.z.number().min(-90).max(90),
    longitude: zod_1.z.number().min(-180).max(180),
    speed: zod_1.z.number().positive().optional(),
    speed_limit: zod_1.z.number().positive().optional(),
    evidence_url: zod_1.z.string().url().optional(),
    signal_id: zod_1.z.string().optional(), // may not be a UUID from AI
    severity: zod_1.z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
    fine_amount: zod_1.z.number().positive().optional(),
    plate_text: zod_1.z.string().max(20).optional(),
    camera_id: zod_1.z.string().optional(),
});
// ── Tracking point from AI ──────────────────────────────────────────────────
exports.aiTrackingSchema = zod_1.z.object({
    vehicle_id: zod_1.z.string().uuid('Invalid vehicle ID'),
    latitude: zod_1.z.number().min(-90).max(90),
    longitude: zod_1.z.number().min(-180).max(180),
    speed: zod_1.z.number().min(0).optional(),
    heading: zod_1.z.number().min(0).max(360).optional(),
    accuracy: zod_1.z.number().positive().optional(),
    timestamp: zod_1.z.string().datetime().optional(),
});
exports.aiTrackingBatchSchema = zod_1.z.object({
    points: zod_1.z.array(exports.aiTrackingSchema).min(1).max(100),
});
// ── Alert from AI ───────────────────────────────────────────────────────────
exports.aiAlertSchema = zod_1.z.object({
    type: zod_1.z.enum([
        'accident', 'congestion', 'signal_malfunction',
        'blacklisted_vehicle', 'emergency', 'road_closure',
        'weather', 'other',
    ]),
    priority: zod_1.z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
    title: zod_1.z.string().min(1).max(200),
    description: zod_1.z.string().max(2000).optional().default(''),
    latitude: zod_1.z.number().min(-90).max(90),
    longitude: zod_1.z.number().min(-180).max(180),
    radius: zod_1.z.number().positive().optional(),
    vehicle_id: zod_1.z.string().uuid().optional(),
    signal_id: zod_1.z.string().optional(),
});
// ── Signal state change from AI ─────────────────────────────────────────────
exports.aiSignalStateSchema = zod_1.z.object({
    state: zod_1.z.enum(['red', 'yellow', 'green', 'flashing', 'off']),
    duration: zod_1.z.number().int().positive().optional(),
    reason: zod_1.z.string().max(500).optional(),
});
// ── Emergency priority check from AI ────────────────────────────────────────
exports.aiEmergencyPrioritySchema = zod_1.z.object({
    plate_text: zod_1.z.string().min(1).max(20),
    signal_id: zod_1.z.string().optional(),
    camera_id: zod_1.z.string().optional(),
    latitude: zod_1.z.number().min(-90).max(90).optional(),
    longitude: zod_1.z.number().min(-180).max(180).optional(),
});
// ── Vehicle sighting from AI (plate detection at camera) ────────────────────
exports.aiSightingSchema = zod_1.z.object({
    plate_text: zod_1.z.string().min(1).max(20),
    camera_id: zod_1.z.string().optional(),
    confidence: zod_1.z.number().min(0).max(1).optional(),
    latitude: zod_1.z.number().min(-90).max(90),
    longitude: zod_1.z.number().min(-180).max(180),
    speed: zod_1.z.number().min(0).optional(),
    heading: zod_1.z.number().min(0).max(360).optional(),
    detected_at: zod_1.z.string().datetime().optional(),
});
