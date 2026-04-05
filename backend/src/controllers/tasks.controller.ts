import type { Request, Response, NextFunction } from 'express';
import { Server } from 'socket.io';
import { parseISO, startOfDay, startOfWeek } from 'date-fns';
import { prisma } from '../prisma/client';
import { AppError, ErrorCode } from '../types/errors';

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
        const daily = await prisma.taskInstance.findMany({
          where: { roleId: role.id, frequency: 'daily', date: dayStart },
          orderBy: { id: 'asc' },
        });
        const weekly = await prisma.taskInstance.findMany({
          where: { roleId: role.id, frequency: 'weekly', date: weekSunday },
          orderBy: { id: 'asc' },
        });
        return { role: { id: role.id, name: role.name }, daily, weekly };
      })
    );

    res.json(result);
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

    const updated = await prisma.taskInstance.update({
      where: { id },
      data: { status: !instance.status },
    });

    const io = req.app.get('io') as Server;
    io.emit('task:toggled', { id: updated.id, status: updated.status });

    res.json(updated);
  } catch (err) {
    next(err);
  }
}
