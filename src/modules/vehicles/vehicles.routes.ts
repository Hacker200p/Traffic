import { Router } from 'express';
import { vehiclesController } from './vehicles.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/rbac.middleware';
import { validate } from '../../middleware/validate.middleware';
import { createVehicleSchema, updateVehicleSchema, vehicleQuerySchema } from './vehicles.validation';

const router = Router();

router.use(authenticate);

router.post('/', authorize('admin', 'police'), validate(createVehicleSchema), vehiclesController.create);
router.get('/', authorize('admin', 'police', 'analyst'), validate(vehicleQuerySchema, 'query'), vehiclesController.findAll);
router.get('/plate/:plateNumber', authorize('admin', 'police'), vehiclesController.findByPlate);
router.get('/:id', authorize('admin', 'police', 'analyst'), vehiclesController.findById);
router.patch('/:id', authorize('admin', 'police'), validate(updateVehicleSchema), vehiclesController.update);
router.delete('/:id', authorize('admin'), vehiclesController.delete);

export { router as vehiclesRouter };
