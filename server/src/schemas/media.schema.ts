import { z } from 'zod';

export const imagePurposes = ['avatar', 'recipe-cover'] as const;

export const createImageUploadSignatureInputSchema = z.strictObject({
  purpose: z.enum(imagePurposes),
});

export const discardImageInputSchema = z.strictObject({
  purpose: z.enum(imagePurposes),
  publicId: z
    .string()
    .trim()
    .min(1, 'Image public ID cannot be empty.')
    .max(500, 'Image public ID is too long.')
    .regex(/^[a-zA-Z0-9/_-]+$/, 'Image public ID is invalid.'),
});

export type ImagePurpose = (typeof imagePurposes)[number];
export type CreateImageUploadSignatureInput = z.infer<typeof createImageUploadSignatureInputSchema>;
export type DiscardImageInput = z.infer<typeof discardImageInputSchema>;
