import { Schema, model, Types, InferSchemaType, HydratedDocument } from 'mongoose';
import { env } from '../config/env';

/**
 * Raw GPS points. This is the highest-volume collection — designed to be
 * append-only and read mostly for route replay / audits. Dashboards read
 * DailySummary instead (see ARCHITECTURE.md "precomputed analytics").
 */
const locationLogSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: 'User', required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    speed: { type: Number, default: 0 }, // km/h
    accuracy: { type: Number, default: 0 }, // metres
    timestamp: { type: Date, required: true, index: true },
    // Idempotency key from the device, prevents duplicate inserts on offline resync.
    clientId: { type: String },
    batteryLevel: { type: Number },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Primary read pattern: a user's points within a time window, in order.
locationLogSchema.index({ userId: 1, timestamp: 1 });

// De-duplication for offline sync: a (userId, clientId) pair is unique when present.
locationLogSchema.index(
  { userId: 1, clientId: 1 },
  { unique: true, partialFilterExpression: { clientId: { $type: 'string' } } }
);

// Automatic retention: MongoDB expires raw points after N days.
// DailySummary (precomputed) is retained indefinitely.
locationLogSchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: env.LOCATION_RETENTION_DAYS * 24 * 60 * 60 }
);

export type LocationLogDoc = HydratedDocument<InferSchemaType<typeof locationLogSchema>>;
export const LocationLog = model('LocationLog', locationLogSchema);
