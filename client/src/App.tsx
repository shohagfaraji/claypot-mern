import { LoaderCircle } from 'lucide-react';
import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';

import { ProtectedRoute } from '@/features/auth/components/protected-route';
import { AdminLayout } from '@/features/admin/components/admin-layout';
import { AdminRoute } from '@/features/admin/components/admin-route';

const AdminDashboardPage = lazy(async () => ({
  default: (await import('@/pages/admin-dashboard-page')).AdminDashboardPage,
}));
const AdminRecipesPage = lazy(async () => ({
  default: (await import('@/pages/admin-recipes-page')).AdminRecipesPage,
}));
const AdminUsersPage = lazy(async () => ({
  default: (await import('@/pages/admin-users-page')).AdminUsersPage,
}));
const AccountPage = lazy(async () => ({
  default: (await import('@/pages/account-page')).AccountPage,
}));
const CreateRecipePage = lazy(async () => ({
  default: (await import('@/pages/create-recipe-page')).CreateRecipePage,
}));
const HomePage = lazy(async () => ({ default: (await import('@/pages/home-page')).HomePage }));
const LoginPage = lazy(async () => ({ default: (await import('@/pages/login-page')).LoginPage }));
const MyRecipesPage = lazy(async () => ({
  default: (await import('@/pages/my-recipes-page')).MyRecipesPage,
}));
const NotFoundPage = lazy(async () => ({
  default: (await import('@/pages/not-found-page')).NotFoundPage,
}));
const RecipeDetailPage = lazy(async () => ({
  default: (await import('@/pages/recipe-detail-page')).RecipeDetailPage,
}));
const RecipesPage = lazy(async () => ({
  default: (await import('@/pages/recipes-page')).RecipesPage,
}));
const RegisterPage = lazy(async () => ({
  default: (await import('@/pages/register-page')).RegisterPage,
}));
const SavedRecipesPage = lazy(async () => ({
  default: (await import('@/pages/saved-recipes-page')).SavedRecipesPage,
}));
const UserProfilePage = lazy(async () => ({
  default: (await import('@/pages/user-profile-page')).UserProfilePage,
}));
const VerifyEmailPage = lazy(async () => ({
  default: (await import('@/pages/verify-email-page')).VerifyEmailPage,
}));

function PageLoader() {
  return (
    <div className="grid min-h-svh place-items-center bg-background text-muted-foreground">
      <div className="text-center">
        <img className="mx-auto size-16 object-contain" src="/brand/claypot-logo.png" alt="" />
        <LoaderCircle className="mx-auto mt-5 size-5 animate-spin" />
        <p className="mt-3 text-sm font-medium">Preparing your page…</p>
      </div>
    </div>
  );
}

function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route index element={<HomePage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="verify-email" element={<VerifyEmailPage />} />
        <Route path="recipes" element={<RecipesPage />} />
        <Route path="recipes/:slug" element={<RecipeDetailPage />} />
        <Route path="cooks/:username" element={<UserProfilePage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AdminRoute />}>
            <Route element={<AdminLayout />}>
              <Route path="admin" element={<AdminDashboardPage />} />
              <Route path="admin/recipes" element={<AdminRecipesPage />} />
              <Route path="admin/users" element={<AdminUsersPage />} />
            </Route>
          </Route>
          <Route path="account" element={<AccountPage />} />
          <Route path="my-recipes" element={<MyRecipesPage />} />
          <Route path="saved-recipes" element={<SavedRecipesPage />} />
          <Route path="recipes/new" element={<CreateRecipePage />} />
          <Route path="my-recipes/:recipeId/edit" element={<CreateRecipePage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}

export default App;
