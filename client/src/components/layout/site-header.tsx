import { BookOpen, Menu, Search, UserRound, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, buttonVariants } from '@/components/ui/button';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { cn } from '@/lib/utils';

const navigation = [
  { label: 'Discover', href: '/recipes' },
  { label: 'How it works', href: '/#how-it-works' },
  { label: 'Our story', href: '/#our-story' },
];

export function SiteHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { status, user } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex h-18 w-full max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10">
        <Link
          className="flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          to="/"
          aria-label="Claypot home"
        >
          <img className="size-10 object-contain" src="/brand/claypot-logo.png" alt="" />
          <span className="text-xl font-bold tracking-[-0.035em]">Claypot</span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary navigation">
          {navigation.map((item) => (
            <a
              key={item.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              href={item.href}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 sm:flex">
          {status === 'authenticated' && user ? (
            <>
              <Link className={buttonVariants({ variant: 'ghost', size: 'lg' })} to="/my-recipes">
                <BookOpen />
                My recipes
              </Link>
              <Link className={buttonVariants({ variant: 'ghost', size: 'lg' })} to="/account">
                <UserRound />
                {user.name.split(' ')[0]}
              </Link>
            </>
          ) : status === 'unauthenticated' ? (
            <Link className={buttonVariants({ variant: 'ghost', size: 'lg' })} to="/login">
              Sign in
            </Link>
          ) : null}
          <Link
            className={cn(buttonVariants({ size: 'lg' }), 'px-4 shadow-sm shadow-primary/15')}
            to="/recipes"
          >
            <Search />
            Explore recipes
          </Link>
        </div>

        <Button
          className="sm:hidden"
          variant="ghost"
          size="icon-lg"
          aria-controls="mobile-navigation"
          aria-expanded={isMenuOpen}
          aria-label={isMenuOpen ? 'Close navigation' : 'Open navigation'}
          onClick={() => setIsMenuOpen((current) => !current)}
        >
          {isMenuOpen ? <X /> : <Menu />}
        </Button>
      </div>

      {isMenuOpen && (
        <div id="mobile-navigation" className="border-t bg-background px-5 py-5 sm:hidden">
          <nav className="mx-auto grid max-w-7xl gap-1" aria-label="Mobile navigation">
            {navigation.map((item) => (
              <a
                key={item.href}
                className="rounded-lg px-3 py-3 text-base font-medium hover:bg-muted"
                href={item.href}
                onClick={() => setIsMenuOpen(false)}
              >
                {item.label}
              </a>
            ))}
            <div className="mt-4 border-t pt-5">
              {status === 'authenticated' && user ? (
                <div className="mb-3 grid gap-2">
                  <Link
                    className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'w-full')}
                    to="/my-recipes"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <BookOpen />
                    My recipes
                  </Link>
                  <Link
                    className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'w-full')}
                    to="/account"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <UserRound />
                    Your account
                  </Link>
                </div>
              ) : status === 'unauthenticated' ? (
                <Link
                  className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'mb-3 w-full')}
                  to="/login"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Sign in
                </Link>
              ) : null}
              <Link
                className={cn(buttonVariants({ size: 'lg' }), 'w-full px-4')}
                to="/recipes"
                onClick={() => setIsMenuOpen(false)}
              >
                <Search />
                Explore recipes
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
