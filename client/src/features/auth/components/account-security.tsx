import {
  CheckCircle2,
  Clock3,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  MapPin,
  MonitorSmartphone,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useState, type SubmitEvent } from 'react';

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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  changeAccountPassword,
  getAccountSessions,
  revokeAccountSession,
  revokeOtherAccountSessions,
} from '@/features/auth/api/auth';
import { useAuthenticatedRequest } from '@/features/auth/hooks/use-authenticated-request';
import type { AccountSession } from '@/features/auth/types';

const sessionDateFormatter = new Intl.DateTimeFormat('en', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

type RevokeTarget = AccountSession | 'others' | null;

export function AccountSecurity() {
  const request = useAuthenticatedRequest();
  const [sessions, setSessions] = useState<AccountSession[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [sessionsNotice, setSessionsNotice] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<RevokeTarget>(null);
  const [isRevoking, setIsRevoking] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordNotice, setPasswordNotice] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    try {
      setSessions(await getAccountSessions(request));
    } catch (loadError) {
      setSessionsError(
        loadError instanceof Error ? loadError.message : 'Active sessions could not be loaded.',
      );
    } finally {
      setIsLoadingSessions(false);
    }
  }, [request]);

  useEffect(() => {
    let isActive = true;

    void getAccountSessions(request)
      .then((activeSessions) => {
        if (isActive) setSessions(activeSessions);
      })
      .catch((loadError: unknown) => {
        if (!isActive) return;
        setSessionsError(
          loadError instanceof Error ? loadError.message : 'Active sessions could not be loaded.',
        );
      })
      .finally(() => {
        if (isActive) setIsLoadingSessions(false);
      });

    return () => {
      isActive = false;
    };
  }, [request]);

  async function handlePasswordSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const currentPassword = String(formData.get('currentPassword') ?? '');
    const newPassword = String(formData.get('newPassword') ?? '');
    const confirmation = String(formData.get('passwordConfirmation') ?? '');

    setPasswordError(null);
    setPasswordNotice(null);
    if (newPassword !== confirmation) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setIsChangingPassword(true);
    try {
      setPasswordNotice(await changeAccountPassword(request, { currentPassword, newPassword }));
      form.reset();
      await loadSessions();
    } catch (changeError) {
      setPasswordError(
        changeError instanceof Error ? changeError.message : 'Your password could not be updated.',
      );
    } finally {
      setIsChangingPassword(false);
    }
  }

  async function handleRevoke() {
    if (revokeTarget === null) return;

    setSessionsError(null);
    setSessionsNotice(null);
    setIsRevoking(true);
    try {
      if (revokeTarget === 'others') {
        const count = await revokeOtherAccountSessions(request);
        setSessionsNotice(
          count === 0
            ? 'There were no other active sessions to sign out.'
            : `${count} other ${count === 1 ? 'session has' : 'sessions have'} been signed out.`,
        );
      } else {
        await revokeAccountSession(request, revokeTarget.id);
        setSessionsNotice(`${revokeTarget.device} has been signed out.`);
      }
      setRevokeTarget(null);
      await loadSessions();
    } catch (revokeError) {
      setSessionsError(
        revokeError instanceof Error ? revokeError.message : 'The session could not be signed out.',
      );
    } finally {
      setIsRevoking(false);
    }
  }

  const otherSessionCount = sessions.filter((session) => !session.isCurrent).length;

  return (
    <>
      <section className="mx-auto grid w-full max-w-7xl gap-6 px-5 pb-10 sm:px-8 lg:grid-cols-[0.82fr_1.18fr] lg:px-10">
        <Card className="border-border/70 shadow-sm">
          <CardContent className="p-6 sm:p-8">
            <div className="grid size-11 place-items-center rounded-xl bg-secondary text-primary">
              <KeyRound className="size-5" />
            </div>
            <h2 className="mt-5 font-serif text-3xl font-medium tracking-[-0.03em]">
              Change password
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Confirm your current password before choosing a new one. Other devices will be signed
              out.
            </p>

            <form className="mt-6 space-y-4" onSubmit={handlePasswordSubmit}>
              <div className="space-y-2">
                <Label htmlFor="current-password">Current password</Label>
                <Input
                  id="current-password"
                  className="h-11"
                  name="currentPassword"
                  type={showPasswords ? 'text' : 'password'}
                  autoComplete="current-password"
                  maxLength={72}
                  required
                  disabled={isChangingPassword}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="account-new-password">New password</Label>
                <div className="relative">
                  <Input
                    id="account-new-password"
                    className="h-11 pr-10"
                    name="newPassword"
                    type={showPasswords ? 'text' : 'password'}
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={72}
                    pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{8,72}"
                    required
                    disabled={isChangingPassword}
                  />
                  <Button
                    className="absolute top-1/2 right-1.5 -translate-y-1/2"
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={showPasswords ? 'Hide passwords' : 'Show passwords'}
                    onClick={() => setShowPasswords((current) => !current)}
                  >
                    {showPasswords ? <EyeOff /> : <Eye />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="account-confirm-password">Confirm new password</Label>
                <Input
                  id="account-confirm-password"
                  className="h-11"
                  name="passwordConfirmation"
                  type={showPasswords ? 'text' : 'password'}
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={72}
                  required
                  disabled={isChangingPassword}
                />
              </div>

              {passwordError && (
                <div
                  className="rounded-xl border border-destructive/20 bg-destructive/8 px-4 py-3 text-sm text-destructive"
                  role="alert"
                >
                  {passwordError}
                </div>
              )}
              {passwordNotice && (
                <div
                  className="flex gap-2 rounded-xl border border-primary/20 bg-secondary/55 px-4 py-3 text-sm"
                  role="status"
                >
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{passwordNotice}</span>
                </div>
              )}

              <Button className="h-11 w-full" type="submit" disabled={isChangingPassword}>
                {isChangingPassword && <LoaderCircle className="animate-spin" />}
                {isChangingPassword ? 'Updating password…' : 'Update password'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="grid size-11 place-items-center rounded-xl bg-secondary text-primary">
                  <MonitorSmartphone className="size-5" />
                </div>
                <h2 className="mt-5 font-serif text-3xl font-medium tracking-[-0.03em]">
                  Active sessions
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Review devices that can currently access your account.
                </p>
              </div>
              <Button
                variant="outline"
                disabled={isLoadingSessions || otherSessionCount === 0}
                onClick={() => setRevokeTarget('others')}
              >
                <ShieldCheck />
                Sign out others
              </Button>
            </div>

            {sessionsNotice && (
              <div
                className="mt-5 flex gap-2 rounded-xl border border-primary/20 bg-secondary/55 px-4 py-3 text-sm"
                role="status"
              >
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>{sessionsNotice}</span>
              </div>
            )}
            {sessionsError && (
              <div
                className="mt-5 rounded-xl border border-destructive/20 bg-destructive/8 px-4 py-3 text-sm text-destructive"
                role="alert"
              >
                {sessionsError}
              </div>
            )}

            <div className="mt-6 space-y-3">
              {isLoadingSessions ? (
                Array.from({ length: 2 }, (_, index) => (
                  <Skeleton key={index} className="h-28 rounded-xl" />
                ))
              ) : sessions.length === 0 ? (
                <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No active sessions were found.
                </p>
              ) : (
                sessions.map((session) => (
                  <div key={session.id} className="rounded-xl border bg-background p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold">{session.device}</p>
                          {session.isCurrent && <Badge variant="secondary">Current session</Badge>}
                        </div>
                        <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                          <span className="flex items-center gap-1.5">
                            <Clock3 className="size-3.5 shrink-0" />
                            Active {sessionDateFormatter.format(new Date(session.lastActiveAt))}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <MapPin className="size-3.5 shrink-0" />
                            {session.ipAddress ?? 'IP address unavailable'}
                          </span>
                        </div>
                      </div>
                      {!session.isCurrent && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Sign out ${session.device}`}
                          onClick={() => setRevokeTarget(session)}
                        >
                          <Trash2 />
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      <AlertDialog
        open={revokeTarget !== null}
        onOpenChange={(open) => {
          if (!open && !isRevoking) setRevokeTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive">
              <ShieldCheck />
            </AlertDialogMedia>
            <AlertDialogTitle>
              {revokeTarget === 'others'
                ? 'Sign out all other sessions?'
                : `Sign out ${revokeTarget?.device ?? 'this session'}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {revokeTarget === 'others'
                ? 'Every other device will need to sign in again. Your current session will remain active.'
                : 'This device will lose account access and will need to sign in again.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRevoking}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isRevoking}
              onClick={() => void handleRevoke()}
            >
              {isRevoking && <LoaderCircle className="animate-spin" />}
              {isRevoking ? 'Signing out…' : 'Sign out'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
