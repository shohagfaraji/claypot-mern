import mongoose, { Types } from 'mongoose';
import { hashPassword } from '../../server/src/lib/password.js';
import { FollowModel } from '../../server/src/models/follow.model.js';
import { RecipeModel } from '../../server/src/models/recipe.model.js';
import { ReviewModel } from '../../server/src/models/review.model.js';
import { UserModel } from '../../server/src/models/user.model.js';
import { dishes, members, testPassword } from './data.js';
import { databaseName } from './settings.js';

let passwordHash: string | undefined;

export async function resetData() {
  if (mongoose.connection.name !== databaseName || process.env.NODE_ENV !== 'test') {
    throw new Error('Fixtures require the temporary end-to-end database.');
  }

  await Promise.all(mongoose.modelNames().map((name) => mongoose.model(name).deleteMany({})));
  const hashedPassword = (passwordHash ??= await hashPassword(testPassword));
  const extraCooks = Array.from({ length: 12 }, (_, index) => ({
    _id: new Types.ObjectId(`507f1f77bcf86cd7994391${String(index).padStart(2, '0')}`),
    name: `Neighbour Cook ${String(index + 1).padStart(2, '0')}`,
    username: `neighbour_cook_${index + 1}`,
    email: `neighbour${index + 1}@example.test`,
    passwordHash: hashedPassword,
    isEmailVerified: true,
  }));
  await UserModel.create([
    ...Object.entries(members).map(([role, member]) => ({
      _id: new Types.ObjectId(member.id),
      name: member.name,
      username: member.username,
      email: member.email,
      passwordHash: hashedPassword,
      bio: role === 'cook' ? 'Simple rice dishes and slow weekend cooking.' : 'A home cook.',
      role: role === 'admin' ? ('admin' as const) : ('user' as const),
      isEmailVerified: true,
    })),
    ...extraCooks,
  ]);

  const base = {
    author: new Types.ObjectId(members.cook.id),
    summary: 'A comforting homemade dish with fresh ingredients and familiar flavours.',
    ingredients: [{ name: 'Rice', quantity: '2 cups' }],
    instructions: [{ step: 1, description: 'Combine the ingredients and cook until tender.' }],
    prepTimeMinutes: 10,
    cookTimeMinutes: 20,
    servings: 4,
    difficulty: 'easy' as const,
    cuisine: 'Mediterranean',
    category: 'Main course',
    tags: ['rice', 'quick'],
    status: 'published' as const,
    publishedAt: new Date('2026-08-20T12:00:00Z'),
  };
  await RecipeModel.create([
    {
      ...base,
      _id: new Types.ObjectId(dishes.rice.id),
      title: dishes.rice.title,
      slug: dishes.rice.slug,
    },
    {
      ...base,
      _id: new Types.ObjectId(dishes.stew.id),
      title: dishes.stew.title,
      slug: dishes.stew.slug,
      cookTimeMinutes: 55,
      difficulty: 'medium' as const,
      cuisine: 'Middle Eastern',
      category: 'Supper',
      tags: ['lentils', 'slow'],
      publishedAt: new Date('2026-08-21T12:00:00Z'),
    },
    {
      ...base,
      _id: new Types.ObjectId(dishes.toast.id),
      title: dishes.toast.title,
      slug: dishes.toast.slug,
      prepTimeMinutes: 5,
      cookTimeMinutes: 5,
      cuisine: 'Italian',
      category: 'Breakfast',
      tags: ['tomato', 'quick'],
      publishedAt: new Date('2026-08-22T12:00:00Z'),
    },
    {
      ...base,
      _id: new Types.ObjectId(dishes.draft.id),
      title: dishes.draft.title,
      slug: dishes.draft.slug,
      cuisine: 'Unpublished cuisine',
      status: 'draft' as const,
      publishedAt: null,
    },
    ...extraCooks.map((cook, index) => ({
      ...base,
      author: cook._id,
      title: `Seasonal Vegetable Bowl ${index + 1}`,
      slug: `seasonal-vegetable-bowl-${index + 1}`,
      cuisine: 'Seasonal',
      category: 'Lunch',
      tags: ['vegetables'],
      cookTimeMinutes: 35,
      publishedAt: new Date(`2026-08-${String(index + 1).padStart(2, '0')}T12:00:00Z`),
    })),
  ]);

  await ReviewModel.create([
    {
      recipe: dishes.rice.id,
      user: members.admin.id,
      rating: 5,
      comment: 'Fresh and easy to cook.',
    },
    ...extraCooks.slice(0, 3).map((cook) => ({
      recipe: dishes.stew.id,
      user: cook._id,
      rating: 4,
      comment: 'A warming supper for the whole table.',
    })),
  ]);
  await FollowModel.create({ follower: members.admin.id, following: members.cook.id });
}
