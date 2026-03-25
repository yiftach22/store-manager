import express from 'express';
import cors from 'cors';
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';
import { router as authRouter } from './routes/auth';
import { router as apiRouter } from './routes/index';

export function createApp() {
  const app = express();

  app.use(express.json());
  app.use(cors());

  // Public routes — no auth required
  app.use('/auth', authRouter);

  // Auth middleware — protects everything below
  app.use(authMiddleware);

  // Protected routes
  app.use('/api', apiRouter);

  // Global error handler — must be last
  app.use(errorHandler);

  return app;
}
