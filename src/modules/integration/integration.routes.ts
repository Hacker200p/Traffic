import { Router } from 'express';
import { integrationController } from './integration.controller';
import { serviceAuth } from '../../middleware/service-auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import {
  aiViolationSchema,
  aiTrackingSchema,
  aiTrackingBatchSchema,
  aiAlertSchema,
  aiSignalStateSchema,
} from './integration.validation';

const router = Router();

// All integration routes use service API-key auth instead of JWT
router.use(serviceAuth);

// Health probe for AI service connectivity check
router.get('/health', integrationController.health);

// Violation ingestion (from AI helmet / red-light / speed detection)
router.post(
  '/violations',
  validate(aiViolationSchema),
  integrationController.createViolation,
);

// Vehicle tracking (single point)
router.post(
  '/tracking',
  validate(aiTrackingSchema),
  integrationController.recordTracking,
);

// Vehicle tracking (batch)
router.post(
  '/tracking/batch',
  validate(aiTrackingBatchSchema),
  integrationController.recordTrackingBatch,
);

// Alert creation (from AI anomaly detection)
router.post(
  '/alerts',
  validate(aiAlertSchema),
  integrationController.createAlert,
);

// Signal state update (from AI density analysis)
router.post(
  '/signals/:id/state',
  validate(aiSignalStateSchema),
  integrationController.changeSignalState,
);

export { router as integrationRouter };
