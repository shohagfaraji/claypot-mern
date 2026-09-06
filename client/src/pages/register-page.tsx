import { AtSign, Eye, EyeOff, LoaderCircle, LockKeyhole, Mail, UserRound } from 'lucide-react';
import { useState, type SubmitEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthPageLayout } from '@/features/auth/components/auth-page-layout';
import { useAuth } from '@/features/auth/hooks/use-auth';

export function RegisterPage() {
  const { status, signUp } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === 'authenticated' && !isSubmitting) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    setError(null);
    setIsSubmitting(true);

    try {
      const session = await signUp({
        name: String(formData.get('name') ?? '').trim(),
        username: String(formData.get('username') ?? '')
          .trim()
          .toLowerCase(),
        email: String(formData.get('email') ?? '')
          .trim()
          .toLowerCase(),
        password: String(formData.get('password') ?? ''),
      });
      navigate('/account', {
        replace: true,
        state: {
          registrationCompleted: true,
          verificationEmailSent: session.verificationEmailSent,
        },
      });
    } catch (registrationError) {
      setError(
        registrationError instanceof Error
          ? registrationError.message
          : 'Account creation could not be completed.',
      );
      setIsSubmitting(false);
    }
  }

  const isDisabled = isSubmitting || status === 'loading';

  return (
    <AuthPageLayout
      eyebrow="Join Claypot"
      title="Give your recipes a place to live."
      description="Create an account to preserve family favourites, publish your own dishes, and become part of a growing community of home cooks."
      quote="Every well-loved recipe deserves to be remembered."
    >
      <Card className="mx-auto w-full max-w-lg border-border/70 bg-card/95 shadow-2xl shadow-primary/8 backdrop-blur-sm">
        <CardContent className="p-6 sm:p-8">
          <div className="grid size-11 place-items-center rounded-xl bg-secondary text-primary">
            <UserRound className="size-5" />
          </div>
          <h2 className="mt-5 font-serif text-3xl font-medium tracking-[-0.035em]">
            Create your account
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Start collecting and sharing recipes in a few simple steps.
          </p>

          <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <div className="relative">
                <UserRound className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="name"
                  className="h-11 pl-9"
                  name="name"
                  type="text"
                  autoComplete="name"
                  minLength={2}
                  maxLength={80}
                  placeholder="Your name"
                  required
                  disabled={isDisabled}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <AtSign className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="username"
                  className="h-11 pl-9"
                  name="username"
                  type="text"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  minLength={3}
                  maxLength={30}
                  pattern="[a-z0-9][a-z0-9_]*[a-z0-9]"
                  title="Use lowercase letters, numbers, and underscores."
                  placeholder="your_username"
                  required
                  disabled={isDisabled}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  className="h-11 pl-9"
                  name="email"
                  type="email"
                  autoComplete="email"
                  maxLength={254}
                  placeholder="you@example.com"
                  required
                  disabled={isDisabled}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="register-password">Password</Label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="register-password"
                  className="h-11 pr-10 pl-9"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={72}
                  pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{8,72}"
                  title="Use at least 8 characters with uppercase, lowercase, and a number."
                  placeholder="Create a strong password"
                  required
                  disabled={isDisabled}
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
              <p className="text-xs leading-5 text-muted-foreground">
                At least 8 characters with uppercase, lowercase, and a number.
              </p>
            </div>

            {error && (
              <div
                className="rounded-xl border border-destructive/20 bg-destructive/8 px-4 py-3 text-sm text-destructive"
                role="alert"
              >
                {error}
              </div>
            )}

            <Button className="h-11 w-full text-base" type="submit" disabled={isDisabled}>
              {isDisabled && <LoaderCircle className="animate-spin" />}
              {status === 'loading'
                ? 'Checking your session…'
                : isSubmitting
                  ? 'Creating account…'
                  : 'Create account'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link className="font-semibold text-primary hover:underline" to="/login">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </AuthPageLayout>
  );
}
