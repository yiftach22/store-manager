import { startOfDay, endOfDay, getDay, addDays, startOfWeek } from 'date-fns';
import { prisma } from '../prisma/client';

export async function processDailyRollover(today: Date) {
  const isSaturday = getDay(today) === 6;
  if (isSaturday) return { updated: 0, created: 0 };

  const weekStart = startOfDay(startOfWeek(today, { weekStartsOn: 0 }));
  let created = 0;

  // Generate instances for ALL 6 days of the current week (Sun–Fri).
  // Missing instances for past days are added as undone — they are NOT flagged overdue
  // because createdAt > currentDate, which the API uses to suppress the red colour.
  for (let dayOffset = 0; dayOffset <= 5; dayOffset++) {
    const dayDate = startOfDay(addDays(weekStart, dayOffset));
    const dayEnd = endOfDay(dayDate);
    const dayDow = getDay(dayDate);

    const templates = await prisma.orderTemplate.findMany({
      where: { isActive: true, dayOfWeek: dayDow, listId: null },
    });

    for (const template of templates) {
      const exists = await prisma.orderInstance.findFirst({
        where: { templateId: template.id, currentDate: { gte: dayDate, lte: dayEnd } },
      });
      if (!exists) {
        await prisma.orderInstance.create({
          data: {
            title: template.title,
            originalDate: dayDate,
            currentDate: dayDate,
            status: false,
            category: template.category,
            isOverdue: false,
            templateId: template.id,
            // createdAt defaults to now() — if dayDate is in the past, the API will
            // detect createdAt > dayDate and NOT show this instance as overdue (red).
          },
        });
        created++;
      }
    }
  }

  // Generate floating list instances for this week if missing
  const lists = await prisma.orderList.findMany({
    where: { isActive: true },
    include: { templates: { where: { isActive: true, dayOfWeek: null } } },
  });

  for (const list of lists) {
    for (const template of list.templates) {
      const exists = await prisma.orderInstance.findFirst({
        where: { listId: list.id, templateId: template.id, originalDate: weekStart },
      });
      if (!exists) {
        await prisma.orderInstance.create({
          data: {
            title: template.title,
            originalDate: weekStart,
            currentDate: weekStart,
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

  return { updated: 0, created };
}
