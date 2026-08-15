import {
  BookOpen,
  CircleCheck,
  ExternalLink,
  EyeOff,
  LoaderCircle,
  MessageSquare,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import { useState, type SubmitEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
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
import { useAuthenticatedRequest } from '@/features/auth/hooks/use-authenticated-request';
import { deleteRecipe } from '@/features/recipes/api/delete-recipe';
import { publishRecipe } from '@/features/recipes/api/publish-recipe';
import { unpublishRecipe } from '@/features/recipes/api/unpublish-recipe';
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
  const request = useAuthenticatedRequest();
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
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [recipeToUnpublish, setRecipeToUnpublish] = useState<AdminRecipeListItem | null>(null);
  const [isUnpublishing, setIsUnpublishing] = useState(false);
  const [unpublishError, setUnpublishError] = useState<string | null>(null);
  const [recipeToDelete, setRecipeToDelete] = useState<AdminRecipeListItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  function refreshAfterChange(leavesCurrentFilter: boolean) {
    if (leavesCurrentFilter && recipes.length === 1 && pagination.page > 1) {
      goToPage(pagination.page - 1);
      return;
    }

    retry();
  }

  async function handlePublish(recipeId: string) {
    setPublishError(null);
    setPublishingId(recipeId);

    try {
      await publishRecipe(request, recipeId);
      setPublishingId(null);
      refreshAfterChange(status === 'draft');
    } catch (publishRecipeError) {
      setPublishError(
        publishRecipeError instanceof Error
          ? publishRecipeError.message
          : 'The recipe could not be published.',
      );
      setPublishingId(null);
    }
  }

  async function handleUnpublish() {
    if (recipeToUnpublish === null) return;

    setUnpublishError(null);
    setIsUnpublishing(true);

    try {
      await unpublishRecipe(request, recipeToUnpublish.id);
      setRecipeToUnpublish(null);
      setIsUnpublishing(false);
      refreshAfterChange(status === 'published');
    } catch (unpublishRecipeError) {
      setUnpublishError(
        unpublishRecipeError instanceof Error
          ? unpublishRecipeError.message
          : 'The recipe could not be returned to drafts.',
      );
      setIsUnpublishing(false);
    }
  }

  async function handleDelete() {
    if (recipeToDelete === null) return;

    setDeleteError(null);
    setIsDeleting(true);

    try {
      await deleteRecipe(request, recipeToDelete.id);
      setRecipeToDelete(null);
      setIsDeleting(false);
      refreshAfterChange(true);
    } catch (deleteRecipeError) {
      setDeleteError(
        deleteRecipeError instanceof Error
          ? deleteRecipeError.message
          : 'The recipe could not be deleted.',
      );
      setIsDeleting(false);
    }
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
              <table className="w-full min-w-6xl text-left text-sm">
                <thead className="bg-muted/45 text-xs text-muted-foreground">
                  <tr className="border-b">
                    <th className="px-5 py-3 font-medium">Recipe</th>
                    <th className="px-4 py-3 font-medium">Author</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Reviews</th>
                    <th className="px-4 py-3 font-medium">Updated</th>
                    <th className="px-5 py-3 text-right font-medium">Actions</th>
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
                        <div className="flex justify-end gap-1">
                          {recipe.status === 'published' && (
                            <Link
                              className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }))}
                              to={`/recipes/${recipe.slug}`}
                              aria-label={`View ${recipe.title}`}
                              title="View live recipe"
                            >
                              <ExternalLink />
                            </Link>
                          )}
                          {recipe.status === 'draft' ? (
                            <Button
                              size="sm"
                              disabled={publishingId !== null || isUnpublishing || isDeleting}
                              onClick={() => void handlePublish(recipe.id)}
                            >
                              {publishingId === recipe.id ? (
                                <LoaderCircle className="animate-spin" />
                              ) : (
                                <CircleCheck />
                              )}
                              {publishingId === recipe.id ? 'Publishing…' : 'Publish'}
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={publishingId !== null || isUnpublishing || isDeleting}
                              onClick={() => {
                                setUnpublishError(null);
                                setRecipeToUnpublish(recipe);
                              }}
                            >
                              <EyeOff />
                              Unpublish
                            </Button>
                          )}
                          <Button
                            size="icon-sm"
                            variant="destructive"
                            disabled={publishingId !== null || isUnpublishing || isDeleting}
                            onClick={() => {
                              setDeleteError(null);
                              setRecipeToDelete(recipe);
                            }}
                            aria-label={`Delete ${recipe.title}`}
                            title="Delete recipe"
                          >
                            <Trash2 />
                          </Button>
                        </div>
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
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      {recipe.status === 'draft' ? (
                        <Button
                          className="col-span-2"
                          size="sm"
                          disabled={publishingId !== null || isUnpublishing || isDeleting}
                          onClick={() => void handlePublish(recipe.id)}
                        >
                          {publishingId === recipe.id ? (
                            <LoaderCircle className="animate-spin" />
                          ) : (
                            <CircleCheck />
                          )}
                          {publishingId === recipe.id ? 'Publishing…' : 'Publish recipe'}
                        </Button>
                      ) : (
                        <>
                          <Link
                            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
                            to={`/recipes/${recipe.slug}`}
                          >
                            <ExternalLink />
                            View
                          </Link>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={publishingId !== null || isUnpublishing || isDeleting}
                            onClick={() => {
                              setUnpublishError(null);
                              setRecipeToUnpublish(recipe);
                            }}
                          >
                            <EyeOff />
                            Unpublish
                          </Button>
                        </>
                      )}
                      <Button
                        className="col-span-2"
                        size="sm"
                        variant="destructive"
                        disabled={publishingId !== null || isUnpublishing || isDeleting}
                        onClick={() => {
                          setDeleteError(null);
                          setRecipeToDelete(recipe);
                        }}
                      >
                        <Trash2 />
                        Delete recipe
                      </Button>
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
        open={recipeToUnpublish !== null}
        onOpenChange={(open) => {
          if (!open && !isUnpublishing) {
            setRecipeToUnpublish(null);
            setUnpublishError(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-secondary text-primary">
              <EyeOff />
            </AlertDialogMedia>
            <AlertDialogTitle>Return this recipe to drafts?</AlertDialogTitle>
            <AlertDialogDescription>
              “{recipeToUnpublish?.title}” will be removed from the public recipe library. Its
              author can continue editing it, and it may be published again later.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {unpublishError && (
            <div
              className="rounded-lg border border-destructive/20 bg-destructive/8 px-3 py-2 text-sm text-destructive"
              role="alert"
            >
              {unpublishError}
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUnpublishing}>Keep published</AlertDialogCancel>
            <AlertDialogAction disabled={isUnpublishing} onClick={handleUnpublish}>
              {isUnpublishing ? <LoaderCircle className="animate-spin" /> : <EyeOff />}
              {isUnpublishing ? 'Moving to drafts…' : 'Move to drafts'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={recipeToDelete !== null}
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            setRecipeToDelete(null);
            setDeleteError(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive">
              <Trash2 />
            </AlertDialogMedia>
            <AlertDialogTitle>Permanently delete this recipe?</AlertDialogTitle>
            <AlertDialogDescription>
              “{recipeToDelete?.title}” and its associated recipe data will be removed. This
              moderation action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {deleteError && (
            <div
              className="rounded-lg border border-destructive/20 bg-destructive/8 px-3 py-2 text-sm text-destructive"
              role="alert"
            >
              {deleteError}
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Keep recipe</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={isDeleting} onClick={handleDelete}>
              {isDeleting ? <LoaderCircle className="animate-spin" /> : <Trash2 />}
              {isDeleting ? 'Deleting…' : 'Delete permanently'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
