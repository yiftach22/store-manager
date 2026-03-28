import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Worker categories
  const categories = [
    { name: 'Orders & Warehouse', description: 'Handles incoming orders and warehouse inventory' },
    { name: 'Cashier', description: 'Operates cash registers and handles customer payments' },
    { name: 'Cleaning', description: 'Responsible for store cleanliness and maintenance' },
  ];

  for (const cat of categories) {
    await prisma.workerCategory.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
  }
  console.log('Seeded 3 default worker categories.');

  // Daily order templates (Sun=0 … Fri=5)
  // dayOfWeek: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri
  const dailyTemplates: { title: string; dayOfWeek: number; category: string }[] = [
    // Sunday (0)
    { title: 'לבדוק מלאי ירקות ופירות', dayOfWeek: 0, category: 'Orders & Warehouse' },
    { title: 'הזמנת לחם ומוצרי מאפה', dayOfWeek: 0, category: 'Orders & Warehouse' },
    { title: 'ניקוי מדפי קופה', dayOfWeek: 0, category: 'Cleaning' },
    { title: 'בדיקת תאריכי תפוגה – מוצרי חלב', dayOfWeek: 0, category: 'Orders & Warehouse' },
    { title: 'ספירת קופות ופתיחת יום', dayOfWeek: 0, category: 'Cashier' },
    { title: 'מילוי תחנת שקיות בקופות', dayOfWeek: 0, category: 'Cashier' },

    // Monday (1)
    { title: 'הזמנת מוצרי ניקוי', dayOfWeek: 1, category: 'Cleaning' },
    { title: 'בדיקת מלאי שימורים', dayOfWeek: 1, category: 'Orders & Warehouse' },
    { title: 'ניקוי מקררי יוגורטים', dayOfWeek: 1, category: 'Cleaning' },
    { title: 'עדכון תצוגת מבצעים', dayOfWeek: 1, category: 'Cashier' },
    { title: 'פריקת משלוח מוצרי בקר', dayOfWeek: 1, category: 'Orders & Warehouse' },
    { title: 'מילוי מדפי חטיפים', dayOfWeek: 1, category: 'Orders & Warehouse' },
    { title: 'ניקוי רצפת מחלקת ירקות', dayOfWeek: 1, category: 'Cleaning' },

    // Tuesday (2)
    { title: 'הזמנת עוף ובשר לסוף שבוע', dayOfWeek: 2, category: 'Orders & Warehouse' },
    { title: 'בדיקת תאריכי תפוגה – לחם', dayOfWeek: 2, category: 'Orders & Warehouse' },
    { title: 'ניקוי פינת הכניסה', dayOfWeek: 2, category: 'Cleaning' },
    { title: 'מילוי קופסאות קנייה', dayOfWeek: 2, category: 'Cashier' },
    { title: 'ספירת מלאי שתייה קרה', dayOfWeek: 2, category: 'Orders & Warehouse' },

    // Wednesday (3)
    { title: 'קבלת והכנסת משלוח יבש', dayOfWeek: 3, category: 'Orders & Warehouse' },
    { title: 'ניקוי מחסן', dayOfWeek: 3, category: 'Cleaning' },
    { title: 'בדיקת מכשירי קופה', dayOfWeek: 3, category: 'Cashier' },
    { title: 'מילוי מדפי מוצרי ניקוי', dayOfWeek: 3, category: 'Orders & Warehouse' },
    { title: 'הוצאת מוצרים פגי תוקף לאישור מנהל', dayOfWeek: 3, category: 'Orders & Warehouse' },
    { title: 'ניקוי מדפי עגלות קנייה', dayOfWeek: 3, category: 'Cleaning' },

    // Thursday (4)
    { title: 'הזמנת פירות וירקות לשבוע הבא', dayOfWeek: 4, category: 'Orders & Warehouse' },
    { title: 'ניקוי עמוק – מדפי מוצרי חלב', dayOfWeek: 4, category: 'Cleaning' },
    { title: 'ספירת מלאי בשר ועוף', dayOfWeek: 4, category: 'Orders & Warehouse' },
    { title: 'עדכון שלטי מחיר', dayOfWeek: 4, category: 'Cashier' },
    { title: 'בדיקת קופות ערב', dayOfWeek: 4, category: 'Cashier' },
    { title: 'מילוי מדפי שתייה קרה', dayOfWeek: 4, category: 'Orders & Warehouse' },

    // Friday (5)
    { title: 'הכנת חנות לסוף שבוע', dayOfWeek: 5, category: 'Orders & Warehouse' },
    { title: 'ניקוי כללי לפני סגירה', dayOfWeek: 5, category: 'Cleaning' },
    { title: 'ספירת קופות וסגירת יום', dayOfWeek: 5, category: 'Cashier' },
    { title: 'בדיקת מנעולים ואבטחה', dayOfWeek: 5, category: 'Orders & Warehouse' },
    { title: 'הוצאת אשפה', dayOfWeek: 5, category: 'Cleaning' },
    { title: 'מילוי מדפים לאחר הרצה', dayOfWeek: 5, category: 'Orders & Warehouse' },
    { title: 'עדכון הזמנות לשבוע הבא', dayOfWeek: 5, category: 'Orders & Warehouse' },
  ];

  for (const t of dailyTemplates) {
    await prisma.orderTemplate.upsert({
      where: { id: (await prisma.orderTemplate.findFirst({ where: { title: t.title, dayOfWeek: t.dayOfWeek } }))?.id ?? 0 },
      update: {},
      create: { title: t.title, dayOfWeek: t.dayOfWeek, category: t.category, isActive: true },
    });
  }
  console.log(`Seeded ${dailyTemplates.length} daily order templates.`);

  // Floating lists
  const morningList = await prisma.orderList.upsert({
    where: { id: (await prisma.orderList.findFirst({ where: { name: 'משמרת בוקר' } }))?.id ?? 0 },
    update: {},
    create: { name: 'משמרת בוקר', isActive: true },
  });

  const eveningList = await prisma.orderList.upsert({
    where: { id: (await prisma.orderList.findFirst({ where: { name: 'משמרת ערב' } }))?.id ?? 0 },
    update: {},
    create: { name: 'משמרת ערב', isActive: true },
  });

  const floatingTemplates: { title: string; listId: number; category: string }[] = [
    // Morning shift
    { title: 'הדלקת תאורה ומערכות', listId: morningList.id, category: 'Orders & Warehouse' },
    { title: 'הכנת עמדות קופה לפתיחה', listId: morningList.id, category: 'Cashier' },
    { title: 'ניקוי שטחי לקוחות', listId: morningList.id, category: 'Cleaning' },
    { title: 'בדיקת טמפרטורות מקררים', listId: morningList.id, category: 'Orders & Warehouse' },
    { title: 'מילוי מדפים בהתאם לרשימת חוסרים', listId: morningList.id, category: 'Orders & Warehouse' },
    { title: 'פתיחת שערי חנות', listId: morningList.id, category: 'Orders & Warehouse' },

    // Evening shift
    { title: 'ספירת ותיאום קופות', listId: eveningList.id, category: 'Cashier' },
    { title: 'ניקוי עמדות קופה', listId: eveningList.id, category: 'Cleaning' },
    { title: 'הוצאת מוצרים קרובים לפג תוקף להנחה', listId: eveningList.id, category: 'Orders & Warehouse' },
    { title: 'ניקוי מחלקת ירקות ופירות', listId: eveningList.id, category: 'Cleaning' },
    { title: 'סגירת מקררים ובדיקת נעילות', listId: eveningList.id, category: 'Orders & Warehouse' },
    { title: 'דיווח חוסרים למחר', listId: eveningList.id, category: 'Orders & Warehouse' },
    { title: 'כיבוי מערכות וסגירת חנות', listId: eveningList.id, category: 'Orders & Warehouse' },
  ];

  for (const t of floatingTemplates) {
    const exists = await prisma.orderTemplate.findFirst({
      where: { title: t.title, listId: t.listId },
    });
    if (!exists) {
      await prisma.orderTemplate.create({
        data: { title: t.title, dayOfWeek: null, category: t.category, listId: t.listId, isActive: true },
      });
    }
  }
  console.log(`Seeded ${floatingTemplates.length} floating list templates.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
