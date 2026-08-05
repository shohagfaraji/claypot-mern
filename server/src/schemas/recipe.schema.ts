import { z } from 'zod';
import { recipeDifficulties } from '../models/recipe.model.js';

const ingredientInputSchema = z.strictObject({
  name: z
    .string()
    .trim()
    .min(1, 'Ingredient name is required.')
    .max(100, 'Ingredient name cannot exceed 100 characters.'),
  quantity: z
    .string()
    .trim()
    .min(1, 'Ingredient quantity is required.')
    .max(50, 'Ingredient quantity cannot exceed 50 characters.'),
});

const instructionInputSchema = z.strictObject({
  description: z
    .string()
    .trim()
    .min(3, 'Instruction must contain at least 3 characters.')
    .max(500, 'Instruction cannot exceed 500 characters.'),
});

const imageUrlSchema = z
  .string()
  .trim()
  .max(2_048, 'Image URL is too long.')
  .pipe(z.url('Enter a valid image URL.'));

const tagSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'Tags cannot be empty.')
  .max(30, 'Tags cannot exceed 30 characters.');

export const createRecipeInputSchema = z.strictObject({
  title: z
    .string()
    .trim()
    .min(3, 'Title must contain at least 3 characters.')
    .max(120, 'Title cannot exceed 120 characters.'),
  summary: z
    .string()
    .trim()
    .min(10, 'Summary must contain at least 10 characters.')
    .max(300, 'Summary cannot exceed 300 characters.'),
  imageUrl: imageUrlSchema.nullable().optional(),
  ingredients: z
    .array(ingredientInputSchema)
    .min(1, 'Add at least one ingredient.')
    .max(50, 'A recipe can have at most 50 ingredients.'),
  instructions: z
    .array(instructionInputSchema)
    .min(1, 'Add at least one instruction.')
    .max(50, 'A recipe can have at most 50 instructions.'),
  prepTimeMinutes: z
    .number()
    .int('Preparation time must be a whole number.')
    .min(0, 'Preparation time cannot be negative.')
    .max(1_440, 'Preparation time cannot exceed 24 hours.'),
  cookTimeMinutes: z
    .number()
    .int('Cooking time must be a whole number.')
    .min(0, 'Cooking time cannot be negative.')
    .max(1_440, 'Cooking time cannot exceed 24 hours.'),
  servings: z
    .number()
    .int('Servings must be a whole number.')
    .min(1, 'A recipe must serve at least one person.')
    .max(100, 'A recipe cannot exceed 100 servings.'),
  difficulty: z.enum(recipeDifficulties, 'Select a valid difficulty.'),
  cuisine: z
    .string()
    .trim()
    .min(2, 'Cuisine must contain at least 2 characters.')
    .max(60, 'Cuisine cannot exceed 60 characters.'),
  category: z
    .string()
    .trim()
    .min(2, 'Category must contain at least 2 characters.')
    .max(60, 'Category cannot exceed 60 characters.'),
  tags: z
    .array(tagSchema)
    .max(10, 'A recipe can have at most 10 tags.')
    .transform((tags) => [...new Set(tags)])
    .default([]),
});

export type CreateRecipeInput = z.infer<typeof createRecipeInputSchema>;
