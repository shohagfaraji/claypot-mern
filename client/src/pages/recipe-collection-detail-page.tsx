import {
  ArrowLeft,
  FolderHeart,
  LoaderCircle,
  Pencil,
  Search,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import { useState, type SubmitEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { AppShell } from '@/components/layout/app-shell';
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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuthenticatedRequest } from '@/features/auth/hooks/use-authenticated-request';
import {
  deleteRecipeCollection,
  removeRecipeFromCollection,
} from '@/features/collections/api/collections';
import { CollectionFormDialog } from '@/features/collections/components/collection-form-dialog';
import { useCollectionRecipes } from '@/features/collections/hooks/use-collection-recipes';
import { RecipeGrid } from '@/features/recipes/components/recipe-grid';
import { NotFoundPage } from '@/pages/not-found-page';

const difficulties = ['easy', 'medium', 'hard'] as const;
const sortOptions = ['saved', 'newest', 'quickest'] as const;

function getPage(value: string | null) {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export function RecipeCollectionDetailPage() {
  const { collectionId = '' } = useParams();
  const navigate = useNavigate();
  const request = useAuthenticatedRequest();
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('search')?.trim() ?? '';
  const difficultyParam = searchParams.get('difficulty');
  const sortParam = searchParams.get('sort');
  const difficulty = difficulties.find((option) => option === difficultyParam) ?? 'all';
  const sort = sortOptions.find((option) => option === sortParam) ?? 'saved';
  const page = getPage(searchParams.get('page'));
  const query = new URLSearchParams({ page: String(page), limit: '9', sort });
  if (search) query.set('search', search);
  if (difficulty !== 'all') query.set('difficulty', difficulty);

  const collectionRecipes = useCollectionRecipes(collectionId, query.toString());
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
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

  async function handleRemoveRecipe(recipeId: string) {
    setMutationError(null);
    setRemovingId(recipeId);
    try {
      await removeRecipeFromCollection(request, collectionId, recipeId);
      setRemovingId(null);
      if (collectionRecipes.recipes.length === 1 && page > 1) goToPage(page - 1);
      else collectionRecipes.retry();
    } catch (error) {
      setMutationError(error instanceof Error ? error.message : 'The recipe could not be removed.');
      setRemovingId(null);
    }
  }

  async function handleDeleteCollection() {
    setIsDeleting(true);
    setMutationError(null);
    try {
      await deleteRecipeCollection(request, collectionId);
      navigate('/collections', { replace: true });
    } catch (error) {
      setMutationError(
        error instanceof Error ? error.message : 'The collection could not be deleted.',
      );
      setIsDeleting(false);
      setDeleteOpen(false);
    }
  }

  if (collectionRecipes.isNotFound) return <NotFoundPage />;

  return (
    <AppShell>
      <section className="border-b bg-card/45">
        <div className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8 sm:py-14 lg:px-10">
          <Link
            className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
            to="/collections"
          >
            <ArrowLeft className="size-4" />
            Back to collections
          </Link>
          <div className="mt-7 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="flex items-center gap-2 text-xs font-bold tracking-[0.14em] text-primary uppercase">
                <FolderHeart className="size-4" />
                Private collection
              </p>
              <h1 className="mt-3 font-serif text-4xl font-medium tracking-[-0.04em] sm:text-5xl">
                {collectionRecipes.collection?.name ?? 'Recipe collection'}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                {collectionRecipes.collection?.description ??
                  'A private collection from your saved recipes.'}
              </p>
            </div>
            {collectionRecipes.collection && (
              <div className="flex shrink-0 gap-2">
                <Button type="button" variant="outline" onClick={() => setEditOpen(true)}>
                  <Pencil />
                  Edit
                </Button>
                <Button type="button" variant="outline" onClick={() => setDeleteOpen(true)}>
                  <Trash2 />
                  Delete
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8 lg:px-10">
        <div className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <SlidersHorizontal className="size-4 text-primary" />
            Search this collection
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
                placeholder="Search collection"
                aria-label="Search collection"
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
              <SelectTrigger className="h-10 w-full" aria-label="Sort collection recipes">
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

        {mutationError && (
          <p
            className="mt-6 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive"
            role="alert"
          >
            {mutationError}
          </p>
        )}

        <div className="mt-8 flex items-center justify-between gap-4">
          <p className="text-sm font-semibold">
            {collectionRecipes.isLoading
              ? 'Loading collection…'
              : `${collectionRecipes.pagination.total} ${
                  collectionRecipes.pagination.total === 1 ? 'recipe' : 'recipes'
                }`}
          </p>
          {collectionRecipes.pagination.totalPages > 0 && (
            <p className="text-sm text-muted-foreground">
              Page {collectionRecipes.pagination.page} of {collectionRecipes.pagination.totalPages}
            </p>
          )}
        </div>

        <div className="mt-5">
          <RecipeGrid
            recipes={collectionRecipes.recipes}
            isLoading={collectionRecipes.isLoading}
            error={collectionRecipes.error}
            onRetry={collectionRecipes.retry}
            onRemove={(recipe) => void handleRemoveRecipe(recipe.id)}
            removeLabel={(recipe) => `Remove ${recipe.title} from this collection`}
            removingId={removingId}
            emptyTitle={hasFilters ? 'No collection recipes match' : 'This collection is empty'}
            emptyDescription={
              hasFilters
                ? 'Try changing your search or filters.'
                : 'Organize a saved recipe and choose this collection to add it here.'
            }
            skeletonCount={9}
          />
        </div>

        {!collectionRecipes.isLoading &&
          !collectionRecipes.error &&
          collectionRecipes.pagination.totalPages > 1 && (
            <nav className="mt-10 flex justify-center gap-3" aria-label="Collection recipe pages">
              <Button
                type="button"
                variant="outline"
                disabled={page <= 1}
                onClick={() => goToPage(page - 1)}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={page >= collectionRecipes.pagination.totalPages}
                onClick={() => goToPage(page + 1)}
              >
                Next
              </Button>
            </nav>
          )}
      </section>

      {collectionRecipes.collection && editOpen && (
        <CollectionFormDialog
          open
          collection={collectionRecipes.collection}
          onOpenChange={setEditOpen}
          onSaved={() => collectionRecipes.retry()}
        />
      )}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive">
              <Trash2 />
            </AlertDialogMedia>
            <AlertDialogTitle>Delete this collection?</AlertDialogTitle>
            <AlertDialogDescription>
              The collection will be removed permanently. Its recipes will remain in All saved
              recipes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Keep collection</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isDeleting}
              onClick={() => void handleDeleteCollection()}
            >
              {isDeleting ? <LoaderCircle className="animate-spin" /> : <Trash2 />}
              {isDeleting ? 'Deleting…' : 'Delete collection'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
