import { z } from 'zod';

export const imagePurposes = ['avatar', 'recipe-cover'] as const;

export const createImageUploadSignatureInputSchema = z.strictObject({
  purpose: z.enum(imagePurposes),
});

export type ImagePurpose = (typeof imagePurposes)[number];
export type CreateImageUploadSignatureInput = z.infer<typeof createImageUploadSignatureInputSchema>;
