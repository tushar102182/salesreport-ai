import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Package, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { productInputSchema, type Paginated, type ProductDto, type ProductInput } from '@salesreport/shared';
import { api } from '../../lib/api';
import { qk, useOrganization } from '../../lib/queries';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../lib/toast';
import { useFieldError, useFormat } from '../../lib/format';
import { applyServerErrors, errorMessage } from '../../lib/errors';
import { useDebounced } from '../../lib/useDebounced';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Input,
  Modal,
  Pagination,
  PageHeader,
  Skeleton,
  Textarea,
} from '../../components/ui';

function ProductForm({ initial, onDone }: { initial: ProductDto | null; onDone: () => void }) {
  const { t } = useTranslation();
  const fe = useFieldError();
  const toast = useToast();
  const qc = useQueryClient();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ProductInput>({
    resolver: zodResolver(productInputSchema) as never,
    defaultValues: {
      name: initial?.name ?? '',
      sku: initial?.sku ?? '',
      unit: initial?.unit ?? '',
      unitPrice: initial?.unitPrice ?? 0,
      description: initial?.description ?? '',
      active: initial?.active ?? true,
    },
  });
  const save = useMutation({
    mutationFn: (body: ProductInput) =>
      initial ? api(`/products/${initial.id}`, { method: 'PUT', body }) : api('/products', { method: 'POST', body }),
    onSuccess: () => {
      toast.success(t('common.saved'));
      void qc.invalidateQueries({ queryKey: ['products'] });
      onDone();
    },
    onError: (err) => applyServerErrors(err, setError) || toast.error(errorMessage(err)),
  });
  return (
    <form onSubmit={handleSubmit((v) => save.mutate(v))} className="grid gap-4 sm:grid-cols-2" noValidate>
      <Input
        label={t('common.name')}
        {...register('name')}
        error={fe(errors.name?.message)}
        wrapperClassName="sm:col-span-2"
      />
      <Input label={t('products.sku')} {...register('sku')} error={fe(errors.sku?.message)} />
      <Input label={t('products.unit')} placeholder="pcs, kg, bag…" {...register('unit')} />
      <Input
        label={t('products.unitPrice')}
        type="number"
        step="0.01"
        min="0"
        inputMode="decimal"
        {...register('unitPrice')}
        error={fe(errors.unitPrice?.message)}
      />
      <label className="flex items-center gap-2 self-end pb-2 text-sm text-slate-700 dark:text-slate-300">
        <input type="checkbox" className="size-4 rounded border-slate-300 accent-brand-600" {...register('active')} />{' '}
        {t('products.active')}
      </label>
      <Textarea label={t('products.description')} {...register('description')} wrapperClassName="sm:col-span-2" />
      <div className="flex justify-end gap-2 sm:col-span-2">
        <Button variant="outline" onClick={onDone}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" loading={save.isPending}>
          {t('common.save')}
        </Button>
      </div>
    </form>
  );
}

export function ProductsPage() {
  const { t } = useTranslation();
  const f = useFormat();
  const toast = useToast();
  const qc = useQueryClient();
  const { isAdmin } = useAuth();
  const { data: org } = useOrganization();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const dq = useDebounced(q);
  const [editing, setEditing] = useState<ProductDto | null | 'new'>(null);
  const [toDelete, setToDelete] = useState<ProductDto | null>(null);
  const params = { page, q: dq, pageSize: 10, sort: 'name' };
  const { data, isLoading } = useQuery({
    queryKey: qk.products(params),
    queryFn: () => api<Paginated<ProductDto>>('/products', { query: params }),
    placeholderData: keepPreviousData,
  });
  const del = useMutation({
    mutationFn: (id: string) => api(`/products/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success(t('common.deleted'));
      setToDelete(null);
      void qc.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const currency = org?.currency ?? 'BDT';

  return (
    <div>
      <PageHeader
        title={t('products.title')}
        subtitle={t('products.subtitle')}
        actions={
          <Button onClick={() => setEditing('new')}>
            <Plus className="size-4" /> {t('products.new')}
          </Button>
        }
      />
      <Card className="overflow-hidden">
        <div className="border-b border-slate-100 p-4 dark:border-slate-800">
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-9"
              placeholder={t('common.search')}
              value={q}
              onChange={(e) => (setQ(e.target.value), setPage(1))}
              aria-label={t('common.search')}
            />
          </div>
        </div>
        {isLoading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : !data?.items.length ? (
          <EmptyState
            icon={<Package className="size-6" />}
            title={t('products.empty')}
            hint={t('common.noResultsHint')}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-900/60">
                <tr>
                  <th className="table-th">{t('common.name')}</th>
                  <th className="table-th">{t('products.sku')}</th>
                  <th className="table-th">{t('products.unit')}</th>
                  <th className="table-th text-right">{t('products.unitPrice')}</th>
                  <th className="table-th">{t('invoices.status')}</th>
                  <th className="table-th sr-only">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.items.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40">
                    <td className="table-td">
                      <p className="font-medium text-slate-900 dark:text-white">{p.name}</p>
                      {p.description && <p className="max-w-xs truncate text-xs text-slate-500">{p.description}</p>}
                    </td>
                    <td className="table-td font-mono text-xs">{p.sku ?? '—'}</td>
                    <td className="table-td">{p.unit ?? '—'}</td>
                    <td className="table-td text-right font-semibold whitespace-nowrap">
                      {f.money(p.unitPrice, currency)}
                    </td>
                    <td className="table-td">
                      {p.active ? (
                        <Badge tone="green">{t('products.active')}</Badge>
                      ) : (
                        <Badge>{t('products.inactive')}</Badge>
                      )}
                    </td>
                    <td className="table-td">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setEditing(p)} aria-label={t('common.edit')}>
                          <Pencil className="size-4" />
                        </Button>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setToDelete(p)}
                            aria-label={t('common.delete')}
                          >
                            <Trash2 className="size-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onChange={setPage} />}
      </Card>
      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? t('products.new') : t('products.edit')}
      >
        {editing !== null && (
          <ProductForm initial={editing === 'new' ? null : editing} onDone={() => setEditing(null)} />
        )}
      </Modal>
      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={() => toDelete && del.mutate(toDelete.id)}
        loading={del.isPending}
        message={t('products.deleteConfirm')}
      />
    </div>
  );
}
