import { Notification, NotificationType, User } from '../models';
import { emitNotification } from '../realtime/socket';
import { logger } from '../config/logger';
import { sendPushToAdmins } from './push.service';

interface CreateNotificationInput {
  userId: string;
  userName: string;
  type: NotificationType;
  message: string;
  metadata?: Record<string, unknown>;
}

/**
 * Single choke-point for every admin notification: persist → socket broadcast
 * → FCM push. Keeping this in one place means delivery monitoring and future
 * channel additions (email/SMS) touch only this function.
 */
export async function createNotification(input: CreateNotificationInput) {
  const notif = await Notification.create({
    userId: input.userId,
    userName: input.userName,
    type: input.type,
    message: input.message,
    metadata: input.metadata,
    isRead: false,
  });

  // 1) Realtime to any connected admin dashboard.
  emitNotification(notif.toObject());

  // 2) Push to admins who are not currently looking at the dashboard.
  void sendPushToAdmins(
    { title: titleFor(input.type), body: input.message },
    { type: input.type, userId: input.userId, notificationId: String(notif._id) }
  ).catch((err) => logger.warn({ err }, 'FCM push failed'));

  return notif;
}

function titleFor(type: NotificationType): string {
  switch (type) {
    case 'LOGIN':
      return 'Employee logged in';
    case 'LOGOUT':
      return 'Employee logged out';
    case 'LEFT_OFFICE':
      return 'Employee left office';
    case 'RETURNED_OFFICE':
      return 'Employee returned to office';
    case 'GPS_DISABLED':
      return 'GPS disabled';
    case 'PERMISSION_REVOKED':
      return 'Location permission revoked';
    case 'TRACKING_INTERRUPTED':
      return 'Tracking interrupted';
    case 'OFFLINE':
      return 'Employee offline';
    default:
      return 'Field tracking alert';
  }
}

export async function listNotifications(opts: { unreadOnly?: boolean; limit?: number; skip?: number }) {
  const filter = opts.unreadOnly ? { isRead: false } : {};
  const [items, total, unread] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(opts.skip ?? 0).limit(opts.limit ?? 50).lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ isRead: false }),
  ]);
  return { items, total, unread };
}

export async function markRead(ids: string[]) {
  await Notification.updateMany({ _id: { $in: ids } }, { $set: { isRead: true } });
}

export async function markAllRead() {
  await Notification.updateMany({ isRead: false }, { $set: { isRead: true } });
}

/** Convenience used across services so callers don't re-fetch the user name. */
export async function notifyAbout(
  userId: string,
  type: NotificationType,
  message: string,
  metadata?: Record<string, unknown>
) {
  const user = await User.findById(userId).select('name').lean();
  return createNotification({
    userId,
    userName: user?.name ?? 'Employee',
    type,
    message,
    metadata,
  });
}
