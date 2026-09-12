import { describe, expect, it, vi } from 'vitest';
import { config, proxyApiRequest } from '../edge-functions/api.js';

const settings = {
  apiOrigin: 'https://claypot-api.onrender.com',
  secret: 'test-proxy-secret-with-at-least-32-characters',
  clientIp: '203.0.113.10',
};
const website = 'https://claypot.netlify.app';

describe('website API proxy', () => {
  it('only handles API paths', () => {
    expect(config.path).toBe('/api/*');
  });

  it.each([
    undefined,
    'http://claypot-api.onrender.com',
    'https://example.com',
    'https://claypot-api.onrender.com.example.com',
    'https://user:password@claypot-api.onrender.com',
    'https://claypot-api.onrender.com/api',
    'https://claypot-api.onrender.com?token=value',
    'https://claypot-api.onrender.com#fragment',
  ])('rejects an invalid backend origin: %s', async (apiOrigin) => {
    const send = vi.fn<typeof fetch>();
    const response = await proxyApiRequest(
      new Request(`${website}/api/v1/recipes`),
      { ...settings, apiOrigin },
      send,
    );
    expect(response.status).toBe(503);
    expect(send).not.toHaveBeenCalled();
  });

  it.each([undefined, '', 'short'])('rejects missing or short proxy secrets', async (secret) => {
    const send = vi.fn<typeof fetch>();
    const response = await proxyApiRequest(
      new Request(`${website}/api/v1/recipes`),
      { ...settings, secret },
      send,
    );
    expect(response.status).toBe(503);
    expect(send).not.toHaveBeenCalled();
  });

  it('forwards the request body and credentials while replacing untrusted proxy headers', async () => {
    const send = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ data: { success: true } }));
    const request = new Request(`${website}/api/v1/auth/login?next=recipes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-access-token',
        Cookie: 'refreshToken=test-session',
        'X-Forwarded-For': '192.0.2.20',
        'X-Claypot-Client-Ip': '192.0.2.21',
        'X-Claypot-Proxy-Secret': 'forged',
      },
      body: JSON.stringify({ email: 'cook@example.test', password: 'test-password' }),
    });

    const response = await proxyApiRequest(request, settings, send);
    expect(response.status).toBe(200);
    const [forwarded, options] = send.mock.calls[0]!;
    expect(forwarded).toBeInstanceOf(Request);
    const upstreamRequest = forwarded as Request;
    expect(upstreamRequest.url).toBe(`${settings.apiOrigin}/api/v1/auth/login?next=recipes`);
    expect(upstreamRequest.method).toBe('POST');
    expect(await upstreamRequest.json()).toEqual({
      email: 'cook@example.test',
      password: 'test-password',
    });
    const headers = new Headers(options?.headers);
    expect(headers.get('authorization')).toBe('Bearer test-access-token');
    expect(headers.get('cookie')).toBe('refreshToken=test-session');
    expect(headers.get('x-forwarded-for')).toBeNull();
    expect(headers.get('x-claypot-proxy-secret')).toBe(settings.secret);
    expect(headers.get('x-claypot-client-ip')).toBe(settings.clientIp);
    expect(options?.redirect).toBe('manual');
    expect(options?.signal).toBeInstanceOf(AbortSignal);
  });

  it('preserves session cookies and disables caching', async () => {
    const headers = new Headers({
      'Content-Type': 'application/json',
      'Content-Encoding': 'gzip',
      'Content-Length': '100',
      'Cache-Control': 'public',
    });
    headers.append(
      'Set-Cookie',
      'refreshToken=session; Path=/api/v1/auth; HttpOnly; Secure; SameSite=Lax',
    );
    headers.append('Set-Cookie', 'oldSession=; Max-Age=0; Path=/');
    const send = vi.fn<typeof fetch>().mockResolvedValue(new Response('{}', { headers }));
    const response = await proxyApiRequest(
      new Request(`${website}/api/v1/auth/refresh`, { method: 'POST' }),
      settings,
      send,
    );
    expect(response.headers.getSetCookie()).toEqual(headers.getSetCookie());
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.has('content-encoding')).toBe(false);
    expect(response.headers.has('content-length')).toBe(false);
  });

  it('preserves validation errors and rate-limit headers', async () => {
    const body = { error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Please try again later.' } };
    const send = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json(body, { status: 429, headers: { 'Retry-After': '60' } }));
    const response = await proxyApiRequest(
      new Request(`${website}/api/v1/auth/login`),
      settings,
      send,
    );
    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toBe('60');
    expect(await response.json()).toEqual(body);
  });

  it('allows empty successful responses', async () => {
    const send = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 204 }));
    const response = await proxyApiRequest(
      new Request(`${website}/api/v1/auth/logout`, { method: 'POST' }),
      settings,
      send,
    );
    expect(response.status).toBe(204);
    expect(await response.text()).toBe('');
  });

  it.each([302, 500, 502, 200])(
    'handles redirects, failures, and HTML responses without retrying (%i)',
    async (status) => {
      const send = vi.fn<typeof fetch>().mockResolvedValue(
        new Response('<html>Starting</html>', {
          status,
          headers: { 'Content-Type': 'text/html' },
        }),
      );
      const response = await proxyApiRequest(
        new Request(`${website}/api/v1/auth/login`, { method: 'POST' }),
        settings,
        send,
      );
      expect(response.status).toBe(503);
      expect(response.headers.get('retry-after')).toBe('15');
      expect(response.headers.get('cache-control')).toBe('no-store');
      expect(await response.json()).toMatchObject({ error: { code: 'SERVICE_UNAVAILABLE' } });
      expect(send).toHaveBeenCalledTimes(1);
    },
  );

  it('returns a readable error when the backend cannot be reached', async () => {
    const send = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('Network failure'));
    const response = await proxyApiRequest(
      new Request(`${website}/api/v1/recipes`),
      settings,
      send,
    );
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ error: { code: 'SERVICE_UNAVAILABLE' } });
  });

  it('does not proxy website routes', async () => {
    const send = vi.fn<typeof fetch>();
    const response = await proxyApiRequest(new Request(`${website}/recipes`), settings, send);
    expect(response.status).toBe(404);
    expect(send).not.toHaveBeenCalled();
  });
});
