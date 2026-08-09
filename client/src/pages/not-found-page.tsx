import { ArrowLeft, UtensilsCrossed } from 'lucide-react';
import { Link } from 'react-router-dom';

import { AppShell } from '@/components/layout/app-shell';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function NotFoundPage() {
  return (
    <AppShell>
      <section className="mx-auto grid min-h-[68vh] w-full max-w-7xl place-items-center px-5 py-20 text-center sm:px-8 lg:px-10">
        <div>
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-secondary text-primary">
            <UtensilsCrossed className="size-6" />
          </div>
          <p className="mt-6 text-sm font-bold tracking-widest text-primary uppercase">404 error</p>
          <h1 className="mt-3 font-serif text-5xl font-medium tracking-[-0.04em] sm:text-6xl">
            This recipe is missing
          </h1>
          <p className="mx-auto mt-4 max-w-lg leading-7 text-muted-foreground">
            The page may have moved, or the link may no longer be available.
          </p>
          <Link className={cn(buttonVariants({ size: 'lg' }), 'mt-8 h-11 px-5')} to="/">
            <ArrowLeft />
            Back to home
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
