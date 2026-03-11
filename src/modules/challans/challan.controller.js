"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.challanController = exports.ChallanController = void 0;
const common_1 = require("../../common");
const challan_service_1 = require("./challan.service");

class ChallanController {
    /** POST /challans/generate — Generate e-challan for a violation */
    generate = (0, common_1.asyncHandler)(async (req, res) => {
        const challan = await challan_service_1.challanService.generateForViolation(
            req.body.violationId,
            req.body.fineAmount
        );
        (0, common_1.sendCreated)(res, challan);
    });

    /** GET /challans — List all challans (paginated) */
    findAll = (0, common_1.asyncHandler)(async (req, res) => {
        const result = await challan_service_1.challanService.findAll(req.query);
        (0, common_1.sendPaginated)(res, result.data, result.total, result.page, result.limit);
    });

    /** GET /challans/stats — Challan statistics */
    getStats = (0, common_1.asyncHandler)(async (req, res) => {
        const { startDate, endDate } = req.query;
        const stats = await challan_service_1.challanService.getStats(startDate, endDate);
        (0, common_1.sendSuccess)(res, stats);
    });

    /** GET /challans/:id — Get challan by ID */
    findById = (0, common_1.asyncHandler)(async (req, res) => {
        const challan = await challan_service_1.challanService.findById(req.params.id);
        (0, common_1.sendSuccess)(res, challan);
    });

    /** PATCH /challans/:id — Update challan status (e.g. mark as paid) */
    update = (0, common_1.asyncHandler)(async (req, res) => {
        const challan = await challan_service_1.challanService.updateStatus(req.params.id, req.body);
        (0, common_1.sendSuccess)(res, challan);
    });

    /** POST /challans/:id/resend — Resend notification */
    resendNotification = (0, common_1.asyncHandler)(async (req, res) => {
        const result = await challan_service_1.challanService.resendNotification(req.params.id);
        (0, common_1.sendSuccess)(res, result);
    });

    /** GET /challans/pending — List challans pending approval */
    getPending = (0, common_1.asyncHandler)(async (req, res) => {
        const result = await challan_service_1.challanService.findPendingApproval(req.query);
        (0, common_1.sendPaginated)(res, result.data, result.total, result.page, result.limit);
    });

    /** POST /challans/:id/approve — Approve a pending challan */
    approve = (0, common_1.asyncHandler)(async (req, res) => {
        const challan = await challan_service_1.challanService.approveChallan(
            req.params.id,
            req.user.userId,
            req.body
        );
        (0, common_1.sendSuccess)(res, challan);
    });

    /** POST /challans/:id/reject — Reject a pending challan */
    reject = (0, common_1.asyncHandler)(async (req, res) => {
        const challan = await challan_service_1.challanService.rejectChallan(
            req.params.id,
            req.user.userId,
            req.body.reason
        );
        (0, common_1.sendSuccess)(res, challan);
    });
}

exports.ChallanController = ChallanController;
exports.challanController = new ChallanController();
