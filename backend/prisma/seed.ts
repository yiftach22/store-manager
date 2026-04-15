import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Manager user
  const managerEmail = 'manager@test.com';
  const existing = await prisma.user.findUnique({ where: { email: managerEmail } });
  if (!existing) {
    const passwordHash = await bcrypt.hash('password123', 10);
    await prisma.user.create({
      data: { name: 'מנהל', email: managerEmail, passwordHash, role: Role.MANAGER },
    });
    console.log('Created manager user: manager@test.com / password123');
  } else {
    console.log('Manager user already exists — skipping');
  }

  // Task roles + templates
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
    const existingRole = await prisma.jobRole.findFirst({ where: { name: roleData.name } });
    if (existingRole) {
      console.log(`Role "${roleData.name}" already exists — skipping`);
      continue;
    }
    const role = await prisma.jobRole.create({ data: { name: roleData.name } });
    console.log(`Created role: ${role.name}`);
    for (const t of roleData.templates) {
      await prisma.taskTemplate.create({
        data: { title: t.title, frequency: t.frequency, roleId: role.id },
      });
      console.log(`  + ${t.title} (${t.frequency})`);
    }
  }

  console.log('Seed complete.');
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
