"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.accidentsController = exports.AccidentsController = void 0;
const common_1 = require("../../common");
const accidents_service_1 = require("./accidents.service");

class AccidentsController {
    create = (0, common_1.asyncHandler)(async (req, res) => {
        const accident = await accidents_service_1.accidentsService.create(req.body, req.user.userId);
        (0, common_1.sendCreated)(res, accident);
    });

    findAll = (0, common_1.asyncHandler)(async (req, res) => {
        const result = await accidents_service_1.accidentsService.findAll(req.query);
        (0, common_1.sendPaginated)(res, result.data, result.total, result.page, result.limit);
    });

    findById = (0, common_1.asyncHandler)(async (req, res) => {
        const accident = await accidents_service_1.accidentsService.findById(req.params.id);
        (0, common_1.sendSuccess)(res, accident);
    });

    updateStatus = (0, common_1.asyncHandler)(async (req, res) => {
        const accident = await accidents_service_1.accidentsService.updateStatus(req.params.id, req.body, req.user.userId);
        (0, common_1.sendSuccess)(res, accident);
    });

    getStats = (0, common_1.asyncHandler)(async (_req, res) => {
        const stats = await accidents_service_1.accidentsService.getStats();
        (0, common_1.sendSuccess)(res, stats);
    });

    /** POST /accidents/analyse — Manual telemetry analysis (from AI service) */
    analyseTelemetry = (0, common_1.asyncHandler)(async (req, res) => {
        const { vehicleId, points } = req.body;
        const detection = accidents_service_1.accidentsService.analyseVehicleTelemetry(vehicleId, points);

        if (detection.detected) {
            const accident = await accidents_service_1.accidentsService.create({
                detectionType: detection.type,
                severity: detection.severity,
                latitude: detection.data.location.latitude,
                longitude: detection.data.location.longitude,
                description: `AI-detected: ${detection.type.replace(/_/g, ' ')}`,
                vehicleIds: [vehicleId],
                detectionData: detection.data,
            }, req.user?.userId || null);

            return (0, common_1.sendCreated)(res, { detected: true, accident });
        }

        (0, common_1.sendSuccess)(res, { detected: false });
    });

    /** POST /accidents/detect-collision — Check two vehicle tracks for collision */
    detectCollision = (0, common_1.asyncHandler)(async (req, res) => {
        const { pointsA, pointsB } = req.body;
        const detection = accidents_service_1.accidentsService.detectCollision(pointsA, pointsB);

        if (detection.detected) {
            const accident = await accidents_service_1.accidentsService.create({
                detectionType: 'collision',
                severity: 'critical',
                latitude: detection.data.location.latitude,
                longitude: detection.data.location.longitude,
                description: `Collision detected between two vehicles`,
                vehicleIds: [detection.data.vehicleA.vehicleId, detection.data.vehicleB.vehicleId],
                detectionData: detection.data,
            }, req.user?.userId || null);

            return (0, common_1.sendCreated)(res, { detected: true, accident });
        }

        (0, common_1.sendSuccess)(res, { detected: false });
    });
}

exports.AccidentsController = AccidentsController;
exports.accidentsController = new AccidentsController();
