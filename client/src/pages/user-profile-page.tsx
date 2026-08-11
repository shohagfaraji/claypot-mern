import { BookOpen, CalendarDays, RefreshCw, Search, SlidersHorizontal } from 'lucide-react';
import type { SubmitEvent } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { RecipeGrid } from '@/features/recipes/components/recipe-grid';
import { useUserProfile } from '@/features/users/hooks/use-user-profile';
import { useUserRecipes } from '@/features/users/hooks/use-user-recipes';
import { getInitials } from '@/lib/get-initials';
import { NotFoundPage } from '@/pages/not-found-page';

const difficulties = ['easy', 'medium', 'hard'] as const;
const sortOptions = ['newest', 'oldest', 'quickest'] as const;
const dateFormatter = new Intl.DateTimeFormat('en', {
  month: 'long',
  year: 'numeric',
});

function getPage(value: string | null) {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function ProfileHeaderSkeleton() {
  return (
    <section className="border-b bg-card/45">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-6 px-5 py-12 sm:px-8 sm:py-16 lg:px-10">
        <Skeleton className="size-24 shrink-0 rounded-3xl" />
        <div className="w-full max-w-xl space-y-4">
          <Skeleton className="h-12 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-full" />
        </div>
      </div>
    </section>
  );
}

export function UserProfilePage() {
  const { username = '' } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('search')?.trim() ?? '';
  const difficultyParam = searchParams.get('difficulty');
  const sortParam = searchParams.get('sort');
  const difficulty = difficulties.find((option) => option === difficultyParam) ?? 'all';
  const sort = sortOptions.find((option) => option === sortParam) ?? 'newest';
  const page = getPage(searchParams.get('page'));

  const query = new URLSearchParams({ page: String(page), limit: '9', sort });
  if (search) query.set('search', search);
  if (difficulty !== 'all') query.set('difficulty', difficulty);

  const profile = useUserProfile(username);
  const recipeList = useUserRecipes(username, query.toString());
  const hasFilters = search.length > 0 || difficulty !== 'all' || sort !== 'newest';

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

  if (profile.isNotFound) return <NotFoundPage />;

  if (profile.error || (!profile.isLoading && profile.user === null)) {
    return (
      <AppShell>
        <section className="mx-auto grid min-h-[68vh] w-full max-w-7xl place-items-center px-5 py-20 text-center sm:px-8 lg:px-10">
          <div>
            <RefreshCw className="mx-auto size-7 text-destructive" />
            <h1 className="mt-5 font-serif text-4xl font-medium">This profile could not load</h1>
            <p className="mx-auto mt-3 max-w-md leading-7 text-muted-foreground">{profile.error}</p>
            <Button className="mt-6" variant="outline" onClick={profile.retry}>
              Try again
            </Button>
          </div>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell>
      {profile.isLoading || profile.user === null ? (
        <ProfileHeaderSkeleton />
      ) : (
        <section className="border-b bg-card/45">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 py-12 sm:flex-row sm:items-center sm:px-8 sm:py-16 lg:px-10">
            <div className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-3xl bg-secondary text-2xl font-bold text-primary shadow-sm">
              {profile.user.avatarUrl ? (
                <img
                  className="size-full object-cover"
                  src={profile.user.avatarUrl}
                  alt={profile.user.name}
                />
              ) : (
                getInitials(profile.user.name)
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold tracking-[0.14em] text-primary uppercase">
                Claypot cook
              </p>
              <h1 className="mt-2 font-serif text-5xl font-medium tracking-[-0.045em] sm:text-6xl">
                {profile.user.name}
              </h1>
              <p className="mt-2 font-medium text-muted-foreground">@{profile.user.username}</p>
              {profile.user.bio && (
                <p className="mt-4 max-w-2xl leading-7 text-muted-foreground">{profile.user.bio}</p>
              )}
              <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-2">
                  <BookOpen className="size-4 text-primary" />
                  {profile.user.publishedRecipeCount}{' '}
                  {profile.user.publishedRecipeCount === 1
                    ? 'published recipe'
                    : 'published recipes'}
                </span>
                <span className="inline-flex items-center gap-2">
                  <CalendarDays className="size-4 text-primary" />
                  Joined {dateFormatter.format(new Date(profile.user.createdAt))}
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8 lg:px-10">
        <div className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <SlidersHorizontal className="size-4 text-primary" />
            Browse this cook’s recipes
          </div>
          <div className="grid gap-3 lg:grid-cols-[1fr_12rem_12rem_auto]">
            <form key={search} className="relative flex gap-2" onSubmit={handleSearch}>
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-10 pl-9"
                type="search"
                name="search"
                defaultValue={search}
                maxLength={100}
                placeholder="Search this cook’s recipes"
                aria-label="Search this cook’s recipes"
              />
              <Button className="h-10 px-4" type="submit">
                Search
              </Button>
            </form>

            <Select
              value={difficulty}
              onValueChange={(value) => updateFilter('difficulty', value === 'all' ? null : value)}
            >
              <SelectTrigger className="h-10 w-full" aria-label="Filter by difficulty">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All difficulties</SelectItem>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sort} onValueChange={(value) => updateFilter('sort', value)}>
              <SelectTrigger className="h-10 w-full" aria-label="Sort recipes">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="oldest">Oldest first</SelectItem>
                <SelectItem value="quickest">Quickest first</SelectItem>
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
        </div>

        <div className="mt-8 flex items-center justify-between gap-4">
          <p className="text-sm font-semibold">
            {recipeList.isLoading
              ? 'Loading recipes…'
              : `${recipeList.pagination.total} ${recipeList.pagination.total === 1 ? 'recipe' : 'recipes'}`}
          </p>
          {recipeList.pagination.totalPages > 0 && (
            <p className="text-sm text-muted-foreground">
              Page {recipeList.pagination.page} of {recipeList.pagination.totalPages}
            </p>
          )}
        </div>

        <div className="mt-5">
          <RecipeGrid
            recipes={recipeList.recipes}
            isLoading={recipeList.isLoading}
            error={recipeList.error}
            onRetry={recipeList.retry}
            emptyTitle={hasFilters ? 'No recipes match these filters' : 'No published recipes yet'}
            emptyDescription={
              hasFilters
                ? 'Try changing your search or filters.'
                : 'Published recipes from this cook will appear here.'
            }
            skeletonCount={9}
          />
        </div>

        {!recipeList.isLoading && !recipeList.error && recipeList.pagination.totalPages > 1 && (
          <nav className="mt-10 flex justify-center gap-3" aria-label="Cook recipe pages">
            <Button
              type="button"
              variant="outline"
              disabled={recipeList.pagination.page <= 1}
              onClick={() => goToPage(recipeList.pagination.page - 1)}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={recipeList.pagination.page >= recipeList.pagination.totalPages}
              onClick={() => goToPage(recipeList.pagination.page + 1)}
            >
              Next
            </Button>
          </nav>
        )}
      </section>
    </AppShell>
  );
}
