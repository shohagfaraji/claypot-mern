import { BookOpen, CheckCircle2, Plus, RefreshCw, Search } from 'lucide-react';
import { useState, type SubmitEvent } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';

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
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthenticatedRequest } from '@/features/auth/hooks/use-authenticated-request';
import { publishRecipe } from '@/features/recipes/api/publish-recipe';
import { AuthorRecipeCard } from '@/features/recipes/components/author-recipe-card';
import { useAuthorRecipes } from '@/features/recipes/hooks/use-author-recipes';
import { cn } from '@/lib/utils';

const statuses = ['draft', 'published'] as const;
const sorts = ['updated', 'newest', 'oldest'] as const;

function getPage(value: string | null) {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function RecipeDashboardSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3" aria-label="Loading your recipes">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="overflow-hidden rounded-xl border bg-card">
          <Skeleton className="aspect-[16/9] w-full rounded-none" />
          <div className="space-y-4 p-6">
            <Skeleton className="h-3 w-2/5" />
            <Skeleton className="h-7 w-4/5" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function MyRecipesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const request = useAuthenticatedRequest();
  const search = searchParams.get('search')?.trim() ?? '';
  const statusParam = searchParams.get('status');
  const sortParam = searchParams.get('sort');
  const status = statuses.find((option) => option === statusParam) ?? 'all';
  const sort = sorts.find((option) => option === sortParam) ?? 'updated';
  const page = getPage(searchParams.get('page'));
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);

  const query = new URLSearchParams({ page: String(page), limit: '9', sort });
  if (search) query.set('search', search);
  if (status !== 'all') query.set('status', status);

  const { recipes, pagination, isLoading, error, retry } = useAuthorRecipes(query.toString());
  const hasFilters = search.length > 0 || status !== 'all' || sort !== 'updated';

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

  async function handlePublish(recipeId: string) {
    setPublishError(null);
    setPublishingId(recipeId);

    try {
      await publishRecipe(request, recipeId);
      setPublishingId(null);
      retry();
    } catch (publishRecipeError) {
      setPublishError(
        publishRecipeError instanceof Error
          ? publishRecipeError.message
          : 'The recipe could not be published.',
      );
      setPublishingId(null);
    }
  }

  return (
    <AppShell>
      <section className="border-b bg-card/45">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 py-12 sm:px-8 sm:py-16 md:flex-row md:items-end md:justify-between lg:px-10">
          <div>
            <p className="text-xs font-bold tracking-[0.14em] text-primary uppercase">
              Your kitchen
            </p>
            <h1 className="mt-3 font-serif text-5xl font-medium tracking-[-0.045em] sm:text-6xl">
              My recipes
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
              Keep track of your drafts and manage the recipes you have shared with the community.
            </p>
          </div>
          <Link
            className={cn(buttonVariants({ size: 'lg' }), 'h-11 shrink-0 px-5')}
            to="/recipes/new"
          >
            <Plus />
            New recipe
          </Link>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8 lg:px-10">
        {location.state?.recipeCreated === true && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-primary/20 bg-secondary/55 px-4 py-3 text-sm">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
            <div>
              <p className="font-semibold">Recipe saved as a draft</p>
              <p className="mt-0.5 text-muted-foreground">
                Review it below and publish when it is ready.
              </p>
            </div>
          </div>
        )}
        {location.state?.recipeUpdated === true && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-primary/20 bg-secondary/55 px-4 py-3 text-sm">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
            <div>
              <p className="font-semibold">Recipe changes saved</p>
              <p className="mt-0.5 text-muted-foreground">
                Your workspace now shows the latest version.
              </p>
            </div>
          </div>
        )}
        <div className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
          <div className="grid gap-3 lg:grid-cols-[1fr_11rem_11rem_auto]">
            <form key={search} className="relative flex gap-2" onSubmit={handleSearch}>
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-10 pl-9"
                type="search"
                name="search"
                defaultValue={search}
                maxLength={100}
                placeholder="Search your recipes"
                aria-label="Search your recipes"
              />
              <Button className="h-10 px-4" type="submit">
                Search
              </Button>
            </form>

            <Select
              value={status}
              onValueChange={(value) => updateFilter('status', value === 'all' ? null : value)}
            >
              <SelectTrigger className="h-10 w-full" aria-label="Filter by status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="draft">Drafts</SelectItem>
                <SelectItem value="published">Published</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sort} onValueChange={(value) => updateFilter('sort', value)}>
              <SelectTrigger className="h-10 w-full" aria-label="Sort your recipes">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="updated">Recently updated</SelectItem>
                <SelectItem value="newest">Newest created</SelectItem>
                <SelectItem value="oldest">Oldest created</SelectItem>
              </SelectContent>
            </Select>

            {hasFilters && (
              <Button className="h-10" variant="ghost" onClick={() => setSearchParams({})}>
                Clear filters
              </Button>
            )}
          </div>
        </div>

        {publishError && (
          <div
            className="mt-6 rounded-xl border border-destructive/20 bg-destructive/8 px-4 py-3 text-sm text-destructive"
            role="alert"
          >
            {publishError}
          </div>
        )}

        <div className="mt-8 flex items-center justify-between gap-4">
          <p className="text-sm font-semibold">
            {isLoading
              ? 'Loading your recipes…'
              : `${pagination.total} ${pagination.total === 1 ? 'recipe' : 'recipes'}`}
          </p>
          {pagination.totalPages > 0 && (
            <p className="text-sm text-muted-foreground">
              Page {pagination.page} of {pagination.totalPages}
            </p>
          )}
        </div>

        <div className="mt-5">
          {isLoading ? (
            <RecipeDashboardSkeleton />
          ) : error ? (
            <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed bg-card/45 px-6 text-center">
              <RefreshCw className="size-6 text-destructive" />
              <h2 className="mt-4 font-serif text-2xl font-medium">Your recipes could not load</h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{error}</p>
              <Button className="mt-5" variant="outline" onClick={retry}>
                Try again
              </Button>
            </div>
          ) : recipes.length === 0 ? (
            <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed bg-card/45 px-6 text-center">
              <div className="grid size-12 place-items-center rounded-full bg-secondary text-primary">
                <BookOpen className="size-5" />
              </div>
              <h2 className="mt-4 font-serif text-2xl font-medium">
                {hasFilters ? 'No recipes match these filters' : 'Your recipe book is empty'}
              </h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                {hasFilters
                  ? 'Try changing your search or filters.'
                  : 'Recipes you create will be saved here as drafts until you publish them.'}
              </p>
              {!hasFilters && (
                <Link className={cn(buttonVariants(), 'mt-5')} to="/recipes/new">
                  <Plus />
                  Create your first recipe
                </Link>
              )}
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {recipes.map((recipe) => (
                <AuthorRecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  isPublishing={publishingId === recipe.id}
                  onPublish={handlePublish}
                />
              ))}
            </div>
          )}
        </div>

        {!isLoading && !error && pagination.totalPages > 1 && (
          <nav className="mt-10 flex justify-center gap-3" aria-label="Your recipe pages">
            <Button
              variant="outline"
              disabled={pagination.page <= 1}
              onClick={() => goToPage(pagination.page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => goToPage(pagination.page + 1)}
            >
              Next
            </Button>
          </nav>
        )}
      </section>
    </AppShell>
  );
}
