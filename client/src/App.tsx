import { Route, Routes } from 'react-router-dom';

import { HomePage } from '@/pages/home-page';
import { NotFoundPage } from '@/pages/not-found-page';

function App() {
  return (
    <Routes>
      <Route index element={<HomePage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
