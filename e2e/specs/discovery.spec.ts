import { dishes, members } from '../support/data.js';
import { expect, selectOption, test } from '../support/fixtures.js';

test('recipe search updates while typing and filter labels are clear before opening menus', async ({
  page,
}) => {
  await page.goto('/recipes?page=2');
  for (const [name, label] of [
    ['Filter by difficulty', 'All difficulties'],
    ['Filter by cuisine', 'All cuisines'],
    ['Filter by category', 'All categories'],
    ['Filter by tag', 'All tags'],
  ])
    await expect(page.getByRole('combobox', { name: name!, exact: true })).toContainText(label!);
  const search = page.getByRole('searchbox', { name: 'Search recipes', exact: true });
  await search.fill('L');
  await expect(page).toHaveURL(/search=L/);
  await expect(page.getByText('15 recipes found', { exact: true })).toBeVisible();
  await search.fill('Lem');
  await expect(page.getByText('1 recipe found', { exact: true })).toBeVisible();
  await expect(page).not.toHaveURL(/page=2/);
  await expect(search).toBeFocused();
  await expect(search).toHaveValue('Lem');
  await expect(page.getByRole('heading', { name: dishes.rice.title, exact: true })).toBeVisible();
  await search.fill('nomatchingdish');
  await expect(page.getByText('0 recipes found', { exact: true })).toBeVisible();
  await expect(search).toBeFocused();
  await search.fill('Lentil');
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
  await expect(search).toHaveValue('');
  await expect(page.getByText('15 recipes found', { exact: true })).toBeVisible();
  await search.fill('Lemon');
  await expect(page.getByText('1 recipe found', { exact: true })).toBeVisible();
  await selectOption(page, 'Filter by difficulty', 'Easy');
  await search.fill('Lentil');
  await expect(page.getByText('0 recipes found', { exact: true })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Filter by difficulty' })).toContainText('Easy');
  await page.goBack();
  await expect(search).toHaveValue('Lemon');
  await expect(page.getByText('1 recipe found', { exact: true })).toBeVisible();
});

test('partial ingredient searches find recipes and punctuation is treated literally', async ({
  page,
}) => {
  await page.goto('/recipes');
  const search = page.getByRole('searchbox', { name: 'Search recipes', exact: true });

  await search.fill('RIC');
  await expect(page.getByText('15 recipes found', { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/search=RIC/);
  await expect(page.getByRole('heading', { name: dishes.toast.title, exact: true })).toBeVisible();
  await search.fill('lem ric');
  await expect(page.getByText('1 recipe found', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: dishes.rice.title, exact: true })).toBeVisible();
  await search.fill('.*');
  await expect(page.getByText('0 recipes found', { exact: true })).toBeVisible();
});

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
