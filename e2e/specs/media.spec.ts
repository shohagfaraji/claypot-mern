import { dishes, members } from '../support/data.js';
import { expect, login, loginApi, test } from '../support/fixtures.js';
import { apiUrl } from '../support/settings.js';

const image = {
  name: 'test-image.png',
  mimeType: 'image/png',
  buffer: Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jY1kAAAAASUVORK5CYII=',
    'base64',
  ),
};

const forms = [
  {
    name: 'avatar',
    member: 'reader' as const,
    path: '/account',
    field: 'Display name',
    value: 'Robin Rivers',
    submit: 'Save profile',
    notice: 'Your profile has been updated.',
  },
  {
    name: 'recipe cover',
    member: 'cook' as const,
    path: `/my-recipes/${dishes.draft.id}/edit`,
    field: 'Recipe title',
    value: 'Updated Family Recipe',
    submit: 'Save changes',
    notice: 'Recipe changes saved',
  },
];

for (const form of forms) {
  test(`${form.name} removal requires confirmation and saving`, async ({ page, request }) => {
    const headers = await loginApi(request, form.member);
    const imageUrl = 'https://images.example.test/cover.png';
    await page.route(imageUrl, (route) =>
      route.fulfill({ contentType: 'image/png', body: image.buffer }),
    );
    const seeded =
      form.name === 'avatar'
        ? await request.patch(`${apiUrl}/auth/me`, {
            headers,
            data: {
              name: members[form.member].name,
              avatarUrl: imageUrl,
              avatarPublicId: null,
              bio: null,
            },
          })
        : await request.put(`${apiUrl}/recipes/${dishes.draft.id}`, {
            headers,
            data: {
              title: dishes.draft.title,
              summary: 'A family recipe with a cover image to review.',
              imageUrl,
              ingredients: [{ name: 'Rice', quantity: '2 cups' }],
              instructions: [{ description: 'Cook until tender.' }],
              prepTimeMinutes: 10,
              cookTimeMinutes: 20,
              servings: 4,
              difficulty: 'easy',
              cuisine: 'Bangladeshi',
              category: 'Main course',
              tags: [],
            },
          });
    expect(seeded.ok()).toBe(true);
    await login(page, form.member);
    await page.goto(form.path);
    const preview = page.getByRole('img', { name: 'Selected upload preview' });
    const remove = page.getByRole('button', { name: 'Remove', exact: true });
    await expect(preview).toBeVisible();
    await remove.click();
    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Keep image' }).click();
    await expect(preview).toBeVisible();
    await expect(remove).toBeFocused();
    await remove.click();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(preview).toBeVisible();
    await remove.click();
    await dialog.getByRole('button', { name: 'Remove image', exact: true }).click();
    await expect(preview).toHaveCount(0);
    await page.reload();
    await expect(preview).toBeVisible();
    await remove.click();
    await dialog.getByRole('button', { name: 'Remove image', exact: true }).click();
    await page.getByRole('button', { name: form.submit, exact: true }).click();
    await expect(page.getByText(form.notice, { exact: true })).toBeVisible();
    await page.goto(form.path);
    await expect(preview).toHaveCount(0);
  });

  test(`${form.name} rejects invalid files and preserves changes when uploads are unavailable`, async ({
    page,
  }) => {
    await login(page, form.member);
    await page.goto(form.path);
    await page.getByLabel(form.field, { exact: true }).fill(form.value);
    const input = page.getByLabel('Choose image', { exact: true });
    const signatureUrl = `${apiUrl}/media/images/signature`;
    let signatureRequests = 0;
    page.on('request', (request) => {
      if (request.url() === signatureUrl && request.method() === 'POST') signatureRequests += 1;
    });

    await input.setInputFiles({
      name: 'notes.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('Notes'),
    });
    await expect(page.getByRole('alert')).toHaveText('Choose an AVIF, JPEG, PNG, or WebP image.');
    await input.setInputFiles({ ...image, buffer: Buffer.alloc(8 * 1024 * 1024 + 1) });
    await expect(page.getByRole('alert')).toHaveText('Choose an image smaller than 8 MB.');
    expect(signatureRequests).toBe(0);

    const signatureResponse = page.waitForResponse(
      (response) => response.url() === signatureUrl && response.request().method() === 'POST',
    );
    await input.setInputFiles(image);
    expect((await signatureResponse).status()).toBe(503);
    await expect(page.getByRole('alert')).toHaveText('Image uploads are temporarily unavailable.');
    await expect(input).toBeEnabled();
    await expect(page.getByLabel(form.field, { exact: true })).toHaveValue(form.value);
    await expect(page.getByRole('button', { name: form.submit, exact: true })).toBeEnabled();
    await page.getByRole('button', { name: form.submit, exact: true }).click();
    await expect(page.getByText(form.notice, { exact: true })).toBeVisible();
    await page.goto(form.path);
    await expect(page.getByLabel(form.field, { exact: true })).toHaveValue(form.value);
  });
}
