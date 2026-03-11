"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsController = exports.AnalyticsController = void 0;
const common_1 = require("../../common");
const analytics_service_1 = require("./analytics.service");

class AnalyticsController {
    getSummary = (0, common_1.asyncHandler)(async (_req, res) => {
        const summary = await analytics_service_1.analyticsService.getSummary();
        (0, common_1.sendSuccess)(res, summary);
    });

    getTrafficFlow = (0, common_1.asyncHandler)(async (req, res) => {
        const data = await analytics_service_1.analyticsService.getTrafficFlow(req.query);
        (0, common_1.sendSuccess)(res, data);
    });

    getViolationStats = (0, common_1.asyncHandler)(async (req, res) => {
        const data = await analytics_service_1.analyticsService.getViolationAnalytics(req.query);
        (0, common_1.sendSuccess)(res, data);
    });

    getDensityTimeline = (0, common_1.asyncHandler)(async (req, res) => {
        const data = await analytics_service_1.analyticsService.getDensityTimeline(req.query);
        (0, common_1.sendSuccess)(res, data);
    });

    getVehicleCountTimeline = (0, common_1.asyncHandler)(async (req, res) => {
        const data = await analytics_service_1.analyticsService.getVehicleCountTimeline(req.query);
        (0, common_1.sendSuccess)(res, data);
    });

    getSpeedTimeline = (0, common_1.asyncHandler)(async (req, res) => {
        const data = await analytics_service_1.analyticsService.getSpeedTimeline(req.query);
        (0, common_1.sendSuccess)(res, data);
    });

    getDensityZones = (0, common_1.asyncHandler)(async (req, res) => {
        const data = await analytics_service_1.analyticsService.getDensityZones(req.query);
        (0, common_1.sendSuccess)(res, data);
    });

    getPeakTrafficHours = (0, common_1.asyncHandler)(async (req, res) => {
        const data = await analytics_service_1.analyticsService.getPeakTrafficHours(req.query);
        (0, common_1.sendSuccess)(res, data);
    });

    getAccidentProneZones = (0, common_1.asyncHandler)(async (req, res) => {
        const data = await analytics_service_1.analyticsService.getAccidentProneZones(req.query);
        (0, common_1.sendSuccess)(res, data);
    });

    getMonthlyTrends = (0, common_1.asyncHandler)(async (req, res) => {
        const data = await analytics_service_1.analyticsService.getMonthlyTrends(req.query);
        (0, common_1.sendSuccess)(res, data);
    });

    getVehicleTypeDistribution = (0, common_1.asyncHandler)(async (req, res) => {
        const data = await analytics_service_1.analyticsService.getVehicleTypeDistribution();
        (0, common_1.sendSuccess)(res, data);
    });
}
exports.AnalyticsController = AnalyticsController;
exports.analyticsController = new AnalyticsController();
