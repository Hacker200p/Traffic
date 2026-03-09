"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.integrationController = exports.IntegrationController = void 0;
const common_1 = require("../../common");
const integration_service_1 = require("./integration.service");
/**
 * Controller for AI microservice integration endpoints.
 * Accepts snake_case payloads and delegates to the integration service.
 */
class IntegrationController {
    /** POST /integration/violations — Ingest an AI-detected violation */
    createViolation = (0, common_1.asyncHandler)(async (req, res) => {
        const violation = await integration_service_1.integrationService.ingestViolation(req.body);
        (0, common_1.sendCreated)(res, violation);
    });
    /** POST /integration/tracking — Record a single tracking point */
    recordTracking = (0, common_1.asyncHandler)(async (req, res) => {
        const point = await integration_service_1.integrationService.ingestTracking(req.body);
        (0, common_1.sendCreated)(res, point);
    });
    /** POST /integration/tracking/batch — Record a batch of tracking points */
    recordTrackingBatch = (0, common_1.asyncHandler)(async (req, res) => {
        const points = await integration_service_1.integrationService.ingestTrackingBatch(req.body);
        (0, common_1.sendCreated)(res, points);
    });
    /** POST /integration/alerts — Create an alert from AI */
    createAlert = (0, common_1.asyncHandler)(async (req, res) => {
        const alert = await integration_service_1.integrationService.ingestAlert(req.body, req.user.userId);
        (0, common_1.sendCreated)(res, alert);
    });
    /** POST /integration/signals/:id/state — Update signal state from AI density analysis */
    changeSignalState = (0, common_1.asyncHandler)(async (req, res) => {
        const signal = await integration_service_1.integrationService.ingestSignalState(req.params.id, req.body, req.user.userId);
        (0, common_1.sendSuccess)(res, signal);
    });
    /** GET /integration/health — Simple health check for the AI service to ping */
    health = (0, common_1.asyncHandler)(async (_req, res) => {
        (0, common_1.sendSuccess)(res, {
            status: 'ok',
            service: 'integration-gateway',
            timestamp: new Date().toISOString(),
        });
    });
}
exports.IntegrationController = IntegrationController;
exports.integrationController = new IntegrationController();
