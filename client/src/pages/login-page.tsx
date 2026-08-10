import { Eye, EyeOff, LoaderCircle, LockKeyhole, UserRound } from 'lucide-react';
import { useState, type SubmitEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthPageLayout } from '@/features/auth/components/auth-page-layout';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { getAuthRedirectPath } from '@/features/auth/lib/get-auth-redirect-path';

export function LoginPage() {
  const { status, signIn } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const redirectPath = getAuthRedirectPath(location.state);

  if (status === 'authenticated') {
    return <Navigate to={redirectPath} replace />;
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
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
    <AuthPageLayout
      eyebrow="Welcome back"
      title="Your kitchen stories are waiting."
      description="Sign in to continue building your recipe collection and sharing dishes with the Claypot community."
      quote="Recipes have a way of bringing people back together."
    >
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
                  className="h-11 pr-10 pl-9"
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
              {(isSubmitting || status === 'loading') && <LoaderCircle className="animate-spin" />}
              {status === 'loading'
                ? 'Checking your session…'
                : isSubmitting
                  ? 'Signing in…'
                  : 'Sign in'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            New to Claypot?{' '}
            <Link className="font-semibold text-primary hover:underline" to="/register">
              Create an account
            </Link>
          </p>
        </CardContent>
      </Card>
    </AuthPageLayout>
  );
}
