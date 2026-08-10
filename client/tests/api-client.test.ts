import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError, apiRequest } from '@/lib/api-client';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('API client', () => {
  it('sends JSON requests with the shared API defaults', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ data: { recipeCount: 2 } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiRequest('/recipes')).resolves.toEqual({ data: { recipeCount: 2 } });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe('http://localhost:5000/api/v1/recipes');
    expect(init?.credentials).toBe('include');
    expect(new Headers(init?.headers).get('Accept')).toBe('application/json');
  });

  it('exposes the most useful validation message and all field details', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Request validation failed.',
            details: [
              { field: 'title', message: 'Title must contain at least 3 characters.' },
              { field: 'servings', message: 'A recipe must serve at least one person.' },
            ],
          },
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const request = apiRequest('/recipes', { method: 'POST' });

    await expect(request).rejects.toMatchObject({
      name: 'ApiError',
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Title must contain at least 3 characters.',
      details: [
        { field: 'title', message: 'Title must contain at least 3 characters.' },
        { field: 'servings', message: 'A recipe must serve at least one person.' },
      ],
    } satisfies Partial<ApiError>);
  });

  it('uses a safe fallback when an error response is not JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue(new Response('Service unavailable', { status: 503 })),
    );

    await expect(apiRequest('/recipes')).rejects.toMatchObject({
      status: 503,
      code: 'REQUEST_FAILED',
      message: 'The request could not be completed.',
      details: [],
    });
  });

  it('handles successful responses without a body', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 204 })),
    );

    await expect(apiRequest<void>('/auth/logout', { method: 'POST' })).resolves.toBeUndefined();
  });
});
