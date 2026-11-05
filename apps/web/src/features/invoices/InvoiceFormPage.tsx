import { useEffect, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import {
  computeInvoiceTotals,
  CURRENCIES,
  INVOICE_STATUSES,
  invoiceInputSchema,
  type CustomerDto,
  type InvoiceDto,
  type InvoiceInput,
  type Paginated,
  type ProductDto,
} from '@salesreport/shared';
import { api } from '../../lib/api';
import { qk, useOrganization } from '../../lib/queries';
import { useToast } from '../../lib/toast';
import { useFieldError, useFormat } from '../../lib/format';
import { applyServerErrors, errorMessage } from '../../lib/errors';
import { Button, Card, CardHeader, FullPageSpinner, Input, PageHeader, Select, Textarea } from '../../components/ui';

const today = () => new Date().toISOString().slice(0, 10);
const plusDays = (iso: string, n: number) =>
  new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

export function InvoiceFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const existing = useQuery({
    queryKey: qk.invoice(id ?? ''),
    queryFn: () => api<InvoiceDto>(`/invoices/${id}`),
    enabled: isEdit,
  });
  const { data: org } = useOrganization();
  if ((isEdit && existing.isLoading) || !org) return <FullPageSpinner />;
  return (
    <InvoiceForm
      initial={existing.data}
      defaults={{
        currency: org.currency,
        taxRate: org.defaultTaxRate,
        language: org.defaultLanguage,
        notes: org.invoiceNotes,
      }}
    />
  );
}

