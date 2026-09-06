export const testPassword = 'KitchenPass123!';

export const members = {
  reader: {
    id: '507f1f77bcf86cd799439011',
    name: 'Robin Reed',
    username: 'robin_kitchen',
    email: 'robin@example.test',
  },
  cook: {
    id: '507f1f77bcf86cd799439012',
    name: 'Mina Malik',
    username: 'mina_kitchen',
    email: 'mina@example.test',
  },
  admin: {
    id: '507f1f77bcf86cd799439013',
    name: 'Casey Park',
    username: 'casey_kitchen',
    email: 'casey@example.test',
  },
} as const;

export type Member = keyof typeof members;

export const dishes = {
  rice: {
    id: '607f1f77bcf86cd799439011',
    title: 'Lemon Herb Rice',
    slug: 'lemon-herb-rice',
  },
  stew: {
    id: '607f1f77bcf86cd799439012',
    title: 'Slow Lentil Stew',
    slug: 'slow-lentil-stew',
  },
  toast: {
    id: '607f1f77bcf86cd799439013',
    title: 'Garden Tomato Toast',
    slug: 'garden-tomato-toast',
  },
  draft: {
    id: '607f1f77bcf86cd799439014',
    title: 'Private Family Recipe',
    slug: 'private-family-recipe',
  },
} as const;
