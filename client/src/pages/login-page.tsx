import { Eye, EyeOff, LoaderCircle, LockKeyhole, UserRound } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';

import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/features/auth/hooks/use-auth';

function getRedirectPath(state: unknown) {
  if (
    typeof state === 'object' &&
    state !== null &&
    'from' in state &&
    typeof state.from === 'string' &&
    state.from.startsWith('/')
  ) {
    return state.from;
  }

  return '/';
}

export function LoginPage() {
  const { status, signIn } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const redirectPath = getRedirectPath(location.state);

  if (status === 'authenticated') {
    return <Navigate to={redirectPath} replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const identifier = String(formData.get('identifier') ?? '').trim();
    const password = String(formData.get('password') ?? '');

    setError(null);
    setIsSubmitting(true);

    try {
      await signIn({ identifier, password });
      navigate(redirectPath, { replace: true });
    } catch (signInError) {
      setError(
        signInError instanceof Error ? signInError.message : 'Sign in could not be completed.',
      );
      setIsSubmitting(false);
    }
  }

  return (
    <AppShell>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_22%,color-mix(in_oklch,var(--accent),transparent_40%),transparent_32%),radial-gradient(circle_at_82%_78%,color-mix(in_oklch,var(--secondary),transparent_15%),transparent_35%)]" />
        <div className="mx-auto grid min-h-[75vh] w-full max-w-7xl gap-12 px-5 py-14 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:px-10 lg:py-20">
          <div className="max-w-xl">
            <p className="text-xs font-bold tracking-[0.14em] text-primary uppercase">
              Welcome back
            </p>
            <h1 className="mt-4 font-serif text-5xl leading-[0.98] font-medium tracking-[-0.05em] sm:text-6xl">
              Your kitchen stories are waiting.
            </h1>
            <p className="mt-5 text-base leading-7 text-muted-foreground sm:text-lg">
              Sign in to continue building your recipe collection and sharing dishes with the
              Claypot community.
            </p>
            <div className="mt-8 hidden items-center gap-3 text-sm text-muted-foreground lg:flex">
              <img className="size-12 object-contain" src="/brand/claypot-logo.png" alt="" />
              <span>Recipes have a way of bringing people back together.</span>
            </div>
          </div>

          <Card className="mx-auto w-full max-w-lg border-border/70 bg-card/95 shadow-2xl shadow-primary/8 backdrop-blur-sm">
            <CardContent className="p-6 sm:p-8">
              <div className="grid size-11 place-items-center rounded-xl bg-secondary text-primary">
                <LockKeyhole className="size-5" />
              </div>
              <h2 className="mt-5 font-serif text-3xl font-medium tracking-[-0.035em]">
                Sign in to Claypot
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Use your email address or username to access your account.
              </p>

              <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="identifier">Email or username</Label>
                  <div className="relative">
                    <UserRound className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="identifier"
                      className="h-11 pl-9"
                      name="identifier"
                      type="text"
                      autoComplete="username"
                      minLength={3}
                      maxLength={254}
                      placeholder="you@example.com"
                      required
                      disabled={isSubmitting || status === 'loading'}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="password"
                      className="h-11 px-10 pl-9"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      maxLength={72}
                      placeholder="Enter your password"
                      required
                      disabled={isSubmitting || status === 'loading'}
                    />
                    <Button
                      className="absolute top-1/2 right-1.5 -translate-y-1/2"
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowPassword((current) => !current)}
                    >
                      {showPassword ? <EyeOff /> : <Eye />}
                    </Button>
                  </div>
                </div>

                {error && (
                  <div
                    className="rounded-xl border border-destructive/20 bg-destructive/8 px-4 py-3 text-sm text-destructive"
                    role="alert"
                  >
                    {error}
                  </div>
                )}

                <Button
                  className="h-11 w-full text-base"
                  type="submit"
                  disabled={isSubmitting || status === 'loading'}
                >
                  {(isSubmitting || status === 'loading') && (
                    <LoaderCircle className="animate-spin" />
                  )}
                  {status === 'loading'
                    ? 'Checking your session…'
                    : isSubmitting
                      ? 'Signing in…'
                      : 'Sign in'}
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                Looking for inspiration?{' '}
                <Link className="font-semibold text-primary hover:underline" to="/recipes">
                  Browse recipes
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </AppShell>
  );
}
