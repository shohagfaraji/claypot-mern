import { LoaderCircle } from 'lucide-react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '@/features/auth/hooks/use-auth';

export function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <div className="grid min-h-svh place-items-center bg-background text-muted-foreground">
        <div className="text-center">
          <img className="mx-auto size-16 object-contain" src="/brand/claypot-logo.png" alt="" />
          <LoaderCircle className="mx-auto mt-5 size-5 animate-spin" />
          <p className="mt-3 text-sm font-medium">Restoring your session…</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    const from = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to="/login" replace state={{ from }} />;
  }

  return <Outlet />;
}
