"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.movementRouter = void 0;
const express_1 = require("express");
const movement_controller_1 = require("./movement.controller");
const prediction_controller_1 = require("./prediction.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const rbac_middleware_1 = require("../../middleware/rbac.middleware");
const validate_middleware_1 = require("../../middleware/validate.middleware");
const movement_validation_1 = require("./movement.validation");
const prediction_validation_1 = require("./prediction.validation");

const router = (0, express_1.Router)();
exports.movementRouter = router;

router.use(auth_middleware_1.authenticate);

// Core feature: vehicle movement across cameras
router.get('/track', (0, rbac_middleware_1.authorize)('admin', 'police', 'analyst'), (0, validate_middleware_1.validate)(movement_validation_1.movementQuerySchema, 'query'), movement_controller_1.movementController.getVehicleMovement);

// Camera management
router.get('/cameras', (0, rbac_middleware_1.authorize)('admin', 'police', 'analyst'), movement_controller_1.movementController.listCameras);
router.get('/cameras/:id', (0, rbac_middleware_1.authorize)('admin', 'police', 'analyst'), movement_controller_1.movementController.getCameraById);
router.post('/cameras', (0, rbac_middleware_1.authorize)('admin'), (0, validate_middleware_1.validate)(movement_validation_1.createCameraSchema), movement_controller_1.movementController.createCamera);

// Last sightings (for lost/stolen vehicle tracking)
router.post('/last-sightings', (0, rbac_middleware_1.authorize)('admin', 'police', 'analyst'), movement_controller_1.movementController.getLastSightings);
router.get('/last-sighting/:vehicleId', (0, rbac_middleware_1.authorize)('admin', 'police', 'analyst'), movement_controller_1.movementController.getLastSighting);

// Predictive route analysis (for stolen vehicles)
router.get('/predict/:vehicleId', (0, rbac_middleware_1.authorize)('admin', 'police'), (0, validate_middleware_1.validate)(prediction_validation_1.predictRouteParamsSchema, 'params'), prediction_controller_1.predictionController.predictRoute);
