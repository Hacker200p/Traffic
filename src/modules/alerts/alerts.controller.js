"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.alertsController = exports.AlertsController = void 0;
const common_1 = require("../../common");
const alerts_service_1 = require("./alerts.service");
class AlertsController {
    create = (0, common_1.asyncHandler)(async (req, res) => {
        const alert = await alerts_service_1.alertsService.create(req.body, req.user.userId);
        (0, common_1.sendCreated)(res, alert);
    });
    findAll = (0, common_1.asyncHandler)(async (req, res) => {
        const result = await alerts_service_1.alertsService.findAll(req.query);
        (0, common_1.sendPaginated)(res, result.data, result.total, result.page, result.limit);
    });
    findById = (0, common_1.asyncHandler)(async (req, res) => {
        const alert = await alerts_service_1.alertsService.findById(req.params.id);
        (0, common_1.sendSuccess)(res, alert);
    });
    update = (0, common_1.asyncHandler)(async (req, res) => {
        const alert = await alerts_service_1.alertsService.update(req.params.id, req.body, req.user.userId);
        (0, common_1.sendSuccess)(res, alert);
    });
    getActiveCount = (0, common_1.asyncHandler)(async (_req, res) => {
        const counts = await alerts_service_1.alertsService.getActiveCount();
        (0, common_1.sendSuccess)(res, counts);
    });
}
exports.AlertsController = AlertsController;
exports.alertsController = new AlertsController();
