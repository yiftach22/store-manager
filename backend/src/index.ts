import './config/env';
import { createApp } from './app';
import { config } from './config/env';
import { prisma } from './prisma/client';

async function main() {
  const app = createApp();

  app.listen(config.port, () => {
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
