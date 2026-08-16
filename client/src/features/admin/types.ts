export interface AdminDashboardMetrics {
  totalUsers: number;
  totalRecipes: number;
  publishedRecipes: number;
  draftRecipes: number;
  totalReviews: number;
}

export interface AdminRecentRecipe {
  id: string;
  title: string;
  slug: string;
  status: 'draft' | 'published';
  createdAt: string;
  author: {
    name: string;
    username: string;
  };
}

export interface AdminRecentUser {
  id: string;
  name: string;
  username: string;
  avatarUrl: string | null;
  role: 'user' | 'admin';
  createdAt: string;
}

export interface AdminDashboard {
  metrics: AdminDashboardMetrics;
  recentRecipes: AdminRecentRecipe[];
  recentUsers: AdminRecentUser[];
}

export interface AdminRecipeListItem {
  id: string;
  title: string;
  slug: string;
  summary: string;
  imageUrl: string | null;
  status: 'draft' | 'published';
  reviewCount: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    name: string;
    username: string;
  };
}

export interface AdminRecipeListData {
  recipes: AdminRecipeListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AdminUserListItem {
  id: string;
  name: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  role: 'user' | 'admin';
  isEmailVerified: boolean;
  recipeCount: number;
  reviewCount: number;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface AdminUserListData {
  users: AdminUserListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
