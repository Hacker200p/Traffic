import { Request, Response } from 'express';
import { asyncHandler, sendCreated, sendSuccess } from '../../common';
import { integrationService } from './integration.service';

/**
 * Controller for AI microservice integration endpoints.
 * Accepts snake_case payloads and delegates to the integration service.
 */
export class IntegrationController {

  /** POST /integration/violations — Ingest an AI-detected violation */
  createViolation = asyncHandler(async (req: Request, res: Response) => {
    const violation = await integrationService.ingestViolation(req.body);
    sendCreated(res, violation);
  });

  /** POST /integration/tracking — Record a single tracking point */
  recordTracking = asyncHandler(async (req: Request, res: Response) => {
    const point = await integrationService.ingestTracking(req.body);
    sendCreated(res, point);
  });

  /** POST /integration/tracking/batch — Record a batch of tracking points */
  recordTrackingBatch = asyncHandler(async (req: Request, res: Response) => {
    const points = await integrationService.ingestTrackingBatch(req.body);
    sendCreated(res, points);
  });

  /** POST /integration/alerts — Create an alert from AI */
  createAlert = asyncHandler(async (req: Request, res: Response) => {
    const alert = await integrationService.ingestAlert(req.body, req.user!.userId);
    sendCreated(res, alert);
  });

  /** POST /integration/signals/:id/state — Update signal state from AI density analysis */
  changeSignalState = asyncHandler(async (req: Request, res: Response) => {
    const signal = await integrationService.ingestSignalState(
      req.params.id,
      req.body,
      req.user!.userId,
    );
    sendSuccess(res, signal);
  });

  /** GET /integration/health — Simple health check for the AI service to ping */
  health = asyncHandler(async (_req: Request, res: Response) => {
    sendSuccess(res, {
      status: 'ok',
      service: 'integration-gateway',
      timestamp: new Date().toISOString(),
    });
  });
}

export const integrationController = new IntegrationController();
