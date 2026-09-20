import { dishes } from '../support/data.js';
import { expect, login, loginApi, test } from '../support/fixtures.js';
import { apiUrl } from '../support/settings.js';

test('pairings reject private targets and hide unpublished or deleted recipes', async ({
  page,
  request,
}) => {
  const headers = await loginApi(request, 'cook');
  const input = {
    title: 'Curry with accompaniments',
    summary: 'A warming curry with suggestions for the table.',
    ingredients: [{ name: 'Chicken', quantity: '500 g' }],
    instructions: [{ description: 'Simmer until the chicken is cooked through.' }],
    prepTimeMinutes: 15,
    cookTimeMinutes: 30,
    servings: 4,
    difficulty: 'easy',
    cuisine: 'Bangladeshi',
    category: 'Main course',
    tags: [],
  };
  const privateTarget = await request.post(`${apiUrl}/recipes`, {
    headers,
    data: {
      ...input,
      pairings: [{ recipeId: dishes.draft.id, label: 'Side dish' }],
    },
  });
  expect(privateTarget.status()).toBe(400);
  const created = await request.post(`${apiUrl}/recipes`, {
    headers,
    data: {
      ...input,
      pairings: [
        { recipeId: dishes.rice.id, label: 'Side dish' },
        { recipeId: dishes.toast.id, label: 'Related recipe' },
      ],
    },
  });
  expect(created.status()).toBe(201);
  const {
    data: { recipe },
  } = (await created.json()) as { data: { recipe: { id: string; slug: string } } };
  expect((await request.patch(`${apiUrl}/recipes/${recipe.id}/publish`, { headers })).ok()).toBe(
    true,
  );
  expect(
    (
      await request.put(`${apiUrl}/recipes/${recipe.id}`, {
        headers,
        data: { ...input, pairings: [{ recipeId: recipe.id, label: 'Related recipe' }] },
      })
    ).status(),
  ).toBe(400);
  expect(
    (await request.patch(`${apiUrl}/recipes/${dishes.rice.id}/unpublish`, { headers })).ok(),
  ).toBe(true);
  expect((await request.delete(`${apiUrl}/recipes/${dishes.toast.id}`, { headers })).ok()).toBe(
    true,
  );
  const detail = await request.get(`${apiUrl}/recipes/${recipe.slug}`);
  expect((await detail.json()).data.recipe.pairedRecipes).toEqual([]);
  await page.goto(`/recipes/${recipe.slug}`);
  await expect(page.getByRole('heading', { level: 1, name: input.title })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Serve it with' })).toHaveCount(0);
  await login(page, 'cook');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/my-recipes/${recipe.id}/edit`);
  await expect(
    page.getByText('Unavailable recipe — remove this selection', { exact: true }),
  ).toHaveCount(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page
    .getByRole('button', { name: 'Remove pairing unavailable recipe', exact: true })
    .first()
    .click();
  await page
    .getByRole('button', { name: 'Remove pairing unavailable recipe', exact: true })
    .click();
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page).toHaveURL(/\/my-recipes$/);
  const saved = await request.get(`${apiUrl}/recipes/mine/${recipe.id}`, { headers });
  expect((await saved.json()).data.recipe.pairings).toEqual([]);
});
