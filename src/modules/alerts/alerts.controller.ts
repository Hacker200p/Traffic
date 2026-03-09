import { Request, Response } from 'express';
import { asyncHandler, sendSuccess, sendCreated, sendPaginated } from '../../common';
import { alertsService } from './alerts.service';

export class AlertsController {
  create = asyncHandler(async (req: Request, res: Response) => {
    const alert = await alertsService.create(req.body, req.user!.userId);
    sendCreated(res, alert);
  });

  findAll = asyncHandler(async (req: Request, res: Response) => {
    const result = await alertsService.findAll(req.query as any);
    sendPaginated(res, result.data, result.total, result.page, result.limit);
  });

  findById = asyncHandler(async (req: Request, res: Response) => {
    const alert = await alertsService.findById(req.params.id);
    sendSuccess(res, alert);
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const alert = await alertsService.update(req.params.id, req.body, req.user!.userId);
    sendSuccess(res, alert);
  });

  getActiveCount = asyncHandler(async (_req: Request, res: Response) => {
    const counts = await alertsService.getActiveCount();
    sendSuccess(res, counts);
  });
}

export const alertsController = new AlertsController();
