import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createContentReportMock,
  listContentReportsMock,
  reviewContentReportMock,
  verifyAccessTokenMock,
} = vi.hoisted(() => ({
  createContentReportMock: vi.fn(),
  listContentReportsMock: vi.fn(),
  reviewContentReportMock: vi.fn(),
  verifyAccessTokenMock: vi.fn(),
}));

vi.mock('../../src/lib/access-token.js', () => ({
  verifyAccessToken: verifyAccessTokenMock,
}));
vi.mock('../../src/services/report.service.js', () => ({
  createContentReport: createContentReportMock,
  listContentReports: listContentReportsMock,
  reviewContentReport: reviewContentReportMock,
}));

import { createApp } from '../../src/app.js';

const targetId = '507f1f77bcf86cd799439012';
const reportId = '507f1f77bcf86cd799439013';

describe('content report routes', () => {
  const app = createApp();

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('creates a validated report for an authenticated user', async () => {
    verifyAccessTokenMock.mockResolvedValue({ userId: 'user-id', role: 'user' });
    createContentReportMock.mockResolvedValue({ id: reportId, status: 'open' });

    const response = await request(app)
      .post('/api/v1/reports')
      .set('Authorization', 'Bearer signed-access-token')
      .send({
        targetType: 'recipe',
        targetId: targetId.toUpperCase(),
        reason: 'misleading',
        details: '  The instructions conflict with the listed ingredients.  ',
      })
      .expect(201);

    expect(createContentReportMock).toHaveBeenCalledWith('user-id', {
      targetType: 'recipe',
      targetId,
      reason: 'misleading',
      details: 'The instructions conflict with the listed ingredients.',
    });
    expect(response.body.data.report.status).toBe('open');
    expect(response.headers['ratelimit-policy']).toContain('content-report');
  });

  it('authenticates before validating report content', async () => {
    await request(app).post('/api/v1/reports').send({ targetType: 'invalid' }).expect(401);
    expect(createContentReportMock).not.toHaveBeenCalled();
  });

  it('returns a filtered moderation queue to administrators', async () => {
    verifyAccessTokenMock.mockResolvedValue({ userId: 'admin-id', role: 'admin' });
    listContentReportsMock.mockResolvedValue({
      items: [{ id: reportId, status: 'open' }],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    const response = await request(app)
      .get('/api/v1/admin/reports?status=open&targetType=review&reason=spam&sort=oldest')
      .set('Authorization', 'Bearer signed-access-token')
      .expect(200);

    expect(listContentReportsMock).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
      status: 'open',
      targetType: 'review',
      reason: 'spam',
      sort: 'oldest',
    });
    expect(response.body.data.reports[0].status).toBe('open');
  });

  it('records a validated administrator decision', async () => {
    verifyAccessTokenMock.mockResolvedValue({ userId: 'admin-id', role: 'admin' });
    reviewContentReportMock.mockResolvedValue({ id: reportId, status: 'dismissed' });

    const response = await request(app)
      .patch(`/api/v1/admin/reports/${reportId}`)
      .set('Authorization', 'Bearer signed-access-token')
      .send({
        status: 'dismissed',
        note: 'The content does not violate the community guidelines.',
      })
      .expect(200);

    expect(reviewContentReportMock).toHaveBeenCalledWith(reportId, 'admin-id', {
      status: 'dismissed',
      note: 'The content does not violate the community guidelines.',
    });
    expect(response.body.data.report.status).toBe('dismissed');
  });

  it('rejects non-administrators before validating moderation inputs', async () => {
    verifyAccessTokenMock.mockResolvedValue({ userId: 'user-id', role: 'user' });

    await request(app)
      .patch('/api/v1/admin/reports/invalid')
      .set('Authorization', 'Bearer signed-access-token')
      .send({ status: 'invalid' })
      .expect(403);
    expect(reviewContentReportMock).not.toHaveBeenCalled();
  });
});
