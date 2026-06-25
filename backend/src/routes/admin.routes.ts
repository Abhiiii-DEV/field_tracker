import { Router } from 'express';
import * as ctrl from '../controllers/admin.controller';
import * as userCtrl from '../controllers/users.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  officeUpdateSchema,
  markReadSchema,
  createUserSchema,
  updateUserSchema,
  resetPasswordSchema,
} from '../validators';

const router = Router();

router.use(authenticate, authorize('admin'));

router.get('/dashboard/overview', ctrl.overview);

// User management (the "Team" page in the dashboard).
router.get('/users', userCtrl.list);
router.post('/users', validate(createUserSchema), userCtrl.create);
router.patch('/users/:id', validate(updateUserSchema), userCtrl.update);
router.post('/users/:id/reset-password', validate(resetPasswordSchema), userCtrl.resetPassword);

router.get('/employees', ctrl.employees);
router.get('/employees/:id', ctrl.employeeDetail);
router.get('/employees/:id/map', ctrl.employeeMap);
router.get('/employees/:id/timeline', ctrl.employeeTimeline);

router.get('/offices', ctrl.listOffices);
router.patch('/offices/:id', validate(officeUpdateSchema), ctrl.updateOffice);

router.get('/notifications', ctrl.listNotifications);
router.post('/notifications/read', validate(markReadSchema), ctrl.markRead);
router.post('/notifications/read-all', ctrl.markAllRead);

export default router;
