import { Schema, model, Types, InferSchemaType, HydratedDocument } from 'mongoose';

const deviceInfoSchema = new Schema(
  {
    os: String,
    osVersion: String,
    model: String,
    brand: String,
    batteryLevel: Number,
    networkType: String,
  },
  { _id: false }
);

const sessionSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    loginTime: { type: Date, required: true, default: Date.now },
    logoutTime: { type: Date, default: null },
    deviceInfo: { type: deviceInfoSchema, default: {} },
    appVersion: { type: String },
  },
  { timestamps: true }
);

sessionSchema.index({ userId: 1, loginTime: -1 });

export type SessionDoc = HydratedDocument<InferSchemaType<typeof sessionSchema>>;
export const Session = model('Session', sessionSchema);
