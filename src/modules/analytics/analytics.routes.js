"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsRouter = void 0;
const express_1 = require("express");
const analytics_controller_1 = require("./analytics.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const rbac_middleware_1 = require("../../middleware/rbac.middleware");

const router = (0, express_1.Router)();
exports.analyticsRouter = router;

router.use(auth_middleware_1.authenticate);

router.get('/summary', (0, rbac_middleware_1.authorize)('admin', 'police', 'analyst'), analytics_controller_1.analyticsController.getSummary);
router.get('/traffic-flow', (0, rbac_middleware_1.authorize)('admin', 'police', 'analyst'), analytics_controller_1.analyticsController.getTrafficFlow);
router.get('/violations', (0, rbac_middleware_1.authorize)('admin', 'police', 'analyst'), analytics_controller_1.analyticsController.getViolationStats);
router.get('/density', (0, rbac_middleware_1.authorize)('admin', 'police', 'analyst'), analytics_controller_1.analyticsController.getDensityTimeline);
router.get('/vehicle-count', (0, rbac_middleware_1.authorize)('admin', 'police', 'analyst'), analytics_controller_1.analyticsController.getVehicleCountTimeline);
router.get('/speed', (0, rbac_middleware_1.authorize)('admin', 'police', 'analyst'), analytics_controller_1.analyticsController.getSpeedTimeline);
router.get('/density-zones', (0, rbac_middleware_1.authorize)('admin', 'police', 'analyst'), analytics_controller_1.analyticsController.getDensityZones);
router.get('/peak-hours', (0, rbac_middleware_1.authorize)('admin', 'police', 'analyst'), analytics_controller_1.analyticsController.getPeakTrafficHours);
router.get('/accident-zones', (0, rbac_middleware_1.authorize)('admin', 'police', 'analyst'), analytics_controller_1.analyticsController.getAccidentProneZones);
router.get('/monthly-trends', (0, rbac_middleware_1.authorize)('admin', 'police', 'analyst'), analytics_controller_1.analyticsController.getMonthlyTrends);
router.get('/vehicle-types', (0, rbac_middleware_1.authorize)('admin', 'police', 'analyst'), analytics_controller_1.analyticsController.getVehicleTypeDistribution);
