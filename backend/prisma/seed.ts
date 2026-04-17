import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function upsertList(name: string) {
  const existing = await prisma.orderList.findFirst({ where: { name } });
  if (existing) return existing;
  return prisma.orderList.create({ data: { name, isActive: true } });
}

async function upsertTemplate(data: {
  title: string;
  dayOfWeek?: number | null;
  category: string;
  listId?: number | null;
}) {
  const existing = await prisma.orderTemplate.findFirst({
    where: { title: data.title, dayOfWeek: data.dayOfWeek ?? null, listId: data.listId ?? null },
  });
  if (existing) return existing;
  return prisma.orderTemplate.create({
    data: { title: data.title, dayOfWeek: data.dayOfWeek ?? null, category: data.category, listId: data.listId ?? null, isActive: true },
  });
}

async function main() {
  // ── Manager user ──────────────────────────────────────────────────────────
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

  // ── Task roles + templates ────────────────────────────────────────────────
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

  // ── Daily order templates (Sun–Fri) — supplier names ─────────────────────
  const dailyTemplates: { title: string; dayOfWeek: number }[] = [
    // Sunday (0)
    { title: 'תנובה', dayOfWeek: 0 },
    { title: 'אסם', dayOfWeek: 0 },
    { title: 'מאפיית ארץ', dayOfWeek: 0 },
    { title: 'יקבי כרמל', dayOfWeek: 0 },
    // Monday (1)
    { title: 'שטראוס', dayOfWeek: 1 },
    { title: 'עלית', dayOfWeek: 1 },
    { title: 'ירדן ירקות', dayOfWeek: 1 },
    // Tuesday (2)
    { title: 'טמפו', dayOfWeek: 2 },
    { title: 'נסטלה', dayOfWeek: 2 },
    { title: 'כפר טרי', dayOfWeek: 2 },
    { title: 'בשר הגליל', dayOfWeek: 2 },
    // Wednesday (3)
    { title: 'אוסם', dayOfWeek: 3 },
    { title: 'ויליפוד', dayOfWeek: 3 },
    { title: 'מחלבות גד', dayOfWeek: 3 },
    // Thursday (4)
    { title: 'תנובה', dayOfWeek: 4 },
    { title: 'שטראוס', dayOfWeek: 4 },
    { title: 'מאפיית ארץ', dayOfWeek: 4 },
    { title: 'ירדן ירקות', dayOfWeek: 4 },
    // Friday (5)
    { title: 'אסם', dayOfWeek: 5 },
    { title: 'טמפו', dayOfWeek: 5 },
    { title: 'כפר טרי', dayOfWeek: 5 },
  ];

  let dailyCount = 0;
  for (const t of dailyTemplates) {
    await upsertTemplate({ title: t.title, dayOfWeek: t.dayOfWeek, category: 'daily' });
    dailyCount++;
  }
  console.log(`Seeded ${dailyCount} daily order templates.`);

  // ── Supplier lists (floating) ─────────────────────────────────────────────
  const suppliers: { name: string; items: string[] }[] = [
    {
      name: 'משמרת בוקר',
      items: [
        'תנובה',
        'שטראוס',
        'מאפיית ארץ',
        'ירדן ירקות',
        'אסם',
      ],
    },
    {
      name: 'משמרת ערב',
      items: [
        'כפר טרי',
        'בשר הגליל',
        'טמפו',
        'מחלבות גד',
        'עלית',
        'ויליפוד',
      ],
    },
  ];

  let supplierCount = 0;
  let itemCount = 0;
  for (const supplier of suppliers) {
    const list = await upsertList(supplier.name);
    console.log(`Supplier list: ${list.name}`);
    for (const item of supplier.items) {
      await upsertTemplate({ title: item, dayOfWeek: null, category: 'floating', listId: list.id });
      itemCount++;
    }
    supplierCount++;
  }
  console.log(`Seeded ${supplierCount} supplier lists with ${itemCount} items.`);

  console.log('Seed complete.');
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
