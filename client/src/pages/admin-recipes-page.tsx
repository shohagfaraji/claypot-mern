import {
  BookOpen,
  ExternalLink,
  MessageSquare,
  RefreshCw,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { type SubmitEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
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
import { useAdminRecipes } from '@/features/admin/hooks/use-admin-recipes';
import type { AdminRecipeListItem } from '@/features/admin/types';
import { cn } from '@/lib/utils';

const statuses = ['draft', 'published'] as const;
const sorts = ['newest', 'oldest', 'updated'] as const;
const dateFormatter = new Intl.DateTimeFormat('en', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

function getPage(value: string | null) {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function RecipeThumbnail({ recipe }: { recipe: AdminRecipeListItem }) {
  return recipe.imageUrl ? (
    <img className="size-12 rounded-lg object-cover" src={recipe.imageUrl} alt="" />
  ) : (
    <div className="grid size-12 place-items-center rounded-lg bg-muted text-muted-foreground">
      <BookOpen className="size-5" />
    </div>
  );
}

function ModerationListSkeleton() {
  return (
    <Card className="gap-0 py-0" aria-label="Loading recipes">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="flex items-center gap-4 border-b p-5 last:border-0">
          <Skeleton className="size-12 shrink-0 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="hidden h-6 w-20 sm:block" />
          <Skeleton className="hidden h-4 w-24 md:block" />
        </div>
      ))}
    </Card>
  );
}

export function AdminRecipesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('search')?.trim() ?? '';
  const statusParam = searchParams.get('status');
  const sortParam = searchParams.get('sort');
  const status = statuses.find((option) => option === statusParam) ?? 'all';
  const sort = sorts.find((option) => option === sortParam) ?? 'newest';
  const page = getPage(searchParams.get('page'));
  const query = new URLSearchParams({ page: String(page), limit: '10', sort });
  if (search) query.set('search', search);
  if (status !== 'all') query.set('status', status);

  const { recipes, pagination, isLoading, error, retry } = useAdminRecipes(query.toString());
  const hasFilters = search.length > 0 || status !== 'all' || sort !== 'newest';

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

  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
      <div>
        <p className="text-xs font-bold tracking-[0.14em] text-primary uppercase">
          Content management
        </p>
        <h1 className="mt-3 font-serif text-4xl font-medium tracking-[-0.04em] sm:text-5xl">
          Recipe moderation
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
          Review every recipe submitted to Claypot and keep track of its publication status.
        </p>
      </div>

      <Card className="mt-8">
        <CardContent>
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
            <SlidersHorizontal className="size-4 text-primary" />
            Find recipes
          </div>
          <div className="grid gap-3 xl:grid-cols-[minmax(18rem,1fr)_11rem_12rem_auto]">
            <form key={search} className="relative flex gap-2" onSubmit={handleSearch}>
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-10 pl-9"
                type="search"
                name="search"
                defaultValue={search}
                maxLength={100}
                placeholder="Search title, summary, or tags"
                aria-label="Search all recipes"
              />
              <Button className="h-10 px-4" type="submit">
                Search
              </Button>
            </form>

            <Select
              value={status}
              onValueChange={(value) => updateFilter('status', value === 'all' ? null : value)}
            >
              <SelectTrigger className="h-10 w-full" aria-label="Filter recipes by status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="draft">Drafts</SelectItem>
                <SelectItem value="published">Published</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sort} onValueChange={(value) => updateFilter('sort', value)}>
              <SelectTrigger className="h-10 w-full" aria-label="Sort recipes">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest created</SelectItem>
                <SelectItem value="updated">Recently updated</SelectItem>
                <SelectItem value="oldest">Oldest created</SelectItem>
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
            ? 'Loading recipes…'
            : `${pagination.total} ${pagination.total === 1 ? 'recipe' : 'recipes'}`}
        </p>
        {pagination.totalPages > 0 && (
          <p className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages}
          </p>
        )}
      </div>

      <div className="mt-4">
        {isLoading ? (
          <ModerationListSkeleton />
        ) : error ? (
          <Card className="border-destructive/25 bg-destructive/5">
            <CardContent className="flex min-h-64 flex-col items-center justify-center text-center">
              <RefreshCw className="size-6 text-destructive" />
              <h2 className="mt-4 font-serif text-2xl font-medium">Recipes could not load</h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{error}</p>
              <Button className="mt-5" variant="outline" onClick={retry}>
                <RefreshCw />
                Try again
              </Button>
            </CardContent>
          </Card>
        ) : recipes.length === 0 ? (
          <Card>
            <CardContent className="flex min-h-64 flex-col items-center justify-center text-center">
              <BookOpen className="size-7 text-muted-foreground" />
              <h2 className="mt-4 font-serif text-2xl font-medium">
                {hasFilters ? 'No recipes match these filters' : 'No recipes submitted yet'}
              </h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                {hasFilters
                  ? 'Clear or adjust the filters to widen the moderation results.'
                  : 'Recipes will appear here as members begin creating them.'}
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
              <table className="w-full min-w-4xl text-left text-sm">
                <thead className="bg-muted/45 text-xs text-muted-foreground">
                  <tr className="border-b">
                    <th className="px-5 py-3 font-medium">Recipe</th>
                    <th className="px-4 py-3 font-medium">Author</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Reviews</th>
                    <th className="px-4 py-3 font-medium">Updated</th>
                    <th className="px-5 py-3 text-right font-medium">View</th>
                  </tr>
                </thead>
                <tbody>
                  {recipes.map((recipe) => (
                    <tr key={recipe.id} className="border-b last:border-0">
                      <td className="px-5 py-4">
                        <div className="flex min-w-64 items-center gap-3">
                          <RecipeThumbnail recipe={recipe} />
                          <div className="min-w-0">
                            <p className="truncate font-semibold">{recipe.title}</p>
                            <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                              {recipe.summary}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <Link
                          className="font-medium hover:text-primary"
                          to={`/cooks/${recipe.author.username}`}
                        >
                          {recipe.author.name}
                        </Link>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          @{recipe.author.username}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <Badge variant={recipe.status === 'published' ? 'secondary' : 'outline'}>
                          {recipe.status === 'published' ? 'Published' : 'Draft'}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <MessageSquare className="size-3.5" />
                          {recipe.reviewCount}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-muted-foreground">
                        {dateFormatter.format(new Date(recipe.updatedAt))}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {recipe.status === 'published' ? (
                          <Link
                            className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
                            to={`/recipes/${recipe.slug}`}
                            aria-label={`View ${recipe.title}`}
                          >
                            <ExternalLink />
                            View
                          </Link>
                        ) : (
                          <span className="text-xs text-muted-foreground">Not public</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            <div className="grid gap-3 md:hidden">
              {recipes.map((recipe) => (
                <Card key={recipe.id}>
                  <CardContent>
                    <div className="flex gap-3">
                      <RecipeThumbnail recipe={recipe} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold leading-5">{recipe.title}</p>
                          <Badge variant={recipe.status === 'published' ? 'secondary' : 'outline'}>
                            {recipe.status === 'published' ? 'Published' : 'Draft'}
                          </Badge>
                        </div>
                        <Link
                          className="mt-1 block text-xs text-muted-foreground hover:text-foreground"
                          to={`/cooks/${recipe.author.username}`}
                        >
                          by {recipe.author.name}
                        </Link>
                      </div>
                    </div>
                    <p className="mt-4 line-clamp-2 text-sm leading-6 text-muted-foreground">
                      {recipe.summary}
                    </p>
                    <div className="mt-4 flex items-center justify-between border-t pt-4 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <MessageSquare className="size-3.5" />
                        {recipe.reviewCount} {recipe.reviewCount === 1 ? 'review' : 'reviews'}
                      </span>
                      <span>Updated {dateFormatter.format(new Date(recipe.updatedAt))}</span>
                    </div>
                    {recipe.status === 'published' && (
                      <Link
                        className={cn(
                          buttonVariants({ variant: 'outline', size: 'sm' }),
                          'mt-4 w-full',
                        )}
                        to={`/recipes/${recipe.slug}`}
                      >
                        <ExternalLink />
                        View live recipe
                      </Link>
                    )}
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
    </div>
  );
}
