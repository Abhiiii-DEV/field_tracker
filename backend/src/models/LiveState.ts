import { Schema, model, Types, InferSchemaType, HydratedDocument } from 'mongoose';

/**
 * Single-document-per-user cache of the *current* live state. Lets the admin
 * dashboard render the live employee list and map without scanning LocationLogs.
 * Updated on every ingest and by the stale-detection worker.
 *
 * (Not in the original 7-collection spec, but required to keep the live view
 * O(employees) instead of O(gps-points). Documented in ARCHITECTURE.md.)
 */
const liveStateSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: 'User', required: true, unique: true },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    speed: { type: Number, default: 0 }, // km/h
    isMoving: { type: Boolean, default: false },
    trackingStatus: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'OFFLINE'],
      default: 'INACTIVE',
      index: true,
    },
    locationStatus: {
      type: String,
      enum: ['INSIDE_OFFICE', 'OUTSIDE_OFFICE', 'UNKNOWN'],
      default: 'UNKNOWN',
      index: true,
    },
    isOnline: { type: Boolean, default: false, index: true },
    activeSessionId: { type: Types.ObjectId, ref: 'Session', default: null },
    lastSeenAt: { type: Date, default: null },
    batteryLevel: { type: Number, default: null },
    // Stop-detection worker cursor: timestamp up to which logs have been
    // evaluated for halts. Keeps the worker incremental instead of rescanning.
    stopCursorAt: { type: Date, default: null },
    // Set true once an OFFLINE notification has fired, so the stale worker
    // doesn't spam the admin every cycle. Reset on the next live ingest.
    offlineNotified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export type LiveStateDoc = HydratedDocument<InferSchemaType<typeof liveStateSchema>>;
export const LiveState = model('LiveState', liveStateSchema);
