import {
  CheckCircle2,
  Image as ImageIcon,
  LoaderCircle,
  LogOut,
  KeyRound,
  Monitor,
  UserRound,
  Trash2,
  MailCheck,
  RefreshCw,
  Save,
} from 'lucide-react';
import { useState, type SubmitEvent } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import { AppShell } from '@/components/layout/app-shell';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { resendVerificationEmail, updateProfile } from '@/features/auth/api/auth';
import { AccountDeletion } from '@/features/auth/components/account-deletion';
import { AccountEmailChange } from '@/features/auth/components/account-email-change';
import { AccountSecurity } from '@/features/auth/components/account-security';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { useAuthenticatedRequest } from '@/features/auth/hooks/use-authenticated-request';
import { ImageUploadField } from '@/features/media/components/image-upload-field';
import { useManagedImage } from '@/features/media/hooks/use-managed-image';
import { getInitials } from '@/lib/get-initials';
import { cn } from '@/lib/utils';

const settingsSections = [
  { id: 'profile', label: 'Profile', icon: UserRound },
  { id: 'email', label: 'Email', icon: MailCheck },
  { id: 'password', label: 'Password', icon: KeyRound },
  { id: 'sessions', label: 'Sessions', icon: Monitor },
  { id: 'delete', label: 'Delete account', icon: Trash2 },
] as const;

interface AccountLocationState {
  registrationCompleted?: boolean;
  verificationEmailSent?: boolean;
}

export function AccountPage() {
  const { user, signOut, updateSessionUser } = useAuth();
  const request = useAuthenticatedRequest();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const section =
    settingsSections.find((item) => item.id === searchParams.get('section'))?.id ?? 'profile';
  const registrationState = location.state as AccountLocationState | null;
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileName, setProfileName] = useState(user?.name ?? '');
  const [profileBio, setProfileBio] = useState(user?.bio ?? '');
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
      setProfileName(updatedUser.name);
      setProfileBio(updatedUser.bio ?? '');
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
      <header className="border-b bg-card/45">
        <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 lg:px-10">
          <h1 className="font-serif text-4xl font-medium tracking-tight sm:text-5xl">
            Account settings
          </h1>
          <p className="mt-3 text-muted-foreground">
            Manage your public profile, sign-in details, and devices.
          </p>
        </div>
      </header>
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[14rem_minmax(0,1fr)] lg:px-10">
        <aside className="min-w-0">
          <div className="lg:sticky lg:top-24">
            <div className="mb-5 flex items-center gap-3">
              <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-full bg-secondary font-semibold text-primary">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="size-full object-cover" />
                ) : (
                  getInitials(user.name)
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold">{user.name}</p>
                <p className="truncate text-xs text-muted-foreground">@{user.username}</p>
                <Link
                  to={`/cooks/${user.username}`}
                  className="text-sm text-primary underline-offset-4 hover:underline"
                >
                  View public profile
                </Link>
              </div>
            </div>
            <nav
              aria-label="Account settings"
              className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-1"
            >
              {settingsSections.map(({ id, label, icon: Icon }) => (
                <Link
                  key={id}
                  to={id === 'profile' ? '/account' : `/account?section=${id}`}
                  state={location.state}
                  aria-current={section === id ? 'page' : undefined}
                  className={cn(
                    buttonVariants({ variant: section === id ? 'secondary' : 'ghost' }),
                    'h-11 justify-start whitespace-normal',
                    id === 'delete' && 'text-destructive',
                  )}
                >
                  <Icon aria-hidden="true" />
                  {label}
                </Link>
              ))}
            </nav>
            <div className="mt-5 border-t pt-4">
              <Button variant="ghost" disabled={isSigningOut} onClick={handleSignOut}>
                {isSigningOut ? <LoaderCircle className="animate-spin" /> : <LogOut />}
                {isSigningOut ? 'Signing out…' : 'Sign out'}
              </Button>
              {error && (
                <p role="alert" className="mt-2 text-sm text-destructive">
                  {error}
                </p>
              )}
            </div>
          </div>
        </aside>
        <div className="min-w-0">
          <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border bg-card px-4 py-3 text-sm">
            <span className="min-w-0 break-all">{user.email}</span>
            <Badge variant="secondary">
              {user.isEmailVerified ? 'Verified' : 'Verification pending'}
            </Badge>
            {!user.isEmailVerified && section !== 'email' && (
              <Link
                to="/account?section=email"
                className="font-medium text-primary underline underline-offset-4"
              >
                Verify email
              </Link>
            )}
          </div>
          <div hidden={section !== 'profile'}>
            <section aria-label="Profile settings">
              <Card className="border-border/70 shadow-sm">
                <CardContent className="p-6 sm:p-8">
                  <div className="space-y-6">
                    <div>
                      <div className="grid size-11 place-items-center rounded-xl bg-secondary text-primary">
                        <ImageIcon className="size-5" />
                      </div>
                      <h2 className="mt-5 font-serif text-3xl font-medium tracking-[-0.03em]">
                        Edit your profile
                      </h2>
                      <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
                        Keep your display name and introduction current. These details will
                        represent you wherever your recipes appear.
                      </p>
                    </div>

                    <form
                      className="space-y-5"
                      onSubmit={handleProfileSubmit}
                      onChange={() => setProfileSaved(false)}
                    >
                      <div className="space-y-2">
                        <Label htmlFor="profile-name">Display name</Label>
                        <Input
                          id="profile-name"
                          className="h-11"
                          name="name"
                          type="text"
                          autoComplete="name"
                          value={profileName}
                          onChange={(event) => setProfileName(event.target.value)}
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
                          onChange={(image) => {
                            avatar.setImage(image);
                            setProfileSaved(false);
                          }}
                          onUploadingChange={setIsAvatarUploading}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="profile-bio">Bio</Label>
                        <Textarea
                          id="profile-bio"
                          className="min-h-28 resize-y"
                          name="bio"
                          value={profileBio}
                          onChange={(event) => setProfileBio(event.target.value)}
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
          </div>
          <div
            hidden={section !== 'email'}
            className={section === 'email' ? 'space-y-6' : undefined}
          >
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
            <AccountEmailChange />
          </div>
          <div hidden={section !== 'password' && section !== 'sessions'}>
            <AccountSecurity section={section === 'sessions' ? 'sessions' : 'password'} />
          </div>
          <div hidden={section !== 'delete'}>
            <AccountDeletion />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
