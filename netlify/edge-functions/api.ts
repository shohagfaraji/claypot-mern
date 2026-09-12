import type { Config, Context } from '@netlify/edge-functions';

interface ProxySettings {
  apiOrigin: string | undefined;
  secret: string | undefined;
  clientIp: string;
}

function unavailable(
  message = 'The service is starting or temporarily unavailable. Please try again shortly.',
) {
  return Response.json(
    { error: { code: 'SERVICE_UNAVAILABLE', message } },
    { status: 503, headers: { 'Cache-Control': 'no-store', 'Retry-After': '15' } },
  );
}

export async function proxyApiRequest(
  request: Request,
  settings: ProxySettings,
  send: typeof fetch = fetch,
): Promise<Response> {
  let origin: URL;
  try {
    origin = new URL(settings.apiOrigin ?? '');
    if (
      origin.protocol !== 'https:' ||
      !origin.hostname.endsWith('.onrender.com') ||
      origin.port ||
      origin.username ||
      origin.password ||
      origin.pathname !== '/' ||
      origin.search ||
      origin.hash ||
      !settings.secret ||
      settings.secret.length < 32 ||
      !settings.clientIp
    )
      return unavailable('The service configuration is incomplete.');
  } catch {
    return unavailable('The service configuration is incomplete.');
  }

  const incoming = new URL(request.url);
  if (!incoming.pathname.startsWith('/api/')) {
    return Response.json(
      { error: { code: 'NOT_FOUND', message: 'API route was not found.' } },
      { status: 404 },
    );
  }
  const target = new URL(origin);
  target.pathname = incoming.pathname;
  target.search = incoming.search;
  const headers = new Headers();
  for (const name of [
    'accept',
    'accept-language',
    'authorization',
    'content-type',
    'cookie',
    'origin',
    'user-agent',
  ]) {
    const value = request.headers.get(name);
    if (value !== null) headers.set(name, value);
  }
  headers.set('x-claypot-proxy-secret', settings.secret);
  headers.set('x-claypot-client-ip', settings.clientIp);

  try {
    const forwarded = new Request(target, request);
    const upstream = await send(forwarded, {
      headers,
      redirect: 'manual',
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(20_000)]),
    });
    if (
      upstream.status >= 500 ||
      (upstream.status >= 300 && upstream.status < 400) ||
      (upstream.status !== 204 &&
        request.method !== 'HEAD' &&
        !upstream.headers.get('content-type')?.includes('application/json'))
    ) {
      await upstream.body?.cancel();
      return unavailable();
    }
    const responseHeaders = new Headers(upstream.headers);
    for (const name of [
      'content-encoding',
      'content-length',
      'connection',
      'transfer-encoding',
      'x-claypot-proxy-secret',
    ]) {
      responseHeaders.delete(name);
    }
    responseHeaders.set('Cache-Control', 'no-store');
    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch {
    return unavailable();
  }
}

export default function handler(request: Request, context: Context) {
  return proxyApiRequest(request, {
    apiOrigin: Netlify.env.get('RENDER_API_ORIGIN'),
    secret: Netlify.env.get('API_PROXY_SECRET'),
    clientIp: context.ip,
  });
}

export const config: Config = { path: '/api/*' };
