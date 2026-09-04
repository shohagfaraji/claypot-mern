import { Eye, EyeOff, LoaderCircle, Trash2, TriangleAlert } from 'lucide-react';
import { useState, type SubmitEvent } from 'react';
import { useNavigate } from 'react-router-dom';

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
import { deleteAccount } from '@/features/auth/api/auth';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { useAuthenticatedRequest } from '@/features/auth/hooks/use-authenticated-request';

export function AccountDeletion() {
  const { user, clearSession } = useAuth();
  const request = useAuthenticatedRequest();
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user === null) return null;

  function resetDialog() {
    setPassword('');
    setConfirmation('');
    setShowPassword(false);
    setError(null);
  }

  function handleOpenChange(open: boolean) {
    if (isDeleting) return;
    setDialogOpen(open);
    if (!open) resetDialog();
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsDeleting(true);

    try {
      await deleteAccount(request, { password, confirmation });
      clearSession();
      navigate('/login', { replace: true, state: { accountDeleted: true } });
    } catch (deletionError) {
      setError(
        deletionError instanceof Error
          ? deletionError.message
          : 'Your account could not be deleted.',
      );
      setIsDeleting(false);
    }
  }

  const canDelete = password.length > 0 && confirmation === user.username;

  return (
    <>
      <section className="mx-auto w-full max-w-7xl px-5 pb-12 sm:px-8 lg:px-10">
        <Card className="border-destructive/35 bg-destructive/3 shadow-sm">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="max-w-2xl">
                <div className="grid size-11 place-items-center rounded-xl bg-destructive/10 text-destructive">
                  <TriangleAlert className="size-5" />
                </div>
                <h2 className="mt-5 font-serif text-3xl font-medium tracking-[-0.03em]">
                  Delete account
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Permanently remove your profile, recipes, reviews, saved recipes, collections,
                  uploaded images, and active sessions. This action cannot be undone.
                </p>
              </div>
              <Button
                className="shrink-0"
                variant="destructive"
                onClick={() => setDialogOpen(true)}
              >
                <Trash2 />
                Delete account
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <AlertDialog open={dialogOpen} onOpenChange={handleOpenChange}>
        <AlertDialogContent className="sm:max-w-lg">
          <form className="contents" onSubmit={handleSubmit}>
            <AlertDialogHeader>
              <AlertDialogMedia className="bg-destructive/10 text-destructive">
                <Trash2 />
              </AlertDialogMedia>
              <AlertDialogTitle>Delete your account permanently?</AlertDialogTitle>
              <AlertDialogDescription>
                Every session will end and your account data will be removed. There is no recovery
                after deletion.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="space-y-4 py-1">
              <div className="space-y-2">
                <Label htmlFor="delete-account-password">Current password</Label>
                <div className="relative">
                  <Input
                    id="delete-account-password"
                    className="h-11 pr-10"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    maxLength={72}
                    value={password}
                    required
                    disabled={isDeleting}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                  <Button
                    className="absolute top-1/2 right-1.5 -translate-y-1/2"
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    disabled={isDeleting}
                    onClick={() => setShowPassword((current) => !current)}
                  >
                    {showPassword ? <EyeOff /> : <Eye />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="delete-account-confirmation">
                  Type <span className="font-mono text-foreground">{user.username}</span> to confirm
                </Label>
                <Input
                  id="delete-account-confirmation"
                  className="h-11"
                  type="text"
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  maxLength={30}
                  value={confirmation}
                  required
                  disabled={isDeleting}
                  onChange={(event) => setConfirmation(event.target.value)}
                />
              </div>

              {error && (
                <div
                  className="rounded-xl border border-destructive/20 bg-destructive/8 px-4 py-3 text-sm text-destructive"
                  role="alert"
                >
                  {error}
                </div>
              )}
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel type="button" disabled={isDeleting}>
                Keep account
              </AlertDialogCancel>
              <AlertDialogAction
                type="submit"
                variant="destructive"
                disabled={!canDelete || isDeleting}
              >
                {isDeleting ? <LoaderCircle className="animate-spin" /> : <Trash2 />}
                {isDeleting ? 'Deleting account…' : 'Delete permanently'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
