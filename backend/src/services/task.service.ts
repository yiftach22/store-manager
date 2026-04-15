import { getDay, startOfDay, startOfWeek } from 'date-fns';
import { prisma } from '../prisma/client';

export async function generateTaskInstances(today: Date, forceWeekly = false) {
  const isSaturday = getDay(today) === 6;
  if (isSaturday) return { created: 0 };

  const isSunday = getDay(today) === 0;
  const todayStart = startOfDay(today);
  const weekSunday = startOfWeek(today, { weekStartsOn: 0 });
  let created = 0;

  const roles = await prisma.jobRole.findMany({ where: { isActive: true } });

  for (const role of roles) {
    const includeWeekly = isSunday || forceWeekly;
    const frequencies = includeWeekly ? ['daily', 'weekly'] : ['daily'];
    const templates = await prisma.taskTemplate.findMany({
      where: { roleId: role.id, isActive: true, frequency: { in: frequencies } },
    });

    for (const t of templates) {
      const instanceDate = t.frequency === 'weekly' ? weekSunday : todayStart;

      const exists = await prisma.taskInstance.findFirst({
        where: { templateId: t.id, date: instanceDate },
      });

      if (!exists) {
        await prisma.taskInstance.create({
          data: {
            title: t.title,
            frequency: t.frequency,
            status: false,
            date: instanceDate,
            roleId: role.id,
            templateId: t.id,
          },
        });
        created++;
      }
    }
  }

  return { created };
}
