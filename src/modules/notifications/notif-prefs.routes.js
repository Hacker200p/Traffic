"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifPrefsRouter = void 0;
const express_1 = require("express");
const notif_prefs_controller_1 = require("./notif-prefs.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const validate_middleware_1 = require("../../middleware/validate.middleware");
const notif_prefs_validation_1 = require("./notif-prefs.validation");

const router = (0, express_1.Router)();
exports.notifPrefsRouter = router;

router.use(auth_middleware_1.authenticate);

// GET /notification-preferences — get current user's preferences
router.get('/', notif_prefs_controller_1.notifPrefsController.getMyPrefs);

// PUT /notification-preferences — upsert a single preference
router.put(
    '/',
    (0, validate_middleware_1.validate)(notif_prefs_validation_1.upsertPrefSchema),
    notif_prefs_controller_1.notifPrefsController.upsertPref
);

// POST /notification-preferences/bulk — bulk upsert
router.post(
    '/bulk',
    (0, validate_middleware_1.validate)(notif_prefs_validation_1.bulkPrefsSchema),
    notif_prefs_controller_1.notifPrefsController.bulkUpsert
);

// DELETE /notification-preferences/:alertType — remove preference for a type
router.delete(
    '/:alertType',
    notif_prefs_controller_1.notifPrefsController.removePref
);
