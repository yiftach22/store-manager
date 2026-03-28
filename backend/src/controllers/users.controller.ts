import type { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { prisma } from '../prisma/client';
import { AppError, ErrorCode } from '../types/errors';

// GET /api/users
export async function getUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    res.json(users);
  } catch (err) {
    next(err);
  }
}

// GET /api/users/allowed-emails
export async function getAllowedEmails(req: Request, res: Response, next: NextFunction) {
  try {
    const emails = await prisma.allowedEmail.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(emails);
  } catch (err) {
    next(err);
  }
}

// POST /api/users/allowed-emails
export async function addAllowedEmail(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, role } = req.body as { email?: string; role?: string };

    if (!email?.trim()) {
      return next(new AppError('email is required', 400, ErrorCode.VALIDATION_ERROR));
    }

    const normalised = email.trim().toLowerCase();
    const validRoles: Role[] = [Role.MANAGER, Role.WORKER];
    const assignedRole: Role = role && validRoles.includes(role as Role) ? (role as Role) : Role.WORKER;

    const existing = await prisma.allowedEmail.findUnique({ where: { email: normalised } });
    if (existing) {
      return next(new AppError('Email already in the allowed list', 409, ErrorCode.EMAIL_TAKEN));
    }

    const entry = await prisma.allowedEmail.create({ data: { email: normalised, role: assignedRole } });
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
