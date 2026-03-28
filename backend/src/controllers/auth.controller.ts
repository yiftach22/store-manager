import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service';
import { prisma } from '../prisma/client';
import { AppError, ErrorCode } from '../types/errors';

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, email, password } = req.body;
    const result = await authService.register({ name, email, password });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;
    const result = await authService.login({ email, password });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// GET /auth/me — returns the current user from the DB (requires auth middleware upstream)
export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    if (!user) return next(new AppError('User not found', 404, ErrorCode.NOT_FOUND));
    res.json(user);
  } catch (err) {
    next(err);
  }
}
