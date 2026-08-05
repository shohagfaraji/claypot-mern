import { describe, expect, it } from 'vitest';
import { createSlugBase } from '../../src/lib/slug.js';

describe('slug generation', () => {
  it.each([
    ['Spiced Claypot Rice', 'spiced-claypot-rice'],
    ['Café-style Chicken & Rice!', 'cafe-style-chicken-rice'],
    ['  Quick---Dinner  ', 'quick-dinner'],
    ['মাটির হাঁড়ির বিরিয়ানি', 'recipe'],
  ])('converts %s to %s', (value, expectedSlug) => {
    expect(createSlugBase(value)).toBe(expectedSlug);
  });

  it('keeps the slug base within its storage limit', () => {
    const slug = createSlugBase('A very long recipe title '.repeat(20));

    expect(slug.length).toBeLessThanOrEqual(140);
    expect(slug).not.toMatch(/-$/);
  });
});
