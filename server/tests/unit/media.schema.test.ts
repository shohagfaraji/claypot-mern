import { describe, expect, it } from 'vitest';
import {
  createImageUploadSignatureInputSchema,
  discardImageInputSchema,
} from '../../src/schemas/media.schema.js';

describe('media schemas', () => {
  it.each(['avatar', 'recipe-cover'] as const)('accepts the %s image purpose', (purpose) => {
    expect(createImageUploadSignatureInputSchema.parse({ purpose })).toEqual({ purpose });
  });

  it('rejects unsupported purposes and unknown fields', () => {
    expect(createImageUploadSignatureInputSchema.safeParse({ purpose: 'banner' }).success).toBe(
      false,
    );
    expect(
      createImageUploadSignatureInputSchema.safeParse({ purpose: 'avatar', userId: 'other-user' })
        .success,
    ).toBe(false);
  });

  it('accepts a managed image discard request', () => {
    expect(
      discardImageInputSchema.parse({
        purpose: 'recipe-cover',
        publicId: '  claypot/recipes/user-id/image-id  ',
      }),
    ).toEqual({
      purpose: 'recipe-cover',
      publicId: 'claypot/recipes/user-id/image-id',
    });
  });

  it('rejects malformed image public IDs', () => {
    expect(
      discardImageInputSchema.safeParse({
        purpose: 'avatar',
        publicId: 'claypot/avatars/user-id/image id',
      }).success,
    ).toBe(false);
  });
});
