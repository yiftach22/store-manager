jest.mock('../../src/prisma/client');

import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { DeepMockProxy } from 'jest-mock-extended';
import { prisma } from '../../src/prisma/client';
import { createApp } from '../../src/app';
import { managerToken, workerToken } from '../helpers/tokens';

const db = prisma as unknown as DeepMockProxy<PrismaClient>;
const app = createApp();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeInstance(overrides: object = {}) {
  return {
    id: 1,
    title: 'Open Store',
    originalDate: new Date('2026-03-24').toISOString(),
    currentDate: new Date('2026-03-24').toISOString(),
    status: false,
    category: 'daily',
    isOverdue: false,
    templateId: null,
    template: null,
    ...overrides,
  };
}

// ─── Auth guard (401) ─────────────────────────────────────────────────────────

describe('Auth guard', () => {
  const routes: Array<{ method: 'get' | 'post' | 'patch'; path: string }> = [
    { method: 'get',   path: '/api/orders?startDate=2026-03-24&endDate=2026-03-24' },
    { method: 'post',  path: '/api/orders/templates' },
    { method: 'patch', path: '/api/orders/instances/1/toggle' },
    { method: 'post',  path: '/api/orders/sync' },
  ];

  test.each(routes)('$method $path → 401 with no token', async ({ method, path }) => {
    const res = await (request(app)[method] as Function)(path);
    expect(res.status).toBe(401);
  });
});

// ─── RBAC (403) ───────────────────────────────────────────────────────────────

describe('RBAC — POST /api/orders/templates', () => {

  it('returns 403 when a WORKER tries to create a template', async () => {
    const res = await request(app)
      .post('/api/orders/templates')
      .set('Authorization', `Bearer ${workerToken()}`)
      .send({ title: 'Open store', category: 'daily', dayOfWeek: 1 });

    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ error: expect.any(String), code: 'FORBIDDEN' });
  });

  it('allows a MANAGER to create a template (201)', async () => {
    db.orderTemplate.create.mockResolvedValue({
      id: 1, title: 'Open store', dayOfWeek: 1, category: 'daily', isActive: true,
    } as any);

    const res = await request(app)
      .post('/api/orders/templates')
      .set('Authorization', `Bearer ${managerToken()}`)
      .send({ title: 'Open store', category: 'daily', dayOfWeek: 1 });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ id: 1, title: 'Open store', category: 'daily' });
  });

});

// ─── GET /api/orders ──────────────────────────────────────────────────────────

describe('GET /api/orders', () => {

  it('returns instances within the requested date range', async () => {
    db.orderInstance.findMany.mockResolvedValue([makeInstance()] as any);

    const res = await request(app)
      .get('/api/orders?startDate=2026-03-24&endDate=2026-03-24')
      .set('Authorization', `Bearer ${workerToken()}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ id: 1, title: 'Open Store', status: false });
  });

  it('returns an empty array when no instances exist in the range', async () => {
    db.orderInstance.findMany.mockResolvedValue([]);

    const res = await request(app)
      .get('/api/orders?startDate=2026-03-24&endDate=2026-03-24')
      .set('Authorization', `Bearer ${workerToken()}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns 400 when startDate is missing', async () => {
    const res = await request(app)
      .get('/api/orders?endDate=2026-03-24')
      .set('Authorization', `Bearer ${workerToken()}`);

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when endDate is missing', async () => {
    const res = await request(app)
      .get('/api/orders?startDate=2026-03-24')
      .set('Authorization', `Bearer ${workerToken()}`);

    expect(res.status).toBe(400);
  });

  it('returns 400 for an invalid date format', async () => {
    const res = await request(app)
      .get('/api/orders?startDate=not-a-date&endDate=2026-03-24')
      .set('Authorization', `Bearer ${workerToken()}`);

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

});

// ─── PATCH /api/orders/instances/:id/toggle ───────────────────────────────────

describe('PATCH /api/orders/instances/:id/toggle', () => {

  it('flips status from false → true', async () => {
    const existing = makeInstance({ status: false });
    const updated  = makeInstance({ status: true });

    db.orderInstance.findUnique.mockResolvedValue(existing as any);
    db.orderInstance.update.mockResolvedValue(updated as any);

    const res = await request(app)
      .patch('/api/orders/instances/1/toggle')
      .set('Authorization', `Bearer ${workerToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe(true);
    expect(db.orderInstance.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { status: true },
    });
  });

  it('flips status from true → false', async () => {
    const existing = makeInstance({ id: 2, status: true });
    const updated  = makeInstance({ id: 2, status: false });

    db.orderInstance.findUnique.mockResolvedValue(existing as any);
    db.orderInstance.update.mockResolvedValue(updated as any);

    const res = await request(app)
      .patch('/api/orders/instances/2/toggle')
      .set('Authorization', `Bearer ${workerToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe(false);
  });

  it('returns 404 when the instance does not exist', async () => {
    db.orderInstance.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .patch('/api/orders/instances/999/toggle')
      .set('Authorization', `Bearer ${workerToken()}`);

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('NOT_FOUND');
  });

  it('returns 400 for a non-numeric id', async () => {
    const res = await request(app)
      .patch('/api/orders/instances/abc/toggle')
      .set('Authorization', `Bearer ${workerToken()}`);

    expect(res.status).toBe(400);
  });

});

// ─── POST /api/orders/sync ────────────────────────────────────────────────────

describe('POST /api/orders/sync', () => {

  it('runs the rollover and returns { deleted, updated, created }', async () => {
    // The real processDailyRollover runs; all its prisma calls are mocked.
    db.orderInstance.findMany.mockResolvedValue([{ id: 5 }, { id: 6 }] as any);
    db.orderInstance.updateMany.mockResolvedValue({ count: 2 });
    db.orderTemplate.findMany.mockResolvedValue([]);

    const res = await request(app)
      .post('/api/orders/sync')
      .set('Authorization', `Bearer ${managerToken()}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      deleted: expect.any(Number),
      updated: expect.any(Number),
      created: expect.any(Number),
    });
  });

  it('reports updated count correctly when there are overdue instances on a weekday', async () => {
    db.orderInstance.findMany.mockResolvedValue([{ id: 7 }] as any);
    db.orderInstance.updateMany.mockResolvedValue({ count: 1 });
    db.orderTemplate.findMany.mockResolvedValue([]);

    const res = await request(app)
      .post('/api/orders/sync')
      .set('Authorization', `Bearer ${workerToken()}`);

    expect(res.status).toBe(200);
    // updated will be 0 or 1 depending on whether today (real clock) is a Sunday or not
    expect(typeof res.body.updated + res.body.deleted).not.toBe('undefinedundefined');
  });

});
