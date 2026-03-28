import { startOfDay, endOfDay, getDay } from 'date-fns';
import { prisma } from '../prisma/client';

export async function processDailyRollover(today: Date) {
  const todayStart = startOfDay(today);
  const isSunday = getDay(today) === 0;

  // Step 1 — roll forward unfinished overdue instances (skip on Sunday)
  let updated = 0;

  if (!isSunday) {
    const overdue = await prisma.orderInstance.findMany({
      where: {
        status: false,
        currentDate: { lt: todayStart },
      },
      select: { id: true },
    });

    if (overdue.length > 0) {
      const result = await prisma.orderInstance.updateMany({
        where: { id: { in: overdue.map((i) => i.id) } },
        data: { currentDate: todayStart, isOverdue: true },
      });
      updated = result.count;
    }
  }

  // Step 2 — generate new instances from templates matching today's day of week
  const todayDow = getDay(today); // 0=Sun … 6=Sat
  const todayEnd = endOfDay(today);

  const templates = await prisma.orderTemplate.findMany({
    where: { isActive: true, dayOfWeek: todayDow },
  });

  let created = 0;

  for (const template of templates) {
    const exists = await prisma.orderInstance.findFirst({
      where: {
        templateId: template.id,
        currentDate: { gte: todayStart, lte: todayEnd },
      },
    });

    if (!exists) {
      await prisma.orderInstance.create({
        data: {
          title: template.title,
          originalDate: todayStart,
          currentDate: todayStart,
          status: false,
          category: template.category,
          isOverdue: false,
          templateId: template.id,
        },
      });
      created++;
    }
  }

  return { updated, created };
}
