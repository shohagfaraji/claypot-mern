export interface DiscoveryFacet {
  value: string;
  count: number;
}

export interface RecipeDiscoveryFacets {
  cuisines: DiscoveryFacet[];
  categories: DiscoveryFacet[];
  tags: DiscoveryFacet[];
}

export interface DiscoverableCook {
  id: string;
  name: string;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  publishedRecipeCount: number;
  followerCount: number;
  createdAt: string;
}

export interface CookDiscoveryData {
  cooks: DiscoverableCook[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
