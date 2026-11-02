import type { Customer } from '@prisma/client';
import type { CustomerDto, PaginationQuery } from '@salesreport/shared';
import { type customerInputSchema } from '@salesreport/shared';
import type { z } from 'zod';
import { conflict, notFound } from '../../lib/errors';
import { paginate } from '../../lib/http';
import { customersRepository as repo } from './customers.repository';

type CustomerData = z.output<typeof customerInputSchema>;

const toDto = (c: Customer & { _count?: { invoices: number } }): CustomerDto => ({
  id: c.id,
  name: c.name,
  email: c.email,
  phone: c.phone,
  address: c.address,
  notes: c.notes,
  invoiceCount: c._count?.invoices,
  createdAt: c.createdAt.toISOString(),
  updatedAt: c.updatedAt.toISOString(),
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
  const c = await repo.findById(orgId, id);
  if (!c) throw notFound('Customer');
  return toDto(c);
}

export const create = async (orgId: string, data: CustomerData) => toDto(await repo.create(orgId, data));

export async function update(orgId: string, id: string, data: CustomerData) {
  if ((await repo.update(orgId, id, data)) === 0) throw notFound('Customer');
  return get(orgId, id);
}

export async function remove(orgId: string, id: string) {
  if ((await repo.countInvoices(orgId, id)) > 0) {
    throw conflict('This customer has invoices. Delete or reassign them first.', 'IN_USE');
  }
  if ((await repo.remove(orgId, id)) === 0) throw notFound('Customer');
}
