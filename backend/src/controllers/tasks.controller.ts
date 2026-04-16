import type { Request, Response, NextFunction } from 'express';
import { Server } from 'socket.io';
import { parseISO, isValid, startOfDay, startOfWeek } from 'date-fns';
import { prisma } from '../prisma/client';
import { AppError, ErrorCode } from '../types/errors';
import { generateTaskInstances } from '../services/task.service';

const completedBySelect = { select: { name: true } } as const;

function flattenInstance(inst: {
  id: number; title: string; frequency: string; status: boolean;
  date: Date; roleId: number; templateId: number | null;
  completedAt: Date | null; completedById: number | null;
  completedBy: { name: string } | null;
}) {
  return {
    id: inst.id,
    title: inst.title,
    frequency: inst.frequency,
    status: inst.status,
    date: inst.date,
    roleId: inst.roleId,
    templateId: inst.templateId,
    completedAt: inst.completedAt ?? null,
    completedByName: inst.completedBy?.name ?? null,
  };
}

// GET /api/tasks/status?date=YYYY-MM-DD
export async function getTaskStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { date } = req.query as { date?: string };
    if (!date) {
      return next(new AppError('date query param required (YYYY-MM-DD)', 400, ErrorCode.VALIDATION_ERROR));
    }

    const parsed = parseISO(date);
    const dayStart = startOfDay(parsed);
    const weekSunday = startOfWeek(parsed, { weekStartsOn: 0 });

    const roles = await prisma.jobRole.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });

    const result = await Promise.all(
      roles.map(async (role) => {
        const [daily, weekly] = await Promise.all([
          prisma.taskInstance.findMany({
            where: { roleId: role.id, frequency: 'daily', date: dayStart },
            orderBy: { id: 'asc' },
            include: { completedBy: completedBySelect },
          }),
          prisma.taskInstance.findMany({
            where: { roleId: role.id, frequency: 'weekly', date: weekSunday },
            orderBy: { id: 'asc' },
            include: { completedBy: completedBySelect },
          }),
        ]);
        return {
          role: { id: role.id, name: role.name },
          daily: daily.map(flattenInstance),
          weekly: weekly.map(flattenInstance),
        };
      })
    );

    res.json(result);
  } catch (err) {
    next(err);
  }
}

// POST /api/tasks/sync — manually generate today's daily + this week's weekly instances
export async function syncTasks(req: Request, res: Response, next: NextFunction) {
  try {
    const { date } = req.query as { date?: string };
    const target = date ? parseISO(date) : new Date();
    if (!isValid(target)) return next(new AppError('Invalid date', 400, ErrorCode.VALIDATION_ERROR));
    const result = await generateTaskInstances(target, true);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// GET /api/tasks/my-tasks?date=YYYY-MM-DD
export async function getMyTasks(req: Request, res: Response, next: NextFunction) {
  try {
    const { date } = req.query as { date?: string };
    if (!date) {
      return next(new AppError('date query param required (YYYY-MM-DD)', 400, ErrorCode.VALIDATION_ERROR));
    }

    const userId = req.user!.id;
    const userRole = await prisma.userJobRole.findFirst({
      where: { userId },
      include: { role: true },
    });

    if (!userRole) {
      return res.json({ role: null, daily: [], weekly: [] });
    }

    const parsed = parseISO(date);
    const dayStart = startOfDay(parsed);
    const weekSunday = startOfWeek(parsed, { weekStartsOn: 0 });
    const roleId = userRole.roleId;

    const [daily, weekly] = await Promise.all([
      prisma.taskInstance.findMany({
        where: { roleId, frequency: 'daily', date: dayStart },
        orderBy: { id: 'asc' },
        include: { completedBy: completedBySelect },
      }),
      prisma.taskInstance.findMany({
        where: { roleId, frequency: 'weekly', date: weekSunday },
        orderBy: { id: 'asc' },
        include: { completedBy: completedBySelect },
      }),
    ]);

    res.json({
      role: { id: userRole.role.id, name: userRole.role.name },
      daily: daily.map(flattenInstance),
      weekly: weekly.map(flattenInstance),
    });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/tasks/instances/:id/toggle
export async function toggleInstance(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return next(new AppError('Invalid id', 400, ErrorCode.VALIDATION_ERROR));

    const instance = await prisma.taskInstance.findUnique({ where: { id } });
    if (!instance) return next(new AppError('Instance not found', 404, ErrorCode.NOT_FOUND));

    const completing = !instance.status;
    const updated = await prisma.taskInstance.update({
      where: { id },
      data: {
        status: completing,
        completedAt: completing ? new Date() : null,
        completedById: completing ? req.user!.id : null,
      },
      include: { completedBy: completedBySelect },
    });

    const io = req.app.get('io') as Server;
    io.emit('task:toggled', {
      id: updated.id,
      status: updated.status,
      completedAt: updated.completedAt ?? null,
      completedByName: updated.completedBy?.name ?? null,
    });

    res.json(flattenInstance(updated));
  } catch (err) {
    next(err);
  }
}
