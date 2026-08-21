import { BadgeCheck, CircleAlert, LoaderCircle, MailCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { confirmEmailAddressChange, getAuthenticatedCurrentUser } from '@/features/auth/api/auth';
import { AuthPageLayout } from '@/features/auth/components/auth-page-layout';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { useAuthenticatedRequest } from '@/features/auth/hooks/use-authenticated-request';
import { cn } from '@/lib/utils';

type PageStatus = 'checking' | 'changed' | 'error';

export function ConfirmEmailChangePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token')?.trim() ?? '';
  const { status: authStatus, signOut, updateSessionUser } = useAuth();
  const request = useAuthenticatedRequest();
  const [pageStatus, setPageStatus] = useState<PageStatus>(token ? 'checking' : 'error');
  const [sessionPreserved, setSessionPreserved] = useState(false);
  const [error, setError] = useState<string | null>(
    token ? null : 'This email change link is incomplete.',
  );

  useEffect(() => {
    if (!token) return;
    let isActive = true;

    void confirmEmailAddressChange(token)
      .then(async (result) => {
        if (result.currentSessionPreserved && authStatus === 'authenticated') {
          const currentUser = await getAuthenticatedCurrentUser(request).catch(() => null);
          if (isActive && currentUser !== null) updateSessionUser(currentUser);
        } else if (!result.currentSessionPreserved && authStatus === 'authenticated') {
          await signOut().catch(() => undefined);
        }

        if (!isActive) return;
        setSessionPreserved(result.currentSessionPreserved);
        setPageStatus('changed');
      })
      .catch((confirmationError: unknown) => {
        if (!isActive) return;
        setError(
          confirmationError instanceof Error
            ? confirmationError.message
            : 'Your email address could not be changed.',
        );
        setPageStatus('error');
      });

    return () => {
      isActive = false;
    };
  }, [authStatus, request, signOut, token, updateSessionUser]);

  return (
    <AuthPageLayout
      eyebrow="Email security"
      title="Confirm your new Claypot address."
      description="Your account email changes only after this private verification link is confirmed."
      quote="A secure account keeps every recipe within reach."
    >
      <Card className="mx-auto w-full max-w-lg border-border/70 bg-card/95 shadow-2xl shadow-primary/8 backdrop-blur-sm">
        <CardContent className="p-7 text-center sm:p-9">
          <div
            className={cn(
              'mx-auto grid size-14 place-items-center rounded-2xl',
              pageStatus === 'checking' && 'bg-secondary text-primary',
              pageStatus === 'changed' && 'bg-primary/10 text-primary',
              pageStatus === 'error' && 'bg-destructive/10 text-destructive',
            )}
          >
            {pageStatus === 'checking' ? (
              <LoaderCircle className="size-6 animate-spin" />
            ) : pageStatus === 'changed' ? (
              <BadgeCheck className="size-7" />
            ) : (
              <CircleAlert className="size-7" />
            )}
          </div>

          <h1 className="mt-6 font-serif text-3xl font-medium tracking-[-0.035em]">
            {pageStatus === 'checking'
              ? 'Confirming your email…'
              : pageStatus === 'changed'
                ? 'Email address updated'
                : 'Confirmation link unavailable'}
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
            {pageStatus === 'checking'
              ? 'Keep this page open while Claypot secures your new address.'
              : pageStatus === 'changed'
                ? sessionPreserved
                  ? 'Your new email is verified and your current session remains active.'
                  : 'Your new email is verified. Sign in again to continue securely.'
                : error}
          </p>

          {pageStatus !== 'checking' && (
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <Link
                className={buttonVariants({ variant: 'default', size: 'lg' })}
                to={pageStatus === 'changed' && sessionPreserved ? '/account' : '/login'}
              >
                {pageStatus === 'changed' ? <BadgeCheck /> : <MailCheck />}
                {pageStatus === 'changed' && sessionPreserved ? 'Open account' : 'Sign in'}
              </Link>
              <Link className={buttonVariants({ variant: 'outline', size: 'lg' })} to="/recipes">
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
