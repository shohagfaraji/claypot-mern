import { dishes, members } from '../support/data.js';
import { expect, login, test } from '../support/fixtures.js';

test('following adds recipes to the feed and notifies the cook', async ({
  page,
  createContext,
}) => {
  await login(page);
  await page.goto(`/cooks/${members.cook.username}`);
  await page.getByRole('button', { name: `Follow ${members.cook.name}`, exact: true }).click();
  await expect(
    page.getByRole('button', { name: `Unfollow ${members.cook.name}`, exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: '2 followers', exact: true })).toBeVisible();
  await page.goto('/following');
  await expect(page.getByRole('heading', { name: dishes.rice.title, exact: true })).toBeVisible();

  const cookContext = await createContext();
  try {
    const cookPage = await cookContext.newPage();
    await login(cookPage, 'cook');
    await cookPage.goto('/notifications');
    await expect(
      cookPage.getByText(`${members.reader.name} started following you`, { exact: true }),
    ).toBeVisible();
    await cookPage.getByRole('button', { name: 'Mark all as read' }).click();
    await expect(cookPage.getByLabel('Unread', { exact: true })).toHaveCount(0);
    await cookPage.reload();
    await expect(
      cookPage.getByText(`${members.reader.name} started following you`, { exact: true }),
    ).toBeVisible();
    await expect(cookPage.getByLabel('Unread', { exact: true })).toHaveCount(0);
  } finally {
    await cookContext.close();
  }

  await page.goto(`/cooks/${members.cook.username}`);
  await page.getByRole('button', { name: `Unfollow ${members.cook.name}`, exact: true }).click();
  await expect(
    page.getByRole('button', { name: `Follow ${members.cook.name}`, exact: true }),
  ).toBeVisible();
  await page.goto('/following');
  await expect(
    page.getByRole('heading', { name: 'Your following feed is ready to grow' }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: dishes.rice.title, exact: true })).toHaveCount(0);
});

test('a member can publish, edit, and delete a review', async ({ page, createContext }) => {
  await login(page);
  await page.goto(`/recipes/${dishes.rice.slug}`);
  await page.getByRole('button', { name: '4 stars', exact: true }).click();
  await page.getByLabel('Your review').fill('Easy instructions and a lovely lemon flavour.');
  await page.getByRole('button', { name: 'Publish review' }).click();
  await expect(page.getByRole('button', { name: 'Edit', exact: true })).toBeVisible();
  const cookContext = await createContext();
  try {
    const cookPage = await cookContext.newPage();
    await login(cookPage, 'cook');
    await cookPage.goto('/notifications');
    await expect(
      cookPage.getByText(`${members.reader.name} reviewed your recipe`, { exact: true }),
    ).toBeVisible();
  } finally {
    await cookContext.close();
  }
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByLabel('Your review').fill('Even better with extra herbs stirred in at the end.');
  await page.getByRole('button', { name: '5 stars', exact: true }).click();
  await page.getByRole('button', { name: 'Save review' }).click();
  await expect(page.getByRole('button', { name: 'Edit', exact: true })).toBeVisible();
  await page.reload();
  await expect(
    page.getByText('Even better with extra herbs stirred in at the end.', { exact: true }).first(),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: 'Delete review', exact: true })
    .click();
  await expect(page.getByRole('button', { name: 'Publish review' })).toBeVisible();
  await expect(
    page.getByText('Even better with extra herbs stirred in at the end.', { exact: true }),
  ).toHaveCount(0);
});
