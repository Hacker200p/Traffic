"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.signalsController = exports.SignalsController = void 0;
const common_1 = require("../../common");
const signals_service_1 = require("./signals.service");
class SignalsController {
    create = (0, common_1.asyncHandler)(async (req, res) => {
        const signal = await signals_service_1.signalsService.create(req.body);
        (0, common_1.sendCreated)(res, signal);
    });
    findAll = (0, common_1.asyncHandler)(async (req, res) => {
        const result = await signals_service_1.signalsService.findAll(req.query);
        (0, common_1.sendPaginated)(res, result.data, result.total, result.page, result.limit);
    });
    findById = (0, common_1.asyncHandler)(async (req, res) => {
        const signal = await signals_service_1.signalsService.findById(req.params.id);
        (0, common_1.sendSuccess)(res, signal);
    });
    update = (0, common_1.asyncHandler)(async (req, res) => {
        const signal = await signals_service_1.signalsService.update(req.params.id, req.body);
        (0, common_1.sendSuccess)(res, signal);
    });
    changeState = (0, common_1.asyncHandler)(async (req, res) => {
        const signal = await signals_service_1.signalsService.changeState(req.params.id, req.body, req.user.userId);
        (0, common_1.sendSuccess)(res, signal);
    });
    getStateLog = (0, common_1.asyncHandler)(async (req, res) => {
        const { page, limit } = req.query;
        const result = await signals_service_1.signalsService.getStateLog(req.params.id, page, limit);
        (0, common_1.sendPaginated)(res, result.data, result.total, result.page, result.limit);
    });
    createSchedule = (0, common_1.asyncHandler)(async (req, res) => {
        const schedule = await signals_service_1.signalsService.createSchedule(req.body);
        (0, common_1.sendCreated)(res, schedule);
    });
    getSchedules = (0, common_1.asyncHandler)(async (req, res) => {
        const schedules = await signals_service_1.signalsService.getSchedules(req.params.id);
        (0, common_1.sendSuccess)(res, schedules);
    });
    getGroupSignals = (0, common_1.asyncHandler)(async (req, res) => {
        const signals = await signals_service_1.signalsService.getGroupSignals(req.params.groupId);
        (0, common_1.sendSuccess)(res, signals);
    });
    getActiveOverrides = (0, common_1.asyncHandler)(async (req, res) => {
        const overrides = await signals_service_1.signalsService.getActiveOverrides();
        (0, common_1.sendSuccess)(res, overrides);
    });
    delete = (0, common_1.asyncHandler)(async (req, res) => {
        await signals_service_1.signalsService.delete(req.params.id);
        (0, common_1.sendNoContent)(res);
    });
}
exports.SignalsController = SignalsController;
exports.signalsController = new SignalsController();
