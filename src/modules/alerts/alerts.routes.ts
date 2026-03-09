import { Router } from 'express';
import { alertsController } from './alerts.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/rbac.middleware';
import { validate } from '../../middleware/validate.middleware';
import { createAlertSchema, updateAlertSchema, alertQuerySchema } from './alerts.validation';

const router = Router();

router.use(authenticate);

router.post('/', authorize('admin', 'police'), validate(createAlertSchema), alertsController.create);
router.get('/', authorize('admin', 'police', 'analyst'), validate(alertQuerySchema, 'query'), alertsController.findAll);
router.get('/active-count', authorize('admin', 'police', 'analyst'), alertsController.getActiveCount);
router.get('/:id', authorize('admin', 'police', 'analyst'), alertsController.findById);
router.patch('/:id', authorize('admin', 'police'), validate(updateAlertSchema), alertsController.update);

export { router as alertsRouter };
