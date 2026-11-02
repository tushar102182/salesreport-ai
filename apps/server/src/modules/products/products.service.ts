import type { Product } from '@prisma/client';
import type { PaginationQuery, ProductDto } from '@salesreport/shared';
import { type productInputSchema } from '@salesreport/shared';
import type { z } from 'zod';
import { notFound } from '../../lib/errors';
import { paginate } from '../../lib/http';
import { productsRepository as repo } from './products.repository';

type ProductData = z.output<typeof productInputSchema>;

const toDto = (p: Product): ProductDto => ({
  id: p.id,
  name: p.name,
  sku: p.sku,
  description: p.description,
  unit: p.unit,
  unitPrice: p.unitPrice,
  active: p.active,
  createdAt: p.createdAt.toISOString(),
  updatedAt: p.updatedAt.toISOString(),
});

export async function list(orgId: string, q: PaginationQuery) {
  const { items, total } = await repo.list(orgId, {
    q: q.q,
    sort: q.sort,
    skip: (q.page - 1) * q.pageSize,
    take: q.pageSize,
  });
  return paginate(items.map(toDto), total, q.page, q.pageSize);
}

export async function get(orgId: string, id: string) {
  const p = await repo.findById(orgId, id);
  if (!p) throw notFound('Product');
  return toDto(p);
}

export const create = async (orgId: string, data: ProductData) => toDto(await repo.create(orgId, data));

export async function update(orgId: string, id: string, data: ProductData) {
  if ((await repo.update(orgId, id, data)) === 0) throw notFound('Product');
  return get(orgId, id);
}

export async function remove(orgId: string, id: string) {
  if ((await repo.remove(orgId, id)) === 0) throw notFound('Product');
}
