export const contentReportReasonOptions = [
  { value: 'spam', label: 'Spam or promotion' },
  { value: 'harassment', label: 'Harassment or abuse' },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'misleading', label: 'Misleading information' },
  { value: 'other', label: 'Another concern' },
] as const;

export type ContentReportTargetType = 'recipe' | 'review';
export type ContentReportReason = (typeof contentReportReasonOptions)[number]['value'];
export type ContentReportStatus = 'open' | 'resolved' | 'dismissed';

export interface CreateContentReportInput {
  targetType: ContentReportTargetType;
  targetId: string;
  reason: ContentReportReason;
  details?: string | null;
}

export interface CreatedContentReport {
  id: string;
  status: 'open';
  createdAt: string;
}

export interface AdminContentReportItem {
  id: string;
  targetType: ContentReportTargetType;
  reason: ContentReportReason;
  details: string | null;
  status: ContentReportStatus;
  resolutionNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  reporter: {
    id: string;
    name: string;
    username: string;
  };
  target: {
    id: string;
    recipe: {
      id: string;
      title: string;
      slug: string;
    };
    review: {
      rating: number;
      comment: string;
    } | null;
    author: {
      id: string;
      name: string;
      username: string;
    };
  };
}

export interface AdminContentReportListData {
  reports: AdminContentReportItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ReviewContentReportInput {
  status: 'resolved' | 'dismissed';
  note: string;
}

export interface ReviewedContentReport {
  id: string;
  status: ReviewContentReportInput['status'];
  resolutionNote: string;
  reviewedAt: string;
}
