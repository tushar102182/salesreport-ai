import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { contains } from '../../lib/db';

export const invoiceInclude = {
  customer: { select: { id: true, name: true, email: true, phone: true, address: true } },
  items: { orderBy: { position: 'asc' } },
} satisfies Prisma.InvoiceInclude;

export type InvoiceWithRelations = Prisma.InvoiceGetPayload<{ include: typeof invoiceInclude }>;

export interface InvoiceListFilter {
  q?: string;
  status?: string;
  customerId?: string;
  from?: string;
  to?: string;
  sort?: string;
  skip: number;
  take: number;
}

/** Data access for invoices. Every method is scoped by organizationId (prevents IDOR). */
export const invoicesRepository = {
  async list(organizationId: string, f: InvoiceListFilter) {
    const where: Prisma.InvoiceWhereInput = {
      organizationId,
      ...(f.status ? { status: f.status } : {}),
      ...(f.customerId ? { customerId: f.customerId } : {}),
      ...(f.from || f.to
        ? {
            issueDate: {
              ...(f.from ? { gte: new Date(`${f.from}T00:00:00Z`) } : {}),
              ...(f.to ? { lte: new Date(`${f.to}T23:59:59Z`) } : {}),
            },
          }
        : {}),
      ...(f.q ? { OR: [{ number: contains(f.q) }, { customer: { name: contains(f.q) } }] } : {}),
    };
    const orderBy: Prisma.InvoiceOrderByWithRelationInput[] =
      f.sort === 'oldest'
        ? [{ issueDate: 'asc' }, { number: 'asc' }]
        : f.sort === 'amount'
          ? [{ total: 'desc' }]
          : [{ issueDate: 'desc' }, { number: 'desc' }];
    const [items, total] = await prisma.$transaction([
      prisma.invoice.findMany({
        where,
        orderBy,
        skip: f.skip,
        take: f.take,
        include: { customer: invoiceInclude.customer },
      }),
      prisma.invoice.count({ where }),
    ]);
    return { items, total };
  },

  findById: (organizationId: string, id: string) =>
    prisma.invoice.findFirst({ where: { id, organizationId }, include: invoiceInclude }),

  /** Flags sent invoices past their due date as overdue. */
  markOverdue: (organizationId: string) =>
    prisma.invoice.updateMany({
      where: { organizationId, status: 'sent', dueDate: { lt: new Date(new Date().toISOString().slice(0, 10)) } },
      data: { status: 'overdue' },
    }),

  totalsByStatus: (organizationId: string) =>
    prisma.invoice.groupBy({
      by: ['status', 'currency'],
      where: { organizationId },
      _count: { _all: true },
      _sum: { total: true },
    }),
};
