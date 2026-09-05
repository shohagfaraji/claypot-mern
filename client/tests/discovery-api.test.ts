import { describe, expect, it, vi } from 'vitest';

import { getDiscoverableCooks, getRecipeDiscoveryFacets } from '@/features/discovery/api/discovery';
import { apiRequest } from '@/lib/api-client';

vi.mock('@/lib/api-client', () => ({ apiRequest: vi.fn() }));

describe('discovery API', () => {
  it('loads public recipe facets', async () => {
    const facets = {
      cuisines: [{ value: 'Bangladeshi', count: 5 }],
      categories: [{ value: 'Main course', count: 8 }],
      tags: [{ value: 'rice', count: 4 }],
    };
    vi.mocked(apiRequest).mockResolvedValue({ data: facets });
    const controller = new AbortController();

    await expect(getRecipeDiscoveryFacets(controller.signal)).resolves.toEqual(facets);
    expect(apiRequest).toHaveBeenCalledWith('/discovery/facets', {
      signal: controller.signal,
    });
  });

  it('loads a filtered cook page', async () => {
    const data = {
      cooks: [{ id: 'cook-id', name: 'Amina Noor', username: 'amina_kitchen' }],
      pagination: { page: 2, limit: 12, total: 13, totalPages: 2 },
    };
    vi.mocked(apiRequest).mockResolvedValue({ data });
    const controller = new AbortController();

    await expect(
      getDiscoverableCooks('page=2&limit=12&sort=name', controller.signal),
    ).resolves.toEqual(data);
    expect(apiRequest).toHaveBeenCalledWith('/discovery/cooks?page=2&limit=12&sort=name', {
      signal: controller.signal,
    });
  });
});
