import { Router } from 'express';
import { trackingController } from './tracking.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/rbac.middleware';
import { validate } from '../../middleware/validate.middleware';
import { trackingPointSchema, trackingBatchSchema, trackingQuerySchema, geofenceQuerySchema } from './tracking.validation';

const router = Router();

router.use(authenticate);

router.post('/', authorize('admin', 'police'), validate(trackingPointSchema), trackingController.recordPoint);
router.post('/batch', authorize('admin', 'police'), validate(trackingBatchSchema), trackingController.recordBatch);
router.get('/history', authorize('admin', 'police', 'analyst'), validate(trackingQuerySchema, 'query'), trackingController.getHistory);
router.get('/latest', authorize('admin', 'police', 'analyst'), trackingController.getLatestPositions);
router.get('/geofence', authorize('admin', 'police'), validate(geofenceQuerySchema, 'query'), trackingController.getVehiclesInRadius);

export { router as trackingRouter };
