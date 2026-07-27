import { model, Schema, type InferSchemaType } from 'mongoose';

export const recipeDifficulties = ['easy', 'medium', 'hard'] as const;
export const recipeStatuses = ['draft', 'published'] as const;

const ingredientSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    quantity: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
  },
  { _id: false },
);

const instructionSchema = new Schema(
  {
    step: {
      type: Number,
      required: true,
      min: 1,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
  },
  { _id: false },
);

const recipeSchema = new Schema(
  {
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 120,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 160,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    },
    summary: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 300,
    },
    imageUrl: {
      type: String,
      trim: true,
      maxlength: 2_048,
      default: null,
    },
    ingredients: {
      type: [ingredientSchema],
      required: true,
      validate: {
        validator: (ingredients: unknown[]) => ingredients.length > 0,
        message: 'A recipe requires at least one ingredient.',
      },
    },
    instructions: {
      type: [instructionSchema],
      required: true,
      validate: {
        validator: (instructions: unknown[]) => instructions.length > 0,
        message: 'A recipe requires at least one instruction.',
      },
    },
    prepTimeMinutes: {
      type: Number,
      required: true,
      min: 0,
      max: 1_440,
    },
    cookTimeMinutes: {
      type: Number,
      required: true,
      min: 0,
      max: 1_440,
    },
    servings: {
      type: Number,
      required: true,
      min: 1,
      max: 100,
    },
    difficulty: {
      type: String,
      enum: recipeDifficulties,
      required: true,
    },
    cuisine: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
    },
    tags: {
      type: [
        {
          type: String,
          trim: true,
          lowercase: true,
          maxlength: 30,
        },
      ],
      validate: {
        validator: (tags: unknown[]) => tags.length <= 10,
        message: 'A recipe can have at most 10 tags.',
      },
      default: [],
    },
    status: {
      type: String,
      enum: recipeStatuses,
      default: 'draft',
      index: true,
    },
    publishedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

recipeSchema.index({ status: 1, publishedAt: -1 });
recipeSchema.index({ title: 'text', summary: 'text', tags: 'text' });

export type Recipe = InferSchemaType<typeof recipeSchema>;

export const RecipeModel = model<Recipe>('Recipe', recipeSchema);
