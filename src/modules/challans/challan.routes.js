"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.challansRouter = void 0;
const express_1 = require("express");
const challan_controller_1 = require("./challan.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const rbac_middleware_1 = require("../../middleware/rbac.middleware");
const validate_middleware_1 = require("../../middleware/validate.middleware");
const challan_validation_1 = require("./challan.validation");

const router = (0, express_1.Router)();
exports.challansRouter = router;

router.use(auth_middleware_1.authenticate);

router.post('/generate', (0, rbac_middleware_1.authorize)('admin', 'police'), (0, validate_middleware_1.validate)(challan_validation_1.generateChallanSchema), challan_controller_1.challanController.generate);
router.get('/', (0, rbac_middleware_1.authorize)('admin', 'police', 'analyst'), (0, validate_middleware_1.validate)(challan_validation_1.challanQuerySchema, 'query'), challan_controller_1.challanController.findAll);
router.get('/stats', (0, rbac_middleware_1.authorize)('admin', 'police', 'analyst'), challan_controller_1.challanController.getStats);
router.get('/:id', (0, rbac_middleware_1.authorize)('admin', 'police', 'analyst'), challan_controller_1.challanController.findById);
router.patch('/:id', (0, rbac_middleware_1.authorize)('admin', 'police'), (0, validate_middleware_1.validate)(challan_validation_1.updateChallanSchema), challan_controller_1.challanController.update);
router.post('/:id/resend', (0, rbac_middleware_1.authorize)('admin', 'police'), challan_controller_1.challanController.resendNotification);
