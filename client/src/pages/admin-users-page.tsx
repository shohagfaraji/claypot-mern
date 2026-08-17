import {
  BadgeCheck,
  BookOpen,
  Clock3,
  LoaderCircle,
  Mail,
  MessageSquare,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  UserRoundCog,
  Users,
} from 'lucide-react';
import { useState, type SubmitEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { updateAdminUserRole } from '@/features/admin/api/update-admin-user-role';
import { useAdminUsers } from '@/features/admin/hooks/use-admin-users';
import type { AdminUserListItem } from '@/features/admin/types';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { useAuthenticatedRequest } from '@/features/auth/hooks/use-authenticated-request';
import { getInitials } from '@/lib/get-initials';

const roles = ['user', 'admin'] as const;
const verificationStates = ['verified', 'unverified'] as const;
const sorts = ['newest', 'oldest', 'name', 'recent-login'] as const;
const dateFormatter = new Intl.DateTimeFormat('en', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

function getPage(value: string | null) {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function MemberAvatar({ member }: { member: AdminUserListItem }) {
  return member.avatarUrl ? (
    <img className="size-11 rounded-full object-cover" src={member.avatarUrl} alt="" />
  ) : (
    <div className="grid size-11 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
      {getInitials(member.name)}
    </div>
  );
}

function UserDirectorySkeleton() {
  return (
    <Card className="gap-0 py-0" aria-label="Loading members">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="flex items-center gap-4 border-b p-5 last:border-0">
          <Skeleton className="size-11 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="hidden h-6 w-16 sm:block" />
          <Skeleton className="hidden h-4 w-24 md:block" />
        </div>
      ))}
    </Card>
  );
}

