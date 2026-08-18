import { BadgeCheck, CircleAlert, LoaderCircle, MailCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getAuthenticatedCurrentUser, verifyEmailAddress } from '@/features/auth/api/auth';
import { AuthPageLayout } from '@/features/auth/components/auth-page-layout';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { useAuthenticatedRequest } from '@/features/auth/hooks/use-authenticated-request';
import type { EmailVerificationStatus } from '@/features/auth/types';
import { cn } from '@/lib/utils';

type PageStatus = 'checking' | EmailVerificationStatus | 'error';

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token')?.trim() ?? '';
  const { status: authStatus, updateSessionUser } = useAuth();
  const request = useAuthenticatedRequest();
  const [pageStatus, setPageStatus] = useState<PageStatus>(token ? 'checking' : 'error');
  const [error, setError] = useState<string | null>(
    token ? null : 'This verification link is incomplete.',
  );

  useEffect(() => {
    if (!token) return;

    let isActive = true;

    void verifyEmailAddress(token)
      .then(async (verificationStatus) => {
        if (authStatus === 'authenticated') {
          const currentUser = await getAuthenticatedCurrentUser(request).catch(() => null);
          if (isActive && currentUser !== null) updateSessionUser(currentUser);
        }

        if (isActive) setPageStatus(verificationStatus);
      })
      .catch((verificationError: unknown) => {
        if (!isActive) return;
        setError(
          verificationError instanceof Error
            ? verificationError.message
            : 'This email address could not be verified.',
        );
        setPageStatus('error');
      });

    return () => {
      isActive = false;
    };
  }, [authStatus, request, token, updateSessionUser]);

  const isSuccessful = pageStatus === 'verified' || pageStatus === 'already_verified';

  return (
    <AuthPageLayout
      eyebrow="Account verification"
      title="One final step for your Claypot account."
      description="Email verification helps keep member accounts trustworthy without interrupting access to recipes and community features."
      quote="A trusted community begins with the small details."
    >
      <Card className="mx-auto w-full max-w-lg border-border/70 bg-card/95 shadow-2xl shadow-primary/8 backdrop-blur-sm">
        <CardContent className="p-7 text-center sm:p-9">
          <div
            className={cn(
              'mx-auto grid size-14 place-items-center rounded-2xl',
              pageStatus === 'checking' && 'bg-secondary text-primary',
              isSuccessful && 'bg-primary/10 text-primary',
              pageStatus === 'error' && 'bg-destructive/10 text-destructive',
            )}
          >
            {pageStatus === 'checking' ? (
              <LoaderCircle className="size-6 animate-spin" />
            ) : isSuccessful ? (
              <BadgeCheck className="size-7" />
            ) : (
              <CircleAlert className="size-7" />
            )}
          </div>

          <h1 className="mt-6 font-serif text-3xl font-medium tracking-[-0.035em]">
            {pageStatus === 'checking'
              ? 'Verifying your email…'
              : pageStatus === 'verified'
                ? 'Email verified'
                : pageStatus === 'already_verified'
                  ? 'Email already verified'
                  : 'Verification link unavailable'}
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
            {pageStatus === 'checking'
              ? 'Keep this page open while Claypot confirms your verification link.'
              : pageStatus === 'verified'
                ? 'Your email address is now confirmed and your account status has been updated.'
                : pageStatus === 'already_verified'
                  ? 'This address was confirmed earlier, so no further action is needed.'
                  : error}
          </p>

          {pageStatus !== 'checking' && (
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <Link
                className={cn(buttonVariants({ variant: 'default', size: 'lg' }))}
                to={authStatus === 'authenticated' ? '/account' : '/login'}
              >
                {isSuccessful ? <BadgeCheck /> : <MailCheck />}
                {authStatus === 'authenticated' ? 'Open account' : 'Sign in'}
              </Link>
              <Link
                className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}
                to="/recipes"
              >
                Browse recipes
              </Link>
            </div>
          )}

          {pageStatus === 'checking' && (
            <Button className="mt-7" variant="outline" disabled>
              <LoaderCircle className="animate-spin" />
              Checking link
            </Button>
          )}
        </CardContent>
      </Card>
    </AuthPageLayout>
  );
}
