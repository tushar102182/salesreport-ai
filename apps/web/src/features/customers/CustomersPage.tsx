import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Pencil, Plus, Search, Trash2, Users } from 'lucide-react';
import { customerInputSchema, type CustomerDto, type CustomerInput, type Paginated } from '@salesreport/shared';
import { api } from '../../lib/api';
import { qk } from '../../lib/queries';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../lib/toast';
import { useFieldError, useFormat } from '../../lib/format';
import { applyServerErrors, errorMessage } from '../../lib/errors';
import { useDebounced } from '../../lib/useDebounced';
import {
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

function CustomerForm({ initial, onDone }: { initial: CustomerDto | null; onDone: () => void }) {
  const { t } = useTranslation();
  const fe = useFieldError();
  const toast = useToast();
  const qc = useQueryClient();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CustomerInput>({
    resolver: zodResolver(customerInputSchema) as never,
    defaultValues: {
      name: initial?.name ?? '',
      email: initial?.email ?? '',
      phone: initial?.phone ?? '',
      address: initial?.address ?? '',
      notes: initial?.notes ?? '',
    },
  });
  const save = useMutation({
    mutationFn: (body: CustomerInput) =>
      initial ? api(`/customers/${initial.id}`, { method: 'PUT', body }) : api('/customers', { method: 'POST', body }),
    onSuccess: () => {
      toast.success(t('common.saved'));
      void qc.invalidateQueries({ queryKey: ['customers'] });
      onDone();
    },
    onError: (err) => applyServerErrors(err, setError) || toast.error(errorMessage(err)),
  });
  return (
    <form
      id="customer-form"
      onSubmit={handleSubmit((v) => save.mutate(v))}
      className="grid gap-4 sm:grid-cols-2"
      noValidate
    >
      <Input
        label={t('common.name')}
        {...register('name')}
        error={fe(errors.name?.message)}
        wrapperClassName="sm:col-span-2"
      />
      <Input label={t('common.email')} type="email" {...register('email')} error={fe(errors.email?.message)} />
      <Input label={t('common.phone')} {...register('phone')} error={fe(errors.phone?.message)} />
      <Textarea
        label={t('common.address')}
        {...register('address')}
        error={fe(errors.address?.message)}
        wrapperClassName="sm:col-span-2"
      />
      <Textarea label={t('common.notes')} {...register('notes')} wrapperClassName="sm:col-span-2" />
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

export function CustomersPage() {
  const { t } = useTranslation();
  const f = useFormat();
  const toast = useToast();
  const qc = useQueryClient();
  const { isAdmin } = useAuth();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const dq = useDebounced(q);
  const [editing, setEditing] = useState<CustomerDto | null | 'new'>(null);
  const [toDelete, setToDelete] = useState<CustomerDto | null>(null);
  const params = { page, q: dq, pageSize: 10, sort: 'name' };
  const { data, isLoading } = useQuery({
    queryKey: qk.customers(params),
    queryFn: () => api<Paginated<CustomerDto>>('/customers', { query: params }),
    placeholderData: keepPreviousData,
  });
  const del = useMutation({
    mutationFn: (id: string) => api(`/customers/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success(t('common.deleted'));
      setToDelete(null);
      void qc.invalidateQueries({ queryKey: ['customers'] });
    },
    onError: (e) => {
      setToDelete(null);
      toast.error(errorMessage(e));
    },
  });

  return (
    <div>
      <PageHeader
        title={t('customers.title')}
        subtitle={t('customers.subtitle')}
        actions={
          <Button onClick={() => setEditing('new')}>
            <Plus className="size-4" /> {t('customers.new')}
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
            icon={<Users className="size-6" />}
            title={t('customers.empty')}
            hint={t('common.noResultsHint')}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-900/60">
                <tr>
                  <th className="table-th">{t('common.name')}</th>
                  <th className="table-th">{t('common.email')}</th>
                  <th className="table-th">{t('common.phone')}</th>
                  <th className="table-th text-right">{t('customers.invoices')}</th>
                  <th className="table-th sr-only">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.items.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40">
                    <td className="table-td">
                      <p className="font-medium text-slate-900 dark:text-white">{c.name}</p>
                      {c.address && <p className="max-w-xs truncate text-xs text-slate-500">{c.address}</p>}
                    </td>
                    <td className="table-td">{c.email ?? '—'}</td>
                    <td className="table-td whitespace-nowrap">{c.phone ?? '—'}</td>
                    <td className="table-td text-right">{f.number(c.invoiceCount ?? 0)}</td>
                    <td className="table-td">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setEditing(c)} aria-label={t('common.edit')}>
                          <Pencil className="size-4" />
                        </Button>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setToDelete(c)}
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
        title={editing === 'new' ? t('customers.new') : t('customers.edit')}
      >
        {editing !== null && (
          <CustomerForm initial={editing === 'new' ? null : editing} onDone={() => setEditing(null)} />
        )}
      </Modal>
      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={() => toDelete && del.mutate(toDelete.id)}
        loading={del.isPending}
        message={t('customers.deleteConfirm')}
      />
    </div>
  );
}
