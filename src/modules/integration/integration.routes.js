"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.integrationRouter = void 0;
const express_1 = require("express");
const integration_controller_1 = require("./integration.controller");
const service_auth_middleware_1 = require("../../middleware/service-auth.middleware");
const validate_middleware_1 = require("../../middleware/validate.middleware");
const integration_validation_1 = require("./integration.validation");
const router = (0, express_1.Router)();
exports.integrationRouter = router;
// All integration routes use service API-key auth instead of JWT
router.use(service_auth_middleware_1.serviceAuth);
// Health probe for AI service connectivity check
router.get('/health', integration_controller_1.integrationController.health);
// Violation ingestion (from AI helmet / red-light / speed detection)
router.post('/violations', (0, validate_middleware_1.validate)(integration_validation_1.aiViolationSchema), integration_controller_1.integrationController.createViolation);
// Vehicle tracking (single point)
router.post('/tracking', (0, validate_middleware_1.validate)(integration_validation_1.aiTrackingSchema), integration_controller_1.integrationController.recordTracking);
// Vehicle tracking (batch)
router.post('/tracking/batch', (0, validate_middleware_1.validate)(integration_validation_1.aiTrackingBatchSchema), integration_controller_1.integrationController.recordTrackingBatch);
// Alert creation (from AI anomaly detection)
router.post('/alerts', (0, validate_middleware_1.validate)(integration_validation_1.aiAlertSchema), integration_controller_1.integrationController.createAlert);
// Signal state update (from AI density analysis)
router.post('/signals/:id/state', (0, validate_middleware_1.validate)(integration_validation_1.aiSignalStateSchema), integration_controller_1.integrationController.changeSignalState);
