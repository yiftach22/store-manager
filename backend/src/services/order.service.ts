import { startOfDay, endOfDay, getDay } from 'date-fns';
import { prisma } from '../prisma/client';

export async function processDailyRollover(today: Date) {
  const todayStart = startOfDay(today);
  const isSaturday = getDay(today) === 6;
  const isSunday = getDay(today) === 0;

  // Step 1 — roll forward unfinished overdue daily instances (skip on Saturday)
  // Floating list instances (listId != null) are never rolled over.
  let updated = 0;

  if (!isSaturday) {
    const overdue = await prisma.orderInstance.findMany({
      where: {
        status: false,
        currentDate: { lt: todayStart },
        listId: null, // floating instances are excluded from day rollover
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

  // Step 2 — generate new daily instances from templates matching today's day of week
  const todayDow = getDay(today);
  const todayEnd = endOfDay(today);
  let created = 0;

  const dailyTemplates = await prisma.orderTemplate.findMany({
    where: { isActive: true, dayOfWeek: todayDow, listId: null },
  });

  for (const template of dailyTemplates) {
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

  // Step 3 — on Sunday, generate floating list instances for the new week
  if (isSunday) {
    const lists = await prisma.orderList.findMany({
      where: { isActive: true },
      include: {
        templates: { where: { isActive: true, dayOfWeek: null } },
      },
    });

    for (const list of lists) {
      for (const template of list.templates) {
        const exists = await prisma.orderInstance.findFirst({
          where: { listId: list.id, templateId: template.id, originalDate: todayStart },
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
              listId: list.id,
            },
          });
          created++;
        }
      }
    }
  }

  return { updated, created };
}
