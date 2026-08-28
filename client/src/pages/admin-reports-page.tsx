import {
  CircleCheck,
  CircleX,
  ExternalLink,
  LoaderCircle,
  MessageSquareText,
  RefreshCw,
  ShieldAlert,
  SlidersHorizontal,
} from 'lucide-react';
import { useState, type SubmitEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
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
import { useAuthenticatedRequest } from '@/features/auth/hooks/use-authenticated-request';
import { reviewAdminContentReport } from '@/features/reports/api/reports';
import { useAdminContentReports } from '@/features/reports/hooks/use-admin-content-reports';
import {
  contentReportReasonOptions,
  type AdminContentReportItem,
  type ContentReportReason,
  type ContentReportStatus,
  type ReviewContentReportInput,
} from '@/features/reports/types';
import { cn } from '@/lib/utils';

const statuses = ['open', 'resolved', 'dismissed'] as const;
const targetTypes = ['recipe', 'review'] as const;
const sorts = ['newest', 'oldest'] as const;

const dateFormatter = new Intl.DateTimeFormat('en', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

function getPage(value: string | null) {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function getReasonLabel(reason: ContentReportReason) {
  return contentReportReasonOptions.find((option) => option.value === reason)?.label ?? reason;
}

function getStatusLabel(status: ContentReportStatus) {
  if (status === 'open') return 'Needs review';
  return status === 'resolved' ? 'Resolved' : 'Dismissed';
}

function getStatusVariant(status: ContentReportStatus) {
  if (status === 'open') return 'destructive' as const;
  return status === 'resolved' ? ('secondary' as const) : ('outline' as const);
}

function ReportsSkeleton() {
  return (
    <div className="space-y-4" aria-label="Loading content reports">
      {Array.from({ length: 4 }, (_, index) => (
        <Card key={index}>
          <CardContent>
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-5 w-20" />
            </div>
            <Skeleton className="mt-5 h-6 w-1/2" />
            <Skeleton className="mt-3 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-4/5" />
            <div className="mt-6 flex gap-2 border-t pt-5">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-24" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function AdminReportsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const request = useAuthenticatedRequest();
  const statusParam = searchParams.get('status');
  const targetTypeParam = searchParams.get('targetType');
  const reasonParam = searchParams.get('reason');
  const sortParam = searchParams.get('sort');
  const status =
    statusParam === 'all' ? 'all' : (statuses.find((option) => option === statusParam) ?? 'open');
  const targetType =
    targetTypeParam === 'all'
      ? 'all'
      : (targetTypes.find((option) => option === targetTypeParam) ?? 'all');
  const reason =
    reasonParam === 'all'
      ? 'all'
      : (contentReportReasonOptions.find((option) => option.value === reasonParam)?.value ?? 'all');
  const sort = sorts.find((option) => option === sortParam) ?? 'newest';
  const page = getPage(searchParams.get('page'));
  const query = new URLSearchParams({ page: String(page), limit: '10', sort });
  if (status !== 'all') query.set('status', status);
  if (targetType !== 'all') query.set('targetType', targetType);
  if (reason !== 'all') query.set('reason', reason);

  const { reports, pagination, isLoading, error, retry } = useAdminContentReports(query.toString());
  const hasFilters =
    status !== 'open' || targetType !== 'all' || reason !== 'all' || sort !== 'newest';
  const [reportToReview, setReportToReview] = useState<AdminContentReportItem | null>(null);
  const [decisionStatus, setDecisionStatus] = useState<ReviewContentReportInput['status'] | null>(
    null,
  );
  const [isReviewing, setIsReviewing] = useState(false);
  const [decisionError, setDecisionError] = useState<string | null>(null);

  function updateFilter(name: string, value: string | null) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (value) next.set(name, value);
      else next.delete(name);
      next.delete('page');
      return next;
    });
  }

  function goToPage(nextPage: number) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set('page', String(nextPage));
      return next;
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function beginReview(
    report: AdminContentReportItem,
    nextStatus: ReviewContentReportInput['status'],
  ) {
    setDecisionError(null);
    setDecisionStatus(nextStatus);
    setReportToReview(report);
  }

  function closeDecision() {
    if (isReviewing) return;
    setReportToReview(null);
    setDecisionStatus(null);
    setDecisionError(null);
  }

  async function handleDecision(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (reportToReview === null || decisionStatus === null) return;

    const note = String(new FormData(event.currentTarget).get('note') ?? '').trim();
    if (note.length < 10) {
      setDecisionError('The moderation note must contain at least 10 characters.');
      return;
    }

    setDecisionError(null);
    setIsReviewing(true);

    try {
      await reviewAdminContentReport(request, reportToReview.id, {
        status: decisionStatus,
        note,
      });
      setReportToReview(null);
      setDecisionStatus(null);
      setIsReviewing(false);

      if (status === 'open' && reports.length === 1 && pagination.page > 1) {
        goToPage(pagination.page - 1);
      } else {
        retry();
      }
    } catch (reviewError) {
      setDecisionError(
        reviewError instanceof Error
          ? reviewError.message
          : 'The moderation decision could not be saved.',
      );
      setIsReviewing(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
      <div>
        <p className="text-xs font-bold tracking-[0.14em] text-primary uppercase">
          Trust and safety
        </p>
        <h1 className="mt-3 font-serif text-4xl font-medium tracking-[-0.04em] sm:text-5xl">
          Content reports
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
          Review member concerns, inspect the reported content, and record a clear moderation
          outcome.
        </p>
      </div>

      <Card className="mt-8">
        <CardContent>
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
            <SlidersHorizontal className="size-4 text-primary" />
            Filter reports
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
            <Select
              value={status}
              onValueChange={(value) =>
                updateFilter('status', value === 'open' ? null : (value ?? null))
              }
            >
              <SelectTrigger className="h-10 w-full" aria-label="Filter reports by status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Needs review</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="dismissed">Dismissed</SelectItem>
                <SelectItem value="all">All statuses</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={targetType}
              onValueChange={(value) =>
                updateFilter('targetType', value === 'all' ? null : (value ?? null))
              }
            >
              <SelectTrigger className="h-10 w-full" aria-label="Filter reports by content type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All content</SelectItem>
                <SelectItem value="recipe">Recipes</SelectItem>
                <SelectItem value="review">Reviews</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={reason}
              onValueChange={(value) =>
                updateFilter('reason', value === 'all' ? null : (value ?? null))
              }
            >
              <SelectTrigger className="h-10 w-full" aria-label="Filter reports by reason">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All reasons</SelectItem>
                {contentReportReasonOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sort} onValueChange={(value) => updateFilter('sort', value)}>
              <SelectTrigger className="h-10 w-full" aria-label="Sort content reports">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="oldest">Oldest first</SelectItem>
              </SelectContent>
            </Select>

            {hasFilters && (
              <Button
                className="h-10 sm:col-span-2 xl:col-span-1"
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
            ? 'Loading reports…'
            : `${pagination.total} ${pagination.total === 1 ? 'report' : 'reports'}`}
        </p>
        {pagination.totalPages > 0 && (
          <p className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages}
          </p>
        )}
      </div>

      <div className="mt-4">
        {isLoading ? (
          <ReportsSkeleton />
        ) : error ? (
          <Card className="border-destructive/25 bg-destructive/5">
            <CardContent className="flex min-h-64 flex-col items-center justify-center text-center">
              <RefreshCw className="size-6 text-destructive" />
              <h2 className="mt-4 font-serif text-2xl font-medium">Reports could not load</h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{error}</p>
              <Button className="mt-5" variant="outline" onClick={retry}>
                <RefreshCw />
                Try again
              </Button>
            </CardContent>
          </Card>
        ) : reports.length === 0 ? (
          <Card>
            <CardContent className="flex min-h-64 flex-col items-center justify-center text-center">
              <ShieldAlert className="size-7 text-muted-foreground" />
              <h2 className="mt-4 font-serif text-2xl font-medium">
                {hasFilters ? 'No reports match these filters' : 'No reports need review'}
              </h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                {hasFilters
                  ? 'Clear or adjust the filters to widen the moderation results.'
                  : 'New member reports will appear here when they are submitted.'}
              </p>
              {hasFilters && (
                <Button className="mt-5" variant="outline" onClick={() => setSearchParams({})}>
                  Clear filters
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => (
              <Card key={report.id}>
                <CardContent>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={getStatusVariant(report.status)}>
                      {getStatusLabel(report.status)}
                    </Badge>
                    <Badge variant="outline" className="capitalize">
                      {report.targetType}
                    </Badge>
                    <Badge variant="secondary">{getReasonLabel(report.reason)}</Badge>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {dateFormatter.format(new Date(report.createdAt))}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(17rem,0.6fr)]">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-serif text-2xl font-medium">
                          {report.target.recipe.title}
                        </h2>
                        <Link
                          className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }))}
                          to={`/recipes/${report.target.recipe.slug}`}
                          aria-label={`View ${report.target.recipe.title}`}
                          title="View reported content"
                        >
                          <ExternalLink />
                        </Link>
                      </div>

                      {report.target.review && (
                        <div className="mt-3 rounded-xl border bg-muted/35 p-4">
                          <div className="flex items-center gap-2 text-xs font-semibold">
                            <MessageSquareText className="size-3.5 text-primary" />
                            {report.target.review.rating} out of 5 stars
                          </div>
                          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted-foreground">
                            {report.target.review.comment}
                          </p>
                        </div>
                      )}

                      <div className="mt-4">
                        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                          Member notes
                        </p>
                        <p className="mt-2 whitespace-pre-line text-sm leading-6">
                          {report.details ?? 'No additional details were provided.'}
                        </p>
                      </div>
                    </div>

                    <dl className="grid content-start gap-4 rounded-xl border bg-muted/20 p-4 text-sm">
                      <div>
                        <dt className="text-xs text-muted-foreground">Reported by</dt>
                        <dd className="mt-1">
                          <Link
                            className="font-semibold hover:text-primary"
                            to={`/cooks/${report.reporter.username}`}
                          >
                            {report.reporter.name}
                          </Link>{' '}
                          <span className="text-muted-foreground">@{report.reporter.username}</span>
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">Content author</dt>
                        <dd className="mt-1">
                          <Link
                            className="font-semibold hover:text-primary"
                            to={`/cooks/${report.target.author.username}`}
                          >
                            {report.target.author.name}
                          </Link>{' '}
                          <span className="text-muted-foreground">
                            @{report.target.author.username}
                          </span>
                        </dd>
                      </div>
                    </dl>
                  </div>

                  {report.status === 'open' ? (
                    <div className="mt-6 flex flex-wrap gap-2 border-t pt-5">
                      <Button type="button" onClick={() => beginReview(report, 'resolved')}>
                        <CircleCheck />
                        Resolve
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => beginReview(report, 'dismissed')}
                      >
                        <CircleX />
                        Dismiss
                      </Button>
                    </div>
                  ) : (
                    <div className="mt-6 rounded-xl border bg-muted/25 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                          Moderation note
                        </p>
                        {report.reviewedAt && (
                          <p className="text-xs text-muted-foreground">
                            {dateFormatter.format(new Date(report.reviewedAt))}
                          </p>
                        )}
                      </div>
                      <p className="mt-2 whitespace-pre-line text-sm leading-6">
                        {report.resolutionNote}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {!isLoading && !error && pagination.totalPages > 1 && (
        <nav
          className="mt-8 flex items-center justify-between border-t pt-6"
          aria-label="Report pages"
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

      <AlertDialog open={reportToReview !== null} onOpenChange={(open) => !open && closeDecision()}>
        <AlertDialogContent className="sm:max-w-lg">
          <form className="contents" onSubmit={handleDecision}>
            <AlertDialogHeader>
              <AlertDialogMedia className="bg-secondary text-primary">
                {decisionStatus === 'resolved' ? <CircleCheck /> : <CircleX />}
              </AlertDialogMedia>
              <AlertDialogTitle>
                {decisionStatus === 'resolved' ? 'Resolve this report?' : 'Dismiss this report?'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {decisionStatus === 'resolved'
                  ? 'Record why the concern is resolved. Remove the content separately if the moderation outcome requires it.'
                  : 'Record why the reported content does not require further action.'}
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="space-y-2 py-1">
              <Label htmlFor="moderation-note">Moderation note</Label>
              <Textarea
                id="moderation-note"
                className="min-h-28 resize-y"
                name="note"
                minLength={10}
                maxLength={500}
                required
                disabled={isReviewing}
                placeholder="Summarize the decision for the moderation record."
              />
              <p className="text-xs text-muted-foreground">Between 10 and 500 characters.</p>
              {decisionError && (
                <p className="text-sm text-destructive" role="alert">
                  {decisionError}
                </p>
              )}
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel type="button" disabled={isReviewing}>
                Cancel
              </AlertDialogCancel>
              <Button type="submit" disabled={isReviewing}>
                {isReviewing ? (
                  <LoaderCircle className="animate-spin" />
                ) : decisionStatus === 'resolved' ? (
                  <CircleCheck />
                ) : (
                  <CircleX />
                )}
                {isReviewing
                  ? 'Saving decision…'
                  : decisionStatus === 'resolved'
                    ? 'Resolve report'
                    : 'Dismiss report'}
              </Button>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
