import { Request, Response } from 'express';
import { asyncHandler, sendSuccess, sendCreated, sendNoContent, sendPaginated } from '../../common';
import { signalsService } from './signals.service';

export class SignalsController {
  create = asyncHandler(async (req: Request, res: Response) => {
    const signal = await signalsService.create(req.body);
    sendCreated(res, signal);
  });

  findAll = asyncHandler(async (req: Request, res: Response) => {
    const result = await signalsService.findAll(req.query as any);
    sendPaginated(res, result.data, result.total, result.page, result.limit);
  });

  findById = asyncHandler(async (req: Request, res: Response) => {
    const signal = await signalsService.findById(req.params.id);
    sendSuccess(res, signal);
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const signal = await signalsService.update(req.params.id, req.body);
    sendSuccess(res, signal);
  });

  changeState = asyncHandler(async (req: Request, res: Response) => {
    const signal = await signalsService.changeState(req.params.id, req.body, req.user!.userId);
    sendSuccess(res, signal);
  });

  getStateLog = asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = req.query as any;
    const result = await signalsService.getStateLog(req.params.id, page, limit);
    sendPaginated(res, result.data, result.total, result.page, result.limit);
  });

  createSchedule = asyncHandler(async (req: Request, res: Response) => {
    const schedule = await signalsService.createSchedule(req.body);
    sendCreated(res, schedule);
  });

  getSchedules = asyncHandler(async (req: Request, res: Response) => {
    const schedules = await signalsService.getSchedules(req.params.id);
    sendSuccess(res, schedules);
  });

  getGroupSignals = asyncHandler(async (req: Request, res: Response) => {
    const signals = await signalsService.getGroupSignals(req.params.groupId);
    sendSuccess(res, signals);
  });

  delete = asyncHandler(async (req: Request, res: Response) => {
    await signalsService.delete(req.params.id);
    sendNoContent(res);
  });
}

export const signalsController = new SignalsController();
