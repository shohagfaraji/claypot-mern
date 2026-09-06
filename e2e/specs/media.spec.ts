import { dishes } from '../support/data.js';
import { expect, login, test } from '../support/fixtures.js';
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
