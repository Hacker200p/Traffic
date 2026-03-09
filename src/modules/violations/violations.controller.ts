import { Request, Response } from 'express';
import { asyncHandler, sendSuccess, sendCreated, sendPaginated } from '../../common';
import { violationsService } from './violations.service';

export class ViolationsController {
  create = asyncHandler(async (req: Request, res: Response) => {
    const violation = await violationsService.create(req.body);
    sendCreated(res, violation);
  });

  findAll = asyncHandler(async (req: Request, res: Response) => {
    const result = await violationsService.findAll(req.query as any);
    sendPaginated(res, result.data, result.total, result.page, result.limit);
  });

  findById = asyncHandler(async (req: Request, res: Response) => {
    const violation = await violationsService.findById(req.params.id);
    sendSuccess(res, violation);
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const violation = await violationsService.update(req.params.id, {
      ...req.body,
      reviewedBy: req.user!.userId,
    });
    sendSuccess(res, violation);
  });

  getStats = asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate } = req.query as any;
    const stats = await violationsService.getStats(startDate, endDate);
    sendSuccess(res, stats);
  });
}

export const violationsController = new ViolationsController();
