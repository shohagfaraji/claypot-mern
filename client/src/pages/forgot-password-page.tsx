import { KeyRound, LoaderCircle, Mail, Send } from 'lucide-react';
import { useState, type SubmitEvent } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { requestPasswordReset, resendPasswordReset } from '@/features/auth/api/auth';
import { AuthPageLayout } from '@/features/auth/components/auth-page-layout';

const genericMessage = 'If an account matches that email, a password reset link will be sent.';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = String(new FormData(event.currentTarget).get('email') ?? '').trim();
    setEmail(normalizedEmail);
    setError(null);
    setIsSubmitting(true);
    try {
      await requestPasswordReset({ email: normalizedEmail });
      setMessage(genericMessage);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'The request could not be completed.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResend() {
    setError(null);
    setIsResending(true);
    try {
      await resendPasswordReset({ email });
      setMessage(genericMessage);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'The request could not be completed.',
      );
    } finally {
      setIsResending(false);
    }
  }

  return (
    <AuthPageLayout
      eyebrow="Account recovery"
      title="Find your way back to your recipes."
      description="Request a private, time-limited link to choose a new password."
      quote="A familiar kitchen is never far away."
    >
      <Card className="mx-auto w-full max-w-lg border-border/70 bg-card/95 shadow-2xl shadow-primary/8 backdrop-blur-sm">
        <CardContent className="p-6 sm:p-8">
          <div className="grid size-11 place-items-center rounded-xl bg-secondary text-primary">
            <KeyRound className="size-5" />
          </div>
          <h2 className="mt-5 font-serif text-3xl font-medium tracking-[-0.035em]">
            Reset your password
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Enter the email address connected to your account.
          </p>
          <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="recovery-email">Email address</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="recovery-email"
                  className="h-11 pl-9"
                  name="email"
                  type="email"
                  autoComplete="email"
                  maxLength={254}
                  placeholder="you@example.com"
                  required
                  disabled={isSubmitting || message !== null}
                />
              </div>
            </div>
            {message && (
              <div
                className="rounded-xl border border-primary/20 bg-primary/8 px-4 py-3 text-sm text-foreground"
                role="status"
              >
                {message}
              </div>
            )}
            {error && (
              <div
                className="rounded-xl border border-destructive/20 bg-destructive/8 px-4 py-3 text-sm text-destructive"
                role="alert"
              >
                {error}
              </div>
            )}
            {message === null ? (
              <Button className="h-11 w-full text-base" type="submit" disabled={isSubmitting}>
                {isSubmitting ? <LoaderCircle className="animate-spin" /> : <Send />}
                {isSubmitting ? 'Sending…' : 'Send reset link'}
              </Button>
            ) : (
              <Button
                className="h-11 w-full text-base"
                type="button"
                variant="outline"
                onClick={handleResend}
                disabled={isResending}
              >
                {isResending && <LoaderCircle className="animate-spin" />}
                {isResending ? 'Sending again…' : 'Resend reset email'}
              </Button>
            )}
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link className="font-semibold text-primary hover:underline" to="/login">
              Back to sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </AuthPageLayout>
  );
}
