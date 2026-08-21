import {
  CheckCircle2,
  Eye,
  EyeOff,
  LoaderCircle,
  MailCheck,
  RefreshCw,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useEffect, useState, type SubmitEvent } from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  cancelEmailChange,
  getPendingEmailChange,
  requestEmailChange,
  resendEmailChange,
} from '@/features/auth/api/auth';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { useAuthenticatedRequest } from '@/features/auth/hooks/use-authenticated-request';
import type { PendingEmailChange } from '@/features/auth/types';

const expirationFormatter = new Intl.DateTimeFormat('en', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export function AccountEmailChange() {
  const { user } = useAuth();
  const request = useAuthenticatedRequest();
  const [pending, setPending] = useState<PendingEmailChange | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let isActive = true;
    void getPendingEmailChange(request)
      .then((emailChange) => {
        if (isActive) setPending(emailChange);
      })
      .catch((loadError: unknown) => {
        if (isActive) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Pending email changes could not be loaded.',
          );
        }
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [request]);

  useEffect(() => {
    if (pending === null) return;
    const resendAt = new Date(pending.canResendAt).getTime();
    if (resendAt <= Date.now()) return;

    const interval = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(interval);
  }, [pending]);

  if (user === null) return null;

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setError(null);
    setNotice(null);
    setIsSubmitting(true);
    try {
      const emailChange = await requestEmailChange(request, {
        email: String(formData.get('email') ?? '').trim(),
        password: String(formData.get('password') ?? ''),
      });
      setPending(emailChange);
      setNow(Date.now());
      setNotice('A confirmation link has been sent to your new email address.');
      form.reset();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Your email change could not be requested.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResend() {
    setError(null);
    setNotice(null);
    setIsResending(true);
    try {
      const emailChange = await resendEmailChange(request);
      setPending(emailChange);
      setNow(Date.now());
      setNotice('A new confirmation link has been sent.');
    } catch (resendError) {
      setError(
        resendError instanceof Error
          ? resendError.message
          : 'The confirmation email could not be resent.',
      );
    } finally {
      setIsResending(false);
    }
  }

  async function handleCancel() {
    setError(null);
    setNotice(null);
    setIsCancelling(true);
    try {
      await cancelEmailChange(request);
      setPending(null);
      setCancelDialogOpen(false);
      setNotice('The pending email change has been cancelled.');
    } catch (cancelError) {
      setError(
        cancelError instanceof Error
          ? cancelError.message
          : 'The email change could not be cancelled.',
      );
    } finally {
      setIsCancelling(false);
    }
  }

  const resendSeconds = pending
    ? Math.max(0, Math.ceil((new Date(pending.canResendAt).getTime() - now) / 1_000))
    : 0;

  return (
    <>
      <section className="mx-auto w-full max-w-7xl px-5 pb-10 sm:px-8 lg:px-10">
        <Card className="border-border/70 shadow-sm">
          <CardContent className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[0.72fr_1fr] lg:gap-12">
            <div>
              <div className="grid size-11 place-items-center rounded-xl bg-secondary text-primary">
                <MailCheck className="size-5" />
              </div>
              <h2 className="mt-5 font-serif text-3xl font-medium tracking-[-0.03em]">
                Change email address
              </h2>
              <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
                Your current address remains active until the new one is confirmed. Other sessions
                will be signed out after confirmation.
              </p>
              <div className="mt-5 rounded-xl border bg-muted/35 px-4 py-3 text-sm">
                <p className="text-xs font-medium text-muted-foreground">Current email</p>
                <p className="mt-1 break-all font-semibold">{user.email}</p>
              </div>
            </div>

            <div>
              {isLoading ? (
                <div className="flex min-h-44 items-center justify-center text-sm text-muted-foreground">
                  <LoaderCircle className="mr-2 size-4 animate-spin" />
                  Checking for pending changes…
                </div>
              ) : pending ? (
                <div className="rounded-2xl border bg-background p-5">
                  <div className="flex items-start gap-3">
                    <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                      <ShieldCheck className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold">Confirmation pending</p>
                      <p className="mt-1 break-all text-sm text-muted-foreground">
                        {pending.email}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Link expires {expirationFormatter.format(new Date(pending.expiresAt))}
                      </p>
                    </div>
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <Button
                      variant="outline"
                      disabled={isResending || resendSeconds > 0}
                      onClick={() => void handleResend()}
                    >
                      {isResending ? <LoaderCircle className="animate-spin" /> : <RefreshCw />}
                      {isResending
                        ? 'Sending…'
                        : resendSeconds > 0
                          ? `Resend in ${resendSeconds}s`
                          : 'Resend email'}
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={isCancelling}
                      onClick={() => setCancelDialogOpen(true)}
                    >
                      <X />
                      Cancel change
                    </Button>
                  </div>
                </div>
              ) : (
                <form className="space-y-5" onSubmit={handleSubmit}>
                  <div className="space-y-2">
                    <Label htmlFor="new-email">New email address</Label>
                    <Input
                      id="new-email"
                      className="h-11"
                      name="email"
                      type="email"
                      autoComplete="email"
                      maxLength={254}
                      placeholder="new@example.com"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email-change-password">Current password</Label>
                    <div className="relative">
                      <Input
                        id="email-change-password"
                        className="h-11 pr-10"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        maxLength={72}
                        required
                        disabled={isSubmitting}
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
                  <Button className="h-11 w-full" type="submit" disabled={isSubmitting}>
                    {isSubmitting && <LoaderCircle className="animate-spin" />}
                    {isSubmitting ? 'Sending confirmation…' : 'Send confirmation email'}
                  </Button>
                </form>
              )}

              {notice && (
                <div
                  className="mt-5 flex gap-2 rounded-xl border border-primary/20 bg-secondary/55 px-4 py-3 text-sm"
                  role="status"
                >
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{notice}</span>
                </div>
              )}
              {error && (
                <div
                  className="mt-5 rounded-xl border border-destructive/20 bg-destructive/8 px-4 py-3 text-sm text-destructive"
                  role="alert"
                >
                  {error}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive">
              <X />
            </AlertDialogMedia>
            <AlertDialogTitle>Cancel this email change?</AlertDialogTitle>
            <AlertDialogDescription>
              The confirmation link sent to {pending?.email ?? 'the new address'} will stop working.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>Keep change</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isCancelling}
              onClick={() => void handleCancel()}
            >
              {isCancelling && <LoaderCircle className="animate-spin" />}
              {isCancelling ? 'Cancelling…' : 'Cancel change'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
