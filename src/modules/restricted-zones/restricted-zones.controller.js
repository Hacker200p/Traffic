"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.restrictedZoneController = exports.RestrictedZoneController = void 0;
const common_1 = require("../../common");
const restricted_zones_service_1 = require("./restricted-zones.service");

class RestrictedZoneController {
    create = (0, common_1.asyncHandler)(async (req, res) => {
        const zone = await restricted_zones_service_1.restrictedZoneService.create(
            req.body, req.user.userId
        );
        (0, common_1.sendCreated)(res, zone);
    });

    findAll = (0, common_1.asyncHandler)(async (req, res) => {
        const result = await restricted_zones_service_1.restrictedZoneService.findAll(req.query);
        (0, common_1.sendPaginated)(res, result.data, result.total, result.page, result.limit);
    });

    findById = (0, common_1.asyncHandler)(async (req, res) => {
        const zone = await restricted_zones_service_1.restrictedZoneService.findById(req.params.id);
        (0, common_1.sendSuccess)(res, zone);
    });

    update = (0, common_1.asyncHandler)(async (req, res) => {
        const zone = await restricted_zones_service_1.restrictedZoneService.update(
            req.params.id, req.body
        );
        (0, common_1.sendSuccess)(res, zone);
    });

    remove = (0, common_1.asyncHandler)(async (req, res) => {
        await restricted_zones_service_1.restrictedZoneService.remove(req.params.id);
        (0, common_1.sendSuccess)(res, { deleted: true });
    });
}

exports.RestrictedZoneController = RestrictedZoneController;
exports.restrictedZoneController = new RestrictedZoneController();
