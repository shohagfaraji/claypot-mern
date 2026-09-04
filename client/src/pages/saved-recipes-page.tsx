import { Bookmark, FolderHeart, Search, SlidersHorizontal } from 'lucide-react';
import { useState, type SubmitEvent } from 'react';
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
import { useAuthenticatedRequest } from '@/features/auth/hooks/use-authenticated-request';
import { RecipeCollectionPicker } from '@/features/collections/components/recipe-collection-picker';
import { unsaveRecipe } from '@/features/recipes/api/unsave-recipe';
import { RecipeGrid } from '@/features/recipes/components/recipe-grid';
import { useSavedRecipes } from '@/features/recipes/hooks/use-saved-recipes';
import { cn } from '@/lib/utils';

const difficulties = ['easy', 'medium', 'hard'] as const;
const sortOptions = ['saved', 'newest', 'quickest'] as const;

function getPage(value: string | null) {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export function SavedRecipesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const request = useAuthenticatedRequest();
  const search = searchParams.get('search')?.trim() ?? '';
  const difficultyParam = searchParams.get('difficulty');
  const sortParam = searchParams.get('sort');
  const difficulty = difficulties.find((option) => option === difficultyParam) ?? 'all';
  const sort = sortOptions.find((option) => option === sortParam) ?? 'saved';
  const page = getPage(searchParams.get('page'));
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [organizingRecipe, setOrganizingRecipe] = useState<{
    id: string;
    title: string;
  } | null>(null);

  const query = new URLSearchParams({ page: String(page), limit: '9', sort });
  if (search) query.set('search', search);
  if (difficulty !== 'all') query.set('difficulty', difficulty);

  const { recipes, pagination, isLoading, error, retry } = useSavedRecipes(query.toString());
  const hasFilters = search.length > 0 || difficulty !== 'all' || sort !== 'saved';

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

  async function handleRemove(recipeId: string) {
    setRemoveError(null);
    setRemovingId(recipeId);

    try {
      await unsaveRecipe(request, recipeId);
      setRemovingId(null);

      if (recipes.length === 1 && pagination.page > 1) {
        goToPage(pagination.page - 1);
      } else {
        retry();
      }
    } catch (removeRecipeError) {
      setRemoveError(
        removeRecipeError instanceof Error
          ? removeRecipeError.message
          : 'The recipe could not be removed from your saved collection.',
      );
      setRemovingId(null);
    }
  }

  return (
    <AppShell>
      <section className="border-b bg-card/45">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-7 px-5 py-12 sm:px-8 sm:py-16 lg:flex-row lg:items-end lg:justify-between lg:px-10">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold tracking-[0.14em] text-primary uppercase">
              <Bookmark className="size-4" />
              Your recipe library
            </p>
            <h1 className="mt-3 font-serif text-5xl font-medium tracking-[-0.045em] sm:text-6xl">
              All saved recipes
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
              Keep inspiration close, then organize recipes into collections that fit the way you
              cook.
            </p>
          </div>
          <Link
            className={cn(buttonVariants({ variant: 'outline' }), 'shrink-0')}
            to="/collections"
          >
            <FolderHeart />
            View collections
          </Link>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8 lg:px-10">
        <div className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <SlidersHorizontal className="size-4 text-primary" />
            Search your collection
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
                placeholder="Search saved recipes"
                aria-label="Search saved recipes"
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
              <SelectTrigger className="h-10 w-full" aria-label="Sort saved recipes">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="saved">Recently saved</SelectItem>
                <SelectItem value="newest">Newest recipes</SelectItem>
                <SelectItem value="quickest">Quickest recipes</SelectItem>
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

        {removeError && (
          <div
            className="mt-6 rounded-xl border border-destructive/20 bg-destructive/8 px-4 py-3 text-sm text-destructive"
            role="alert"
          >
            {removeError}
          </div>
        )}

        <div className="mt-8 flex items-center justify-between gap-4">
          <p className="text-sm font-semibold">
            {isLoading
              ? 'Loading your collection…'
              : `${pagination.total} saved ${pagination.total === 1 ? 'recipe' : 'recipes'}`}
          </p>
          {pagination.totalPages > 0 && (
            <p className="text-sm text-muted-foreground">
              Page {pagination.page} of {pagination.totalPages}
            </p>
          )}
        </div>

        <div className="mt-5">
          <RecipeGrid
            recipes={recipes}
            isLoading={isLoading}
            error={error}
            onRetry={retry}
            onRemove={(recipe) => void handleRemove(recipe.id)}
            onOrganize={(recipe) => setOrganizingRecipe({ id: recipe.id, title: recipe.title })}
            removingId={removingId}
            emptyTitle={hasFilters ? 'No saved recipes match' : 'Your saved collection is empty'}
            emptyDescription={
              hasFilters
                ? 'Try changing your search or filters.'
                : 'Save recipes while browsing and they will appear here.'
            }
            skeletonCount={9}
          />
        </div>

        {!isLoading && !error && pagination.totalPages > 1 && (
          <nav className="mt-10 flex justify-center gap-3" aria-label="Saved recipe pages">
            <Button
              type="button"
              variant="outline"
              disabled={pagination.page <= 1}
              onClick={() => goToPage(pagination.page - 1)}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => goToPage(pagination.page + 1)}
            >
              Next
            </Button>
          </nav>
        )}
      </section>

      {organizingRecipe && (
        <RecipeCollectionPicker
          recipeId={organizingRecipe.id}
          recipeTitle={organizingRecipe.title}
          open
          showTrigger={false}
          onOpenChange={(open) => {
            if (!open) setOrganizingRecipe(null);
          }}
        />
      )}
    </AppShell>
  );
}
