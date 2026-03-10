"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.restrictedZonesRouter = void 0;
const express_1 = require("express");
const restricted_zones_controller_1 = require("./restricted-zones.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const rbac_middleware_1 = require("../../middleware/rbac.middleware");
const validate_middleware_1 = require("../../middleware/validate.middleware");
const restricted_zones_validation_1 = require("./restricted-zones.validation");

const router = (0, express_1.Router)();
exports.restrictedZonesRouter = router;

router.use(auth_middleware_1.authenticate);

router.post(
    '/',
    (0, rbac_middleware_1.authorize)('admin'),
    (0, validate_middleware_1.validate)(restricted_zones_validation_1.createZoneSchema),
    restricted_zones_controller_1.restrictedZoneController.create
);

router.get(
    '/',
    (0, rbac_middleware_1.authorize)('admin', 'police', 'analyst'),
    (0, validate_middleware_1.validate)(restricted_zones_validation_1.zoneQuerySchema, 'query'),
    restricted_zones_controller_1.restrictedZoneController.findAll
);

router.get(
    '/:id',
    (0, rbac_middleware_1.authorize)('admin', 'police', 'analyst'),
    restricted_zones_controller_1.restrictedZoneController.findById
);

router.patch(
    '/:id',
    (0, rbac_middleware_1.authorize)('admin'),
    (0, validate_middleware_1.validate)(restricted_zones_validation_1.updateZoneSchema),
    restricted_zones_controller_1.restrictedZoneController.update
);

router.delete(
    '/:id',
    (0, rbac_middleware_1.authorize)('admin'),
    restricted_zones_controller_1.restrictedZoneController.remove
);
