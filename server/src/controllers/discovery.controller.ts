import type { RequestHandler } from 'express';
import type { ListCooksQuery } from '../schemas/discovery.schema.js';
import { getRecipeDiscoveryFacets, listDiscoverableCooks } from '../services/discovery.service.js';

export const facets: RequestHandler = async (_request, response) => {
  const result = await getRecipeDiscoveryFacets();
  response.status(200).json({ data: result });
};

export const cooks: RequestHandler = async (request, response) => {
  const result = await listDiscoverableCooks(request.validatedQuery as ListCooksQuery);
  response.status(200).json({
    data: { cooks: result.items, pagination: result.pagination },
  });
};
