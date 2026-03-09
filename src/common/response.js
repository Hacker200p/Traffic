"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendNoContent = exports.sendCreated = exports.sendPaginated = exports.sendSuccess = void 0;
const sendSuccess = (res, data, statusCode = 200) => {
    const response = {
        success: true,
        data,
    };
    res.status(statusCode).json(response);
};
exports.sendSuccess = sendSuccess;
const sendPaginated = (res, data, total, page, limit) => {
    const response = {
        success: true,
        data,
        meta: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
    res.status(200).json(response);
};
exports.sendPaginated = sendPaginated;
const sendCreated = (res, data) => {
    (0, exports.sendSuccess)(res, data, 201);
};
exports.sendCreated = sendCreated;
const sendNoContent = (res) => {
    res.status(204).send();
};
exports.sendNoContent = sendNoContent;
