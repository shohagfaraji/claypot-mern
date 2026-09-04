import { z } from 'zod';

const collectionNameSchema = z
  .string()
  .trim()
  .min(2, 'Collection name must contain at least 2 characters.')
  .max(60, 'Collection name cannot exceed 60 characters.')
  .transform((value) => value.replace(/\s+/g, ' ').normalize('NFKC'));

const collectionDescriptionSchema = z
  .string()
  .trim()
  .max(240, 'Collection description cannot exceed 240 characters.')
  .nullable()
  .default(null)
  .transform((value) => value?.replace(/\s+/g, ' ') || null);

export const recipeCollectionInputSchema = z.strictObject({
  name: collectionNameSchema,
  description: collectionDescriptionSchema,
});

export const recipeCollectionIdParamsSchema = z.strictObject({
  collectionId: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-f0-9]{24}$/, 'Collection ID is invalid.'),
});

export const collectionRecipeParamsSchema = recipeCollectionIdParamsSchema.extend({
  recipeId: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-f0-9]{24}$/, 'Recipe ID is invalid.'),
});

export type RecipeCollectionInput = z.infer<typeof recipeCollectionInputSchema>;
export type RecipeCollectionIdParams = z.infer<typeof recipeCollectionIdParamsSchema>;
export type CollectionRecipeParams = z.infer<typeof collectionRecipeParamsSchema>;