function InvoiceForm({
  initial,
  defaults,
}: {
  initial?: InvoiceDto;
  defaults: { currency: string; taxRate: number; language: 'en' | 'bn'; notes: string | null };
}) {
  const { t } = useTranslation();
  const f = useFormat();
  const fe = useFieldError();
  const toast = useToast();
  const nav = useNavigate();
  const qc = useQueryClient();

  const customers = useQuery({
    queryKey: qk.customers({ all: true }),
    queryFn: () => api<Paginated<CustomerDto>>('/customers', { query: { pageSize: 100, sort: 'name' } }),
  });
  const products = useQuery({
    queryKey: qk.products({ all: true }),
    queryFn: () => api<Paginated<ProductDto>>('/products', { query: { pageSize: 100, sort: 'name' } }),
  });

  const issue = initial?.issueDate ?? today();
  const {
    register,
    control,
    handleSubmit,
    setValue,
    setError,
    formState: { errors },
  } = useForm<InvoiceInput>({
    resolver: zodResolver(invoiceInputSchema) as never,
    defaultValues: initial
      ? {
          customerId: initial.customer.id,
          issueDate: initial.issueDate,
          dueDate: initial.dueDate ?? '',
          status: initial.status,
          currency: initial.currency,
          language: initial.language,
          taxRate: initial.taxRate,
          discountType: initial.discountType,
          discountValue: initial.discountValue,
          notes: initial.notes ?? '',
          items: initial.items.map((i) => ({
            productId: i.productId ?? '',
            description: i.description,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
          })),
        }
      : {
          customerId: '',
          issueDate: issue,
          dueDate: plusDays(issue, 15),
          status: 'draft',
          currency: defaults.currency,
          language: defaults.language,
          taxRate: defaults.taxRate,
          discountType: 'fixed',
          discountValue: 0,
          notes: '',
          items: [{ productId: '', description: '', quantity: 1, unitPrice: 0 }],
        },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const watched = useWatch({ control });
  const currency = watched.currency ?? defaults.currency;

  const totals = useMemo(
    () =>
      computeInvoiceTotals({
        items: (watched.items ?? []).map((i) => ({
          quantity: Number(i?.quantity) || 0,
          unitPrice: Number(i?.unitPrice) || 0,
        })),
        taxRate: Number(watched.taxRate) || 0,
        discountType: watched.discountType === 'percent' ? 'percent' : 'fixed',
        discountValue: Number(watched.discountValue) || 0,
      }),
    [watched],
  );

  useEffect(() => {
    if (!initial && customers.data?.items.length === 1) setValue('customerId', customers.data.items[0]!.id);
  }, [customers.data, initial, setValue]);

  const save = useMutation({
    mutationFn: (body: InvoiceInput) => {
      const clean = {
        ...body,
        dueDate: body.dueDate || null,
        items: body.items.map((i) => ({ ...i, productId: i.productId || null })),
      };
      return initial
        ? api<InvoiceDto>(`/invoices/${initial.id}`, { method: 'PUT', body: clean })
        : api<InvoiceDto>('/invoices', { method: 'POST', body: clean });
    },
    onSuccess: (inv) => {
      toast.success(initial ? t('invoices.updated') : t('invoices.created', { number: inv.number }));
      void qc.invalidateQueries({ queryKey: ['invoices'] });
      void qc.invalidateQueries({ queryKey: ['invoice', inv.id] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
      void qc.invalidateQueries({ queryKey: qk.org });
      nav(`/invoices/${inv.id}`);
    },
    onError: (err) => applyServerErrors(err, setError) || toast.error(errorMessage(err)),
  });

  const pickProduct = (index: number, productId: string) => {
    const p = products.data?.items.find((x) => x.id === productId);
    setValue(`items.${index}.productId`, productId);
    if (p) {
      setValue(`items.${index}.description`, p.name, { shouldValidate: true });
      setValue(`items.${index}.unitPrice`, p.unitPrice, { shouldValidate: true });
    }
  };

  return (
    <form onSubmit={handleSubmit((v) => save.mutate(v))} noValidate>
      <Link
        to={initial ? `/invoices/${initial.id}` : '/invoices'}
        className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white"
      >
        <ArrowLeft className="size-4" /> {t('invoices.title')}
      </Link>
      <PageHeader
        title={initial ? `${t('invoices.edit')} · ${initial.number}` : t('invoices.new')}
        actions={
          <Button type="submit" loading={save.isPending}>
            {t('common.save')}
          </Button>
        }
      />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardHeader title={t('invoices.details')} />
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <Select
                label={t('invoices.customer')}
                {...register('customerId')}
                error={fe(errors.customerId?.message)}
                wrapperClassName="sm:col-span-2"
              >
                <option value="">
                  {customers.data?.items.length === 0 ? t('invoices.noCustomers') : t('invoices.selectCustomer')}
                </option>
                {customers.data?.items.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
              <Input
                type="date"
                label={t('invoices.issueDate')}
                {...register('issueDate')}
                error={fe(errors.issueDate?.message)}
              />
              <Input
                type="date"
                label={t('invoices.dueDate')}
                {...register('dueDate')}
                error={fe(errors.dueDate?.message)}
              />
              <Select label={t('invoices.status')} {...register('status')}>
                {INVOICE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {t(`status.${s}`)}
                  </option>
                ))}
              </Select>
              <Select label={t('invoices.language')} {...register('language')}>
                <option value="en">English</option>
                <option value="bn">বাংলা</option>
              </Select>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader
              title={t('invoices.items')}
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => append({ productId: '', description: '', quantity: 1, unitPrice: 0 })}
                >
                  <Plus className="size-4" /> {t('invoices.addItem')}
                </Button>
              }
            />
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-12 gap-3 p-4">
                  <Select
                    aria-label={t('invoices.product')}
                    wrapperClassName="col-span-12 md:col-span-4"
                    value={watched.items?.[index]?.productId ?? ''}
                    onChange={(e) => pickProduct(index, e.target.value)}
                  >
                    <option value="">{t('invoices.pickProduct')}</option>
                    {products.data?.items
                      .filter((p) => p.active)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                  </Select>
                  <Input
                    aria-label={t('invoices.description')}
                    placeholder={t('invoices.description')}
                    wrapperClassName="col-span-12 md:col-span-8"
                    {...register(`items.${index}.description`)}
                    error={fe(errors.items?.[index]?.description?.message)}
                  />
                  <Input
                    aria-label={t('invoices.quantity')}
                    type="number"
                    step="any"
                    min="0"
                    inputMode="decimal"
                    placeholder={t('invoices.quantity')}
                    wrapperClassName="col-span-4 md:col-span-3"
                    {...register(`items.${index}.quantity`)}
                    error={fe(errors.items?.[index]?.quantity?.message)}
                  />
                  <Input
                    aria-label={t('invoices.unitPrice')}
                    type="number"
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                    placeholder={t('invoices.unitPrice')}
                    wrapperClassName="col-span-5 md:col-span-4"
                    {...register(`items.${index}.unitPrice`)}
                    error={fe(errors.items?.[index]?.unitPrice?.message)}
                  />
                  <div className="col-span-3 flex items-center justify-end gap-2 md:col-span-5">
                    <span className="text-sm font-semibold whitespace-nowrap text-slate-900 dark:text-white">
                      {f.moneyExact(totals.lineTotals[index] ?? 0, currency)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={fields.length === 1}
                      onClick={() => remove(index)}
                      aria-label={t('invoices.removeItem')}
                    >
                      <Trash2 className="size-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            {errors.items?.root?.message && (
              <p className="px-5 pb-4 text-sm text-red-600">{fe(errors.items.root.message)}</p>
            )}
            {errors.items?.message && <p className="px-5 pb-4 text-sm text-red-600">{fe(errors.items.message)}</p>}
          </Card>

          <Card className="p-5">
            <Textarea label={t('invoices.notes')} placeholder={defaults.notes ?? ''} {...register('notes')} />
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="xl:sticky xl:top-24">
            <CardHeader title={t('invoices.grandTotal')} />
            <div className="space-y-4 p-5">
              <Select label={t('invoices.currency')} {...register('currency')}>
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </Select>
              <div className="grid grid-cols-2 gap-3">
                <Select label={t('invoices.discountType')} {...register('discountType')}>
                  <option value="fixed">{t('invoices.fixed')}</option>
                  <option value="percent">{t('invoices.percent')}</option>
                </Select>
                <Input
                  label={t('invoices.discount')}
                  type="number"
                  step="0.01"
                  min="0"
                  {...register('discountValue')}
                  error={fe(errors.discountValue?.message)}
                />
              </div>
              <Input
                label={t('invoices.taxRate')}
                type="number"
                step="0.01"
                min="0"
                max="100"
                {...register('taxRate')}
                error={fe(errors.taxRate?.message)}
              />
              <dl className="space-y-2 border-t border-slate-100 pt-4 text-sm dark:border-slate-800">
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <dt>{t('invoices.subtotal')}</dt>
                  <dd>{f.moneyExact(totals.subtotal, currency)}</dd>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <dt>{t('invoices.discount')}</dt>
                  <dd>- {f.moneyExact(totals.discountTotal, currency)}</dd>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <dt>{t('invoices.tax')}</dt>
                  <dd>{f.moneyExact(totals.taxTotal, currency)}</dd>
                </div>
                <div className="flex justify-between rounded-xl bg-brand-600 px-4 py-3 text-base font-bold text-white">
                  <dt>{t('invoices.grandTotal')}</dt>
                  <dd>{f.moneyExact(totals.total, currency)}</dd>
                </div>
                {currency !== f.currency && (
                  <p className="text-end text-xs text-slate-500" data-testid="invoice-form-approx">
                    {t('invoices.approxIn', { amount: f.money(totals.total, currency) })}
                  </p>
                )}
              </dl>
              <Button type="submit" className="w-full" loading={save.isPending}>
                {t('common.save')}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </form>
  );
}
