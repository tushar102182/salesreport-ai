import { Router } from 'express';
import { INVOICE_STATUSES, type DashboardDto, type InvoiceStatus } from '@salesreport/shared';
import { requireAuth } from '../../middleware/auth';
import { getAuth } from '../../lib/http';
import { prisma } from '../../lib/prisma';
import { invoicesRepository } from '../invoices/invoices.repository';
import { list as listInvoices } from '../invoices/invoices.service';
import { datasetsRepository } from '../datasets/datasets.repository';
import { analyticsFor, toDatasetDto } from '../datasets/datasets.service';
import { idSchema } from '@salesreport/shared';
import { validate } from '../../lib/validate';
import { z } from 'zod';

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth);

/** Overview for the home dashboard: counts, invoice totals by status, and analytics of the chosen (or latest) dataset. */
dashboardRouter.get('/', async (req, res) => {
  const orgId = getAuth(req).organizationId;
  const { datasetId } = validate(z.object({ datasetId: idSchema.optional() }), req.query);
  await invoicesRepository.markOverdue(orgId);

  const [org, customers, products, invoices, datasets, grouped, recent] = await Promise.all([
    prisma.organization.findUniqueOrThrow({ where: { id: orgId }, select: { currency: true } }),
    prisma.customer.count({ where: { organizationId: orgId } }),
    prisma.product.count({ where: { organizationId: orgId } }),
    prisma.invoice.count({ where: { organizationId: orgId } }),
    prisma.dataset.count({ where: { organizationId: orgId } }),
    invoicesRepository.totalsByStatus(orgId),
    listInvoices(orgId, { page: 1, pageSize: 5 }),
  ]);

  const invoiceTotals = Object.fromEntries(
    INVOICE_STATUSES.map((s) => [s, { count: 0, amount: 0 }]),
  ) as DashboardDto['invoiceTotals'];
  for (const g of grouped) {
    if ((INVOICE_STATUSES as readonly string[]).includes(g.status)) {
      invoiceTotals[g.status as InvoiceStatus] = {
        count: g._count._all,
        amount: Math.round((g._sum.total ?? 0) * 100) / 100,
      };
    }
  }

  const ds = datasetId ? await datasetsRepository.findById(orgId, datasetId) : await datasetsRepository.latest(orgId);
  const body: DashboardDto = {
    currency: org.currency,
    counts: { customers, products, invoices, datasets },
    invoiceTotals,
    recentInvoices: recent.items,
    dataset: ds ? toDatasetDto(ds) : null,
    analytics: ds ? await analyticsFor(ds) : null,
  };
  res.json(body);
});
