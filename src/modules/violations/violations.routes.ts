import { Router } from 'express';
import { violationsController } from './violations.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/rbac.middleware';
import { validate } from '../../middleware/validate.middleware';
import { createViolationSchema, updateViolationSchema, violationQuerySchema } from './violations.validation';

const router = Router();

router.use(authenticate);

router.post('/', authorize('admin', 'police'), validate(createViolationSchema), violationsController.create);
router.get('/', authorize('admin', 'police', 'analyst'), validate(violationQuerySchema, 'query'), violationsController.findAll);
router.get('/stats', authorize('admin', 'analyst'), violationsController.getStats);
router.get('/:id', authorize('admin', 'police', 'analyst'), violationsController.findById);
router.patch('/:id', authorize('admin', 'police'), validate(updateViolationSchema), violationsController.update);

export { router as violationsRouter };
