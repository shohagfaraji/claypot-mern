import { members, testPassword } from '../support/data.js';
import { expect, login, test } from '../support/fixtures.js';

test('profile changes are saved and shown on the public profile', async ({ page }) => {
  await login(page);
  await page.goto('/account');
  await page.getByLabel('Display name').fill('Robin Rivers');
  await page
    .getByLabel('Bio', { exact: true })
    .fill('Collecting simple recipes for busy evenings.');
  await page.getByRole('button', { name: 'Save profile' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Your profile has been updated.' }),
  ).toBeVisible();
  await page.goto(`/cooks/${members.reader.username}`);
  await expect(page.getByRole('heading', { level: 1, name: 'Robin Rivers' })).toBeVisible();
  await expect(
    page.getByText('Collecting simple recipes for busy evenings.', { exact: true }),
  ).toBeVisible();
});

test('changing a password keeps this session and signs out another device', async ({
  page,
  createContext,
}) => {
  const otherContext = await createContext();
  try {
    const otherPage = await otherContext.newPage();
    await login(otherPage);
    await otherPage.goto('/account');
    await login(page);
    await page.goto('/account');
    const form = page
      .locator('form')
      .filter({ has: page.getByLabel('New password', { exact: true }) });
    await form.getByLabel('Current password', { exact: true }).fill(testPassword);
    await form.getByLabel('New password', { exact: true }).fill('ChangedKitchen123!');
    await form.getByLabel('Confirm new password').fill('ChangedKitchen123!');
    await form.getByRole('button', { name: 'Update password' }).click();
    await expect(page.getByRole('status').filter({ hasText: /password/i })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'Welcome, Robin' })).toBeVisible();
    await otherPage.reload();
    await expect(otherPage).toHaveURL(/\/login$/);
  } finally {
    await otherContext.close();
  }
});

test('an email change waits for confirmation and preserves the current session', async ({
  page,
  data,
}) => {
  await login(page);
  await page.goto('/account');
  const form = page.locator('form').filter({ has: page.getByLabel('New email address') });
  await form.getByLabel('New email address').fill('robin.new@example.test');
  await form.getByLabel('Current password', { exact: true }).fill(testPassword);
  await form.getByRole('button', { name: 'Send confirmation email' }).click();
  await expect(page.getByText('Confirmation pending', { exact: true })).toBeVisible();
  const link = await data.emailLink('robin.new@example.test', '/confirm-email-change');
  await page.goto(link);
  await expect(page.getByRole('heading', { name: 'Email address updated' })).toBeVisible();
  await page.getByRole('link', { name: 'Open account', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Welcome, Robin' })).toBeVisible();
  await expect(page.getByText('robin.new@example.test', { exact: true }).first()).toBeVisible();
  await expect
    .poll(async () =>
      (await data.emails(members.reader.email)).some(
        (email) => email.subject === 'Your Claypot email address was changed',
      ),
    )
    .toBe(true);
});

test('deleting an account requires confirmation and removes access', async ({ page }) => {
  await login(page);
  await page.goto('/account');
  await page.getByRole('button', { name: 'Delete account', exact: true }).click();
  const dialog = page.getByRole('alertdialog');
  await expect(dialog.getByRole('button', { name: 'Delete permanently' })).toBeDisabled();
  await dialog.getByLabel('Current password', { exact: true }).fill(testPassword);
  await dialog
    .getByLabel(`Type ${members.reader.username} to confirm`)
    .fill(members.reader.username);
  await dialog.getByRole('button', { name: 'Delete permanently' }).click();
  await expect(dialog).toHaveCount(0);
  await page.goto('/account');
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel('Email or username').fill(members.reader.email);
  await page.getByLabel('Password', { exact: true }).fill(testPassword);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
});
