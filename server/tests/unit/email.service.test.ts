import { beforeEach, describe, expect, it, vi } from 'vitest';

const { sendEmailMock } = vi.hoisted(() => ({
  sendEmailMock: vi.fn(),
}));

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: sendEmailMock };
  },
}));

vi.mock('../../src/config/env.js', () => ({
  env: {
    RESEND_API_KEY: 're_test_key',
    EMAIL_FROM: 'Claypot <onboarding@resend.dev>',
    CLIENT_ORIGIN: 'https://claypot.netlify.app',
    EMAIL_VERIFICATION_TOKEN_TTL_HOURS: 24,
  },
}));

import { sendEmailVerificationMessage } from '../../src/services/email.service.js';

describe('email delivery service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('sends a branded verification message with an encoded client link', async () => {
    sendEmailMock.mockResolvedValue({ data: { id: 'email-id' }, error: null });

    await sendEmailVerificationMessage({
      recipientName: 'Amina & Family',
      recipientEmail: 'amina@example.com',
      token: 'token_with-safe.characters'.replace('.', '-'),
    });

    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'Claypot <onboarding@resend.dev>',
        to: 'amina@example.com',
        subject: 'Verify your Claypot email address',
        html: expect.stringContaining('Amina &amp; Family'),
        text: expect.stringContaining('https://claypot.netlify.app/verify-email?token='),
      }),
    );
  });

  it('returns a service error when the provider rejects delivery', async () => {
    sendEmailMock.mockResolvedValue({ data: null, error: { message: 'Rejected' } });

    await expect(
      sendEmailVerificationMessage({
        recipientName: 'Amina Rahman',
        recipientEmail: 'amina@example.com',
        token: 'a'.repeat(43),
      }),
    ).rejects.toMatchObject({
      statusCode: 503,
      code: 'EMAIL_DELIVERY_FAILED',
    });
  });
});
