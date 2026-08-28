import { describe, expect, it, vi } from 'vitest';

import {
  createContentReport,
  getAdminContentReports,
  reviewAdminContentReport,
} from '@/features/reports/api/reports';

describe('content reporting API', () => {
  it('submits an authenticated content report with JSON content', async () => {
    const report = {
      id: 'report-id',
      status: 'open',
      createdAt: '2026-08-28T08:00:00.000Z',
    };
    const request = vi.fn().mockResolvedValue({ data: { report } });
    const input = {
      targetType: 'recipe' as const,
      targetId: 'recipe-id',
      reason: 'misleading' as const,
      details: 'The ingredient measurements conflict with the instructions.',
    };

    await expect(createContentReport(request, input)).resolves.toEqual(report);
    expect(request).toHaveBeenCalledWith('/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  });

  it('loads the authenticated moderation queue with its query', async () => {
    const data = {
      reports: [{ id: 'report-id', targetType: 'review', status: 'open' }],
      pagination: { page: 2, limit: 10, total: 12, totalPages: 2 },
    };
    const request = vi.fn().mockResolvedValue({ data });
    const controller = new AbortController();

    await expect(
      getAdminContentReports(request, 'page=2&limit=10&status=open', controller.signal),
    ).resolves.toEqual(data);
    expect(request).toHaveBeenCalledWith('/admin/reports?page=2&limit=10&status=open', {
      signal: controller.signal,
    });
  });

  it('records an authenticated moderation decision with JSON content', async () => {
    const report = {
      id: 'report-id',
      status: 'resolved',
      resolutionNote: 'The reported review was removed under the community rules.',
      reviewedAt: '2026-08-28T09:00:00.000Z',
    };
    const request = vi.fn().mockResolvedValue({ data: { report } });
    const input = {
      status: 'resolved' as const,
      note: report.resolutionNote,
    };

    await expect(reviewAdminContentReport(request, report.id, input)).resolves.toEqual(report);
    expect(request).toHaveBeenCalledWith('/admin/reports/report-id', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  });
});
