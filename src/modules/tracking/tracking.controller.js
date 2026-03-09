"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.trackingController = exports.TrackingController = void 0;
const common_1 = require("../../common");
const tracking_service_1 = require("./tracking.service");
class TrackingController {
    recordPoint = (0, common_1.asyncHandler)(async (req, res) => {
        const point = await tracking_service_1.trackingService.recordPoint(req.body);
        (0, common_1.sendCreated)(res, point);
    });
    recordBatch = (0, common_1.asyncHandler)(async (req, res) => {
        const points = await tracking_service_1.trackingService.recordBatch(req.body);
        (0, common_1.sendCreated)(res, points);
    });
    getHistory = (0, common_1.asyncHandler)(async (req, res) => {
        const result = await tracking_service_1.trackingService.getHistory(req.query);
        (0, common_1.sendPaginated)(res, result.data, result.total, result.page, result.limit);
    });
    getLatestPositions = (0, common_1.asyncHandler)(async (_req, res) => {
        const positions = await tracking_service_1.trackingService.getLatestPositions();
        (0, common_1.sendSuccess)(res, positions);
    });
    getVehiclesInRadius = (0, common_1.asyncHandler)(async (req, res) => {
        const vehicles = await tracking_service_1.trackingService.getVehiclesInRadius(req.query);
        (0, common_1.sendSuccess)(res, vehicles);
    });
}
exports.TrackingController = TrackingController;
exports.trackingController = new TrackingController();
