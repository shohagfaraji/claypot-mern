import { model, Schema, type Types } from 'mongoose';

export interface RecipeCollection {
  user: Types.ObjectId;
  name: string;
  normalizedName: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const recipeCollectionSchema = new Schema<RecipeCollection>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, minlength: 2, maxlength: 60 },
    normalizedName: { type: String, required: true, maxlength: 60 },
    description: { type: String, default: null, maxlength: 240 },
  },
  {
    collection: 'recipe_collections',
    timestamps: true,
    versionKey: false,
  },
);

recipeCollectionSchema.index({ user: 1, normalizedName: 1 }, { unique: true });
recipeCollectionSchema.index({ user: 1, updatedAt: -1 });

export const RecipeCollectionModel = model<RecipeCollection>(
  'RecipeCollection',
  recipeCollectionSchema,
);
