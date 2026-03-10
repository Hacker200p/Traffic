"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifPrefsController = exports.NotifPrefsController = void 0;
const common_1 = require("../../common");
const notif_prefs_service_1 = require("./notif-prefs.service");

class NotifPrefsController {
    getMyPrefs = (0, common_1.asyncHandler)(async (req, res) => {
        const prefs = await notif_prefs_service_1.notifPrefsService.getForUser(req.user.userId);
        (0, common_1.sendSuccess)(res, prefs);
    });

    upsertPref = (0, common_1.asyncHandler)(async (req, res) => {
        const pref = await notif_prefs_service_1.notifPrefsService.upsert(
            req.user.userId, req.body.alertType, req.body
        );
        (0, common_1.sendSuccess)(res, pref);
    });

    bulkUpsert = (0, common_1.asyncHandler)(async (req, res) => {
        const results = await notif_prefs_service_1.notifPrefsService.bulkUpsert(
            req.user.userId, req.body.preferences
        );
        (0, common_1.sendSuccess)(res, results);
    });

    removePref = (0, common_1.asyncHandler)(async (req, res) => {
        await notif_prefs_service_1.notifPrefsService.remove(
            req.user.userId, req.params.alertType
        );
        (0, common_1.sendSuccess)(res, { deleted: true });
    });
}

exports.NotifPrefsController = NotifPrefsController;
exports.notifPrefsController = new NotifPrefsController();
