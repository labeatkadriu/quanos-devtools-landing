import mongoose, { type HydratedDocument } from 'mongoose';

export interface ILink {
  title: string;
  url: string;
  description: string;
  icon: string;
  category: string;
  color: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export type LinkDocument = HydratedDocument<ILink>;

const linkSchema = new mongoose.Schema<ILink>(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    url: { type: String, required: true, trim: true, maxlength: 2048 },
    description: { type: String, default: '', trim: true, maxlength: 500 },
    icon: { type: String, default: '', trim: true, maxlength: 64 },
    category: { type: String, default: 'General', trim: true, maxlength: 60 },
    color: { type: String, default: '#3b82f6', trim: true, maxlength: 16 },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

linkSchema.index({ category: 1, order: 1, title: 1 });

linkSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    const out = ret as unknown as Record<string, unknown>;
    out.id = (out._id as mongoose.Types.ObjectId).toString();
    delete out._id;
    return out;
  },
});

export const Link = mongoose.model<ILink>('Link', linkSchema);
