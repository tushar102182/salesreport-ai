/* Production seed entry (bundled to dist/seed.js): node dist/seed.js */
import { prisma } from '../lib/prisma';
import { seedDemo } from '../demo/seed';

seedDemo(prisma, { log: (m) => console.log(`🌱 ${m}`) })
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
