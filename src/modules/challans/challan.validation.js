"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.challanQuerySchema = exports.updateChallanSchema = exports.generateChallanSchema = void 0;
const zod_1 = require("zod");

exports.generateChallanSchema = zod_1.z.object({
    violationId: zod_1.z.string().uuid('Invalid violation ID'),
    fineAmount: zod_1.z.number().positive().optional(),
});

exports.updateChallanSchema = zod_1.z.object({
    status: zod_1.z.enum(['paid', 'cancelled']),
    paymentRef: zod_1.z.string().max(255).optional(),
});

exports.approveChallanSchema = zod_1.z.object({
    notes: zod_1.z.string().max(500).optional(),
    adjustedFineAmount: zod_1.z.number().positive().optional(),
});

exports.rejectChallanSchema = zod_1.z.object({
    reason: zod_1.z.string().min(1).max(500),
});

exports.challanQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().positive().max(100).default(20),
    status: zod_1.z.enum(['pending_approval', 'issued', 'sent', 'paid', 'overdue', 'cancelled', 'rejected']).optional(),
    plateNumber: zod_1.z.string().max(20).optional(),
    startDate: zod_1.z.string().datetime().optional(),
    endDate: zod_1.z.string().datetime().optional(),
});
