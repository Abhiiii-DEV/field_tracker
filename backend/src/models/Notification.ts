import { Schema, model, Types, InferSchemaType, HydratedDocument } from 'mongoose';

export const NOTIFICATION_TYPES = [
  'LOGIN',
  'LOGOUT',
  'LEFT_OFFICE',
  'RETURNED_OFFICE',
  'GPS_DISABLED',
  'PERMISSION_REVOKED',
  'TRACKING_INTERRUPTED',
  'OFFLINE',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

const notificationSchema = new Schema(
  {
    // The salesperson the notification is *about*.
    userId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    userName: { type: String, required: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false, index: true },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

notificationSchema.index({ createdAt: -1 });

export type NotificationDoc = HydratedDocument<InferSchemaType<typeof notificationSchema>>;
export const Notification = model('Notification', notificationSchema);
