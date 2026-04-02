import './config/env';
import http from 'http';
import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';
import { createApp } from './app';
import { config } from './config/env';
import { prisma } from './prisma/client';

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
