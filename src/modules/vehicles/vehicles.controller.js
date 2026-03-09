"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.vehiclesController = exports.VehiclesController = void 0;
const common_1 = require("../../common");
const vehicles_service_1 = require("./vehicles.service");
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
}
exports.VehiclesController = VehiclesController;
exports.vehiclesController = new VehiclesController();
