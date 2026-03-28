import { Request, Response, NextFunction } from 'express';
import { parseISO, isValid, startOfDay, endOfDay, startOfWeek, addDays, format } from 'date-fns';
import { prisma } from '../prisma/client';
import { processDailyRollover } from '../services/order.service';
import { AppError, ErrorCode } from '../types/errors';

const DAY_LABELS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי'];

// GET /api/orders/week?weekOf=YYYY-MM-DD
export async function getWeek(req: Request, res: Response, next: NextFunction) {
  try {
    const { weekOf } = req.query as { weekOf?: string };

    const base = weekOf ? parseISO(weekOf) : new Date();
    if (!isValid(base)) {
      return next(new AppError('Invalid weekOf date. Use YYYY-MM-DD', 400, ErrorCode.VALIDATION_ERROR));
    }

    // Snap to Sunday of the requested week
    const weekStart = startOfWeek(base, { weekStartsOn: 0 });
    const currentWeekSunday = startOfWeek(new Date(), { weekStartsOn: 0 });
    const isFutureWeek = weekStart > currentWeekSunday;

    const weekStartDay = startOfDay(weekStart);
    const activeLists = await prisma.orderList.findMany({
      where: { isActive: true },
      orderBy: { id: 'asc' },
    });

    if (isFutureWeek) {
      // Build days from templates; include any manager one-off instances (templateId=null)
      const days = await Promise.all(
        Array.from({ length: 6 }, async (_, i) => {
          const date = addDays(weekStart, i);
          const dateStr = format(date, 'yyyy-MM-dd');
          const dayStart = startOfDay(date);
          const dayEnd = endOfDay(date);

          const templates = await prisma.orderTemplate.findMany({
            where: { dayOfWeek: i, listId: null, isActive: true },
          });
          const oneOffs = await prisma.orderInstance.findMany({
            where: { listId: null, templateId: null, currentDate: { gte: dayStart, lte: dayEnd } },
          });

          const instances = [
            ...templates.map((t) => ({
              id: -(t.id), title: t.title, status: false, isOverdue: false,
              category: t.category, templateId: t.id, listId: null,
              originalDate: dateStr, currentDate: dateStr, virtual: true,
            })),
            ...oneOffs.map((inst) => ({ ...inst, virtual: false })),
          ];

          return { date: dateStr, dayOfWeek: i, label: DAY_LABELS[i], instances };
        })
      );

      const lists = await Promise.all(
        activeLists.map(async (list) => {
          const templates = await prisma.orderTemplate.findMany({
            where: { listId: list.id, isActive: true },
          });
          const oneOffs = await prisma.orderInstance.findMany({
            where: { listId: list.id, templateId: null, originalDate: weekStartDay },
          });
          const instances = [
            ...templates.map((t) => ({
              id: -(t.id), title: t.title, status: false, isOverdue: false,
              category: t.category, templateId: t.id, listId: list.id,
              originalDate: format(weekStartDay, 'yyyy-MM-dd'),
              currentDate: format(weekStartDay, 'yyyy-MM-dd'), virtual: true,
            })),
            ...oneOffs.map((inst) => ({ ...inst, virtual: false })),
          ];
          return { id: list.id, name: list.name, instances };
        })
      );

      return res.json({ weekStart: format(weekStart, 'yyyy-MM-dd'), days, lists });
    }

    // Current/past week: return actual instances from DB
    const weekEnd = endOfDay(addDays(weekStart, 5));
    const dailyInstances = await prisma.orderInstance.findMany({
      where: { currentDate: { gte: weekStartDay, lte: weekEnd }, listId: null },
      include: { template: true },
    });

    const days = Array.from({ length: 6 }, (_, i) => {
      const date = addDays(weekStart, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);
      const instances = dailyInstances
        .filter((inst) => inst.currentDate >= dayStart && inst.currentDate <= dayEnd)
        .sort(sortInstances);
      return { date: dateStr, dayOfWeek: i, label: DAY_LABELS[i], instances };
    });

    const lists = await Promise.all(
      activeLists.map(async (list) => {
        const instances = await prisma.orderInstance.findMany({
          where: { listId: list.id, originalDate: weekStartDay },
          include: { template: true },
        });
        return { id: list.id, name: list.name, instances: instances.sort(sortInstances) };
      })
    );

    res.json({ weekStart: format(weekStart, 'yyyy-MM-dd'), days, lists });
  } catch (err) {
    next(err);
  }
}

// GET /api/orders?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD  (kept for compatibility)
export async function getInstances(req: Request, res: Response, next: NextFunction) {
  try {
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };

    if (!startDate || !endDate) {
      return next(new AppError('startDate and endDate query params are required', 400, ErrorCode.VALIDATION_ERROR));
    }

    const start = parseISO(startDate);
    const end = parseISO(endDate);

    if (!isValid(start) || !isValid(end)) {
      return next(new AppError('Invalid date format. Use YYYY-MM-DD', 400, ErrorCode.VALIDATION_ERROR));
    }

    const instances = await prisma.orderInstance.findMany({
      where: { currentDate: { gte: startOfDay(start), lte: endOfDay(end) } },
      include: { template: true },
      orderBy: { currentDate: 'asc' },
    });

    res.json(instances);
  } catch (err) {
    next(err);
  }
}