export function AdminUsersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const request = useAuthenticatedRequest();
  const { user: currentUser } = useAuth();
  const search = searchParams.get('search')?.trim() ?? '';
  const roleParam = searchParams.get('role');
  const verificationParam = searchParams.get('verification');
  const sortParam = searchParams.get('sort');
  const role = roles.find((option) => option === roleParam) ?? 'all';
  const verification = verificationStates.find((option) => option === verificationParam) ?? 'all';
  const sort = sorts.find((option) => option === sortParam) ?? 'newest';
  const page = getPage(searchParams.get('page'));
  const query = new URLSearchParams({ page: String(page), limit: '10', sort });
  if (search) query.set('search', search);
  if (role !== 'all') query.set('role', role);
  if (verification !== 'all') query.set('verification', verification);

  const { users, pagination, isLoading, error, retry } = useAdminUsers(query.toString());
  const hasFilters =
    search.length > 0 || role !== 'all' || verification !== 'all' || sort !== 'newest';
  const [memberToChange, setMemberToChange] = useState<AdminUserListItem | null>(null);
  const [isChangingRole, setIsChangingRole] = useState(false);
  const [roleError, setRoleError] = useState<string | null>(null);

  function updateFilter(name: string, value: string | null) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (value) next.set(name, value);
      else next.delete(name);
      next.delete('page');
      return next;
    });
  }

  function handleSearch(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const value = String(formData.get('search') ?? '').trim();
    updateFilter('search', value || null);
  }

  function goToPage(nextPage: number) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set('page', String(nextPage));
      return next;
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openRoleDialog(member: AdminUserListItem) {
    setRoleError(null);
    setMemberToChange(member);
  }

  async function handleRoleChange() {
    if (memberToChange === null) return;

    const nextRole = memberToChange.role === 'admin' ? 'user' : 'admin';
    setRoleError(null);
    setIsChangingRole(true);

    try {
      await updateAdminUserRole(request, memberToChange.id, nextRole);
      setMemberToChange(null);
      setIsChangingRole(false);

      const leavesCurrentFilter = role !== 'all' && role !== nextRole;
      if (leavesCurrentFilter && users.length === 1 && pagination.page > 1) {
        goToPage(pagination.page - 1);
      } else {
        retry();
      }
    } catch (updateRoleError) {
      setRoleError(
        updateRoleError instanceof Error
          ? updateRoleError.message
          : 'The member role could not be updated.',
      );
      setIsChangingRole(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
      <div>
        <p className="text-xs font-bold tracking-[0.14em] text-primary uppercase">
          Community management
        </p>
        <h1 className="mt-3 font-serif text-4xl font-medium tracking-[-0.04em] sm:text-5xl">
          User management
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
          Review member accounts, account access, and contribution activity across Claypot.
        </p>
      </div>

      <Card className="mt-8">
        <CardContent>
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
            <SlidersHorizontal className="size-4 text-primary" />
            Find members
          </div>
          <div className="grid gap-3 xl:grid-cols-[minmax(16rem,1fr)_10rem_11rem_12rem_auto]">
            <form key={search} className="relative flex gap-2" onSubmit={handleSearch}>
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-10 pl-9"
                type="search"
                name="search"
                defaultValue={search}
                maxLength={100}
                placeholder="Search name, username, or email"
                aria-label="Search members"
              />
              <Button className="h-10 px-4" type="submit">
                Search
              </Button>
            </form>

            <Select
              value={role}
              onValueChange={(value) => updateFilter('role', value === 'all' ? null : value)}
            >
              <SelectTrigger className="h-10 w-full" aria-label="Filter members by role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                <SelectItem value="user">Users</SelectItem>
                <SelectItem value="admin">Admins</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={verification}
              onValueChange={(value) =>
                updateFilter('verification', value === 'all' ? null : value)
              }
            >
              <SelectTrigger className="h-10 w-full" aria-label="Filter by email verification">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any verification</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="unverified">Unverified</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sort} onValueChange={(value) => updateFilter('sort', value)}>
              <SelectTrigger className="h-10 w-full" aria-label="Sort members">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest joined</SelectItem>
                <SelectItem value="recent-login">Recent login</SelectItem>
                <SelectItem value="name">Name A–Z</SelectItem>
                <SelectItem value="oldest">Oldest joined</SelectItem>
              </SelectContent>
            </Select>

            {hasFilters && (
              <Button
                className="h-10"
                type="button"
                variant="ghost"
                onClick={() => setSearchParams({})}
              >
                Clear filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="mt-8 flex items-center justify-between gap-4">
        <p className="text-sm font-semibold">
          {isLoading
            ? 'Loading members…'
            : `${pagination.total} ${pagination.total === 1 ? 'member' : 'members'}`}
        </p>
        {pagination.totalPages > 0 && (
          <p className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages}
          </p>
        )}
      </div>

      <div className="mt-4">
        {isLoading ? (
          <UserDirectorySkeleton />
        ) : error ? (
          <Card className="border-destructive/25 bg-destructive/5">
            <CardContent className="flex min-h-64 flex-col items-center justify-center text-center">
              <RefreshCw className="size-6 text-destructive" />
              <h2 className="mt-4 font-serif text-2xl font-medium">Members could not load</h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{error}</p>
              <Button className="mt-5" variant="outline" onClick={retry}>
                <RefreshCw />
                Try again
              </Button>
            </CardContent>
          </Card>
        ) : users.length === 0 ? (
          <Card>
            <CardContent className="flex min-h-64 flex-col items-center justify-center text-center">
              <Users className="size-7 text-muted-foreground" />
              <h2 className="mt-4 font-serif text-2xl font-medium">
                {hasFilters ? 'No members match these filters' : 'No member accounts yet'}
              </h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                {hasFilters
                  ? 'Clear or adjust the filters to widen the directory results.'
                  : 'Newly registered Claypot members will appear here.'}
              </p>
              {hasFilters && (
                <Button className="mt-5" variant="outline" onClick={() => setSearchParams({})}>
                  Clear filters
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="hidden gap-0 overflow-x-auto py-0 md:block">
              <table className="w-full min-w-7xl text-left text-sm">
                <thead className="bg-muted/45 text-xs text-muted-foreground">
                  <tr className="border-b">
                    <th className="px-5 py-3 font-medium">Member</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium">Verification</th>
                    <th className="px-4 py-3 font-medium">Activity</th>
                    <th className="px-4 py-3 font-medium">Last login</th>
                    <th className="px-4 py-3 font-medium">Joined</th>
                    <th className="px-5 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((member) => (
                    <tr key={member.id} className="border-b last:border-0">
                      <td className="px-5 py-4">
                        <div className="flex min-w-52 items-center gap-3">
                          <MemberAvatar member={member} />
                          <div className="min-w-0">
                            <Link
                              className="block truncate font-semibold hover:text-primary"
                              to={`/cooks/${member.username}`}
                            >
                              {member.name}
                            </Link>
                            <p className="mt-0.5 truncate text-xs text-muted-foreground">
                              @{member.username}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <a
                          className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
                          href={`mailto:${member.email}`}
                        >
                          <Mail className="size-3.5" />
                          {member.email}
                        </a>
                      </td>
                      <td className="px-4 py-4">
                        <Badge variant={member.role === 'admin' ? 'default' : 'outline'}>
                          {member.role === 'admin' && <ShieldCheck data-icon="inline-start" />}
                          {member.role === 'admin' ? 'Admin' : 'User'}
                        </Badge>
                      </td>
                      <td className="px-4 py-4">
                        <Badge variant={member.isEmailVerified ? 'secondary' : 'outline'}>
                          {member.isEmailVerified && <BadgeCheck data-icon="inline-start" />}
                          {member.isEmailVerified ? 'Verified' : 'Unverified'}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <BookOpen className="size-3.5" />
                          {member.recipeCount} recipes
                        </span>
                        <span className="mt-1 flex items-center gap-1.5">
                          <MessageSquare className="size-3.5" />
                          {member.reviewCount} reviews
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-muted-foreground">
                        {member.lastLoginAt
                          ? dateFormatter.format(new Date(member.lastLoginAt))
                          : 'Never'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-muted-foreground">
                        {dateFormatter.format(new Date(member.createdAt))}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {member.id === currentUser?.id ? (
                          <span className="text-xs font-medium text-muted-foreground">
                            Current account
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            variant={member.role === 'admin' ? 'outline' : 'default'}
                            disabled={isChangingRole}
                            onClick={() => openRoleDialog(member)}
                          >
                            <UserRoundCog />
                            {member.role === 'admin' ? 'Demote' : 'Make admin'}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            <div className="grid gap-3 md:hidden">
              {users.map((member) => (
                <Card key={member.id}>
                  <CardContent>
                    <div className="flex gap-3">
                      <MemberAvatar member={member} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <Link
                              className="block truncate font-semibold hover:text-primary"
                              to={`/cooks/${member.username}`}
                            >
                              {member.name}
                            </Link>
                            <p className="mt-0.5 truncate text-xs text-muted-foreground">
                              @{member.username}
                            </p>
                          </div>
                          <Badge variant={member.role === 'admin' ? 'default' : 'outline'}>
                            {member.role === 'admin' ? 'Admin' : 'User'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <a
                      className="mt-4 flex items-center gap-2 truncate text-sm text-muted-foreground"
                      href={`mailto:${member.email}`}
                    >
                      <Mail className="size-4 shrink-0" />
                      {member.email}
                    </a>
                    <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-muted/45 p-3 text-xs">
                      <div>
                        <p className="font-semibold">{member.recipeCount}</p>
                        <p className="mt-0.5 text-muted-foreground">Recipes</p>
                      </div>
                      <div>
                        <p className="font-semibold">{member.reviewCount}</p>
                        <p className="mt-0.5 text-muted-foreground">Reviews</p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-3 border-t pt-4 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock3 className="size-3.5" />
                        {member.lastLoginAt
                          ? `Last login ${dateFormatter.format(new Date(member.lastLoginAt))}`
                          : 'Never signed in'}
                      </span>
                      <Badge variant={member.isEmailVerified ? 'secondary' : 'outline'}>
                        {member.isEmailVerified ? 'Verified' : 'Unverified'}
                      </Badge>
                    </div>
                    <div className="mt-4 border-t pt-4">
                      {member.id === currentUser?.id ? (
                        <p className="text-center text-xs font-medium text-muted-foreground">
                          This is your current account
                        </p>
                      ) : (
                        <Button
                          className="w-full"
                          size="sm"
                          variant={member.role === 'admin' ? 'outline' : 'default'}
                          disabled={isChangingRole}
                          onClick={() => openRoleDialog(member)}
                        >
                          <UserRoundCog />
                          {member.role === 'admin' ? 'Demote to user' : 'Promote to admin'}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>

      {!isLoading && !error && pagination.totalPages > 1 && (
        <nav
          className="mt-8 flex items-center justify-between border-t pt-6"
          aria-label="Pagination"
        >
          <Button
            variant="outline"
            disabled={pagination.page <= 1}
            onClick={() => goToPage(pagination.page - 1)}
          >
            Previous
          </Button>
          <p className="text-sm text-muted-foreground">
            {pagination.page} / {pagination.totalPages}
          </p>
          <Button
            variant="outline"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => goToPage(pagination.page + 1)}
          >
            Next
          </Button>
        </nav>
      )}

      <AlertDialog
        open={memberToChange !== null}
        onOpenChange={(open) => {
          if (!open && !isChangingRole) {
            setMemberToChange(null);
            setRoleError(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia
              className={
                memberToChange?.role === 'admin'
                  ? 'bg-destructive/10 text-destructive'
                  : 'bg-primary/10 text-primary'
              }
            >
              <UserRoundCog />
            </AlertDialogMedia>
            <AlertDialogTitle>
              {memberToChange?.role === 'admin'
                ? `Demote ${memberToChange.name}?`
                : `Promote ${memberToChange?.name ?? 'this member'}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {memberToChange?.role === 'admin'
                ? 'This removes access to administration and moderation features.'
                : 'This grants access to user management, recipe moderation, and other administration features.'}{' '}
              Existing refresh sessions will be revoked, so the member may need to sign in again.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {roleError && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {roleError}
            </p>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isChangingRole}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant={memberToChange?.role === 'admin' ? 'destructive' : 'default'}
              disabled={isChangingRole}
              onClick={() => void handleRoleChange()}
            >
              {isChangingRole && <LoaderCircle className="animate-spin" />}
              {isChangingRole
                ? 'Updating…'
                : memberToChange?.role === 'admin'
                  ? 'Demote to user'
                  : 'Promote to admin'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
