/* Seeds the demo organization, users, products, customers, invoices and a 6-month dataset. */
import path from 'node:path';
import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { seedDemo } from '../src/demo/seed';

config({ path: [path.resolve('.env'), path.resolve('../../.env')], quiet: true });

const prisma = new PrismaClient();

seedDemo(prisma, { log: (m) => console.log(`🌱 ${m}`) })
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
