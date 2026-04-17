import type { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { prisma } from '../prisma/client';
import { AppError, ErrorCode } from '../types/errors';

const MIN_PASSWORD_LENGTH = 6;
const PASSWORD_SALT_ROUNDS = 12;

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
    const { email, jobRoleId, role } = req.body as {
      email?: string;
      jobRoleId?: number | null;
      role?: string;
    };

    if (!email?.trim()) {
      return next(new AppError('email is required', 400, ErrorCode.VALIDATION_ERROR));
    }

    const normalised = email.trim().toLowerCase();

    // Validate role — default to WORKER for backward compatibility with older clients
    const validRoles = Object.values(Role) as string[];
    if (role !== undefined && !validRoles.includes(role)) {
      return next(new AppError(`role must be one of: ${validRoles.join(', ')}`, 400, ErrorCode.VALIDATION_ERROR));
    }
    const resolvedRole: Role = (role as Role | undefined) ?? Role.WORKER;

    // Only WORKER uses a job role — null it out defensively for MANAGER/ORDERS so a
    // stale dropdown value cannot slip through.
    const resolvedJobRoleId = resolvedRole === Role.WORKER ? (jobRoleId ?? null) : null;

    const existing = await prisma.allowedEmail.findUnique({ where: { email: normalised } });
    if (existing) {
      return next(new AppError('Email already in the allowed list', 409, ErrorCode.EMAIL_TAKEN));
    }

    const entry = await prisma.allowedEmail.create({
      data: { email: normalised, role: resolvedRole, jobRoleId: resolvedJobRoleId },
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
    const validRoles = Object.values(Role) as string[];
    if (!role || !validRoles.includes(role)) {
      return next(new AppError(`role must be one of: ${validRoles.join(', ')}`, 400, ErrorCode.VALIDATION_ERROR));
    }

    // Prevent a user from changing their own auth role at all — avoids both self-demotion
    // (locking yourself out of manager features) and any other escalation/footgun.
    if (req.user!.id === userId) {
      return next(new AppError('Cannot change your own auth role', 400, ErrorCode.VALIDATION_ERROR));
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return next(new AppError('User not found', 404, ErrorCode.NOT_FOUND));

    await prisma.user.update({ where: { id: userId }, data: { role: role as Role } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// PATCH /api/users/:id/password — manager-initiated password reset
export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) return next(new AppError('Invalid id', 400, ErrorCode.VALIDATION_ERROR));

    const { newPassword } = req.body as { newPassword?: string };
    if (typeof newPassword !== 'string' || newPassword.length < MIN_PASSWORD_LENGTH) {
      return next(new AppError(
        `newPassword must be at least ${MIN_PASSWORD_LENGTH} characters`,
        400,
        ErrorCode.VALIDATION_ERROR,
      ));
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return next(new AppError('User not found', 404, ErrorCode.NOT_FOUND));

    const passwordHash = await bcrypt.hash(newPassword, PASSWORD_SALT_ROUNDS);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

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
