import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const rolesData = [
    {
      name: 'קופאי',
      templates: [
        { title: 'ספירת קופה בתחילת משמרת', frequency: 'daily' },
        { title: 'ספירת קופה בסוף משמרת', frequency: 'daily' },
        { title: 'הגשת דוח קופה שבועי', frequency: 'weekly' },
      ],
    },
    {
      name: 'מלצר',
      templates: [
        { title: 'הכנת שולחנות לפתיחה', frequency: 'daily' },
        { title: 'ניקוי תחנת עבודה בסוף משמרת', frequency: 'daily' },
        { title: 'בדיקת מלאי תפריט שבועי', frequency: 'weekly' },
      ],
    },
    {
      name: 'אחראי משמרת',
      templates: [
        { title: 'בדיקת נוכחות עובדים', frequency: 'daily' },
        { title: 'פתיחת הקופה הראשית', frequency: 'daily' },
        { title: 'ישיבת צוות שבועית', frequency: 'weekly' },
        { title: 'בדיקת ציוד ומלאי', frequency: 'weekly' },
      ],
    },
  ];

  for (const roleData of rolesData) {
    const existing = await prisma.jobRole.findFirst({ where: { name: roleData.name } });
    if (existing) {
      console.log(`Role "${roleData.name}" already exists — skipping`);
      continue;
    }

    const role = await prisma.jobRole.create({ data: { name: roleData.name } });
    console.log(`Created role: ${role.name} (id=${role.id})`);

    for (const t of roleData.templates) {
      await prisma.taskTemplate.create({
        data: { title: t.title, frequency: t.frequency, roleId: role.id },
      });
      console.log(`  + template: ${t.title} (${t.frequency})`);
    }
  }

  console.log('seedTasks done');
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
