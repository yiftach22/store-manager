jest.mock('../../src/prisma/client');

import { PrismaClient } from '@prisma/client';
import { DeepMockProxy } from 'jest-mock-extended';
import { startOfDay } from 'date-fns';
import { prisma } from '../../src/prisma/client';
import { processDailyRollover } from '../../src/services/order.service';

const db = prisma as unknown as DeepMockProxy<PrismaClient>;

// Work week: Sun–Fri. Saturday is the rest day (no rollover).
// March 24 = Tuesday  (getDay() === 2) — mid-week workday
// March 29 = Sunday   (getDay() === 0) — start of work week
// March 28 = Saturday (getDay() === 6) — rest day, no rollover
const TUESDAY  = new Date('2026-03-24T12:00:00.000Z');
const SUNDAY   = new Date('2026-03-29T12:00:00.000Z');
const SATURDAY = new Date('2026-03-28T12:00:00.000Z');

describe('processDailyRollover', () => {

  // ─── Workday behaviour (Sun–Fri) ─────────────────────────────────────────

  describe('workday (Tuesday)', () => {

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
      expect(result).toEqual({ updated: 2, created: 0 });
    });

    it('does not call updateMany when there are no overdue instances', async () => {
      db.orderInstance.findMany.mockResolvedValue([]);
      db.orderTemplate.findMany.mockResolvedValue([]);

      const result = await processDailyRollover(TUESDAY);

      expect(db.orderInstance.updateMany).not.toHaveBeenCalled();
      expect(result).toEqual({ updated: 0, created: 0 });
    });

  });

  describe('workday (Sunday — start of week)', () => {

    it('rolls over overdue instances on Sunday just like any other workday', async () => {
      db.orderInstance.findMany.mockResolvedValue([{ id: 5 }] as any);
      db.orderInstance.updateMany.mockResolvedValue({ count: 1 });
      db.orderTemplate.findMany.mockResolvedValue([]);

      const result = await processDailyRollover(SUNDAY);

      expect(db.orderInstance.updateMany).toHaveBeenCalledWith({
        where: { id: { in: [5] } },
        data: { currentDate: startOfDay(SUNDAY), isOverdue: true },
      });
      expect(result).toEqual({ updated: 1, created: 0 });
    });

  });

  // ─── Saturday behaviour (rest day) ───────────────────────────────────────

  describe('Saturday (rest day)', () => {

    it('leaves overdue instances untouched — no update, no delete', async () => {
      db.orderTemplate.findMany.mockResolvedValue([]);

      const result = await processDailyRollover(SATURDAY);

      expect(db.orderInstance.findMany).not.toHaveBeenCalled();
      expect(db.orderInstance.updateMany).not.toHaveBeenCalled();
      expect(db.orderInstance.deleteMany).not.toHaveBeenCalled();
      expect(result).toEqual({ updated: 0, created: 0 });
    });

  });

  // ─── Completed-task exclusion ────────────────────────────────────────────

  describe('completed tasks (status: true)', () => {

    it('queries with status: false so completed tasks are never included', async () => {
      db.orderInstance.findMany.mockResolvedValue([]);
      db.orderTemplate.findMany.mockResolvedValue([]);

      await processDailyRollover(TUESDAY);

      expect(db.orderInstance.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: false }),
        })
      );
    });

    it('takes no action when completed tasks are the only ones past their date', async () => {
      db.orderInstance.findMany.mockResolvedValue([]);
      db.orderTemplate.findMany.mockResolvedValue([]);

      const result = await processDailyRollover(TUESDAY);

      expect(db.orderInstance.updateMany).not.toHaveBeenCalled();
      expect(db.orderInstance.deleteMany).not.toHaveBeenCalled();
      expect(result).toEqual({ updated: 0, created: 0 });
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
      db.orderInstance.findFirst.mockResolvedValue(null);
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
      db.orderInstance.findFirst.mockResolvedValue({ id: 50 } as any);

      const result = await processDailyRollover(TUESDAY);

      expect(db.orderInstance.create).not.toHaveBeenCalled();
      expect(result.created).toBe(0);
    });

    it('does not auto-generate instances for floating templates (dayOfWeek = null)', async () => {
      db.orderInstance.findMany.mockResolvedValue([]);
      db.orderTemplate.findMany.mockResolvedValue([]);

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
