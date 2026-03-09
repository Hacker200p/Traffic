import { Request, Response } from 'express';
import { asyncHandler, sendSuccess, sendCreated, sendPaginated } from '../../common';
import { trackingService } from './tracking.service';

export class TrackingController {
  recordPoint = asyncHandler(async (req: Request, res: Response) => {
    const point = await trackingService.recordPoint(req.body);
    sendCreated(res, point);
  });

  recordBatch = asyncHandler(async (req: Request, res: Response) => {
    const points = await trackingService.recordBatch(req.body);
    sendCreated(res, points);
  });

  getHistory = asyncHandler(async (req: Request, res: Response) => {
    const result = await trackingService.getHistory(req.query as any);
    sendPaginated(res, result.data, result.total, result.page, result.limit);
  });

  getLatestPositions = asyncHandler(async (_req: Request, res: Response) => {
    const positions = await trackingService.getLatestPositions();
    sendSuccess(res, positions);
  });

  getVehiclesInRadius = asyncHandler(async (req: Request, res: Response) => {
    const vehicles = await trackingService.getVehiclesInRadius(req.query as any);
    sendSuccess(res, vehicles);
  });
}

export const trackingController = new TrackingController();
