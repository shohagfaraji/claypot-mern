import { describe, expect, it } from 'vitest';
import { createImageUploadSignatureInputSchema } from '../../src/schemas/media.schema.js';

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
});
