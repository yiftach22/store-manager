import { Request, Response, NextFunction } from 'express';
import { parseISO, isValid, startOfDay, endOfDay } from 'date-fns';
import { prisma } from '../prisma/client';
import { processDailyRollover } from '../services/order.service';
import { AppError, ErrorCode } from '../types/errors';

// GET /api/orders?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
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
      where: {
        currentDate: {
          gte: startOfDay(start),
          lte: endOfDay(end),
        },
      },
      include: { template: true },
      orderBy: { currentDate: 'asc' },
    });

    res.json(instances);
  } catch (err) {
    next(err);
  }
}

// POST /api/orders/templates  (Manager only)
export async function createTemplate(req: Request, res: Response, next: NextFunction) {
  try {
    const { title, dayOfWeek, category } = req.body as {
      title?: string;
      dayOfWeek?: number | null;
      category?: string;
    };

    if (!title || !category) {
      return next(new AppError('title and category are required', 400, ErrorCode.VALIDATION_ERROR));
    }

    const validCategories = ['daily', 'floating_a', 'floating_b'];
    if (!validCategories.includes(category)) {
      return next(new AppError(`category must be one of: ${validCategories.join(', ')}`, 400, ErrorCode.VALIDATION_ERROR));
    }

    if (dayOfWeek !== undefined && dayOfWeek !== null) {
      if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
        return next(new AppError('dayOfWeek must be an integer 0–6 or null', 400, ErrorCode.VALIDATION_ERROR));
      }
    }

    const template = await prisma.orderTemplate.create({
      data: {
        title,
        dayOfWeek: dayOfWeek ?? null,
        category,
      },
    });

    res.status(201).json(template);
  } catch (err) {
    next(err);
  }
}

// PATCH /api/orders/instances/:id/toggle
export async function toggleInstance(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return next(new AppError('Invalid instance id', 400, ErrorCode.VALIDATION_ERROR));
    }

    const instance = await prisma.orderInstance.findUnique({ where: { id } });
    if (!instance) {
      return next(new AppError('Order instance not found', 404, ErrorCode.NOT_FOUND));
    }

    const updated = await prisma.orderInstance.update({
      where: { id },
      data: { status: !instance.status },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// POST /api/orders/sync
export async function syncOrders(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await processDailyRollover(new Date());
    res.json(result);
  } catch (err) {
    next(err);
  }
}
