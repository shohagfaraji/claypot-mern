import type { ReactNode } from 'react';

import { AppShell } from '@/components/layout/app-shell';

interface AuthPageLayoutProps {
  eyebrow: string;
  title: string;
  description: string;
  quote: string;
  children: ReactNode;
}

export function AuthPageLayout({
  eyebrow,
  title,
  description,
  quote,
  children,
}: AuthPageLayoutProps) {
  return (
    <AppShell>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_22%,color-mix(in_oklch,var(--accent),transparent_40%),transparent_32%),radial-gradient(circle_at_82%_78%,color-mix(in_oklch,var(--secondary),transparent_15%),transparent_35%)]" />
        <div className="mx-auto grid min-h-[75vh] w-full max-w-7xl gap-12 px-5 py-14 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:px-10 lg:py-20">
          <div className="max-w-xl">
            <p className="text-xs font-bold tracking-[0.14em] text-primary uppercase">{eyebrow}</p>
            <h1 className="mt-4 font-serif text-5xl leading-[0.98] font-medium tracking-[-0.05em] sm:text-6xl">
              {title}
            </h1>
            <p className="mt-5 text-base leading-7 text-muted-foreground sm:text-lg">
              {description}
            </p>
            <div className="mt-8 hidden items-center gap-3 text-sm text-muted-foreground lg:flex">
              <img className="size-12 object-contain" src="/brand/claypot-logo.png" alt="" />
              <span>{quote}</span>
            </div>
          </div>

          {children}
        </div>
      </section>
    </AppShell>
  );
}
