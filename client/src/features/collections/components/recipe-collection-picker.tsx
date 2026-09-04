import { FolderHeart, FolderPlus, LoaderCircle, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { Button, buttonVariants } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuthenticatedRequest } from '@/features/auth/hooks/use-authenticated-request';
import {
  addRecipeToCollection,
  getRecipeCollectionMemberships,
  removeRecipeFromCollection,
} from '@/features/collections/api/collections';
import type { RecipeCollectionMembership } from '@/features/collections/types';

interface RecipeCollectionPickerProps {
  recipeId: string;
  recipeTitle: string;
  open?: boolean;
  showTrigger?: boolean;
  onOpenChange?: (open: boolean) => void;
  onRecipeSaved?: () => void;
}

interface MembershipState {
  requestKey: string | null;
  memberships: RecipeCollectionMembership[];
  error: string | null;
}

export function RecipeCollectionPicker({
  recipeId,
  recipeTitle,
  open: controlledOpen,
  showTrigger = true,
  onOpenChange,
  onRecipeSaved,
}: RecipeCollectionPickerProps) {
  const request = useAuthenticatedRequest();
  const [internalOpen, setInternalOpen] = useState(false);
  const [membershipState, setMembershipState] = useState<MembershipState>({
    requestKey: null,
    memberships: [],
    error: null,
  });
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [requestVersion, setRequestVersion] = useState(0);
  const open = controlledOpen ?? internalOpen;
  const requestKey = `${recipeId}:${requestVersion}`;
  const isCurrentRequest = membershipState.requestKey === requestKey;
  const memberships = isCurrentRequest ? membershipState.memberships : [];
  const error = isCurrentRequest ? membershipState.error : null;
  const isLoading = open && !isCurrentRequest;

  function setOpen(nextOpen: boolean) {
    if (updatingId !== null) return;
    if (controlledOpen === undefined) setInternalOpen(nextOpen);
    onOpenChange?.(nextOpen);
  }

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();

    void getRecipeCollectionMemberships(request, recipeId, controller.signal)
      .then((collections) => {
        setMembershipState({ requestKey, memberships: collections, error: null });
      })
      .catch((loadError: unknown) => {
        if (controller.signal.aborted) return;
        setMembershipState({
          requestKey,
          memberships: [],
          error:
            loadError instanceof Error ? loadError.message : 'Recipe collections could not load.',
        });
      });

    return () => controller.abort();
  }, [open, recipeId, request, requestKey]);

  async function handleMembershipChange(collection: RecipeCollectionMembership) {
    if (updatingId !== null) return;
    setUpdatingId(collection.id);
    setMembershipState((current) => ({ ...current, error: null }));

    try {
      if (collection.containsRecipe) {
        await removeRecipeFromCollection(request, collection.id, recipeId);
      } else {
        await addRecipeToCollection(request, collection.id, recipeId);
        onRecipeSaved?.();
      }
      setMembershipState((current) => ({
        ...current,
        memberships: current.memberships.map((item) =>
          item.id === collection.id
            ? {
                ...item,
                containsRecipe: !item.containsRecipe,
                recipeCount: Math.max(0, item.recipeCount + (item.containsRecipe ? -1 : 1)),
              }
            : item,
        ),
      }));
      setUpdatingId(null);
    } catch (updateError) {
      setMembershipState((current) => ({
        ...current,
        error:
          updateError instanceof Error
            ? updateError.message
            : 'The recipe collection could not be updated.',
      }));
      setUpdatingId(null);
    }
  }

  return (
    <>
      {showTrigger && (
        <Button type="button" variant="outline" onClick={() => setOpen(true)}>
          <FolderPlus />
          Organize recipe
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Organize recipe</DialogTitle>
            <DialogDescription>
              Choose where to keep “{recipeTitle}”. Adding it to a collection also saves the recipe.
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="flex min-h-40 items-center justify-center text-muted-foreground">
              <LoaderCircle className="mr-2 size-5 animate-spin" />
              Loading collections…
            </div>
          ) : error && memberships.length === 0 ? (
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-5 text-center">
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
              <Button
                className="mt-4"
                type="button"
                variant="outline"
                onClick={() => setRequestVersion((version) => version + 1)}
              >
                <RefreshCw />
                Try again
              </Button>
            </div>
          ) : memberships.length === 0 ? (
            <div className="rounded-xl border border-dashed p-6 text-center">
              <FolderHeart className="mx-auto size-7 text-primary" />
              <p className="mt-3 font-semibold">Create your first collection</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Collections help organize saved recipes around occasions, cuisines, or plans.
              </p>
              <Link className={buttonVariants({ className: 'mt-4' })} to="/collections">
                <FolderPlus />
                Manage collections
              </Link>
            </div>
          ) : (
            <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
              {memberships.map((collection) => {
                const checkboxId = `collection-${recipeId}-${collection.id}`;
                const isUpdating = updatingId === collection.id;
                return (
                  <label
                    key={collection.id}
                    className="flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors hover:bg-muted/50 has-data-checked:border-primary/35 has-data-checked:bg-primary/5"
                    htmlFor={checkboxId}
                  >
                    <Checkbox
                      id={checkboxId}
                      checked={collection.containsRecipe}
                      disabled={updatingId !== null}
                      onCheckedChange={() => void handleMembershipChange(collection)}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">
                        {collection.name}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {collection.recipeCount}{' '}
                        {collection.recipeCount === 1 ? 'recipe' : 'recipes'}
                      </span>
                    </span>
                    {isUpdating && <LoaderCircle className="size-4 animate-spin text-primary" />}
                  </label>
                );
              })}
            </div>
          )}

          {error && memberships.length > 0 && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <DialogFooter className="items-center sm:justify-between">
            <Link
              className={buttonVariants({ variant: 'ghost' })}
              to="/collections"
              onClick={() => setOpen(false)}
            >
              Manage collections
            </Link>
            <Button type="button" disabled={updatingId !== null} onClick={() => setOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
