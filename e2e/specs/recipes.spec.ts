import { dishes } from '../support/data.js';
import { expect, login, loginApi, selectOption, test } from '../support/fixtures.js';
import { apiUrl } from '../support/settings.js';

test('a cook can create, edit, publish, unpublish, and delete a recipe', async ({
  page,
  request,
}) => {
  await login(page);
  await page.goto('/recipes/new');
  await page.getByLabel('Recipe title').fill('Roasted Carrot Soup');
  await page
    .getByLabel('Short description')
    .fill('A smooth carrot soup with warming spices and fresh herbs.');
  await page.getByLabel('Ingredient 1', { exact: true }).fill('Carrots');
  await page.getByLabel('Quantity', { exact: true }).fill('500 grams');
  await expect(page.getByLabel('Quantity', { exact: true })).toBeFocused();
  await page
    .getByLabel('Step 1', { exact: true })
    .fill('Roast the carrots, then blend with hot vegetable stock.');
  await expect(page.getByLabel('Ingredient 2', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Step 1', { exact: true })).toBeFocused();
  await expect(page.getByLabel('Step 2', { exact: true })).toHaveCount(0);
  await page.getByLabel('Prep minutes').fill('10');
  await expect(page.getByLabel('Step 2', { exact: true })).toBeVisible();
  await page.getByLabel('Cook minutes').fill('30');
  await page.getByLabel('Servings').fill('4');
  await page.getByLabel('Cuisine', { exact: true }).fill('British');
  await page.getByLabel('Category', { exact: true }).fill('Soup');
  await page.getByLabel('Tags', { exact: true }).fill('carrot, soup');
  await page.getByLabel('Find a recipe to pair').fill(dishes.rice.title);
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await page.getByRole('button', { name: `Add pairing ${dishes.rice.title}`, exact: true }).click();
  await page.getByLabel('Ingredient 2', { exact: true }).fill('Salt');
  await page.getByRole('button', { name: 'Save recipe', exact: true }).click();
  await expect(page).toHaveURL(/\/recipes\/new$/);
  await expect(page.getByLabel('Quantity', { exact: true }).nth(1)).toBeFocused();
  await page.getByLabel('Ingredient 2', { exact: true }).fill('');
  await page.getByLabel('Step 2', { exact: true }).fill(' ');
  const savedRequest = page.waitForRequest(
    (request) => request.method() === 'POST' && request.url() === `${apiUrl}/recipes`,
  );
  await page.getByRole('button', { name: 'Save recipe', exact: true }).click();
  const savedInput = (await savedRequest).postDataJSON();
  expect(savedInput.ingredients).toEqual([{ name: 'Carrots', quantity: '500 grams' }]);
  expect(savedInput.instructions).toHaveLength(1);
  await expect(page).toHaveURL(/\/my-recipes/);
  await expect(page.getByText('Recipe saved as a draft', { exact: true })).toBeVisible();
  const card = page
    .locator('[data-slot="card"]')
    .filter({ has: page.getByRole('heading', { name: 'Roasted Carrot Soup', exact: true }) });
  await card.getByRole('link', { name: 'Edit', exact: true }).click();
  await page.getByLabel('Recipe title').fill('Roasted Carrot and Ginger Soup');
  await selectOption(page, `Pairing type for ${dishes.rice.title}`, 'Related recipe');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByText('Recipe changes saved', { exact: true })).toBeVisible();
  const updated = page.locator('[data-slot="card"]').filter({
    has: page.getByRole('heading', { name: 'Roasted Carrot and Ginger Soup', exact: true }),
  });
  await updated.getByRole('button', { name: 'Publish recipe', exact: true }).click();
  const view = updated.getByRole('link', { name: 'View', exact: true });
  await expect(view).toBeVisible();
  const publicPath = await view.getAttribute('href');
  await view.click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Roasted Carrot and Ginger Soup' }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your published recipe' })).toBeVisible();
  const pairings = page.getByRole('region', { name: 'Serve it with' });
  await expect(pairings.getByText('Related recipe', { exact: true })).toBeVisible();
  await expect(pairings.getByRole('link')).toHaveAttribute('href', `/recipes/${dishes.rice.slug}`);
  await pairings.getByRole('link').click();
  await expect(page.getByRole('heading', { level: 1, name: dishes.rice.title })).toBeVisible();
  await page.goto('/my-recipes');
  await updated.getByRole('button', { name: 'Unpublish Roasted Carrot and Ginger Soup' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Move to drafts' }).click();
  await expect(updated.getByRole('button', { name: 'Publish recipe' })).toBeVisible();
  expect((await request.get(`${apiUrl}${publicPath!}`)).status()).toBe(404);
  await updated.getByRole('button', { name: 'Delete Roasted Carrot and Ginger Soup' }).click();
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: 'Delete recipe', exact: true })
    .click();
  await expect(updated).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Your recipe book is empty' })).toBeVisible();
  await expect(updated).toHaveCount(0);
});

test('another member cannot edit, publish, or delete a cook’s recipe', async ({
  page,
  request,
}) => {
  const headers = await loginApi(request);
  expect(
    (await request.get(`${apiUrl}/recipes/mine/${dishes.draft.id}`, { headers })).status(),
  ).toBe(404);
  expect(
    (await request.patch(`${apiUrl}/recipes/${dishes.draft.id}/publish`, { headers })).status(),
  ).toBe(404);
  expect((await request.delete(`${apiUrl}/recipes/${dishes.rice.id}`, { headers })).status()).toBe(
    404,
  );
  await login(page);
  await page.goto(`/my-recipes/${dishes.draft.id}/edit`);
  await expect(page.getByLabel('Recipe title')).toHaveCount(0);
  await expect(page.getByText('404 error', { exact: true })).toBeVisible();
  expect((await request.get(`${apiUrl}/recipes/${dishes.rice.slug}`)).status()).toBe(200);
});
