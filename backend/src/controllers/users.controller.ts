import type { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { prisma } from '../prisma/client';
import { AppError, ErrorCode } from '../types/errors';

// GET /api/users
export async function getUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        jobRoles: { select: { role: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: 'asc' },
    });
    // Flatten: each user has at most one job role
    const result = users.map((u) => ({
      ...u,
      jobRole: u.jobRoles[0]?.role ?? null,
      jobRoles: undefined,
    }));
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// GET /api/users/allowed-emails
export async function getAllowedEmails(req: Request, res: Response, next: NextFunction) {
  try {
    const emails = await prisma.allowedEmail.findMany({
      orderBy: { createdAt: 'desc' },
      include: { jobRole: { select: { id: true, name: true } } },
    });
    res.json(emails);
  } catch (err) {
    next(err);
  }
}

// POST /api/users/allowed-emails
export async function addAllowedEmail(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, jobRoleId } = req.body as { email?: string; jobRoleId?: number | null };

    if (!email?.trim()) {
      return next(new AppError('email is required', 400, ErrorCode.VALIDATION_ERROR));
    }

    const normalised = email.trim().toLowerCase();

    const existing = await prisma.allowedEmail.findUnique({ where: { email: normalised } });
    if (existing) {
      return next(new AppError('Email already in the allowed list', 409, ErrorCode.EMAIL_TAKEN));
    }

    const entry = await prisma.allowedEmail.create({
      data: { email: normalised, role: Role.WORKER, jobRoleId: jobRoleId ?? null },
      include: { jobRole: { select: { id: true, name: true } } },
    });
    res.status(201).json(entry);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/users/allowed-emails/:id
export async function removeAllowedEmail(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return next(new AppError('Invalid id', 400, ErrorCode.VALIDATION_ERROR));

    const entry = await prisma.allowedEmail.findUnique({ where: { id } });
    if (!entry) return next(new AppError('Allowed email not found', 404, ErrorCode.NOT_FOUND));

    await prisma.allowedEmail.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// PATCH /api/users/:id/auth-role
export async function setAuthRole(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) return next(new AppError('Invalid id', 400, ErrorCode.VALIDATION_ERROR));

    const { role } = req.body as { role?: string };
    if (role !== Role.MANAGER && role !== Role.WORKER) {
      return next(new AppError('role must be MANAGER or WORKER', 400, ErrorCode.VALIDATION_ERROR));
    }

    // Prevent manager from removing their own manager access
    if (req.user!.id === userId && role === Role.WORKER) {
      return next(new AppError('Cannot remove your own manager access', 400, ErrorCode.VALIDATION_ERROR));
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return next(new AppError('User not found', 404, ErrorCode.NOT_FOUND));

    await prisma.user.update({ where: { id: userId }, data: { role: role as Role } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// PATCH /api/users/:id/role
export async function assignRole(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) return next(new AppError('Invalid id', 400, ErrorCode.VALIDATION_ERROR));

    const { roleId } = req.body as { roleId?: number | null };

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return next(new AppError('User not found', 404, ErrorCode.NOT_FOUND));

    // Remove any existing role assignment
    await prisma.userJobRole.deleteMany({ where: { userId } });

    if (roleId != null) {
      const role = await prisma.jobRole.findUnique({ where: { id: roleId } });
      if (!role) return next(new AppError('Role not found', 404, ErrorCode.NOT_FOUND));
      await prisma.userJobRole.create({ data: { userId, roleId } });
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
