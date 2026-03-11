"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.vehiclesController = exports.VehiclesController = void 0;
const common_1 = require("../../common");
const vehicles_service_1 = require("./vehicles.service");
const risk_service_1 = require("./risk.service");
class VehiclesController {
    create = (0, common_1.asyncHandler)(async (req, res) => {
        const vehicle = await vehicles_service_1.vehiclesService.create(req.body);
        (0, common_1.sendCreated)(res, vehicle);
    });
    findAll = (0, common_1.asyncHandler)(async (req, res) => {
        const result = await vehicles_service_1.vehiclesService.findAll(req.query);
        (0, common_1.sendPaginated)(res, result.data, result.total, result.page, result.limit);
    });
    findById = (0, common_1.asyncHandler)(async (req, res) => {
        const vehicle = await vehicles_service_1.vehiclesService.findById(req.params.id);
        (0, common_1.sendSuccess)(res, vehicle);
    });
    findByPlate = (0, common_1.asyncHandler)(async (req, res) => {
        const vehicle = await vehicles_service_1.vehiclesService.findByPlate(req.params.plateNumber);
        (0, common_1.sendSuccess)(res, vehicle);
    });
    update = (0, common_1.asyncHandler)(async (req, res) => {
        const vehicle = await vehicles_service_1.vehiclesService.update(req.params.id, req.body);
        (0, common_1.sendSuccess)(res, vehicle);
    });
    delete = (0, common_1.asyncHandler)(async (req, res) => {
        await vehicles_service_1.vehiclesService.delete(req.params.id);
        (0, common_1.sendNoContent)(res);
    });
    getRiskProfile = (0, common_1.asyncHandler)(async (req, res) => {
        const profile = await risk_service_1.riskService.getRiskProfile(req.params.id);
        (0, common_1.sendSuccess)(res, profile);
    });
    getRiskHistory = (0, common_1.asyncHandler)(async (req, res) => {
        const history = await risk_service_1.riskService.getRiskHistory(req.params.id);
        (0, common_1.sendSuccess)(res, history);
    });
    recalculateRisk = (0, common_1.asyncHandler)(async (req, res) => {
        const profile = await risk_service_1.riskService.updateRiskScore(req.params.id);
        (0, common_1.sendSuccess)(res, profile);
    });
    recalculateAll = (0, common_1.asyncHandler)(async (_req, res) => {
        const result = await risk_service_1.riskService.recalculateAll();
        (0, common_1.sendSuccess)(res, result);
    });
    getHighRiskVehicles = (0, common_1.asyncHandler)(async (req, res) => {
        const limit = parseInt(req.query.limit || '20', 10);
        const data = await risk_service_1.riskService.getHighRiskVehicles(limit);
        (0, common_1.sendSuccess)(res, data);
    });
}
exports.VehiclesController = VehiclesController;
exports.vehiclesController = new VehiclesController();
