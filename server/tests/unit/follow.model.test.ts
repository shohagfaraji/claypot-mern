import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';
import { FollowModel } from '../../src/models/follow.model.js';

describe('Follow model', () => {
  it('accepts a follower relationship', async () => {
    const follow = new FollowModel({
      follower: new Types.ObjectId(),
      following: new Types.ObjectId(),
    });

    await expect(follow.validate()).resolves.toBeUndefined();
  });

  it('requires both sides of the relationship', async () => {
    await expect(new FollowModel({}).validate()).rejects.toMatchObject({
      errors: {
        follower: expect.any(Object),
        following: expect.any(Object),
      },
    });
  });

  it('prevents duplicate relationships and supports connection lists', () => {
    expect(FollowModel.schema.indexes()).toEqual(
      expect.arrayContaining([
        [{ follower: 1, following: 1 }, expect.objectContaining({ unique: true })],
        [{ following: 1, createdAt: -1 }, expect.any(Object)],
        [{ follower: 1, createdAt: -1 }, expect.any(Object)],
      ]),
    );
  });
});
