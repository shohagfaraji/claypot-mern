import { Route, Routes } from 'react-router-dom';

import { ProtectedRoute } from '@/features/auth/components/protected-route';
import { AccountPage } from '@/pages/account-page';
import { HomePage } from '@/pages/home-page';
import { LoginPage } from '@/pages/login-page';
import { NotFoundPage } from '@/pages/not-found-page';
import { RecipeDetailPage } from '@/pages/recipe-detail-page';
import { RecipesPage } from '@/pages/recipes-page';
import { RegisterPage } from '@/pages/register-page';

function App() {
  return (
    <Routes>
      <Route index element={<HomePage />} />
      <Route path="login" element={<LoginPage />} />
      <Route path="register" element={<RegisterPage />} />
      <Route path="recipes" element={<RecipesPage />} />
      <Route path="recipes/:slug" element={<RecipeDetailPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="account" element={<AccountPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
