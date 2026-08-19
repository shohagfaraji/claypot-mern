import { Eye, EyeOff, KeyRound, LoaderCircle, LockKeyhole } from 'lucide-react';
import { useState, type SubmitEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { resetPassword } from '@/features/auth/api/auth';
import { AuthPageLayout } from '@/features/auth/components/auth-page-layout';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token')?.trim() ?? '';
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(
    token.length === 43 ? null : 'This password reset link is incomplete.',
  );

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const password = String(formData.get('password') ?? '');
    const confirmation = String(formData.get('passwordConfirmation') ?? '');

    if (password !== confirmation) {
      setError('Passwords do not match.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      setMessage(await resetPassword({ token, password }));
    } catch (resetError) {
      setError(
        resetError instanceof Error ? resetError.message : 'Your password could not be reset.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthPageLayout
      eyebrow="Password reset"
      title="Choose a fresh key for your kitchen."
      description="Create a strong password that you do not use for another account."
      quote="Small safeguards keep treasured recipes close."
    >
      <Card className="mx-auto w-full max-w-lg border-border/70 bg-card/95 shadow-2xl shadow-primary/8 backdrop-blur-sm">
        <CardContent className="p-6 sm:p-8">
          <div className="grid size-11 place-items-center rounded-xl bg-secondary text-primary">
            <KeyRound className="size-5" />
          </div>
          <h2 className="mt-5 font-serif text-3xl font-medium tracking-[-0.035em]">
            Create a new password
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Use at least 8 characters with uppercase, lowercase, and a number.
          </p>
          {message ? (
            <div className="mt-7 space-y-5">
              <div
                className="rounded-xl border border-primary/20 bg-primary/8 px-4 py-3 text-sm text-foreground"
                role="status"
              >
                {message}
              </div>
              <Link className={buttonVariants({ className: 'h-11 w-full text-base' })} to="/login">
                Continue to sign in
              </Link>
            </div>
          ) : (
            <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="new-password">New password</Label>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="new-password"
                    className="h-11 pr-10 pl-9"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={72}
                    pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{8,72}"
                    required
                    disabled={isSubmitting || token.length !== 43}
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
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm new password</Label>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="confirm-password"
                    className="h-11 pl-9"
                    name="passwordConfirmation"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={72}
                    required
                    disabled={isSubmitting || token.length !== 43}
                  />
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
                disabled={isSubmitting || token.length !== 43}
              >
                {isSubmitting && <LoaderCircle className="animate-spin" />}
                {isSubmitting ? 'Updating password…' : 'Update password'}
              </Button>
            </form>
          )}
          {!message && (
            <p className="mt-6 text-center text-sm text-muted-foreground">
              <Link className="font-semibold text-primary hover:underline" to="/forgot-password">
                Request a new link
              </Link>
            </p>
          )}
        </CardContent>
      </Card>
    </AuthPageLayout>
  );
}
