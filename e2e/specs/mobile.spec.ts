import { dishes } from '../support/data.js';
import { expect, login, test } from '../support/fixtures.js';

test('phone account settings show one section at a time without overflow', async ({ page }) => {
  await login(page);
  await page.goto('/account');
  const navigation = page.getByRole('navigation', { name: 'Account settings', exact: true });
  await page.getByLabel('Bio', { exact: true }).fill('An unfinished introduction.');
  for (const [label, heading] of [
    ['Email', 'Change email address'],
    ['Password', 'Change password'],
    ['Sessions', 'Active sessions'],
    ['Delete account', 'Delete account'],
  ]) {
    await navigation.getByRole('link', { name: label!, exact: true }).click();
    await expect(page.getByRole('heading', { name: heading!, exact: true })).toBeVisible();
    await expect(page.getByLabel('Bio', { exact: true })).toBeHidden();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  }
  await navigation.getByRole('link', { name: 'Profile', exact: true }).click();
  await expect(page.getByLabel('Bio', { exact: true })).toHaveValue('An unfinished introduction.');
});

test('phone navigation opens recipes and collections without horizontal overflow', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page
    .getByRole('navigation', { name: 'Mobile navigation' })
    .getByRole('link', { name: 'Recipes', exact: true })
    .click();
  await expect(page).toHaveURL(/\/recipes$/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);
  await login(page);
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page
    .getByRole('navigation', { name: 'Mobile navigation' })
    .getByRole('link', { name: 'Recipe collections', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Recipe collections', exact: true }),
  ).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);
});

test('a member can save a recipe from a phone', async ({ page }) => {
  await login(page);
  await page.goto(`/recipes/${dishes.rice.slug}`);
  await page.getByRole('button', { name: 'Save recipe', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Saved recipe', exact: true })).toBeVisible();
  await page.goto('/saved-recipes');
  await expect(page.getByRole('heading', { name: dishes.rice.title, exact: true })).toBeVisible();
});
