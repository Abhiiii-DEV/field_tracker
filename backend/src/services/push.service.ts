import { env } from '../config/env';
import { logger } from '../config/logger';
import { User } from '../models';

/**
 * Firebase Cloud Messaging wrapper.
 *
 * firebase-admin is loaded lazily and optionally: if FCM_SERVICE_ACCOUNT_PATH
 * is not set, pushes become no-ops and the rest of the system keeps working
 * (realtime sockets still deliver to open dashboards). This keeps local dev
 * and CI free of a hard Firebase dependency. To enable: set the env var and
 * `npm i firebase-admin`.
 */

interface PushMessage {
  title: string;
  body: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let messaging: any = null;
let initTried = false;

async function getMessaging() {
  if (initTried) return messaging;
  initTried = true;
  if (!env.FCM_SERVICE_ACCOUNT_PATH) {
    logger.info('FCM not configured — push notifications disabled (sockets still active)');
    return null;
  }
  try {
    // Dynamic import so the dependency is optional.
    // @ts-ignore - firebase-admin is an optional peer; install it to enable FCM.
    const admin = await import('firebase-admin');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const serviceAccount = require(env.FCM_SERVICE_ACCOUNT_PATH);
    admin.default.initializeApp({
      credential: admin.default.credential.cert(serviceAccount),
    });
    messaging = admin.default.messaging();
    logger.info('FCM initialised');
  } catch (err) {
    logger.warn({ err }, 'FCM initialisation failed — pushes disabled');
    messaging = null;
  }
  return messaging;
}

export async function sendPushToAdmins(
  msg: PushMessage,
  data: Record<string, string>
): Promise<void> {
  const m = await getMessaging();
  if (!m) return;

  const admins = await User.find({ role: 'admin', isActive: true })
    .select('fcmTokens')
    .lean();
  const tokens = admins.flatMap((a) => a.fcmTokens ?? []);
  if (tokens.length === 0) return;

  await m.sendEachForMulticast({
    tokens,
    notification: { title: msg.title, body: msg.body },
    data,
    android: { priority: 'high' },
    apns: { headers: { 'apns-priority': '10' } },
  });
}
