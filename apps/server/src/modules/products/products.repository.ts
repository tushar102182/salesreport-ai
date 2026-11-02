import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { contains } from '../../lib/db';

/** Data access for products. Every method is scoped by organizationId (prevents IDOR). */
export const productsRepository = {
  async list(organizationId: string, opts: { q?: string; skip: number; take: number; sort?: string }) {
    const where: Prisma.ProductWhereInput = {
      organizationId,
      ...(opts.q ? { OR: [{ name: contains(opts.q) }, { sku: contains(opts.q) }] } : {}),
    };
    const orderBy: Prisma.ProductOrderByWithRelationInput =
      opts.sort === 'name'
        ? { name: 'asc' }
        : opts.sort === 'amount'
          ? { unitPrice: 'desc' }
          : opts.sort === 'oldest'
            ? { createdAt: 'asc' }
            : { createdAt: 'desc' };
    const [items, total] = await prisma.$transaction([
      prisma.product.findMany({ where, orderBy, skip: opts.skip, take: opts.take }),
      prisma.product.count({ where }),
    ]);
    return { items, total };
  },
  findById: (organizationId: string, id: string) => prisma.product.findFirst({ where: { id, organizationId } }),
  findManyByIds: (organizationId: string, ids: string[]) =>
    prisma.product.findMany({ where: { organizationId, id: { in: ids } }, select: { id: true } }),
  create: (organizationId: string, data: Omit<Prisma.ProductUncheckedCreateInput, 'organizationId'>) =>
    prisma.product.create({ data: { ...data, organizationId } }),
  async update(organizationId: string, id: string, data: Prisma.ProductUpdateInput) {
    const { count } = await prisma.product.updateMany({ where: { id, organizationId }, data });
    return count;
  },
  async remove(organizationId: string, id: string) {
    const { count } = await prisma.product.deleteMany({ where: { id, organizationId } });
    return count;
  },
};
