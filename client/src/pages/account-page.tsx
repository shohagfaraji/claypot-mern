import { CalendarDays, CheckCircle2, LoaderCircle, LogOut, Mail, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { AppShell } from '@/components/layout/app-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { getInitials } from '@/lib/get-initials';

const dateFormatter = new Intl.DateTimeFormat('en', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export function AccountPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user === null) {
    return null;
  }

  async function handleSignOut() {
    setError(null);
    setIsSigningOut(true);

    try {
      await signOut();
      navigate('/', { replace: true });
    } catch (signOutError) {
      setError(
        signOutError instanceof Error ? signOutError.message : 'Sign out could not be completed.',
      );
      setIsSigningOut(false);
    }
  }

  return (
    <AppShell>
      <section className="border-b bg-card/45">
        <div className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-8 sm:py-16 lg:px-10">
          <p className="text-xs font-bold tracking-[0.14em] text-primary uppercase">Your account</p>
          <h1 className="mt-3 font-serif text-5xl font-medium tracking-[-0.045em] sm:text-6xl">
            Welcome, {user.name.split(' ')[0]}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
            Review the profile connected to your Claypot session and manage your sign-in.
          </p>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-6 px-5 py-10 sm:px-8 lg:grid-cols-[1fr_0.72fr] lg:px-10">
        <Card className="border-border/70 shadow-sm">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-2xl bg-secondary text-xl font-bold text-primary">
                {user.avatarUrl ? (
                  <img className="size-full object-cover" src={user.avatarUrl} alt={user.name} />
                ) : (
                  getInitials(user.name)
                )}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-serif text-3xl font-medium tracking-[-0.03em]">
                    {user.name}
                  </h2>
                  <Badge variant="secondary" className="capitalize">
                    {user.role}
                  </Badge>
                </div>
                <p className="mt-1 text-muted-foreground">@{user.username}</p>
              </div>
            </div>

            <dl className="mt-8 grid gap-px overflow-hidden rounded-2xl border bg-border sm:grid-cols-2">
              <div className="bg-background p-5">
                <dt className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Mail className="size-4 text-primary" />
                  Email address
                </dt>
                <dd className="mt-2 break-all font-semibold">{user.email}</dd>
              </div>
              <div className="bg-background p-5">
                <dt className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <CalendarDays className="size-4 text-primary" />
                  Claypot member since
                </dt>
                <dd className="mt-2 font-semibold">
                  {dateFormatter.format(new Date(user.createdAt))}
                </dd>
              </div>
              <div className="bg-background p-5 sm:col-span-2">
                <dt className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <CheckCircle2 className="size-4 text-primary" />
                  Email status
                </dt>
                <dd className="mt-2 font-semibold">
                  {user.isEmailVerified ? 'Verified' : 'Verification pending'}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card className="h-fit border-border/70 shadow-sm">
          <CardContent className="p-6 sm:p-8">
            <div className="grid size-11 place-items-center rounded-xl bg-secondary text-primary">
              <ShieldCheck className="size-5" />
            </div>
            <h2 className="mt-5 font-serif text-2xl font-medium">Session security</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Signing out revokes this session and removes its secure refresh cookie.
            </p>

            {error && (
              <div
                className="mt-5 rounded-xl border border-destructive/20 bg-destructive/8 px-4 py-3 text-sm text-destructive"
                role="alert"
              >
                {error}
              </div>
            )}

            <Button
              className="mt-6 w-full"
              variant="outline"
              disabled={isSigningOut}
              onClick={handleSignOut}
            >
              {isSigningOut ? <LoaderCircle className="animate-spin" /> : <LogOut />}
              {isSigningOut ? 'Signing out…' : 'Sign out'}
            </Button>
          </CardContent>
        </Card>
      </section>
    </AppShell>
  );
}
