import { Schema, model, Types, InferSchemaType, HydratedDocument } from 'mongoose';

const stopSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    durationMinutes: { type: Number, required: true },
    date: { type: String, required: true, index: true }, // YYYY-MM-DD (local day)
    resolvedAddress: { type: String }, // filled lazily via reverse geocoding
  },
  { timestamps: true }
);

stopSchema.index({ userId: 1, startTime: 1 });
// Prevent duplicate stops being created for the same window by the worker.
stopSchema.index({ userId: 1, startTime: 1, endTime: 1 }, { unique: true });

export type StopDoc = HydratedDocument<InferSchemaType<typeof stopSchema>>;
export const Stop = model('Stop', stopSchema);
