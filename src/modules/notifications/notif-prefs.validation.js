"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bulkPrefsSchema = exports.upsertPrefSchema = void 0;
const zod_1 = require("zod");

const ALERT_TYPES = [
    'accident', 'congestion', 'signal_malfunction', 'blacklisted_vehicle',
    'emergency', 'road_closure', 'weather', 'restricted_zone', 'violation', 'other',
];

exports.upsertPrefSchema = zod_1.z.object({
    alertType: zod_1.z.enum(ALERT_TYPES),
    sms: zod_1.z.boolean().default(false),
    push: zod_1.z.boolean().default(true),
    email: zod_1.z.boolean().default(false),
});

exports.bulkPrefsSchema = zod_1.z.object({
    preferences: zod_1.z.array(
        zod_1.z.object({
            alertType: zod_1.z.enum(ALERT_TYPES),
            sms: zod_1.z.boolean().default(false),
            push: zod_1.z.boolean().default(true),
            email: zod_1.z.boolean().default(false),
        })
    ).min(1).max(20),
});
