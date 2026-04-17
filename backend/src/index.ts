// MUST run before any other imports — locks the process to Israel local time so
// all downstream date-fns calls (startOfDay, startOfWeek, getDay, cron schedule)
// interpret dates in Asia/Jerusalem instead of UTC/server local.
process.env.TZ = process.env.TZ ?? 'Asia/Jerusalem';

import './config/env';
import http from 'http';
import jwt from 'jsonwebtoken';
import cron from 'node-cron';
import { Server } from 'socket.io';
import { createApp } from './app';
import { config } from './config/env';
import { prisma } from './prisma/client';
import { processDailyRollover } from './services/order.service';
import { generateTaskInstances } from './services/task.service';

async function main() {
  const app = createApp();
  const server = http.createServer(app);

  const io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const allowed = [config.frontendUrl, /\.vercel\.app$/];
        const ok = allowed.some(p => typeof p === 'string' ? p === origin : p.test(origin));
        callback(ok ? null : new Error('CORS'), ok);
      },
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token as string | undefined;
    if (!token) return next(new Error('Authentication required'));
    try {
      jwt.verify(token, config.jwtSecret);
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', () => {});

  app.set('io', io);

  // Daily rollover at 00:01 Asia/Jerusalem every day (Sun–Sat; service skips Saturday internally)
  cron.schedule(
    '1 0 * * *',
    async () => {
      const now = new Date();
      console.log('[cron] Running daily rollover...');
      try {
        const result = await processDailyRollover(now);
        console.log(`[cron] Rollover complete — updated: ${result.updated}, created: ${result.created}`);
      } catch (err) {
        console.error('[cron] Rollover failed:', err);
      }
      console.log('[cron] Generating task instances...');
      try {
        const result = await generateTaskInstances(now);
        console.log(`[cron] Task generation complete — created: ${result.created}`);
      } catch (err) {
        console.error('[cron] Task generation failed:', err);
      }
    },
    { timezone: 'Asia/Jerusalem' }
  );

  server.listen(config.port, () => {
    console.log(`Server running on port ${config.port} [${config.nodeEnv}] tz=${process.env.TZ}`);
  });

  process.on('SIGTERM', async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('Fatal error during startup:', err);
  process.exit(1);
});
