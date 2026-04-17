/**
 * One-time cleanup: reset currentDate = originalDate for all OrderInstances
 * and clear the isOverdue flag. Fixes rolled-forward instances from the old mechanism.
 * Run with: set -a && source .env && set +a && ./node_modules/.bin/ts-node --transpile-only prisma/resetInstanceDates.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.$executeRaw`
    UPDATE "OrderInstance"
    SET "currentDate" = "originalDate",
        "isOverdue"   = false
  `;
  console.log(`Reset ${result} instance(s): currentDate = originalDate, isOverdue = false`);
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
