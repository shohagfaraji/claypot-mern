import type { ReactNode } from 'react';
import { SiteFooter } from './site-footer';
import { SiteHeader } from './site-header';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="grid min-h-svh grid-rows-[auto_1fr_auto]">
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
    </div>
  );
}
