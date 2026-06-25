import { Schema, model, InferSchemaType, HydratedDocument } from 'mongoose';

const officeSchema = new Schema(
  {
    officeName: { type: String, required: true, trim: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    radius: { type: Number, required: true, default: 1000 }, // metres
    isActive: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

export type OfficeDoc = HydratedDocument<InferSchemaType<typeof officeSchema>>;
export const Office = model('Office', officeSchema);
