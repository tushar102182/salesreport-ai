import { Router } from 'express';
import {
  convertAmount,
  convertAnalytics,
  currencyQuerySchema,
  displayCurrencyFor,
  INVOICE_STATUSES,
  type DashboardDto,
  type InvoiceStatus,
} from '@salesreport/shared';
import { getFxTable, requestedDisplayCurrency } from '../../lib/fx';
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

/**
 * Overview for the home dashboard: counts, invoice totals by status, and analytics of the chosen (or latest) dataset.
 * Invoice totals are summed per currency and converted to the display currency
 * (`?currency=` / `X-Display-Currency`, default: company currency) so mixed-currency
 * invoices are never added together unconverted. Analytics are converted the same way
 * (`analytics.currency` says which currency the numbers are in).
 */
dashboardRouter.get('/', async (req, res) => {
  const orgId = getAuth(req).organizationId;
  const { datasetId, currency } = validate(
    z.object({ datasetId: idSchema.optional() }).extend(currencyQuerySchema.shape),
    req.query,
  );
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
  const { rates } = await getFxTable();
  const display = requestedDisplayCurrency(req, currency) ?? org.currency;
  for (const g of grouped) {
    if ((INVOICE_STATUSES as readonly string[]).includes(g.status)) {
      const slot = invoiceTotals[g.status as InvoiceStatus];
      // A currency without a known rate is skipped from the converted sum rather than mislabelled.
      const target = displayCurrencyFor(g.currency, display, rates);
      slot.count += g._count._all;
      if (target === display) slot.amount += convertAmount(g._sum.total ?? 0, g.currency, display, rates);
    }
  }
  for (const s of INVOICE_STATUSES) invoiceTotals[s].amount = Math.round(invoiceTotals[s].amount * 100) / 100;

  const ds = datasetId ? await datasetsRepository.findById(orgId, datasetId) : await datasetsRepository.latest(orgId);
  const body: DashboardDto = {
    currency: display,
    counts: { customers, products, invoices, datasets },
    invoiceTotals,
    recentInvoices: recent.items,
    dataset: ds ? toDatasetDto(ds) : null,
    analytics: ds ? convertAnalytics(await analyticsFor(ds), display, rates) : null,
  };
  res.json(body);
});
