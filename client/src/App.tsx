import { Route, Routes } from 'react-router-dom';

import { HomePage } from '@/pages/home-page';
import { NotFoundPage } from '@/pages/not-found-page';
import { RecipesPage } from '@/pages/recipes-page';

function App() {
  return (
    <Routes>
      <Route index element={<HomePage />} />
      <Route path="recipes" element={<RecipesPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
