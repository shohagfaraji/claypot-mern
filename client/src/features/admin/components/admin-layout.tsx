import { ArrowLeft, BookOpen, LayoutDashboard, ShieldCheck, Users } from 'lucide-react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '@/features/auth/hooks/use-auth';
import { getInitials } from '@/lib/get-initials';
import { cn } from '@/lib/utils';

const navigation = [
  { label: 'Overview', href: '/admin', icon: LayoutDashboard },
  { label: 'Recipes', href: '/admin/recipes', icon: BookOpen },
  { label: 'Users', href: '/admin/users', icon: Users },
];

export function AdminLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const activeLabel = navigation.find((item) => item.href === location.pathname)?.label ?? 'Admin';

  return (
    <div className="min-h-svh bg-muted/25 lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-svh flex-col border-r bg-card lg:flex">
        <div className="border-b px-6 py-5">
          <Link
            className="flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            to="/admin"
          >
            <img className="size-10 object-contain" src="/brand/claypot-logo.png" alt="" />
            <div>
              <p className="text-base font-bold tracking-[-0.025em]">Claypot</p>
              <p className="text-xs font-medium text-muted-foreground">Administration</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 p-4" aria-label="Admin navigation">
          {navigation.map((item) => (
            <NavLink
              key={item.href}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                  isActive && 'bg-primary/10 text-primary',
                )
              }
              to={item.href}
              end
            >
              <item.icon className="size-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t p-4">
          <div className="mb-4 flex items-center gap-3 px-2">
            <div className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              {getInitials(user?.name ?? 'Admin')}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user?.name}</p>
              <p className="truncate text-xs text-muted-foreground">Administrator</p>
            </div>
          </div>
          <Link
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            to="/"
          >
            <ArrowLeft className="size-4" />
            Back to website
          </Link>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-background/90 px-5 backdrop-blur-xl sm:px-8 lg:hidden">
          <Link className="flex items-center gap-2.5" to="/admin">
            <img className="size-9 object-contain" src="/brand/claypot-logo.png" alt="" />
            <div>
              <p className="text-sm font-bold">Claypot Admin</p>
              <p className="text-[11px] text-muted-foreground">{activeLabel}</p>
            </div>
          </Link>
          <Link
            className="grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            to="/"
            aria-label="Back to website"
          >
            <ArrowLeft className="size-4" />
          </Link>
        </header>

        <nav
          className="flex gap-1 overflow-x-auto border-b bg-background px-5 py-2 lg:hidden"
          aria-label="Admin navigation"
        >
          {navigation.map((item) => (
            <NavLink
              key={item.href}
              className={({ isActive }) =>
                cn(
                  'flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground',
                  isActive && 'bg-primary/10 text-primary',
                )
              }
              to={item.href}
              end
            >
              <item.icon className="size-3.5" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <main>
          <Outlet />
        </main>

        <footer className="flex items-center justify-center gap-2 border-t px-5 py-5 text-xs text-muted-foreground lg:hidden">
          <ShieldCheck className="size-3.5" />
          Restricted administration area
        </footer>
      </div>
    </div>
  );
}
