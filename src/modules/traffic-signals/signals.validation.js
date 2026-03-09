"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.signalScheduleSchema = exports.signalQuerySchema = exports.signalStateSchema = exports.updateSignalSchema = exports.createSignalSchema = void 0;
const zod_1 = require("zod");
exports.createSignalSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(200),
    intersectionName: zod_1.z.string().max(300).optional(),
    latitude: zod_1.z.number().min(-90).max(90),
    longitude: zod_1.z.number().min(-180).max(180),
    direction: zod_1.z.enum(['north', 'south', 'east', 'west', 'north_east', 'north_west', 'south_east', 'south_west']),
    type: zod_1.z.enum(['standard', 'pedestrian', 'arrow', 'flashing', 'emergency']).default('standard'),
    defaultGreenDuration: zod_1.z.number().int().positive().default(30),
    defaultYellowDuration: zod_1.z.number().int().positive().default(5),
    defaultRedDuration: zod_1.z.number().int().positive().default(30),
    isAutonomous: zod_1.z.boolean().default(true),
    groupId: zod_1.z.string().uuid().optional(),
    cameraUrl: zod_1.z.string().url().optional(),
});
exports.updateSignalSchema = exports.createSignalSchema.partial();
exports.signalStateSchema = zod_1.z.object({
    state: zod_1.z.enum(['green', 'yellow', 'red', 'flashing_red', 'flashing_yellow', 'off']),
    duration: zod_1.z.number().int().positive().optional(),
    reason: zod_1.z.string().max(500).optional(),
    overrideUntil: zod_1.z.string().datetime().optional(),
});
exports.signalQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().positive().max(100).default(20),
    type: zod_1.z.enum(['standard', 'pedestrian', 'arrow', 'flashing', 'emergency']).optional(),
    state: zod_1.z.enum(['green', 'yellow', 'red', 'flashing_red', 'flashing_yellow', 'off']).optional(),
    isAutonomous: zod_1.z.coerce.boolean().optional(),
    groupId: zod_1.z.string().uuid().optional(),
});
exports.signalScheduleSchema = zod_1.z.object({
    signalId: zod_1.z.string().uuid(),
    dayOfWeek: zod_1.z.number().int().min(0).max(6),
    startTime: zod_1.z.string().regex(/^\d{2}:\d{2}$/, 'Format HH:MM'),
    endTime: zod_1.z.string().regex(/^\d{2}:\d{2}$/, 'Format HH:MM'),
    greenDuration: zod_1.z.number().int().positive(),
    yellowDuration: zod_1.z.number().int().positive(),
    redDuration: zod_1.z.number().int().positive(),
});
