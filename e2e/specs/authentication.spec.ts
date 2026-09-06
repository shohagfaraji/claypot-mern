import { members, testPassword } from '../support/data.js';
import { expect, login, test } from '../support/fixtures.js';

test('registration sends a verification link and confirms the account', async ({ page, data }) => {
  await page.goto('/register');
  await page.getByLabel('Full name').fill('Taylor Green');
  await page.getByLabel('Username', { exact: true }).fill('taylor_green');
  await page.getByLabel('Email address', { exact: true }).fill('taylor@example.test');
  await page.getByLabel('Password', { exact: true }).fill(testPassword);
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByText('Verification pending', { exact: true })).toBeVisible();
  const link = await data.emailLink('taylor@example.test', '/verify-email');
  await page.goto(link);
  await expect(page.getByRole('heading', { name: /Email (already )?verified/ })).toBeVisible();
  await page.goto('/account');
  await expect(page.getByText('Verified', { exact: true })).toBeVisible();
});

test('login returns to the protected page and survives reload until sign-out', async ({ page }) => {
  await page.goto('/collections');
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel('Email or username').fill(members.reader.email);
  await page.getByLabel('Password', { exact: true }).fill('WrongPassword123!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await page.getByLabel('Password', { exact: true }).fill(testPassword);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/collections$/);
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Recipe collections', exact: true }),
  ).toBeVisible();
  await page.goto('/account');
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await page.goto('/collections');
  await expect(page).toHaveURL(/\/login$/);
});

test('password recovery keeps responses generic and enforces resend cooldown', async ({
  page,
  data,
}) => {
  await page.goto('/forgot-password');
  await page.getByLabel('Email address').fill(members.reader.email);
  await page.getByRole('button', { name: 'Send reset link' }).click();
  const message = page.getByRole('status');
  await expect(message).toHaveText(
    'If an account matches that email, a password reset link will be sent.',
  );
  const knownMessage = await message.textContent();
  const original = await data.emailLink(members.reader.email, '/reset-password');
  await page.getByRole('button', { name: 'Resend reset email' }).click();
  await expect(page.getByRole('button', { name: 'Resend reset email' })).toBeEnabled();
  expect(await data.emails(members.reader.email)).toHaveLength(1);
  await data.agePasswordToken('reader');
  await page.getByRole('button', { name: 'Resend reset email' }).click();
  await expect.poll(async () => (await data.emails(members.reader.email)).length).toBe(2);
  expect(await data.emailLink(members.reader.email, '/reset-password')).not.toBe(original);

  await page.goto('/forgot-password');
  await page.getByLabel('Email address').fill('unknown@example.test');
  await page.getByRole('button', { name: 'Send reset link' }).click();
  await expect(message).toHaveText(knownMessage!);
  expect(await data.emails('unknown@example.test')).toHaveLength(0);
});

test('resetting a password checks confirmation, consumes the link, and revokes sessions', async ({
  page,
  context,
  data,
}) => {
  await login(page);
  await page.goto('/account');
  const recovery = await context.newPage();
  await recovery.goto('/forgot-password');
  await recovery.getByLabel('Email address').fill(members.reader.email);
  await recovery.getByRole('button', { name: 'Send reset link' }).click();
  const link = await data.emailLink(members.reader.email, '/reset-password');
  await recovery.goto(link);
  await recovery.getByLabel('New password', { exact: true }).fill('UpdatedKitchen123!');
  await recovery.getByLabel('Confirm new password').fill('MismatchKitchen123!');
  await recovery.getByRole('button', { name: 'Update password' }).click();
  await expect(recovery.getByRole('alert')).toHaveText('Passwords do not match.');
  await recovery.getByLabel('Confirm new password').fill('UpdatedKitchen123!');
  await recovery.getByRole('button', { name: 'Update password' }).click();
  await expect(recovery.getByRole('link', { name: 'Continue to sign in' })).toBeVisible();

  await page.reload();
  await expect(page).toHaveURL(/\/login$/);
  await recovery.goto(link);
  await recovery.getByLabel('New password', { exact: true }).fill('AnotherKitchen123!');
  await recovery.getByLabel('Confirm new password').fill('AnotherKitchen123!');
  await recovery.getByRole('button', { name: 'Update password' }).click();
  await expect(recovery.getByRole('alert')).toContainText('invalid or has expired');

  await page.getByLabel('Email or username').fill(members.reader.email);
  await page.getByLabel('Password', { exact: true }).fill(testPassword);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await page.getByLabel('Password', { exact: true }).fill('UpdatedKitchen123!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/account$/);
});

test('expired password reset links cannot change the password', async ({ page, data }) => {
  await page.goto('/forgot-password');
  await page.getByLabel('Email address').fill(members.reader.email);
  await page.getByRole('button', { name: 'Send reset link' }).click();
  const link = await data.emailLink(members.reader.email, '/reset-password');
  await data.agePasswordToken('reader', true);
  await page.goto(link);
  await page.getByLabel('New password', { exact: true }).fill('UpdatedKitchen123!');
  await page.getByLabel('Confirm new password').fill('UpdatedKitchen123!');
  await page.getByRole('button', { name: 'Update password' }).click();
  await expect(page.getByRole('alert')).toContainText('invalid or has expired');
  await login(page);
});
