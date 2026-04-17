import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config/env';
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';
import { router as authRouter } from './routes/auth';
import { router as apiRouter } from './routes/index';

// Throttle anonymous login/register traffic: 10 attempts per IP per 15 min.
// Skipped in tests (jest hammers endpoints rapidly with supertest).
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: { error: 'Too many attempts, please try again later', code: 'RATE_LIMITED' },
});

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(express.json());
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // allow non-browser requests
      const allowed = [
        config.frontendUrl,
        /\.vercel\.app$/,
      ];
      const ok = allowed.some(p => typeof p === 'string' ? p === origin : p.test(origin));
      callback(ok ? null : new Error('CORS'), ok);
    },
    credentials: true,
  }));

  // Public routes — no auth required. Rate-limited to blunt brute-force.
  app.use('/auth', authLimiter, authRouter);

  // Auth middleware — protects everything below
  app.use(authMiddleware);

  // Protected routes
  app.use('/api', apiRouter);

  // Global error handler — must be last
  app.use(errorHandler);

  return app;
}
