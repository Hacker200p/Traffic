import { Request, Response } from 'express';
import { asyncHandler, sendSuccess, sendCreated, sendNoContent, sendPaginated } from '../../common';
import { vehiclesService } from './vehicles.service';

export class VehiclesController {
  create = asyncHandler(async (req: Request, res: Response) => {
    const vehicle = await vehiclesService.create(req.body);
    sendCreated(res, vehicle);
  });

  findAll = asyncHandler(async (req: Request, res: Response) => {
    const result = await vehiclesService.findAll(req.query as any);
    sendPaginated(res, result.data, result.total, result.page, result.limit);
  });

  findById = asyncHandler(async (req: Request, res: Response) => {
    const vehicle = await vehiclesService.findById(req.params.id);
    sendSuccess(res, vehicle);
  });

  findByPlate = asyncHandler(async (req: Request, res: Response) => {
    const vehicle = await vehiclesService.findByPlate(req.params.plateNumber);
    sendSuccess(res, vehicle);
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const vehicle = await vehiclesService.update(req.params.id, req.body);
    sendSuccess(res, vehicle);
  });

  delete = asyncHandler(async (req: Request, res: Response) => {
    await vehiclesService.delete(req.params.id);
    sendNoContent(res);
  });
}

export const vehiclesController = new VehiclesController();
