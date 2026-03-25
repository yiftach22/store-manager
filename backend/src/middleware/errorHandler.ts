import { Request, Response, NextFunction } from 'express';
import { AppError, ErrorCode } from '../types/errors';
import { config } from '../config/env';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
    });
  }

  if (config.nodeEnv !== 'production') {
    console.error(err);
  }

  res.status(500).json({
    error: 'Internal server error',
    code: ErrorCode.INTERNAL_ERROR,
  });
}
