import type { PrismaClient } from '@prisma/client';
import { computeInvoiceTotals, formatInvoiceNumber, INVOICE_STATUSES } from '@salesreport/shared';
import { hashPassword } from '../modules/auth/password';
import { DEMO_ADMIN, DEMO_STAFF } from './constants';
import { DEMO_CUSTOMERS, DEMO_PRODUCTS, generateSales, prng } from './generator';

/** Removes all application data (used by DEMO_MODE daily reset). */
export async function wipeAll(prisma: PrismaClient) {
  await prisma.$transaction([
    prisma.salesRecord.deleteMany(),
    prisma.datasetSummary.deleteMany(),
    prisma.dataset.deleteMany(),
    prisma.invoiceItem.deleteMany(),
    prisma.invoice.deleteMany(),
    prisma.product.deleteMany(),
    prisma.customer.deleteMany(),
    prisma.refreshToken.deleteMany(),
    prisma.user.deleteMany(),
    prisma.organization.deleteMany(),
  ]);
}

/** Seeds a complete demo organization. Idempotent: skips if the demo admin exists. */
export async function seedDemo(prisma: PrismaClient, opts: { log?: (m: string) => void } = {}) {
  const log = opts.log ?? (() => {});
  if (await prisma.user.findUnique({ where: { email: DEMO_ADMIN.email } })) {
    log('Demo data already present — skipping.');
    return false;
  }

  const org = await prisma.organization.create({
    data: {
      name: 'Dhaka Fresh Mart Ltd.',
      address: 'House 24, Road 7, Dhanmondi, Dhaka 1205, Bangladesh',
      phone: '+880 1700-000000',
      email: 'accounts@dhakafreshmart.example',
      website: 'www.dhakafreshmart.example',
      taxId: 'BIN 000123456-0101',
      currency: 'BDT',
      defaultLanguage: 'en',
      invoicePrefix: 'DFM-',
      defaultTaxRate: 5,
      invoiceFooter: 'Bank: Example Bank PLC · A/C 0123456789 · bKash Merchant: 01700-000000',
      invoiceNotes: 'Payment due within 15 days. Goods once sold are not returnable without receipt.',
    },
  });

  const [adminHash, staffHash] = await Promise.all([
    hashPassword(DEMO_ADMIN.password),
    hashPassword(DEMO_STAFF.password),
  ]);
  const admin = await prisma.user.create({
    data: {
      email: DEMO_ADMIN.email,
      name: DEMO_ADMIN.name,
      passwordHash: adminHash,
      role: 'admin',
      organizationId: org.id,
    },
  });
  await prisma.user.create({
    data: {
      email: DEMO_STAFF.email,
      name: DEMO_STAFF.name,
      passwordHash: staffHash,
      role: 'staff',
      organizationId: org.id,
    },
  });

  const products = await Promise.all(
    DEMO_PRODUCTS.map((p) =>
      prisma.product.create({
        data: {
          organizationId: org.id,
          name: p.name,
          sku: p.sku,
          unit: p.unit,
          unitPrice: p.price,
          description: p.nameBn,
        },
      }),
    ),
  );
  const customers = await Promise.all(
    DEMO_CUSTOMERS.map((c) => prisma.customer.create({ data: { organizationId: org.id, ...c } })),
  );
  log(`Created ${products.length} products and ${customers.length} customers.`);

  // 6 full calendar months of sales ending on the last day of the previous month
  const today = new Date();
  const salesEnd = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 0));
  const salesStart = new Date(Date.UTC(salesEnd.getUTCFullYear(), salesEnd.getUTCMonth() - 5, 1));
  const sales = generateSales(salesEnd, Math.round((salesEnd.getTime() - salesStart.getTime()) / 86_400_000) + 1, 2026);
  const minT = sales[0]!.date;
  const maxT = sales.at(-1)!.date;
  const dataset = await prisma.dataset.create({
    data: {
      organizationId: org.id,
      createdById: admin.id,
      name: 'Retail & wholesale sales — last 6 months',
      originalFilename: 'dhaka-fresh-mart-sales.csv',
      fileType: 'csv',
      rowCount: sales.length,
      columnMapping: JSON.stringify({
        date: 'Date',
        product: 'Product',
        quantity: 'Quantity',
        unitPrice: 'Unit Price',
        total: 'Total',
        customer: 'Customer',
      }),
      currency: 'BDT',
      periodStart: minT,
      periodEnd: maxT,
    },
  });
  for (let i = 0; i < sales.length; i += 1000) {
    await prisma.salesRecord.createMany({
      data: sales.slice(i, i + 1000).map((s) => ({
        datasetId: dataset.id,
        date: s.date,
        product: s.product.name,
        quantity: s.quantity,
        unitPrice: s.unitPrice,
        total: s.total,
        customer: s.customer.name,
      })),
    });
  }
  log(`Created dataset with ${sales.length} sales records.`);

  // Invoices across the last ~4 months with mixed statuses
  const rand = prng(7);
  const count = 28;
  for (let i = 0; i < count; i++) {
    const daysAgo = Math.floor(((count - i) / count) * 120);
    const issue = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - daysAgo));
    const due = new Date(issue.getTime() + 15 * 86_400_000);
    const customer = customers[Math.floor(rand() * customers.length)]!;
    const lineCount = 1 + Math.floor(rand() * 4);
    const items = Array.from({ length: lineCount }, (_, k) => {
      const p = products[Math.floor(rand() * products.length)]!;
      return {
        productId: p.id,
        description: p.name,
        quantity: 1 + Math.floor(rand() * 20),
        unitPrice: p.unitPrice,
        position: k,
      };
    });
    const discountType = rand() > 0.6 ? 'percent' : 'fixed';
    const discountValue =
      discountType === 'percent' ? [0, 5, 10][Math.floor(rand() * 3)]! : [0, 0, 100, 250][Math.floor(rand() * 4)]!;
    const totals = computeInvoiceTotals({ items, taxRate: 5, discountType, discountValue });
    const pastDue = due < today;
    const status =
      daysAgo > 30
        ? rand() > 0.2
          ? 'paid'
          : 'overdue'
        : pastDue
          ? 'overdue'
          : (INVOICE_STATUSES[Math.floor(rand() * 3)] ?? 'sent');
    await prisma.invoice.create({
      data: {
        organizationId: org.id,
        customerId: customer.id,
        createdById: admin.id,
        number: formatInvoiceNumber(org.invoicePrefix, i + 1),
        status,
        issueDate: issue,
        dueDate: due,
        currency: 'BDT',
        language: rand() > 0.5 ? 'bn' : 'en',
        taxRate: 5,
        discountType,
        discountValue,
        subtotal: totals.subtotal,
        discountTotal: totals.discountTotal,
        taxTotal: totals.taxTotal,
        total: totals.total,
        paidAt: status === 'paid' ? new Date(issue.getTime() + 7 * 86_400_000) : null,
        items: { create: items.map((it, k) => ({ ...it, lineTotal: totals.lineTotals[k] ?? 0 })) },
      },
    });
  }
  await prisma.organization.update({ where: { id: org.id }, data: { nextInvoiceNumber: count + 1 } });
  log(`Created ${count} invoices.`);
  log(`Demo login: ${DEMO_ADMIN.email} / ${DEMO_ADMIN.password} (staff: ${DEMO_STAFF.email} / ${DEMO_STAFF.password})`);
  return true;
}
