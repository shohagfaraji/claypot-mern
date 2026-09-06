import { dishes } from '../support/data.js';
import { expect, login, loginApi, selectOption, test } from '../support/fixtures.js';
import { apiUrl } from '../support/settings.js';

test('admin pages and endpoints reject ordinary members', async ({ page, request }) => {
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/login$/);
  await login(page);
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/$/);
  const headers = await loginApi(request);
  for (const path of ['/admin/dashboard', '/admin/users', '/admin/recipes', '/admin/reports']) {
    expect((await request.get(`${apiUrl}${path}`, { headers })).status()).toBe(403);
  }
});

test('an administrator can view platform data and review a submitted report', async ({
  page,
  createContext,
}) => {
  await login(page);
  await page.goto(`/recipes/${dishes.rice.slug}`);
  await page.getByRole('button', { name: 'Report recipe', exact: true }).click();
  await selectOption(page, 'Report reason', 'Misleading information');
  await page
    .getByLabel('Additional details (optional)')
    .fill('The stated cooking time should be checked.');
  await page.getByRole('button', { name: 'Submit report', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Report submitted', exact: true })).toBeVisible();
  const adminContext = await createContext();
  try {
    const adminPage = await adminContext.newPage();
    await login(adminPage, 'admin');
    await adminPage.goto('/admin');
    await expect(adminPage.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();
    await expect(adminPage.getByLabel('Platform totals')).toBeVisible();
    await adminPage.goto('/admin/users');
    await expect(adminPage.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(adminPage.getByRole('searchbox')).toBeVisible();
    await adminPage.goto('/admin/recipes');
    await adminPage.getByRole('searchbox', { name: 'Search all recipes' }).fill('Lemon');
    await adminPage.getByRole('button', { name: 'Search', exact: true }).click();
    await expect(adminPage.getByRole('cell', { name: /^Lemon Herb Rice/ })).toBeVisible();
    await adminPage.goto('/admin/reports');
    await expect(
      adminPage.getByText('The stated cooking time should be checked.', { exact: true }),
    ).toBeVisible();
    await adminPage.getByRole('button', { name: 'Resolve', exact: true }).click();
    await adminPage
      .getByLabel('Moderation note')
      .fill('Reviewed the cooking instructions and confirmed the timing.');
    await adminPage.getByRole('button', { name: 'Resolve report', exact: true }).click();
    await expect(adminPage.getByRole('alertdialog')).toHaveCount(0);
    await selectOption(adminPage, 'Filter reports by status', 'Resolved');
    await expect(
      adminPage.getByText('Reviewed the cooking instructions and confirmed the timing.', {
        exact: true,
      }),
    ).toBeVisible();
  } finally {
    await adminContext.close();
  }
  await page.goto('/notifications');
  await expect(page.getByText('Your content report was resolved', { exact: true })).toBeVisible();
});
