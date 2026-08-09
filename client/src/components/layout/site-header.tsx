import { Menu, Search, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navigation = [
  { label: 'Discover', href: '/#discover' },
  { label: 'How it works', href: '/#how-it-works' },
  { label: 'Our story', href: '/#our-story' },
];

export function SiteHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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

        <div className="hidden items-center sm:flex">
          <a
            className={cn(buttonVariants({ size: 'lg' }), 'px-4 shadow-sm shadow-primary/15')}
            href="/#discover"
          >
            <Search />
            Explore recipes
          </a>
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
              <a
                className={cn(buttonVariants({ size: 'lg' }), 'w-full px-4')}
                href="/#discover"
                onClick={() => setIsMenuOpen(false)}
              >
                <Search />
                Explore recipes
              </a>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
