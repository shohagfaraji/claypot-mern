import { Navigate, Outlet } from 'react-router-dom';

import { useAuth } from '@/features/auth/hooks/use-auth';

export function AdminRoute() {
  const { user } = useAuth();

  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
