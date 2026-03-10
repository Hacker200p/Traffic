"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.zoneQuerySchema = exports.updateZoneSchema = exports.createZoneSchema = void 0;
const zod_1 = require("zod");

exports.createZoneSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(200),
    description: zod_1.z.string().max(1000).optional(),
    latitude: zod_1.z.number().min(-90).max(90),
    longitude: zod_1.z.number().min(-180).max(180),
    radius: zod_1.z.number().positive().max(50000),
    zoneType: zod_1.z.enum(['restricted', 'no_entry', 'vip', 'school', 'hospital']).default('restricted'),
    isActive: zod_1.z.boolean().default(true),
    startTime: zod_1.z.string().regex(/^\d{2}:\d{2}$/).optional(),
    endTime: zod_1.z.string().regex(/^\d{2}:\d{2}$/).optional(),
});

exports.updateZoneSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(200).optional(),
    description: zod_1.z.string().max(1000).optional(),
    latitude: zod_1.z.number().min(-90).max(90).optional(),
    longitude: zod_1.z.number().min(-180).max(180).optional(),
    radius: zod_1.z.number().positive().max(50000).optional(),
    zoneType: zod_1.z.enum(['restricted', 'no_entry', 'vip', 'school', 'hospital']).optional(),
    isActive: zod_1.z.boolean().optional(),
    startTime: zod_1.z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
    endTime: zod_1.z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
});

exports.zoneQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().positive().max(100).default(20),
    activeOnly: zod_1.z.coerce.boolean().optional(),
});
