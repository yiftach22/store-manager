import { startOfDay, endOfDay, getDay } from 'date-fns';
import { prisma } from '../prisma/client';

export async function processDailyRollover(today: Date) {
  const todayStart = startOfDay(today);
  const isSunday = getDay(today) === 0;

  // Step 1 — find all unfinished overdue instances
  const overdue = await prisma.orderInstance.findMany({
    where: {
      status: false,
      currentDate: { lt: todayStart },
    },
    select: { id: true },
  });

  const overdueIds = overdue.map((i) => i.id);
  let deleted = 0;
  let updated = 0;

  if (overdueIds.length > 0) {
    if (isSunday) {
      // Weekend cleanup — delete all unfinished instances
      const result = await prisma.orderInstance.deleteMany({
        where: { id: { in: overdueIds } },
      });
      deleted = result.count;
    } else {
      // Roll forward to today and mark overdue
      const result = await prisma.orderInstance.updateMany({
        where: { id: { in: overdueIds } },
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
    // Avoid duplicates — skip if an instance already exists for today
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

  return { deleted, updated, created };
}
