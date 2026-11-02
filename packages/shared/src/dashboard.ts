import type { InvoiceStatus } from './constants';
import type { Analytics, DatasetDto } from './schemas/dataset';
import type { InvoiceListItemDto } from './schemas/invoice';

export interface DashboardDto {
  currency: string;
  counts: { customers: number; products: number; invoices: number; datasets: number };
  invoiceTotals: Record<InvoiceStatus, { count: number; amount: number }>;
  recentInvoices: InvoiceListItemDto[];
  dataset: DatasetDto | null;
  analytics: Analytics | null;
}
