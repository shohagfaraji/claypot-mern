import { dishes } from '../support/data.js';
import { expect, login, loginApi, test } from '../support/fixtures.js';
import { apiUrl } from '../support/settings.js';

test('collections accept a blank description and keep saved recipes through edits and removal', async ({
  page,
}) => {
  await login(page);
  await page.goto('/collections');
  await page.getByRole('button', { name: 'New collection' }).first().click();
  await page.getByLabel('Collection name').fill('Weeknight dinners');
  await page.getByRole('button', { name: 'Create collection', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Weeknight dinners', exact: true })).toBeVisible();
  await page.goto(`/recipes/${dishes.rice.slug}`);
  await page.getByRole('button', { name: 'Organize recipe' }).click();
  await page.getByRole('checkbox', { name: /Weeknight dinners/ }).click();
  await expect(page.getByRole('checkbox', { name: /Weeknight dinners/ })).toBeChecked();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Saved recipe', exact: true })).toBeVisible();
  await page.goto('/collections');
  const card = page
    .locator('[data-slot="card"]')
    .filter({ has: page.getByRole('heading', { name: 'Weeknight dinners', exact: true }) });
  await card.getByRole('link').click();
  await expect(page.getByRole('heading', { name: dishes.rice.title, exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByLabel('Collection name').fill('Quick dinners');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Quick dinners' })).toBeVisible();
  await page
    .getByRole('button', { name: `Remove ${dishes.rice.title} from this collection` })
    .click();
  await expect(page.getByRole('heading', { name: dishes.rice.title, exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete collection' }).click();
  await expect(page).toHaveURL(/\/collections$/);
  await expect(page.getByRole('heading', { name: 'Quick dinners', exact: true })).toHaveCount(0);
  await page.goto('/saved-recipes');
  await expect(page.getByRole('heading', { name: dishes.rice.title, exact: true })).toBeVisible();
  await page.goto(`/recipes/${dishes.rice.slug}`);
  await page.getByRole('button', { name: 'Saved recipe', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Save recipe', exact: true })).toBeVisible();
  await page.goto('/saved-recipes');
  await expect(page.getByRole('heading', { name: 'Your saved collection is empty' })).toBeVisible();
  await expect(page.getByRole('heading', { name: dishes.rice.title, exact: true })).toHaveCount(0);
});

test('a private collection cannot be read or changed by another member', async ({
  request,
  playwright,
}) => {
  const ownerHeaders = await loginApi(request);
  const response = await request.post(`${apiUrl}/collections`, {
    headers: ownerHeaders,
    data: { name: 'Private dinners' },
  });
  expect(response.status()).toBe(201);
  const { data } = (await response.json()) as { data: { collection: { id: string } } };
  const other = await playwright.request.newContext();
  try {
    const headers = await loginApi(other, 'cook');
    const path = `${apiUrl}/collections/${data.collection.id}`;
    expect((await other.get(`${path}/recipes`, { headers })).status()).toBe(404);
    expect((await other.patch(path, { headers, data: { name: 'Changed name' } })).status()).toBe(
      404,
    );
    expect((await other.delete(path, { headers })).status()).toBe(404);
    expect((await request.get(`${path}/recipes`, { headers: ownerHeaders })).status()).toBe(200);
  } finally {
    await other.dispose();
  }
});
