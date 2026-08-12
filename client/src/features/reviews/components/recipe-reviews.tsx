import { LoaderCircle, MessageSquareText, Pencil, RefreshCw, Star, Trash2 } from 'lucide-react';
import { useState, type SubmitEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';

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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { useAuthenticatedRequest } from '@/features/auth/hooks/use-authenticated-request';
import { createReview, deleteReview, updateReview } from '@/features/reviews/api/reviews';
import { useCurrentUserReview } from '@/features/reviews/hooks/use-current-user-review';
import { useReviews } from '@/features/reviews/hooks/use-reviews';
import type { RecipeReview, ReviewInput, ReviewSort } from '@/features/reviews/types';
import { getInitials } from '@/lib/get-initials';
import { cn } from '@/lib/utils';

interface RecipeReviewsProps {
  recipeId: string;
  authorId: string;
}

interface ReviewFormProps {
  existingReview: RecipeReview | null;
  isSubmitting: boolean;
  onCancel?: () => void;
  onSubmit: (input: ReviewInput) => Promise<void>;
}

const dateFormatter = new Intl.DateTimeFormat('en', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

function StarRating({ rating, label }: { rating: number; label: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={label}>
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          key={index}
          className={cn('size-4', index < rating ? 'fill-primary text-primary' : 'text-border')}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

function ReviewForm({ existingReview, isSubmitting, onCancel, onSubmit }: ReviewFormProps) {
  const [rating, setRating] = useState(existingReview?.rating ?? 5);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    await onSubmit({
      rating,
      comment: String(formData.get('comment') ?? '').trim(),
    });
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <fieldset disabled={isSubmitting}>
        <legend className="text-sm font-medium">Your rating</legend>
        <div className="mt-2 flex gap-1">
          {Array.from({ length: 5 }, (_, index) => {
            const value = index + 1;
            return (
              <button
                key={value}
                className="rounded-md p-1 text-border transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none"
                type="button"
                aria-label={`${value} ${value === 1 ? 'star' : 'stars'}`}
                aria-pressed={rating === value}
                onClick={() => setRating(value)}
              >
                <Star
                  className={cn(
                    'size-7',
                    value <= rating ? 'fill-primary text-primary' : 'text-border',
                  )}
                />
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor="review-comment">Your review</Label>
        <Textarea
          id="review-comment"
          className="min-h-32 resize-y bg-background"
          name="comment"
          defaultValue={existingReview?.comment ?? ''}
          minLength={10}
          maxLength={1000}
          placeholder="What worked well, and what should another cook know?"
          required
          disabled={isSubmitting}
        />
        <p className="text-xs text-muted-foreground">Between 10 and 1000 characters.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <LoaderCircle className="animate-spin" />}
          {isSubmitting
            ? existingReview
              ? 'Saving changes…'
              : 'Publishing review…'
            : existingReview
              ? 'Save review'
              : 'Publish review'}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" disabled={isSubmitting} onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

function ReviewSkeleton() {
  return (
    <div className="rounded-2xl border bg-card p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <Skeleton className="mt-5 h-4 w-full" />
      <Skeleton className="mt-2 h-4 w-4/5" />
    </div>
  );
}

export function RecipeReviews({ recipeId, authorId }: RecipeReviewsProps) {
  const location = useLocation();
  const request = useAuthenticatedRequest();
  const { status, user } = useAuth();
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<ReviewSort>('newest');
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [reviewToDelete, setReviewToDelete] = useState<RecipeReview | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const query = new URLSearchParams({ page: String(page), limit: '5', sort });
  const reviewList = useReviews(recipeId, query.toString());
  const canReview = status === 'authenticated' && user !== null && user.id !== authorId;
  const currentUserReview = useCurrentUserReview(recipeId, canReview);

  function refreshReviews() {
    reviewList.retry();
    currentUserReview.retry();
  }

  function requestDelete(review: RecipeReview) {
    setMutationError(null);
    setReviewToDelete(review);
  }

  async function handleSubmit(input: ReviewInput) {
    setMutationError(null);
    setIsSubmitting(true);

    try {
      if (currentUserReview.review) {
        await updateReview(request, currentUserReview.review.id, input);
      } else {
        await createReview(request, recipeId, input);
      }

      setIsSubmitting(false);
      setIsEditing(false);
      setPage(1);
      refreshReviews();
    } catch (error) {
      setMutationError(error instanceof Error ? error.message : 'Your review could not be saved.');
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (reviewToDelete === null) return;

    setMutationError(null);
    setIsDeleting(true);

    try {
      await deleteReview(request, reviewToDelete.id);
      const isOnCurrentPage = reviewList.reviews.some((review) => review.id === reviewToDelete.id);
      const removedLastItem = isOnCurrentPage && reviewList.reviews.length === 1 && page > 1;
      setReviewToDelete(null);
      setIsDeleting(false);
      setIsEditing(false);
      currentUserReview.retry();

      if (removedLastItem) setPage((current) => current - 1);
      else reviewList.retry();
    } catch (error) {
      setMutationError(error instanceof Error ? error.message : 'The review could not be deleted.');
      setIsDeleting(false);
    }
  }

  return (
    <section className="border-t bg-card/35">
      <div className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-8 sm:py-16 lg:px-10">
        <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
          <aside className="space-y-6 lg:sticky lg:top-24">
            <div>
              <p className="text-xs font-bold tracking-[0.14em] text-primary uppercase">
                Community notes
              </p>
              <h2 className="mt-3 font-serif text-4xl font-medium tracking-[-0.035em]">
                Reviews and ratings
              </h2>
            </div>

            <Card className="border-border/70 shadow-sm">
              <CardContent className="p-6">
                {reviewList.isLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-12 w-24" />
                    <Skeleton className="h-4 w-44" />
                  </div>
                ) : (
                  <div>
                    <div className="flex items-end gap-3">
                      <span className="font-serif text-5xl font-medium">
                        {reviewList.summary.averageRating?.toFixed(1) ?? '—'}
                      </span>
                      <span className="pb-1 text-sm text-muted-foreground">out of 5</span>
                    </div>
                    {reviewList.summary.averageRating !== null && (
                      <div className="mt-2">
                        <StarRating
                          rating={Math.round(reviewList.summary.averageRating)}
                          label={`${reviewList.summary.averageRating} out of 5 stars`}
                        />
                      </div>
                    )}
                    <p className="mt-3 text-sm text-muted-foreground">
                      Based on {reviewList.summary.reviewCount}{' '}
                      {reviewList.summary.reviewCount === 1 ? 'review' : 'reviews'}.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/70 shadow-sm">
              <CardContent className="p-6">
                {status === 'loading' || (canReview && currentUserReview.isLoading) ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <LoaderCircle className="size-4 animate-spin" />
                    Checking your review…
                  </div>
                ) : status === 'unauthenticated' ? (
                  <div>
                    <h3 className="font-serif text-2xl font-medium">Cooked this recipe?</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Sign in to share your rating and help other home cooks.
                    </p>
                    <Link
                      className={cn(buttonVariants({ variant: 'outline' }), 'mt-5')}
                      to="/login"
                      state={{ from: `${location.pathname}${location.search}${location.hash}` }}
                    >
                      Sign in to review
                    </Link>
                  </div>
                ) : user?.id === authorId ? (
                  <div>
                    <h3 className="font-serif text-2xl font-medium">Your published recipe</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Authors cannot rate their own recipes, but you can read feedback from other
                      cooks here.
                    </p>
                  </div>
                ) : currentUserReview.error ? (
                  <div>
                    <p className="text-sm text-destructive" role="alert">
                      {currentUserReview.error}
                    </p>
                    <Button className="mt-4" variant="outline" onClick={currentUserReview.retry}>
                      Try again
                    </Button>
                  </div>
                ) : currentUserReview.review !== null && !isEditing ? (
                  <div>
                    <p className="text-sm font-semibold">Your rating</p>
                    <div className="mt-2">
                      <StarRating
                        rating={currentUserReview.review.rating}
                        label={`${currentUserReview.review.rating} out of 5 stars`}
                      />
                    </div>
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">
                      {currentUserReview.review.comment}
                    </p>
                    <div className="mt-5 flex gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsEditing(true)}>
                        <Pencil />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => requestDelete(currentUserReview.review as RecipeReview)}
                      >
                        <Trash2 />
                        Delete
                      </Button>
                    </div>
                  </div>
                ) : (
                  <ReviewForm
                    key={currentUserReview.review?.id ?? 'new-review'}
                    existingReview={currentUserReview.review}
                    isSubmitting={isSubmitting}
                    onCancel={currentUserReview.review ? () => setIsEditing(false) : undefined}
                    onSubmit={handleSubmit}
                  />
                )}

                {mutationError && (
                  <p className="mt-4 text-sm text-destructive" role="alert">
                    {mutationError}
                  </p>
                )}
              </CardContent>
            </Card>
          </aside>

          <div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="font-serif text-3xl font-medium">What cooks are saying</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  First-hand notes from people who tried this recipe.
                </p>
              </div>
              <Select
                value={sort}
                onValueChange={(value) => {
                  setSort(value as ReviewSort);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-44" aria-label="Sort reviews">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest first</SelectItem>
                  <SelectItem value="oldest">Oldest first</SelectItem>
                  <SelectItem value="highest">Highest rated</SelectItem>
                  <SelectItem value="lowest">Lowest rated</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="mt-6 space-y-4">
              {reviewList.isLoading ? (
                Array.from({ length: 3 }, (_, index) => <ReviewSkeleton key={index} />)
              ) : reviewList.error ? (
                <div className="rounded-2xl border border-dashed bg-background p-8 text-center">
                  <RefreshCw className="mx-auto size-6 text-destructive" />
                  <p className="mt-3 text-sm text-muted-foreground">{reviewList.error}</p>
                  <Button className="mt-4" variant="outline" onClick={reviewList.retry}>
                    Try again
                  </Button>
                </div>
              ) : reviewList.reviews.length === 0 ? (
                <div className="rounded-2xl border border-dashed bg-background p-10 text-center">
                  <MessageSquareText className="mx-auto size-7 text-primary" />
                  <h4 className="mt-4 font-serif text-2xl font-medium">No reviews yet</h4>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Be the first cook to share how this recipe turned out.
                  </p>
                </div>
              ) : (
                reviewList.reviews.map((review) => {
                  const isOwnReview = user?.id === review.user.id;
                  const canDelete =
                    status === 'authenticated' &&
                    user !== null &&
                    (isOwnReview || user.role === 'admin');

                  return (
                    <article
                      key={review.id}
                      className="rounded-2xl border bg-background p-5 sm:p-6"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <Link
                          className="flex min-w-0 items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                          to={`/cooks/${review.user.username}`}
                        >
                          <div className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-secondary text-xs font-bold text-primary">
                            {review.user.avatarUrl ? (
                              <img
                                className="size-full object-cover"
                                src={review.user.avatarUrl}
                                alt={review.user.name}
                                loading="lazy"
                                decoding="async"
                              />
                            ) : (
                              getInitials(review.user.name)
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{review.user.name}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              @{review.user.username}
                            </p>
                          </div>
                        </Link>
                        <div className="flex shrink-0 items-center gap-2">
                          <StarRating
                            rating={review.rating}
                            label={`${review.rating} out of 5 stars`}
                          />
                          {canDelete && !isOwnReview && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Delete review by ${review.user.name}`}
                              onClick={() => requestDelete(review)}
                            >
                              <Trash2 />
                            </Button>
                          )}
                        </div>
                      </div>
                      <p className="mt-5 whitespace-pre-line text-sm leading-7 text-muted-foreground">
                        {review.comment}
                      </p>
                      <p className="mt-4 text-xs text-muted-foreground">
                        {review.updatedAt !== review.createdAt ? 'Updated ' : 'Reviewed '}
                        {dateFormatter.format(new Date(review.updatedAt))}
                      </p>
                    </article>
                  );
                })
              )}
            </div>

            {!reviewList.isLoading && !reviewList.error && reviewList.pagination.totalPages > 1 && (
              <nav className="mt-8 flex justify-center gap-3" aria-label="Review pages">
                <Button
                  type="button"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => current - 1)}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={page >= reviewList.pagination.totalPages}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next
                </Button>
              </nav>
            )}
          </div>
        </div>
      </div>

      <AlertDialog
        open={reviewToDelete !== null}
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            setReviewToDelete(null);
            setMutationError(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive">
              <Trash2 />
            </AlertDialogMedia>
            <AlertDialogTitle>Delete this review?</AlertDialogTitle>
            <AlertDialogDescription>
              This review and its rating will be permanently removed. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {mutationError && (
            <p className="text-sm text-destructive" role="alert">
              {mutationError}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Keep review</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={isDeleting} onClick={handleDelete}>
              {isDeleting ? <LoaderCircle className="animate-spin" /> : <Trash2 />}
              {isDeleting ? 'Deleting…' : 'Delete review'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
