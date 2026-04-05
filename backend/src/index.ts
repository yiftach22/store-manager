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
    cors: { origin: config.frontendUrl, credentials: true },
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

  // Daily rollover at 00:01 every day (Sun–Sat; service skips Saturday internally)
  cron.schedule('1 0 * * *', async () => {
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
  });

  server.listen(config.port, () => {
    console.log(`Server running on port ${config.port} [${config.nodeEnv}]`);
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
