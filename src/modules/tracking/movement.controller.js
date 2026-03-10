"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.movementController = exports.MovementController = void 0;
const common_1 = require("../../common");
const movement_service_1 = require("./movement.service");

class MovementController {
    /** GET /movement/track?plateNumber=...&startDate=...&endDate=... */
    getVehicleMovement = (0, common_1.asyncHandler)(async (req, res) => {
        const { plateNumber, startDate, endDate } = req.query;
        const result = await movement_service_1.movementService.getVehicleMovement(plateNumber, startDate, endDate);
        (0, common_1.sendSuccess)(res, result);
    });

    /** GET /movement/cameras — List all cameras */
    listCameras = (0, common_1.asyncHandler)(async (_req, res) => {
        const cameras = await movement_service_1.movementService.findAllCameras();
        (0, common_1.sendSuccess)(res, cameras);
    });

    /** GET /movement/cameras/:id — Get camera by ID */
    getCameraById = (0, common_1.asyncHandler)(async (req, res) => {
        const camera = await movement_service_1.movementService.findCameraById(req.params.id);
        (0, common_1.sendSuccess)(res, camera);
    });

    /** POST /movement/cameras — Create a camera */
    createCamera = (0, common_1.asyncHandler)(async (req, res) => {
        const camera = await movement_service_1.movementService.createCamera(req.body);
        (0, common_1.sendCreated)(res, camera);
    });

    /** POST /movement/last-sightings — Get most recent sighting for each vehicle ID */
    getLastSightings = (0, common_1.asyncHandler)(async (req, res) => {
        const { vehicleIds } = req.body;
        const sightings = await movement_service_1.movementService.getLastSightingsForVehicles(vehicleIds || []);
        (0, common_1.sendSuccess)(res, sightings);
    });

    /** GET /movement/last-sighting/:vehicleId — Get last sighting for a single vehicle */
    getLastSighting = (0, common_1.asyncHandler)(async (req, res) => {
        const sighting = await movement_service_1.movementService.getLastSighting(req.params.vehicleId);
        (0, common_1.sendSuccess)(res, sighting);
    });
}

exports.MovementController = MovementController;
exports.movementController = new MovementController();
