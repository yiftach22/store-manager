import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
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
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
