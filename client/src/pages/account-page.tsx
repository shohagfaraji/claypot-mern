import {
  CalendarDays,
  CheckCircle2,
  Image as ImageIcon,
  LoaderCircle,
  LogOut,
  Mail,
  MailCheck,
  RefreshCw,
  Save,
  ShieldCheck,
} from 'lucide-react';
import { useState, type SubmitEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { AppShell } from '@/components/layout/app-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { resendVerificationEmail, updateProfile } from '@/features/auth/api/auth';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { useAuthenticatedRequest } from '@/features/auth/hooks/use-authenticated-request';
import { ImageUploadField } from '@/features/media/components/image-upload-field';
import { useManagedImage } from '@/features/media/hooks/use-managed-image';
import { getInitials } from '@/lib/get-initials';

const dateFormatter = new Intl.DateTimeFormat('en', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

interface AccountLocationState {
  registrationCompleted?: boolean;
  verificationEmailSent?: boolean;
}

export function AccountPage() {
  const { user, signOut, updateSessionUser } = useAuth();
  const request = useAuthenticatedRequest();
  const navigate = useNavigate();
  const location = useLocation();
  const registrationState = location.state as AccountLocationState | null;
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);
  const avatar = useManagedImage(
    user?.avatarUrl ? { url: user.avatarUrl, publicId: user.avatarPublicId } : null,
    'avatar',
  );
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const [isSendingVerification, setIsSendingVerification] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [verificationNotice, setVerificationNotice] = useState<string | null>(() => {
    if (!registrationState?.registrationCompleted) return null;

    return registrationState.verificationEmailSent
      ? 'A verification link has been sent to your email address.'
      : 'Your account is ready, but the verification email could not be delivered.';
  });

  if (user === null) {
    return null;
  }

  async function handleSignOut() {
    setError(null);
    setIsSigningOut(true);

    try {
      await signOut();
      navigate('/', { replace: true });
    } catch (signOutError) {
      setError(
        signOutError instanceof Error ? signOutError.message : 'Sign out could not be completed.',
      );
      setIsSigningOut(false);
    }
  }

  async function handleProfileSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const bio = String(formData.get('bio') ?? '').trim();

    if (isAvatarUploading) {
      setProfileError('Wait for the avatar upload to finish before saving.');
      return;
    }

    setProfileError(null);
    setProfileSaved(false);
    setIsSavingProfile(true);

    try {
      const updatedUser = await updateProfile(request, {
        name: String(formData.get('name') ?? '').trim(),
        avatarUrl: avatar.image?.url ?? null,
        avatarPublicId: avatar.image?.publicId ?? null,
        bio: bio || null,
      });
      avatar.commit(
        updatedUser.avatarUrl
          ? { url: updatedUser.avatarUrl, publicId: updatedUser.avatarPublicId }
          : null,
      );
      updateSessionUser(updatedUser);
      setProfileSaved(true);
      setIsSavingProfile(false);
    } catch (updateProfileError) {
      setProfileError(
        updateProfileError instanceof Error
          ? updateProfileError.message
          : 'Your profile could not be updated.',
      );
      setIsSavingProfile(false);
    }
  }

  async function handleVerificationRequest() {
    if (user === null) return;

    setVerificationError(null);
    setVerificationNotice(null);
    setIsSendingVerification(true);

    try {
      const status = await resendVerificationEmail(request);

      if (status === 'already_verified') {
        updateSessionUser({ ...user, isEmailVerified: true });
        setVerificationNotice('Your email address is already verified.');
      } else {
        setVerificationNotice('A new verification link has been sent to your email address.');
      }
      setIsSendingVerification(false);
    } catch (sendVerificationError) {
      setVerificationError(
        sendVerificationError instanceof Error
          ? sendVerificationError.message
          : 'The verification email could not be sent.',
      );
      setIsSendingVerification(false);
    }
  }

  return (
    <AppShell>
      <section className="border-b bg-card/45">
        <div className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-8 sm:py-16 lg:px-10">
          <p className="text-xs font-bold tracking-[0.14em] text-primary uppercase">Your account</p>
          <h1 className="mt-3 font-serif text-5xl font-medium tracking-[-0.045em] sm:text-6xl">
            Welcome, {user.name.split(' ')[0]}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
            Review the profile connected to your Claypot session and manage your sign-in.
          </p>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-6 px-5 py-10 sm:px-8 lg:grid-cols-[1fr_0.72fr] lg:px-10">
        <Card className="border-border/70 shadow-sm">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-2xl bg-secondary text-xl font-bold text-primary">
                {user.avatarUrl ? (
                  <img className="size-full object-cover" src={user.avatarUrl} alt={user.name} />
                ) : (
                  getInitials(user.name)
                )}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-serif text-3xl font-medium tracking-[-0.03em]">
                    {user.name}
                  </h2>
                  <Badge variant="secondary" className="capitalize">
                    {user.role}
                  </Badge>
                </div>
                <p className="mt-1 text-muted-foreground">@{user.username}</p>
              </div>
            </div>

            <dl className="mt-8 grid gap-px overflow-hidden rounded-2xl border bg-border sm:grid-cols-2">
              <div className="bg-background p-5">
                <dt className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Mail className="size-4 text-primary" />
                  Email address
                </dt>
                <dd className="mt-2 break-all font-semibold">{user.email}</dd>
              </div>
              <div className="bg-background p-5">
                <dt className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <CalendarDays className="size-4 text-primary" />
                  Claypot member since
                </dt>
                <dd className="mt-2 font-semibold">
                  {dateFormatter.format(new Date(user.createdAt))}
                </dd>
              </div>
              <div className="bg-background p-5 sm:col-span-2">
                <dt className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <CheckCircle2 className="size-4 text-primary" />
                  Email status
                </dt>
                <dd className="mt-2 font-semibold">
                  {user.isEmailVerified ? 'Verified' : 'Verification pending'}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <div className="grid content-start gap-6">
          <Card className="border-border/70 shadow-sm">
            <CardContent className="p-6 sm:p-8">
              <div className="grid size-11 place-items-center rounded-xl bg-secondary text-primary">
                <MailCheck className="size-5" />
              </div>
              <h2 className="mt-5 font-serif text-2xl font-medium">Email verification</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {user.isEmailVerified
                  ? 'Your email address has been confirmed.'
                  : `We will send a private verification link to ${user.email}.`}
              </p>

              {verificationNotice && (
                <div
                  className="mt-5 flex gap-2 rounded-xl border border-primary/20 bg-secondary/55 px-4 py-3 text-sm"
                  role="status"
                >
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{verificationNotice}</span>
                </div>
              )}

              {verificationError && (
                <div
                  className="mt-5 rounded-xl border border-destructive/20 bg-destructive/8 px-4 py-3 text-sm text-destructive"
                  role="alert"
                >
                  {verificationError}
                </div>
              )}

              {!user.isEmailVerified && (
                <Button
                  className="mt-6 w-full"
                  variant="outline"
                  disabled={isSendingVerification}
                  onClick={() => void handleVerificationRequest()}
                >
                  {isSendingVerification ? (
                    <LoaderCircle className="animate-spin" />
                  ) : (
                    <RefreshCw />
                  )}
                  {isSendingVerification ? 'Sending link…' : 'Send verification email'}
                </Button>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/70 shadow-sm">
            <CardContent className="p-6 sm:p-8">
              <div className="grid size-11 place-items-center rounded-xl bg-secondary text-primary">
                <ShieldCheck className="size-5" />
              </div>
              <h2 className="mt-5 font-serif text-2xl font-medium">Session security</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Signing out revokes this session and removes its secure refresh cookie.
              </p>

              {error && (
                <div
                  className="mt-5 rounded-xl border border-destructive/20 bg-destructive/8 px-4 py-3 text-sm text-destructive"
                  role="alert"
                >
                  {error}
                </div>
              )}

              <Button
                className="mt-6 w-full"
                variant="outline"
                disabled={isSigningOut}
                onClick={handleSignOut}
              >
                {isSigningOut ? <LoaderCircle className="animate-spin" /> : <LogOut />}
                {isSigningOut ? 'Signing out…' : 'Sign out'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 pb-12 sm:px-8 lg:px-10">
        <Card className="border-border/70 shadow-sm">
          <CardContent className="p-6 sm:p-8">
            <div className="grid gap-8 lg:grid-cols-[0.55fr_1fr] lg:gap-12">
              <div>
                <div className="grid size-11 place-items-center rounded-xl bg-secondary text-primary">
                  <ImageIcon className="size-5" />
                </div>
                <h2 className="mt-5 font-serif text-3xl font-medium tracking-[-0.03em]">
                  Edit your profile
                </h2>
                <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
                  Keep your display name and introduction current. These details will represent you
                  wherever your recipes appear.
                </p>
              </div>

              <form className="space-y-5" onSubmit={handleProfileSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="profile-name">Display name</Label>
                  <Input
                    id="profile-name"
                    className="h-11"
                    name="name"
                    type="text"
                    autoComplete="name"
                    defaultValue={user.name}
                    minLength={2}
                    maxLength={80}
                    required
                    disabled={isSavingProfile}
                  />
                </div>

                <div className="max-w-72">
                  <ImageUploadField
                    label="Profile avatar"
                    description="Upload a square AVIF, JPEG, PNG, or WebP image up to 8 MB."
                    purpose="avatar"
                    value={avatar.image}
                    aspect="square"
                    disabled={isSavingProfile}
                    onChange={avatar.setImage}
                    onUploadingChange={setIsAvatarUploading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profile-bio">Bio</Label>
                  <Textarea
                    id="profile-bio"
                    className="min-h-28 resize-y"
                    name="bio"
                    defaultValue={user.bio ?? ''}
                    maxLength={300}
                    placeholder="Tell other cooks a little about yourself."
                    disabled={isSavingProfile}
                  />
                  <p className="text-xs text-muted-foreground">Up to 300 characters.</p>
                </div>

                {profileError && (
                  <div
                    className="rounded-xl border border-destructive/20 bg-destructive/8 px-4 py-3 text-sm text-destructive"
                    role="alert"
                  >
                    {profileError}
                  </div>
                )}

                {profileSaved && (
                  <div
                    className="flex items-center gap-2 rounded-xl border border-primary/20 bg-secondary/55 px-4 py-3 text-sm font-medium"
                    role="status"
                  >
                    <CheckCircle2 className="size-4 text-primary" />
                    Your profile has been updated.
                  </div>
                )}

                <Button type="submit" disabled={isSavingProfile || isAvatarUploading}>
                  {isSavingProfile ? <LoaderCircle className="animate-spin" /> : <Save />}
                  {isSavingProfile
                    ? 'Saving profile…'
                    : isAvatarUploading
                      ? 'Uploading avatar…'
                      : 'Save profile'}
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
      </section>
    </AppShell>
  );
}
