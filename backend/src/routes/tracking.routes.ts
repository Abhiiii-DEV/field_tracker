import { Router } from 'express';
import * as ctrl from '../controllers/tracking.controller';
import { validate } from '../middlewares/validate.middleware';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { ingestLimiter } from '../middlewares/rateLimit.middleware';
import { ingestSchema, trackingEventSchema, fcmTokenSchema } from '../validators';

const router = Router();

router.use(authenticate);

// Salesperson GPS ingest (single + offline batch).
router.post('/track', authorize('salesperson'), ingestLimiter, validate(ingestSchema), ctrl.ingest);
router.post('/track/event', authorize('salesperson'), validate(trackingEventSchema), ctrl.trackingEvent);

// Salesperson self-stats for the simple dashboard.
router.get('/me/stats', authorize('salesperson'), ctrl.myStats);

// Shared runtime config (office geofence + tracking thresholds).
router.get('/config', ctrl.getClientConfig);

// FCM token registration (admins receive pushes).
router.post('/me/fcm-token', validate(fcmTokenSchema), ctrl.registerFcmToken);

export default router;
