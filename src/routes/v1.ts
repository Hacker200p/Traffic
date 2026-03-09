import { Router } from 'express';
import { authRouter } from '../modules/auth/auth.routes';
import { vehiclesRouter } from '../modules/vehicles/vehicles.routes';
import { violationsRouter } from '../modules/violations/violations.routes';
import { trackingRouter } from '../modules/tracking/tracking.routes';
import { alertsRouter } from '../modules/alerts/alerts.routes';
import { signalsRouter } from '../modules/traffic-signals/signals.routes';
import { integrationRouter } from '../modules/integration/integration.routes';

const router = Router();

router.use('/auth', authRouter);
router.use('/vehicles', vehiclesRouter);
router.use('/violations', violationsRouter);
router.use('/tracking', trackingRouter);
router.use('/alerts', alertsRouter);
router.use('/signals', signalsRouter);

// AI microservice integration (service-to-service, API-key auth)
router.use('/integration', integrationRouter);

export { router as apiV1Router };
