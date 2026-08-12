import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';
import { ReviewModel } from '../../src/models/review.model.js';

function createValidReview() {
  return new ReviewModel({
    recipe: new Types.ObjectId(),
    user: new Types.ObjectId(),
    rating: 5,
    comment: '  This recipe was clear, reliable, and delicious.  ',
  });
}

describe('Review model', () => {
  it('accepts and normalizes a complete review', async () => {
    const review = createValidReview();

    await expect(review.validate()).resolves.toBeUndefined();
    expect(review.comment).toBe('This recipe was clear, reliable, and delicious.');
  });

  it('requires review relationships and content', async () => {
    await expect(new ReviewModel({}).validate()).rejects.toMatchObject({
      errors: {
        recipe: expect.any(Object),
        user: expect.any(Object),
        rating: expect.any(Object),
        comment: expect.any(Object),
      },
    });
  });

  it('rejects invalid ratings and comment lengths', async () => {
    const review = createValidReview();
    review.rating = 6;
    review.comment = 'Too short';

    await expect(review.validate()).rejects.toMatchObject({
      errors: {
        rating: expect.any(Object),
        comment: expect.any(Object),
      },
    });
  });

  it('prevents duplicate user reviews and supports recent recipe queries', () => {
    expect(ReviewModel.schema.indexes()).toEqual(
      expect.arrayContaining([
        [{ recipe: 1, user: 1 }, expect.objectContaining({ unique: true })],
        [{ recipe: 1, createdAt: -1 }, expect.any(Object)],
      ]),
    );
  });
});
