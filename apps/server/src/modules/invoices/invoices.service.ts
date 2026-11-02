import type { Prisma } from '@prisma/client';
import {
  computeInvoiceTotals,
  formatInvoiceNumber,
  type InvoiceDto,
  type InvoiceInputParsed,
  type InvoiceListItemDto,
  type InvoiceListQuery,
  type InvoiceStatus,
} from '@salesreport/shared';
import { prisma } from '../../lib/prisma';
import { badRequest, notFound } from '../../lib/errors';
import { iso, isoDay, paginate } from '../../lib/http';
import { toCsv } from '../../lib/csv';
import { invoiceInclude, invoicesRepository as repo, type InvoiceWithRelations } from './invoices.repository';

type ListRow = Omit<InvoiceWithRelations, 'items'>;

const toListDto = (i: ListRow): InvoiceListItemDto => ({
  id: i.id,
  number: i.number,
  status: i.status as InvoiceStatus,
  issueDate: isoDay(i.issueDate)!,
  dueDate: isoDay(i.dueDate),
  currency: i.currency,
  language: i.language === 'bn' ? 'bn' : 'en',
  taxRate: i.taxRate,
  discountType: i.discountType === 'percent' ? 'percent' : 'fixed',
  discountValue: i.discountValue,
  subtotal: i.subtotal,
  discountTotal: i.discountTotal,
  taxTotal: i.taxTotal,
  total: i.total,
  notes: i.notes,
  paidAt: iso(i.paidAt),
  customer: i.customer,
  createdAt: i.createdAt.toISOString(),
  updatedAt: i.updatedAt.toISOString(),
});

export const toInvoiceDto = (i: InvoiceWithRelations): InvoiceDto => ({
  ...toListDto(i),
  items: i.items.map((it) => ({
    id: it.id,
    productId: it.productId,
    description: it.description,
    quantity: it.quantity,
    unitPrice: it.unitPrice,
    lineTotal: it.lineTotal,
  })),
});

export async function list(orgId: string, q: InvoiceListQuery) {
  await repo.markOverdue(orgId);
  const { items, total } = await repo.list(orgId, { ...q, skip: (q.page - 1) * q.pageSize, take: q.pageSize });
  return paginate(items.map(toListDto), total, q.page, q.pageSize);
}

export async function getEntity(orgId: string, id: string) {
  const inv = await repo.findById(orgId, id);
  if (!inv) throw notFound('Invoice');
  return inv;
}

export const get = async (orgId: string, id: string) => toInvoiceDto(await getEntity(orgId, id));

/** Validates that the referenced customer and products belong to the same organization (no IDOR). */
async function assertReferences(tx: Prisma.TransactionClient, orgId: string, input: InvoiceInputParsed) {
  const customer = await tx.customer.findFirst({
    where: { id: input.customerId, organizationId: orgId },
    select: { id: true },
  });
  if (!customer) throw badRequest('Customer not found', [{ path: 'customerId', message: 'invoice.customerNotFound' }]);
  const productIds = [...new Set(input.items.map((i) => i.productId).filter((x): x is string => Boolean(x)))];
  if (productIds.length) {
    const found = await tx.product.count({ where: { organizationId: orgId, id: { in: productIds } } });
    if (found !== productIds.length) throw badRequest('One or more products were not found');
  }
}

function buildData(input: InvoiceInputParsed) {
  const totals = computeInvoiceTotals(input);
  const items = input.items.map((it, idx) => ({
    productId: it.productId ?? null,
    description: it.description,
    quantity: it.quantity,
    unitPrice: it.unitPrice,
    lineTotal: totals.lineTotals[idx] ?? 0,
    position: idx,
  }));
  return {
    totals,
    items,
    scalar: {
      issueDate: new Date(`${input.issueDate}T00:00:00Z`),
      dueDate: input.dueDate ? new Date(`${input.dueDate}T00:00:00Z`) : null,
      status: input.status,
      language: input.language,
      taxRate: input.taxRate,
      discountType: input.discountType,
      discountValue: input.discountValue,
      notes: input.notes,
      subtotal: totals.subtotal,
      discountTotal: totals.discountTotal,
      taxTotal: totals.taxTotal,
      total: totals.total,
      paidAt: input.status === 'paid' ? new Date() : null,
    },
  };
}

export async function create(orgId: string, userId: string, input: InvoiceInputParsed) {
  const { scalar, items } = buildData(input);
  const created = await prisma.$transaction(async (tx) => {
    await assertReferences(tx, orgId, input);
    // Atomically reserve the next sequential number for this organization.
    const org = await tx.organization.update({
      where: { id: orgId },
      data: { nextInvoiceNumber: { increment: 1 } },
      select: { nextInvoiceNumber: true, invoicePrefix: true, currency: true },
    });
    return tx.invoice.create({
      data: {
        ...scalar,
        organizationId: orgId,
        customerId: input.customerId,
        createdById: userId,
        currency: input.currency ?? org.currency,
        number: formatInvoiceNumber(org.invoicePrefix, org.nextInvoiceNumber - 1),
        items: { create: items },
      },
      include: invoiceInclude,
    });
  });
  return toInvoiceDto(created);
}

export async function update(orgId: string, id: string, input: InvoiceInputParsed) {
  const existing = await getEntity(orgId, id);
  const { scalar, items } = buildData(input);
  const updated = await prisma.$transaction(async (tx) => {
    await assertReferences(tx, orgId, input);
    await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });
    return tx.invoice.update({
      where: { id },
      data: {
        ...scalar,
        paidAt: input.status === 'paid' ? (existing.paidAt ?? new Date()) : null,
        customerId: input.customerId,
        currency: input.currency ?? existing.currency,
        items: { create: items },
      },
      include: invoiceInclude,
    });
  });
  return toInvoiceDto(updated);
}

export async function setStatus(orgId: string, id: string, status: InvoiceStatus) {
  const existing = await getEntity(orgId, id);
  const updated = await prisma.invoice.update({
    where: { id },
    data: { status, paidAt: status === 'paid' ? (existing.paidAt ?? new Date()) : null },
    include: invoiceInclude,
  });
  return toInvoiceDto(updated);
}

export async function remove(orgId: string, id: string) {
  const { count } = await prisma.invoice.deleteMany({ where: { id, organizationId: orgId } });
  if (count === 0) throw notFound('Invoice');
}

/** CSV export of all invoices matching the filter (formula-injection safe). */
export async function exportCsv(orgId: string, q: InvoiceListQuery) {
  const { items } = await repo.list(orgId, { ...q, skip: 0, take: 10_000 });
  return toCsv(
    ['Number', 'Status', 'Issue date', 'Due date', 'Customer', 'Currency', 'Subtotal', 'Discount', 'Tax', 'Total'],
    items.map((i) => [
      i.number,
      i.status,
      isoDay(i.issueDate),
      isoDay(i.dueDate),
      i.customer.name,
      i.currency,
      i.subtotal,
      i.discountTotal,
      i.taxTotal,
      i.total,
    ]),
  );
}
