"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.violationsController = exports.ViolationsController = void 0;
const common_1 = require("../../common");
const violations_service_1 = require("./violations.service");
class ViolationsController {
    create = (0, common_1.asyncHandler)(async (req, res) => {
        const violation = await violations_service_1.violationsService.create(req.body);
        (0, common_1.sendCreated)(res, violation);
    });
    findAll = (0, common_1.asyncHandler)(async (req, res) => {
        const result = await violations_service_1.violationsService.findAll(req.query);
        (0, common_1.sendPaginated)(res, result.data, result.total, result.page, result.limit);
    });
    findById = (0, common_1.asyncHandler)(async (req, res) => {
        const violation = await violations_service_1.violationsService.findById(req.params.id);
        (0, common_1.sendSuccess)(res, violation);
    });
    update = (0, common_1.asyncHandler)(async (req, res) => {
        const violation = await violations_service_1.violationsService.update(req.params.id, {
            ...req.body,
            reviewedBy: req.user.userId,
        });
        (0, common_1.sendSuccess)(res, violation);
    });
    getStats = (0, common_1.asyncHandler)(async (req, res) => {
        const { startDate, endDate } = req.query;
        const stats = await violations_service_1.violationsService.getStats(startDate, endDate);
        (0, common_1.sendSuccess)(res, stats);
    });
}
exports.ViolationsController = ViolationsController;
exports.violationsController = new ViolationsController();
