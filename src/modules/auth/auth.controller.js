"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authController = exports.AuthController = void 0;
const common_1 = require("../../common");
const auth_service_1 = require("./auth.service");
class AuthController {
    register = (0, common_1.asyncHandler)(async (req, res) => {
        const user = await auth_service_1.authService.register(req.body);
        (0, common_1.sendCreated)(res, { user });
    });
    login = (0, common_1.asyncHandler)(async (req, res) => {
        const result = await auth_service_1.authService.login(req.body);
        (0, common_1.sendSuccess)(res, result);
    });
    refreshToken = (0, common_1.asyncHandler)(async (req, res) => {
        const result = await auth_service_1.authService.refreshToken(req.body.refreshToken);
        (0, common_1.sendSuccess)(res, result);
    });
    logout = (0, common_1.asyncHandler)(async (req, res) => {
        const token = req.headers.authorization.split(' ')[1];
        await auth_service_1.authService.logout(req.user.userId, token);
        (0, common_1.sendNoContent)(res);
    });
    changePassword = (0, common_1.asyncHandler)(async (req, res) => {
        await auth_service_1.authService.changePassword(req.user.userId, req.body);
        (0, common_1.sendSuccess)(res, { message: 'Password changed successfully' });
    });
    getProfile = (0, common_1.asyncHandler)(async (req, res) => {
        const profile = await auth_service_1.authService.getProfile(req.user.userId);
        (0, common_1.sendSuccess)(res, profile);
    });
}
exports.AuthController = AuthController;
exports.authController = new AuthController();
