"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.predictionController = exports.PredictionController = void 0;
const common_1 = require("../../common");
const prediction_service_1 = require("./prediction.service");

class PredictionController {
    /** GET /movement/predict/:vehicleId — Predict route for a stolen vehicle */
    predictRoute = (0, common_1.asyncHandler)(async (req, res) => {
        const result = await prediction_service_1.predictionService.predictRoute(req.params.vehicleId);
        (0, common_1.sendSuccess)(res, result);
    });
}

exports.PredictionController = PredictionController;
exports.predictionController = new PredictionController();
