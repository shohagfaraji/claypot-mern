import { model, Schema, type Types } from 'mongoose';

export interface Review {
  recipe: Types.ObjectId;
  user: Types.ObjectId;
  rating: number;
  comment: string;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<Review>(
  {
    recipe: {
      type: Schema.Types.ObjectId,
      ref: 'Recipe',
      required: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 1_000,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

reviewSchema.index({ recipe: 1, user: 1 }, { unique: true });
reviewSchema.index({ recipe: 1, createdAt: -1 });

export const ReviewModel = model<Review>('Review', reviewSchema);
