import { Router } from 'express';
import * as ctrl from '../controllers/auth.controller';
import { validate } from '../middlewares/validate.middleware';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { authLimiter } from '../middlewares/rateLimit.middleware';
import {
  loginSchema,
  refreshSchema,
  registerSchema,
  logoutSchema,
} from '../validators';

const router = Router();

// Registration is admin-only in production (no open signup for a tracking app).
router.post(
  '/register',
  authenticate,
  authorize('admin'),
  validate(registerSchema),
  ctrl.register
);

router.post('/login', authLimiter, validate(loginSchema), ctrl.login);
router.post('/refresh', authLimiter, validate(refreshSchema), ctrl.refresh);
router.post('/logout', authenticate, validate(logoutSchema), ctrl.logout);
router.get('/me', authenticate, ctrl.me);

export default router;
