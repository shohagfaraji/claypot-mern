import { model, Schema, type Types } from 'mongoose';

export interface SavedRecipe {
  user: Types.ObjectId;
  recipe: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const savedRecipeSchema = new Schema<SavedRecipe>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    recipe: {
      type: Schema.Types.ObjectId,
      ref: 'Recipe',
      required: true,
    },
  },
  {
    collection: 'saved_recipes',
    timestamps: true,
    versionKey: false,
  },
);

savedRecipeSchema.index({ user: 1, recipe: 1 }, { unique: true });
savedRecipeSchema.index({ user: 1, createdAt: -1 });

export const SavedRecipeModel = model<SavedRecipe>('SavedRecipe', savedRecipeSchema);
