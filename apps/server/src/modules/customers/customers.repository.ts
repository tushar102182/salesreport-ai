import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { contains } from '../../lib/db';

/** Data access for customers. Every method is scoped by organizationId (prevents IDOR). */
export const customersRepository = {
  async list(organizationId: string, opts: { q?: string; skip: number; take: number; sort?: string }) {
    const where: Prisma.CustomerWhereInput = {
      organizationId,
      ...(opts.q ? { OR: [{ name: contains(opts.q) }, { email: contains(opts.q) }, { phone: contains(opts.q) }] } : {}),
    };
    const orderBy: Prisma.CustomerOrderByWithRelationInput =
      opts.sort === 'name' ? { name: 'asc' } : opts.sort === 'oldest' ? { createdAt: 'asc' } : { createdAt: 'desc' };
    const [items, total] = await prisma.$transaction([
      prisma.customer.findMany({
        where,
        orderBy,
        skip: opts.skip,
        take: opts.take,
        include: { _count: { select: { invoices: true } } },
      }),
      prisma.customer.count({ where }),
    ]);
    return { items, total };
  },
  findById: (organizationId: string, id: string) =>
    prisma.customer.findFirst({ where: { id, organizationId }, include: { _count: { select: { invoices: true } } } }),
  create: (organizationId: string, data: Omit<Prisma.CustomerUncheckedCreateInput, 'organizationId'>) =>
    prisma.customer.create({ data: { ...data, organizationId } }),
  async update(organizationId: string, id: string, data: Prisma.CustomerUpdateInput) {
    const { count } = await prisma.customer.updateMany({ where: { id, organizationId }, data });
    return count;
  },
  async remove(organizationId: string, id: string) {
    const { count } = await prisma.customer.deleteMany({ where: { id, organizationId } });
    return count;
  },
  countInvoices: (organizationId: string, customerId: string) =>
    prisma.invoice.count({ where: { organizationId, customerId } }),
};
