import { PrismaClient } from '@prisma/client';
import { startOfWeek, addDays, startOfDay } from 'date-fns';

const prisma = new PrismaClient();

async function main() {
  const weekSunday = startOfDay(startOfWeek(new Date(), { weekStartsOn: 0 }));

  // Daily instances: one per template per matching day
  const dailyTemplates = await prisma.orderTemplate.findMany({
    where: { listId: null, isActive: true, dayOfWeek: { not: null } },
  });

  let created = 0;
  for (const template of dailyTemplates) {
    const dayOffset = template.dayOfWeek!; // 0=Sun … 5=Fri
    const dayStart = startOfDay(addDays(weekSunday, dayOffset));

    const exists = await prisma.orderInstance.findFirst({
      where: { templateId: template.id, currentDate: dayStart },
    });
    if (!exists) {
      await prisma.orderInstance.create({
        data: {
          title: template.title,
          originalDate: dayStart,
          currentDate: dayStart,
          status: false,
          category: template.category,
          isOverdue: false,
          templateId: template.id,
        },
      });
      created++;
    }
  }
  console.log(`Created ${created} daily instances for week of ${weekSunday.toISOString().slice(0, 10)}.`);

  // Floating instances: one set per active list, anchored to this week's Sunday
  const lists = await prisma.orderList.findMany({
    where: { isActive: true },
    include: { templates: { where: { isActive: true } } },
  });

  let floatingCreated = 0;
  for (const list of lists) {
    for (const template of list.templates) {
      const exists = await prisma.orderInstance.findFirst({
        where: { templateId: template.id, listId: list.id, originalDate: weekSunday },
      });
      if (!exists) {
        await prisma.orderInstance.create({
          data: {
            title: template.title,
            originalDate: weekSunday,
            currentDate: weekSunday,
            status: false,
            category: template.category,
            isOverdue: false,
            templateId: template.id,
            listId: list.id,
          },
        });
        floatingCreated++;
      }
    }
  }
  console.log(`Created ${floatingCreated} floating instances across ${lists.length} lists.`);
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
