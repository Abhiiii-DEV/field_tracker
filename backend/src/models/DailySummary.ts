import { Schema, model, Types, InferSchemaType, HydratedDocument } from 'mongoose';

/**
 * Pre-computed daily analytics. THIS is what every dashboard reads.
 * Maintained incrementally on each location ingest and finalised by the
 * nightly close worker. One document per (userId, date).
 */
const dailySummarySchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true }, // YYYY-MM-DD

    distanceTravelledKm: { type: Number, default: 0 },
    travelMinutes: { type: Number, default: 0 },

    stopCount: { type: Number, default: 0 },
    stopDurationMinutes: { type: Number, default: 0 },

    leftOfficeAt: { type: Date, default: null },
    returnedOfficeAt: { type: Date, default: null },

    totalLocationPoints: { type: Number, default: 0 },

    // Bookkeeping used by incremental distance accumulation.
    lastPointAt: { type: Date, default: null },
    lastLat: { type: Number, default: null },
    lastLng: { type: Number, default: null },

    // Cached road-snapped polyline (lazy: computed on first map view, reused
    // until new points arrive). snappedRouteCount = how many raw route points it
    // was built from, used to detect staleness.
    snappedRoute: {
      type: [{ latitude: Number, longitude: Number, _id: false }],
      default: undefined,
    },
    snappedRouteCount: { type: Number, default: 0 },

    finalized: { type: Boolean, default: false },
  },
  { timestamps: true }
);

dailySummarySchema.index({ userId: 1, date: 1 }, { unique: true });
dailySummarySchema.index({ date: 1 });

export type DailySummaryDoc = HydratedDocument<InferSchemaType<typeof dailySummarySchema>>;
export const DailySummary = model('DailySummary', dailySummarySchema);
