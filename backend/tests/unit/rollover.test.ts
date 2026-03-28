// jest.mock is hoisted before imports, so the manual mock at
// src/prisma/__mocks__/client.ts is used instead of the real Prisma client.
jest.mock('../../src/prisma/client');

import { PrismaClient } from '@prisma/client';
import { DeepMockProxy } from 'jest-mock-extended';
import { startOfDay } from 'date-fns';
import { prisma } from '../../src/prisma/client';
import { processDailyRollover } from '../../src/services/order.service';

const db = prisma as unknown as DeepMockProxy<PrismaClient>;

// March 24 = Tuesday (getDay() === 2)
const TUESDAY = new Date('2026-03-24T12:00:00.000Z');
// March 29 = Sunday (getDay() === 0)
const SUNDAY = new Date('2026-03-29T12:00:00.000Z');

describe('processDailyRollover', () => {

  // ─── Weekday behaviour ───────────────────────────────────────────────────

  describe('weekday (Tuesday)', () => {

    it('moves overdue unfinished instances to today and marks isOverdue=true', async () => {
      db.orderInstance.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }] as any);
      db.orderInstance.updateMany.mockResolvedValue({ count: 2 });
      db.orderTemplate.findMany.mockResolvedValue([]);

      const result = await processDailyRollover(TUESDAY);

      expect(db.orderInstance.updateMany).toHaveBeenCalledWith({
        where: { id: { in: [1, 2] } },
        data: { currentDate: startOfDay(TUESDAY), isOverdue: true },
      });
      expect(db.orderInstance.deleteMany).not.toHaveBeenCalled();
      expect(result).toEqual({ deleted: 0, updated: 2, created: 0 });
    });

    it('does not call updateMany or deleteMany when there are no overdue instances', async () => {
      db.orderInstance.findMany.mockResolvedValue([]);
      db.orderTemplate.findMany.mockResolvedValue([]);

      const result = await processDailyRollover(TUESDAY);

      expect(db.orderInstance.updateMany).not.toHaveBeenCalled();
      expect(db.orderInstance.deleteMany).not.toHaveBeenCalled();
      expect(result).toEqual({ deleted: 0, updated: 0, created: 0 });
    });

  });

  // ─── Sunday behaviour ────────────────────────────────────────────────────

  describe('Sunday (weekend cleanup)', () => {

    it('deletes unfinished instances instead of rolling them over', async () => {
      db.orderInstance.findMany.mockResolvedValue([{ id: 3 }, { id: 4 }] as any);
      db.orderInstance.deleteMany.mockResolvedValue({ count: 2 });
      db.orderTemplate.findMany.mockResolvedValue([]);

      const result = await processDailyRollover(SUNDAY);

      expect(db.orderInstance.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: [3, 4] } },
      });
      expect(db.orderInstance.updateMany).not.toHaveBeenCalled();
      expect(result).toEqual({ deleted: 2, updated: 0, created: 0 });
    });

    it('does not delete anything if there are no overdue instances on Sunday', async () => {
      db.orderInstance.findMany.mockResolvedValue([]);
      db.orderTemplate.findMany.mockResolvedValue([]);

      const result = await processDailyRollover(SUNDAY);

      expect(db.orderInstance.deleteMany).not.toHaveBeenCalled();
      expect(result.deleted).toBe(0);
    });

  });

  // ─── Completed-task exclusion ────────────────────────────────────────────

  describe('completed tasks (status: true)', () => {

    it('queries with status: false so completed tasks are never included', async () => {
      db.orderInstance.findMany.mockResolvedValue([]);
      db.orderTemplate.findMany.mockResolvedValue([]);

      await processDailyRollover(TUESDAY);

      // Verify the WHERE clause explicitly filters for incomplete tasks
      expect(db.orderInstance.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: false }),
        })
      );
    });

    it('takes no action when completed tasks are the only ones past their date', async () => {
      // The query with status:false returns empty — completed tasks are excluded
      db.orderInstance.findMany.mockResolvedValue([]);
      db.orderTemplate.findMany.mockResolvedValue([]);

      const result = await processDailyRollover(TUESDAY);

      expect(db.orderInstance.updateMany).not.toHaveBeenCalled();
      expect(db.orderInstance.deleteMany).not.toHaveBeenCalled();
      expect(result).toEqual({ deleted: 0, updated: 0, created: 0 });
    });

  });

  // ─── Instance generation from templates ──────────────────────────────────

  describe('new instance generation', () => {

    it('creates an instance for each template matching today\'s day of week', async () => {
      const tuesdayTemplate = {
        id: 10, title: 'Tuesday checklist', dayOfWeek: 2,
        category: 'daily', isActive: true, instances: [],
      };

      db.orderInstance.findMany.mockResolvedValue([]);
      db.orderTemplate.findMany.mockResolvedValue([tuesdayTemplate] as any);
      db.orderInstance.findFirst.mockResolvedValue(null); // no duplicate exists
      db.orderInstance.create.mockResolvedValue({ id: 99 } as any);

      const result = await processDailyRollover(TUESDAY);

      expect(db.orderInstance.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'Tuesday checklist',
          category: 'daily',
          status: false,
          isOverdue: false,
          templateId: 10,
          currentDate: startOfDay(TUESDAY),
          originalDate: startOfDay(TUESDAY),
        }),
      });
      expect(result.created).toBe(1);
    });

    it('skips creation if an instance already exists for today (duplicate guard)', async () => {
      const template = {
        id: 11, title: 'Already generated', dayOfWeek: 2,
        category: 'daily', isActive: true, instances: [],
      };

      db.orderInstance.findMany.mockResolvedValue([]);
      db.orderTemplate.findMany.mockResolvedValue([template] as any);
      db.orderInstance.findFirst.mockResolvedValue({ id: 50 } as any); // already exists

      const result = await processDailyRollover(TUESDAY);

      expect(db.orderInstance.create).not.toHaveBeenCalled();
      expect(result.created).toBe(0);
    });

    it('does not auto-generate instances for floating templates (dayOfWeek = null)', async () => {
      // Floating templates are NOT returned by the query (dayOfWeek: todayDow),
      // so they will never be in the findMany result.
      db.orderInstance.findMany.mockResolvedValue([]);
      db.orderTemplate.findMany.mockResolvedValue([]); // null-dayOfWeek templates excluded by query

      const result = await processDailyRollover(TUESDAY);

      expect(db.orderInstance.create).not.toHaveBeenCalled();
      expect(result.created).toBe(0);
    });

    it('queries templates by today\'s exact day of week', async () => {
      db.orderInstance.findMany.mockResolvedValue([]);
      db.orderTemplate.findMany.mockResolvedValue([]);

      await processDailyRollover(TUESDAY);

      // Tuesday = getDay() 2
      expect(db.orderTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true, dayOfWeek: 2 }),
        })
      );
    });

  });

});
