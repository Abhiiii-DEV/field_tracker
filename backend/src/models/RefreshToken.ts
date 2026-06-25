import { Schema, model, Types, InferSchemaType, HydratedDocument } from 'mongoose';

/**
 * Server-side record of issued refresh tokens, enabling rotation and
 * revocation (logout-everywhere, stolen-token invalidation). The JWT carries
 * a `tokenId` (jti) that must match an un-revoked document here.
 */
const refreshTokenSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    tokenId: { type: String, required: true, unique: true }, // jti
    revoked: { type: Boolean, default: false },
    replacedBy: { type: String, default: null }, // jti of the rotated successor
    userAgent: { type: String },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// Auto-purge expired tokens.
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type RefreshTokenDoc = HydratedDocument<InferSchemaType<typeof refreshTokenSchema>>;
export const RefreshToken = model('RefreshToken', refreshTokenSchema);
