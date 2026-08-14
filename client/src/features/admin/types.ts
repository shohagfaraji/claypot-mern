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
