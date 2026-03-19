"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.accidentQuerySchema = exports.collisionDetectSchema = exports.telemetryAnalyseSchema = exports.updateAccidentStatusSchema = exports.createAccidentSchema = void 0;
const zod_1 = require("zod");

const emptyToUndefined = (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value);

const gpsPointSchema = zod_1.z.object({
    vehicleId: zod_1.z.string().uuid().optional(),
    latitude: zod_1.z.number().min(-90).max(90),
    longitude: zod_1.z.number().min(-180).max(180),
    speed: zod_1.z.number().min(0).default(0),
    heading: zod_1.z.number().min(0).max(360).optional(),
    timestamp: zod_1.z.string(),
});

exports.createAccidentSchema = zod_1.z.object({
    detectionType: zod_1.z.enum(['sudden_stop', 'collision', 'unusual_motion', 'manual_report']),
    severity: zod_1.z.enum(['low', 'medium', 'high', 'critical']).default('high'),
    latitude: zod_1.z.number().min(-90).max(90),
    longitude: zod_1.z.number().min(-180).max(180),
    description: zod_1.z.string().max(2000).optional(),
    evidenceUrl: zod_1.z.string().url().max(500).optional(),
    vehicleIds: zod_1.z.array(zod_1.z.string().uuid()).max(10).optional(),
    detectionData: zod_1.z.record(zod_1.z.any()).optional(),
});

exports.updateAccidentStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(['detected', 'confirmed', 'dispatched', 'resolved', 'false_alarm']),
    resolutionNotes: zod_1.z.string().max(2000).optional(),
});

exports.telemetryAnalyseSchema = zod_1.z.object({
    vehicleId: zod_1.z.string().uuid(),
    points: zod_1.z.array(gpsPointSchema).min(2).max(100),
});

exports.collisionDetectSchema = zod_1.z.object({
    pointsA: zod_1.z.array(gpsPointSchema).min(1).max(100),
    pointsB: zod_1.z.array(gpsPointSchema).min(1).max(100),
});

exports.accidentQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().positive().max(100).default(20),
    status: zod_1.z.preprocess(emptyToUndefined, zod_1.z.enum(['detected', 'confirmed', 'dispatched', 'resolved', 'false_alarm']).optional()),
    severity: zod_1.z.preprocess(emptyToUndefined, zod_1.z.enum(['low', 'medium', 'high', 'critical']).optional()),
    detectionType: zod_1.z.preprocess(emptyToUndefined, zod_1.z.enum(['sudden_stop', 'collision', 'unusual_motion', 'manual_report']).optional()),
});
