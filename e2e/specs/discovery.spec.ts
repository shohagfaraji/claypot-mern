import { dishes, members } from '../support/data.js';
import { expect, selectOption, test } from '../support/fixtures.js';

test('guests can search, combine filters, and clear them', async ({ page }) => {
  await page.goto('/recipes');
  await expect(page.getByText('15 recipes found', { exact: true })).toBeVisible();
  await page.getByRole('searchbox', { name: 'Search recipes', exact: true }).fill('Lemon');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page.getByRole('heading', { name: dishes.rice.title, exact: true })).toBeVisible();
  await expect(page.getByText('1 recipe found', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).click();

  await selectOption(page, 'Filter by cuisine', /^Mediterranean/);
  await selectOption(page, 'Filter by category', /^Main course/);
  await selectOption(page, 'Filter by tag', /^rice /);
  await selectOption(page, 'Filter by difficulty', 'Easy');
  await expect(page.getByText('1 recipe found', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: dishes.rice.title, exact: true })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Filter by cuisine' })).toContainText(
    'Mediterranean',
  );

  await page.getByRole('button', { name: 'Clear filters' }).click();
  await page.getByRole('searchbox', { name: 'Search recipes', exact: true }).fill('nomatchingdish');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page.getByText('0 recipes found', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page.getByText('15 recipes found', { exact: true })).toBeVisible();
});

test('recipe ranking and pagination use the complete published library', async ({ page }) => {
  await page.goto('/recipes');
  const titles = page.locator('#recipe-results').getByRole('heading', { level: 3 });
  await expect(titles).toHaveCount(9);
  await expect(titles.first()).toHaveText(dishes.toast.title);
  await selectOption(page, 'Sort recipes', 'Top rated');
  await expect(titles.first()).toHaveText(dishes.rice.title);
  await selectOption(page, 'Sort recipes', 'Most reviewed');
  await expect(titles.first()).toHaveText(dishes.stew.title);
  await selectOption(page, 'Sort recipes', 'Quickest first');
  await expect(titles.first()).toHaveText(dishes.toast.title);
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(titles).toHaveCount(6);
  await expect(page.getByText('Page 2 of 2')).toBeVisible();
  await selectOption(page, 'Filter by difficulty', 'Medium');
  await expect(page).not.toHaveURL(/page=2/);
  await expect(titles).toHaveText([dishes.stew.title]);
});

test('recipe links open at the top and drafts stay private', async ({ page }) => {
  await page.goto('/recipes');
  await page
    .getByRole('heading', { name: dishes.rice.title, exact: true })
    .getByRole('link')
    .click();
  await expect(page.getByRole('heading', { level: 1, name: dishes.rice.title })).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await expect(page.getByRole('heading', { name: 'Ingredients', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Method', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Sign in to save' })).toBeVisible();
  await page.goto(`/recipes/${dishes.draft.slug}`);
  await expect(page.getByRole('heading', { name: dishes.draft.title })).toHaveCount(0);
  await expect(page.getByText('404 error', { exact: true })).toBeVisible();
});

test('guests can find cooks, page through the directory, and open a profile', async ({ page }) => {
  await page.goto('/cooks');
  await expect(page.getByText('13 cooks found', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByText('Page 2 of 2')).toBeVisible();
  await page.getByRole('searchbox', { name: 'Search cooks' }).fill('mina_kitchen');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page.getByText('1 cook found', { exact: true })).toBeVisible();
  await expect(page).not.toHaveURL(/page=2/);
  await selectOption(page, 'Sort cooks', 'Name A–Z');
  await page.getByRole('link', { name: 'View profile', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: members.cook.name })).toBeVisible();
  await expect(page.getByText('3 published recipes', { exact: true })).toBeVisible();
});
