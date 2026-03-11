"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.predictRouteParamsSchema = void 0;
const zod_1 = require("zod");

exports.predictRouteParamsSchema = zod_1.z.object({
    vehicleId: zod_1.z.string().uuid('Invalid vehicle ID'),
});
