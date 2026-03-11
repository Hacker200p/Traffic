"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.accidentsRouter = void 0;
const express_1 = require("express");
const accidents_controller_1 = require("./accidents.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const rbac_middleware_1 = require("../../middleware/rbac.middleware");
const validate_middleware_1 = require("../../middleware/validate.middleware");
const accidents_validation_1 = require("./accidents.validation");

const router = (0, express_1.Router)();
exports.accidentsRouter = router;

router.use(auth_middleware_1.authenticate);

// List & stats — all authenticated roles
router.get('/', (0, rbac_middleware_1.authorize)('admin', 'police', 'analyst'), (0, validate_middleware_1.validate)(accidents_validation_1.accidentQuerySchema, 'query'), accidents_controller_1.accidentsController.findAll);
router.get('/stats', (0, rbac_middleware_1.authorize)('admin', 'police', 'analyst'), accidents_controller_1.accidentsController.getStats);

// Detection endpoints — admin/police + service-to-service
router.post('/', (0, rbac_middleware_1.authorize)('admin', 'police'), (0, validate_middleware_1.validate)(accidents_validation_1.createAccidentSchema), accidents_controller_1.accidentsController.create);
router.post('/analyse', (0, rbac_middleware_1.authorize)('admin', 'police'), (0, validate_middleware_1.validate)(accidents_validation_1.telemetryAnalyseSchema), accidents_controller_1.accidentsController.analyseTelemetry);
router.post('/detect-collision', (0, rbac_middleware_1.authorize)('admin', 'police'), (0, validate_middleware_1.validate)(accidents_validation_1.collisionDetectSchema), accidents_controller_1.accidentsController.detectCollision);

// Single accident & status update
router.get('/:id', (0, rbac_middleware_1.authorize)('admin', 'police', 'analyst'), accidents_controller_1.accidentsController.findById);
router.patch('/:id', (0, rbac_middleware_1.authorize)('admin', 'police'), (0, validate_middleware_1.validate)(accidents_validation_1.updateAccidentStatusSchema), accidents_controller_1.accidentsController.updateStatus);
