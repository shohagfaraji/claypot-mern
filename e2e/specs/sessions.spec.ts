import { devices } from '@playwright/test';
import { expect, login, test } from '../support/fixtures.js';

test('signing out one device leaves the other sessions active', async ({ page, createContext }) => {
  const phone = await (await createContext({ userAgent: devices['Pixel 7'].userAgent })).newPage();
  const anotherDevice = await (await createContext()).newPage();
  await login(phone);
  await phone.goto('/account');
  await login(anotherDevice);
  await anotherDevice.goto('/account');
  await login(page);
  await page.goto('/account');

  const signOutPhone = page.getByRole('button', {
    name: 'Sign out Chrome on Android',
    exact: true,
  });
  await signOutPhone.click();
  const dialog = page.getByRole('alertdialog');
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(signOutPhone).toBeVisible();
  await phone.reload();
  await expect(phone.getByRole('heading', { level: 1, name: 'Welcome, Robin' })).toBeVisible();

  await signOutPhone.click();
  await dialog.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Chrome on Android has been signed out.');
  await expect(signOutPhone).toHaveCount(0);
  await phone.reload();
  await expect(phone).toHaveURL(/\/login$/);
  await anotherDevice.reload();
  await expect(
    anotherDevice.getByRole('heading', { level: 1, name: 'Welcome, Robin' }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Welcome, Robin' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign out others', exact: true })).toBeEnabled();
});

test('signing out all other devices keeps only the current session', async ({
  page,
  createContext,
}) => {
  const otherPages = [
    await (await createContext()).newPage(),
    await (await createContext()).newPage(),
  ];
  for (const otherPage of otherPages) {
    await login(otherPage);
    await otherPage.goto('/account');
  }
  await login(page);
  await page.goto('/account');
  await page.getByRole('button', { name: 'Sign out others', exact: true }).click();
  const dialog = page.getByRole('alertdialog');
  await expect(dialog.getByRole('heading')).toHaveText('Sign out all other sessions?');
  await dialog.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('2 other sessions have been signed out.');
  await expect(page.getByRole('button', { name: 'Sign out others', exact: true })).toBeDisabled();
  for (const otherPage of otherPages) {
    await otherPage.reload();
    await expect(otherPage).toHaveURL(/\/login$/);
  }
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Welcome, Robin' })).toBeVisible();
  await expect(page.getByText('Current session', { exact: true })).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Sign out others', exact: true })).toBeDisabled();
});