// GET /api/orders/lists  (all roles)
export async function getLists(req: Request, res: Response, next: NextFunction) {
  try {
    const lists = await prisma.orderList.findMany({
      where: { isActive: true },
      orderBy: { id: 'asc' },
    });
    res.json(lists);
  } catch (err) {
    next(err);
  }
}

// POST /api/orders/lists  (Manager only)
export async function createList(req: Request, res: Response, next: NextFunction) {
  try {
    const { name } = req.body as { name?: string };
    if (!name?.trim()) {
      return next(new AppError('name is required', 400, ErrorCode.VALIDATION_ERROR));
    }
    const list = await prisma.orderList.create({ data: { name: name.trim() } });
    res.status(201).json(list);
  } catch (err) {
    next(err);
  }
}

// POST /api/orders/templates  (Manager only)
export async function createTemplate(req: Request, res: Response, next: NextFunction) {
  try {
    const { title, dayOfWeek, category, listId } = req.body as {
      title?: string;
      dayOfWeek?: number | null;
      category?: string;
      listId?: number | null;
    };

    if (!title || !category) {
      return next(new AppError('title and category are required', 400, ErrorCode.VALIDATION_ERROR));
    }

    const validCategories = ['daily', 'floating'];
    if (!validCategories.includes(category)) {
      return next(new AppError(`category must be one of: ${validCategories.join(', ')}`, 400, ErrorCode.VALIDATION_ERROR));
    }

    if (dayOfWeek !== undefined && dayOfWeek !== null) {
      if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
        return next(new AppError('dayOfWeek must be an integer 0–6 or null', 400, ErrorCode.VALIDATION_ERROR));
      }
    }

    if (listId != null) {
      const list = await prisma.orderList.findUnique({ where: { id: listId } });
      if (!list) return next(new AppError('OrderList not found', 404, ErrorCode.NOT_FOUND));
    }

    const template = await prisma.orderTemplate.create({
      data: { title, dayOfWeek: dayOfWeek ?? null, category, listId: listId ?? null },
    });

    res.status(201).json(template);
  } catch (err) {
    next(err);
  }
}

// GET /api/orders/templates  (Manager only)
export async function getTemplates(req: Request, res: Response, next: NextFunction) {
  try {
    const templates = await prisma.orderTemplate.findMany({
      orderBy: [{ isActive: 'desc' }, { id: 'asc' }],
      include: { list: true },
    });
    res.json(templates);
  } catch (err) {
    next(err);
  }
}

// PATCH /api/orders/templates/:id/toggle  (Manager only)
export async function toggleTemplate(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return next(new AppError('Invalid template id', 400, ErrorCode.VALIDATION_ERROR));

    const template = await prisma.orderTemplate.findUnique({ where: { id } });
    if (!template) return next(new AppError('Order template not found', 404, ErrorCode.NOT_FOUND));

    const updated = await prisma.orderTemplate.update({
      where: { id },
      data: { isActive: !template.isActive },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// POST /api/orders/instances  (Manager only — one-off instance for this week)
export async function createInstance(req: Request, res: Response, next: NextFunction) {
  try {
    const { title, date, listId } = req.body as {
      title?: string;
      date?: string;
      listId?: number | null;
    };

    if (!title?.trim()) {
      return next(new AppError('title is required', 400, ErrorCode.VALIDATION_ERROR));
    }
    if (!date) {
      return next(new AppError('date is required', 400, ErrorCode.VALIDATION_ERROR));
    }

    const parsed = parseISO(date);
    if (!isValid(parsed)) {
      return next(new AppError('Invalid date format. Use YYYY-MM-DD', 400, ErrorCode.VALIDATION_ERROR));
    }

    if (listId != null) {
      const list = await prisma.orderList.findUnique({ where: { id: listId } });
      if (!list) return next(new AppError('OrderList not found', 404, ErrorCode.NOT_FOUND));
    }

    const dayStart = startOfDay(parsed);
    const instance = await prisma.orderInstance.create({
      data: {
        title: title.trim(),
        originalDate: dayStart,
        currentDate: dayStart,
        status: false,
        category: listId != null ? 'floating' : 'daily',
        isOverdue: false,
        listId: listId ?? null,
      },
    });

    res.status(201).json(instance);
  } catch (err) {
    next(err);
  }
}

// PATCH /api/orders/instances/:id/toggle  (all roles)
export async function toggleInstance(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return next(new AppError('Invalid instance id', 400, ErrorCode.VALIDATION_ERROR));

    const instance = await prisma.orderInstance.findUnique({ where: { id } });
    if (!instance) return next(new AppError('Order instance not found', 404, ErrorCode.NOT_FOUND));

    const updated = await prisma.orderInstance.update({
      where: { id },
      data: { status: !instance.status },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// POST /api/orders/sync  (Manager only)
export async function syncOrders(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await processDailyRollover(new Date());
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// Sort: overdue incomplete → incomplete → complete
function sortInstances(a: { status: boolean; isOverdue: boolean }, b: { status: boolean; isOverdue: boolean }) {
  if (a.status !== b.status) return a.status ? 1 : -1; // complete last
  if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1; // overdue first
  return 0;
}
