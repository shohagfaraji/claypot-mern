import { Route, Routes } from 'react-router-dom';

import { ProtectedRoute } from '@/features/auth/components/protected-route';
import { AccountPage } from '@/pages/account-page';
import { CreateRecipePage } from '@/pages/create-recipe-page';
import { HomePage } from '@/pages/home-page';
import { LoginPage } from '@/pages/login-page';
import { MyRecipesPage } from '@/pages/my-recipes-page';
import { NotFoundPage } from '@/pages/not-found-page';
import { RecipeDetailPage } from '@/pages/recipe-detail-page';
import { RecipesPage } from '@/pages/recipes-page';
import { RegisterPage } from '@/pages/register-page';
import { SavedRecipesPage } from '@/pages/saved-recipes-page';

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
        <Route path="my-recipes" element={<MyRecipesPage />} />
        <Route path="saved-recipes" element={<SavedRecipesPage />} />
        <Route path="recipes/new" element={<CreateRecipePage />} />
        <Route path="my-recipes/:recipeId/edit" element={<CreateRecipePage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
