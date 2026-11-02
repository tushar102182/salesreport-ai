import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { contains } from '../../lib/db';
import type { NormalizedRecord } from './normalize';

/** Data access for datasets. Every method is scoped by organizationId (prevents IDOR). */
export const datasetsRepository = {
  async list(organizationId: string, opts: { q?: string; skip: number; take: number }) {
    const where: Prisma.DatasetWhereInput = { organizationId, ...(opts.q ? { name: contains(opts.q) } : {}) };
    const [items, total] = await prisma.$transaction([
      prisma.dataset.findMany({ where, orderBy: { createdAt: 'desc' }, skip: opts.skip, take: opts.take }),
      prisma.dataset.count({ where }),
    ]);
    return { items, total };
  },
  findById: (organizationId: string, id: string) => prisma.dataset.findFirst({ where: { id, organizationId } }),
  latest: (organizationId: string) =>
    prisma.dataset.findFirst({ where: { organizationId }, orderBy: { createdAt: 'desc' } }),
  records: (datasetId: string) =>
    prisma.salesRecord.findMany({
      where: { datasetId },
      orderBy: { date: 'asc' },
      select: { date: true, product: true, quantity: true, unitPrice: true, total: true, customer: true },
    }),
  revenueByDataset: (ids: string[]) =>
    prisma.salesRecord.groupBy({ by: ['datasetId'], where: { datasetId: { in: ids } }, _sum: { total: true } }),

  /** Creates the dataset and inserts records in chunks inside one transaction. */
  async createWithRecords(data: Omit<Prisma.DatasetUncheckedCreateInput, 'records'>, records: NormalizedRecord[]) {
    return prisma.$transaction(
      async (tx) => {
        const ds = await tx.dataset.create({ data });
        for (let i = 0; i < records.length; i += 1000) {
          await tx.salesRecord.createMany({
            data: records.slice(i, i + 1000).map((r) => ({ ...r, datasetId: ds.id })),
          });
        }
        return ds;
      },
      { timeout: 60_000 },
    );
  },
  async remove(organizationId: string, id: string) {
    const { count } = await prisma.dataset.deleteMany({ where: { id, organizationId } });
    return count;
  },
};
