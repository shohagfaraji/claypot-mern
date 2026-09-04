import { FolderPlus, LoaderCircle, Pencil } from 'lucide-react';
import { useId, useState, type SubmitEvent } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuthenticatedRequest } from '@/features/auth/hooks/use-authenticated-request';
import {
  createRecipeCollection,
  updateRecipeCollection,
} from '@/features/collections/api/collections';
import type { RecipeCollection } from '@/features/collections/types';

interface CollectionFormDialogProps {
  open: boolean;
  collection?: RecipeCollection | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (collection: RecipeCollection) => void;
}

export function CollectionFormDialog({
  open,
  collection = null,
  onOpenChange,
  onSaved,
}: CollectionFormDialogProps) {
  const request = useAuthenticatedRequest();
  const nameId = useId();
  const descriptionId = useId();
  const [name, setName] = useState(collection?.name ?? '');
  const [description, setDescription] = useState(collection?.description ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEditing = collection !== null;

  function handleOpenChange(nextOpen: boolean) {
    if (isSubmitting) return;
    onOpenChange(nextOpen);
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedName = name.trim().replace(/\s+/g, ' ');
    const normalizedDescription = description.trim().replace(/\s+/g, ' ');

    if (normalizedName.length < 2) {
      setError('Collection name must contain at least 2 characters.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const savedCollection = isEditing
        ? await updateRecipeCollection(request, collection.id, {
            name: normalizedName,
            description: normalizedDescription || null,
          })
        : await createRecipeCollection(request, {
            name: normalizedName,
            description: normalizedDescription || null,
          });
      setIsSubmitting(false);
      onSaved(savedCollection);
      onOpenChange(false);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : `The collection could not be ${isEditing ? 'updated' : 'created'}.`,
      );
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <form className="contents" onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit collection' : 'Create a collection'}</DialogTitle>
            <DialogDescription>
              {isEditing
                ? 'Update how this private recipe collection appears in your library.'
                : 'Group saved recipes into a private collection that only you can access.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={nameId}>Collection name</Label>
              <Input
                id={nameId}
                value={name}
                minLength={2}
                maxLength={60}
                required
                disabled={isSubmitting}
                autoFocus
                placeholder="Weeknight dinners"
                onChange={(event) => {
                  setName(event.currentTarget.value);
                  setError(null);
                }}
              />
              <p className="text-xs text-muted-foreground">2–60 characters.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor={descriptionId}>Description (optional)</Label>
              <Textarea
                id={descriptionId}
                className="min-h-24 resize-y"
                value={description}
                maxLength={240}
                disabled={isSubmitting}
                placeholder="Reliable meals for busy evenings."
                onChange={(event) => {
                  setDescription(event.currentTarget.value);
                  setError(null);
                }}
              />
              <p className="text-xs text-muted-foreground">Up to 240 characters.</p>
            </div>

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || name.trim().length < 2}>
              {isSubmitting ? (
                <LoaderCircle className="animate-spin" />
              ) : isEditing ? (
                <Pencil />
              ) : (
                <FolderPlus />
              )}
              {isSubmitting
                ? isEditing
                  ? 'Saving changes…'
                  : 'Creating collection…'
                : isEditing
                  ? 'Save changes'
                  : 'Create collection'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
