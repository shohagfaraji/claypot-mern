import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getRecipeDiscoveryFacetsMock, listDiscoverableCooksMock } = vi.hoisted(() => ({
  getRecipeDiscoveryFacetsMock: vi.fn(),
  listDiscoverableCooksMock: vi.fn(),
}));

vi.mock('../../src/services/discovery.service.js', () => ({
  getRecipeDiscoveryFacets: getRecipeDiscoveryFacetsMock,
  listDiscoverableCooks: listDiscoverableCooksMock,
}));

import { createApp } from '../../src/app.js';

describe('discovery routes', () => {
  const app = createApp();

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns public recipe facets', async () => {
    const facets = {
      cuisines: [{ value: 'Bangladeshi', count: 4 }],
      categories: [{ value: 'Main course', count: 8 }],
      tags: [{ value: 'rice', count: 6 }],
    };
    getRecipeDiscoveryFacetsMock.mockResolvedValue(facets);

    const response = await request(app).get('/api/v1/discovery/facets').expect(200);

    expect(response.body.data).toEqual(facets);
  });

  it('returns a validated page of discoverable cooks', async () => {
    listDiscoverableCooksMock.mockResolvedValue({
      items: [{ id: 'cook-id', name: 'Amina Noor', username: 'amina_kitchen' }],
      pagination: { page: 2, limit: 6, total: 7, totalPages: 2 },
    });

    const response = await request(app)
      .get('/api/v1/discovery/cooks')
      .query({ page: '2', limit: '6', search: '  Amina  ', sort: 'name' })
      .expect(200);

    expect(listDiscoverableCooksMock).toHaveBeenCalledWith({
      page: 2,
      limit: 6,
      search: 'Amina',
      sort: 'name',
    });
    expect(response.body.data.cooks[0].username).toBe('amina_kitchen');
  });

  it('rejects invalid cook discovery parameters before service work', async () => {
    const response = await request(app)
      .get('/api/v1/discovery/cooks')
      .query({ limit: '25', sort: 'trending' })
      .expect(400);

    expect(listDiscoverableCooksMock).not.toHaveBeenCalled();
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});
