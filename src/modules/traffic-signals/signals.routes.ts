import { Router } from 'express';
import { signalsController } from './signals.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/rbac.middleware';
import { validate } from '../../middleware/validate.middleware';
import { createSignalSchema, updateSignalSchema, signalStateSchema, signalQuerySchema, signalScheduleSchema } from './signals.validation';

const router = Router();

router.use(authenticate);

router.post('/', authorize('admin'), validate(createSignalSchema), signalsController.create);
router.get('/', authorize('admin', 'police', 'analyst'), validate(signalQuerySchema, 'query'), signalsController.findAll);
router.get('/group/:groupId', authorize('admin', 'police', 'analyst'), signalsController.getGroupSignals);
router.get('/:id', authorize('admin', 'police', 'analyst'), signalsController.findById);
router.patch('/:id', authorize('admin'), validate(updateSignalSchema), signalsController.update);
router.post('/:id/state', authorize('admin', 'police'), validate(signalStateSchema), signalsController.changeState);
router.get('/:id/log', authorize('admin', 'police', 'analyst'), signalsController.getStateLog);
router.post('/:id/schedule', authorize('admin'), validate(signalScheduleSchema), signalsController.createSchedule);
router.get('/:id/schedules', authorize('admin', 'police', 'analyst'), signalsController.getSchedules);
router.delete('/:id', authorize('admin'), signalsController.delete);

export { router as signalsRouter };
