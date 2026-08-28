import type {
  AdminContentReportListData,
  CreateContentReportInput,
  CreatedContentReport,
  ReviewedContentReport,
  ReviewContentReportInput,
} from '@/features/reports/types';

type AuthenticatedRequest = <T>(path: string, init?: RequestInit) => Promise<T>;

interface CreateContentReportResponse {
  data: { report: CreatedContentReport };
}

interface AdminContentReportListResponse {
  data: AdminContentReportListData;
}

interface ReviewContentReportResponse {
  data: { report: ReviewedContentReport };
}

export async function createContentReport(
  request: AuthenticatedRequest,
  input: CreateContentReportInput,
) {
  const response = await request<CreateContentReportResponse>('/reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  return response.data.report;
}

export async function getAdminContentReports(
  request: AuthenticatedRequest,
  queryString: string,
  signal?: AbortSignal,
) {
  const query = queryString.length > 0 ? `?${queryString}` : '';
  const response = await request<AdminContentReportListResponse>(`/admin/reports${query}`, {
    signal,
  });

  return response.data;
}

export async function reviewAdminContentReport(
  request: AuthenticatedRequest,
  reportId: string,
  input: ReviewContentReportInput,
) {
  const response = await request<ReviewContentReportResponse>(`/admin/reports/${reportId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  return response.data.report;
}
