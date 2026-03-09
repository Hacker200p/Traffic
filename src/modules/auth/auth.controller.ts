import { Request, Response } from 'express';
import { asyncHandler, sendSuccess, sendCreated, sendNoContent } from '../../common';
import { authService } from './auth.service';

export class AuthController {
  register = asyncHandler(async (req: Request, res: Response) => {
    const user = await authService.register(req.body);
    sendCreated(res, { user });
  });

  login = asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.login(req.body);
    sendSuccess(res, result);
  });

  refreshToken = asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.refreshToken(req.body.refreshToken);
    sendSuccess(res, result);
  });

  logout = asyncHandler(async (req: Request, res: Response) => {
    const token = req.headers.authorization!.split(' ')[1];
    await authService.logout(req.user!.userId, token);
    sendNoContent(res);
  });

  changePassword = asyncHandler(async (req: Request, res: Response) => {
    await authService.changePassword(req.user!.userId, req.body);
    sendSuccess(res, { message: 'Password changed successfully' });
  });

  getProfile = asyncHandler(async (req: Request, res: Response) => {
    const profile = await authService.getProfile(req.user!.userId);
    sendSuccess(res, profile);
  });
}

export const authController = new AuthController();
