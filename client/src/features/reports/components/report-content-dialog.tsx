import { CircleCheck, Flag, LoaderCircle } from 'lucide-react';
import { useId, useState, type SubmitEvent } from 'react';

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
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuthenticatedRequest } from '@/features/auth/hooks/use-authenticated-request';
import { createContentReport } from '@/features/reports/api/reports';
import {
  contentReportReasonOptions,
  type ContentReportReason,
  type ContentReportTargetType,
} from '@/features/reports/types';

interface ReportContentDialogProps {
  targetType: ContentReportTargetType;
  targetId: string;
  targetLabel: string;
  compact?: boolean;
}

export function ReportContentDialog({
  targetType,
  targetId,
  targetLabel,
  compact = false,
}: ReportContentDialogProps) {
  const request = useAuthenticatedRequest();
  const detailsId = useId();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ContentReportReason | ''>('');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleOpenChange(nextOpen: boolean) {
    if (isSubmitting) return;
    setOpen(nextOpen);

    if (!nextOpen && !isSubmitted) {
      setReason('');
      setDetails('');
      setError(null);
    }
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedDetails = details.trim();

    if (reason === '') {
      setError('Choose the reason that best describes your concern.');
      return;
    }

    if (reason === 'other' && normalizedDetails.length === 0) {
      setError('Add details when selecting another concern.');
      return;
    }

    if (normalizedDetails.length > 0 && normalizedDetails.length < 10) {
      setError('Additional details must contain at least 10 characters.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await createContentReport(request, {
        targetType,
        targetId,
        reason,
        details: normalizedDetails || null,
      });
      setIsSubmitting(false);
      setIsSubmitted(true);
    } catch (reportError) {
      setError(
        reportError instanceof Error ? reportError.message : 'The report could not be submitted.',
      );
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant={compact ? 'ghost' : 'outline'}
        size={compact ? 'icon-sm' : 'default'}
        disabled={isSubmitted}
        aria-label={compact ? (isSubmitted ? 'Report submitted' : targetLabel) : undefined}
        title={compact ? (isSubmitted ? 'Report submitted' : targetLabel) : undefined}
        onClick={() => setOpen(true)}
      >
        {isSubmitted ? <CircleCheck /> : <Flag />}
        {!compact && (isSubmitted ? 'Report submitted' : 'Report recipe')}
      </Button>

      <AlertDialog open={open} onOpenChange={handleOpenChange}>
        <AlertDialogContent className="sm:max-w-lg">
          {isSubmitted ? (
            <>
              <AlertDialogHeader>
                <AlertDialogMedia className="bg-secondary text-primary">
                  <CircleCheck />
                </AlertDialogMedia>
                <AlertDialogTitle>Report submitted</AlertDialogTitle>
                <AlertDialogDescription>
                  Thank you for bringing this to our attention. An administrator can now review the
                  content and your notes.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel variant="default">Done</AlertDialogCancel>
              </AlertDialogFooter>
            </>
          ) : (
            <form className="contents" onSubmit={handleSubmit}>
              <AlertDialogHeader>
                <AlertDialogMedia className="bg-destructive/10 text-destructive">
                  <Flag />
                </AlertDialogMedia>
                <AlertDialogTitle>Report {targetType}</AlertDialogTitle>
                <AlertDialogDescription>
                  Tell us what is wrong with this {targetType}. Reports are reviewed by an
                  administrator and are not shown publicly.
                </AlertDialogDescription>
              </AlertDialogHeader>

              <div className="space-y-4 py-1">
                <div className="space-y-2">
                  <Label>Reason</Label>
                  <Select
                    value={reason || null}
                    onValueChange={(value) => {
                      setReason((value ?? '') as ContentReportReason | '');
                      setError(null);
                    }}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="w-full" aria-label="Report reason">
                      <SelectValue placeholder="Choose a reason" />
                    </SelectTrigger>
                    <SelectContent>
                      {contentReportReasonOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={detailsId}>
                    Additional details {reason === 'other' ? '' : '(optional)'}
                  </Label>
                  <Textarea
                    id={detailsId}
                    className="min-h-28 resize-y"
                    value={details}
                    minLength={10}
                    maxLength={500}
                    required={reason === 'other'}
                    disabled={isSubmitting}
                    placeholder="Add context that will help an administrator review this report."
                    onChange={(event) => {
                      setDetails(event.currentTarget.value);
                      setError(null);
                    }}
                  />
                  <p className="text-xs text-muted-foreground">10–500 characters when provided.</p>
                </div>

                {error && (
                  <p className="text-sm text-destructive" role="alert">
                    {error}
                  </p>
                )}
              </div>

              <AlertDialogFooter>
                <AlertDialogCancel type="button" disabled={isSubmitting}>
                  Cancel
                </AlertDialogCancel>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <LoaderCircle className="animate-spin" /> : <Flag />}
                  {isSubmitting ? 'Submitting…' : 'Submit report'}
                </Button>
              </AlertDialogFooter>
            </form>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
