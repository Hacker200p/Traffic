"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditRouter = void 0;
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const rbac_middleware_1 = require("../middleware/rbac.middleware");
const common_1 = require("../common");
const audit_service_1 = require("../common/audit.service");
const validate_middleware_1 = require("../middleware/validate.middleware");
const zod_1 = require("zod");

const router = (0, express_1.Router)();
exports.auditRouter = router;

const auditQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().positive().max(100).default(50),
    userId: zod_1.z.string().uuid().optional(),
    action: zod_1.z.string().max(50).optional(),
    entityType: zod_1.z.string().max(50).optional(),
    entityId: zod_1.z.string().uuid().optional(),
    startDate: zod_1.z.string().datetime().optional(),
    endDate: zod_1.z.string().datetime().optional(),
});

router.use(auth_middleware_1.authenticate);

// Only admins can query audit logs
router.get(
    '/',
    (0, rbac_middleware_1.authorize)('admin'),
    (0, validate_middleware_1.validate)(auditQuerySchema, 'query'),
    (0, common_1.asyncHandler)(async (req, res) => {
        const result = await audit_service_1.auditService.findAll(req.query);
        (0, common_1.sendPaginated)(res, result.data, result.total, result.page, result.limit);
    })
);

// Get audit history for a specific entity
router.get(
    '/entity/:entityType/:entityId',
    (0, rbac_middleware_1.authorize)('admin'),
    (0, common_1.asyncHandler)(async (req, res) => {
        const history = await audit_service_1.auditService.getEntityHistory(
            req.params.entityType,
            req.params.entityId
        );
        (0, common_1.sendSuccess)(res, history);
    })
);
