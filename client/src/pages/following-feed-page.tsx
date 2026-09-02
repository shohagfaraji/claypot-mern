import { Search, SlidersHorizontal, UsersRound } from 'lucide-react';
import type { SubmitEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { AppShell } from '@/components/layout/app-shell';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useFollowingFeed } from '@/features/follows/hooks/use-following-feed';
import { RecipeGrid } from '@/features/recipes/components/recipe-grid';

const difficulties = ['easy', 'medium', 'hard'] as const;
const sortOptions = ['newest', 'oldest', 'quickest'] as const;

function getPage(value: string | null) {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export function FollowingFeedPage() {
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

  const feed = useFollowingFeed(query.toString());
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
    const value = String(new FormData(event.currentTarget).get('search') ?? '').trim();
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

  const emptyTitle = hasFilters
    ? 'No followed recipes match'
    : feed.followingCount === 0
      ? 'Your following feed is ready to grow'
      : 'No new recipes from followed cooks';
  const emptyDescription = hasFilters
    ? 'Try changing your search or filters.'
    : feed.followingCount === 0
      ? 'Discover cooks you enjoy and follow their profiles to build a personalized feed.'
      : 'Published recipes from the cooks you follow will appear here.';

  return (
    <AppShell>
      <section className="border-b bg-card/45">
        <div className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-8 sm:py-16 lg:px-10">
          <p className="flex items-center gap-2 text-xs font-bold tracking-[0.14em] text-primary uppercase">
            <UsersRound className="size-4" />
            Your cook network
          </p>
          <h1 className="mt-3 font-serif text-5xl font-medium tracking-[-0.045em] sm:text-6xl">
            Following feed
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
            A focused collection of the latest recipes published by cooks you follow.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8 lg:px-10">
        <div className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <SlidersHorizontal className="size-4 text-primary" />
            Refine your feed
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
                placeholder="Search followed recipes"
                aria-label="Search followed recipes"
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
              <SelectTrigger className="h-10 w-full" aria-label="Sort followed recipes">
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
            {feed.isLoading
              ? 'Loading your feed…'
              : `${feed.pagination.total} ${feed.pagination.total === 1 ? 'recipe' : 'recipes'} from ${
                  feed.followingCount
                } followed ${feed.followingCount === 1 ? 'cook' : 'cooks'}`}
          </p>
          {feed.pagination.totalPages > 0 && (
            <p className="text-sm text-muted-foreground">
              Page {feed.pagination.page} of {feed.pagination.totalPages}
            </p>
          )}
        </div>

        <div className="mt-5">
          <RecipeGrid
            recipes={feed.recipes}
            isLoading={feed.isLoading}
            error={feed.error}
            onRetry={feed.retry}
            emptyTitle={emptyTitle}
            emptyDescription={emptyDescription}
            skeletonCount={9}
          />
          {!feed.isLoading && !feed.error && feed.recipes.length === 0 && !hasFilters && (
            <div className="mt-5 text-center">
              <Link className={buttonVariants({ variant: 'outline' })} to="/recipes">
                <Search />
                Discover cooks
              </Link>
            </div>
          )}
        </div>

        {!feed.isLoading && !feed.error && feed.pagination.totalPages > 1 && (
          <nav className="mt-10 flex justify-center gap-3" aria-label="Following feed pages">
            <Button variant="outline" disabled={page <= 1} onClick={() => goToPage(page - 1)}>
              Previous
            </Button>
            <Button
              variant="outline"
              disabled={page >= feed.pagination.totalPages}
              onClick={() => goToPage(page + 1)}
            >
              Next
            </Button>
          </nav>
        )}
      </section>
    </AppShell>
  );
}
