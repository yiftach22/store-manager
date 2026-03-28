import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { AppError, ErrorCode } from '../types/errors';
import { Role } from '@prisma/client';

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return next(new AppError('No token provided', 401, ErrorCode.UNAUTHORIZED));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as Express.Request['user'];
    req.user = decoded;
    next();
  } catch {
    next(new AppError('Invalid or expired token', 401, ErrorCode.INVALID_TOKEN));
  }
}

export function requireManager(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.role !== Role.MANAGER) {
    return next(new AppError('Manager access required', 403, ErrorCode.FORBIDDEN));
  }
  next();
}
