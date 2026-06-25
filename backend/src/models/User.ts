import { Schema, model, InferSchemaType, HydratedDocument } from 'mongoose';

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ['salesperson', 'admin'],
      required: true,
      default: 'salesperson',
      index: true,
    },
    phone: { type: String, trim: true },
    // Devices that may receive FCM pushes (admins). Salespeople push *to* admins.
    fcmTokens: { type: [String], default: [] },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

export type UserDoc = HydratedDocument<InferSchemaType<typeof userSchema>>;
export const User = model('User', userSchema);
