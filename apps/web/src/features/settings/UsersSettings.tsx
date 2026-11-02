import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react';
import { createUserSchema, type CreateUserInput, type UserDto } from '@salesreport/shared';
import { api } from '../../lib/api';
import { qk } from '../../lib/queries';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../lib/toast';
import { useFieldError, useFormat } from '../../lib/format';
import { applyServerErrors, errorMessage } from '../../lib/errors';
import { Badge, Button, Card, CardHeader, ConfirmDialog, Input, Modal, Select } from '../../components/ui';

export function UsersSettings() {
  const { t } = useTranslation();
  const f = useFormat();
  const fe = useFieldError();
  const toast = useToast();
  const qc = useQueryClient();
  const { user: me } = useAuth();
  const [open, setOpen] = useState(false);
  const [toDelete, setToDelete] = useState<UserDto | null>(null);
  const { data } = useQuery({ queryKey: qk.users, queryFn: () => api<{ items: UserDto[] }>('/users') });
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema) as never,
    defaultValues: { name: '', email: '', password: '', role: 'staff' },
  });
  const create = useMutation({
    mutationFn: (body: CreateUserInput) => api('/users', { method: 'POST', body }),
    onSuccess: () => {
      toast.success(t('common.saved'));
      setOpen(false);
      reset();
      void qc.invalidateQueries({ queryKey: qk.users });
    },
    onError: (e) => applyServerErrors(e, setError) || toast.error(errorMessage(e)),
  });
  const changeRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: 'admin' | 'staff' }) =>
      api(`/users/${id}`, { method: 'PATCH', body: { role } }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.users }),
    onError: (e) => toast.error(errorMessage(e)),
  });
  const del = useMutation({
    mutationFn: (id: string) => api(`/users/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      setToDelete(null);
      void qc.invalidateQueries({ queryKey: qk.users });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title={t('settings.usersTitle')}
        action={
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="size-4" /> {t('settings.addUser')}
          </Button>
        }
      />
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 dark:bg-slate-900/60">
            <tr>
              <th className="table-th">{t('common.name')}</th>
              <th className="table-th">{t('settings.role')}</th>
              <th className="table-th">{t('settings.lastLogin')}</th>
              <th className="table-th sr-only">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {data?.items.map((u) => (
              <tr key={u.id}>
                <td className="table-td">
                  <p className="font-medium text-slate-900 dark:text-white">
                    {u.name} {u.id === me?.id && <Badge tone="brand">{t('settings.you')}</Badge>}
                  </p>
                  <p className="text-xs text-slate-500">{u.email}</p>
                </td>
                <td className="table-td">
                  <select
                    className="input h-8 w-28 py-0 text-xs"
                    value={u.role}
                    disabled={u.id === me?.id}
                    onChange={(e) => changeRole.mutate({ id: u.id, role: e.target.value as 'admin' | 'staff' })}
                    aria-label={t('settings.role')}
                  >
                    <option value="admin">{t('settings.admin')}</option>
                    <option value="staff">{t('settings.staff')}</option>
                  </select>
                </td>
                <td className="table-td whitespace-nowrap">
                  {u.lastLoginAt ? f.date(u.lastLoginAt) : t('settings.never')}
                </td>
                <td className="table-td text-right">
                  {u.id !== me?.id && (
                    <Button variant="ghost" size="sm" onClick={() => setToDelete(u)} aria-label={t('common.delete')}>
                      <Trash2 className="size-4 text-red-500" />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title={t('settings.addUser')} size="sm">
        <form onSubmit={handleSubmit((v) => create.mutate(v))} className="space-y-4" noValidate>
          <Input label={t('common.name')} {...register('name')} error={fe(errors.name?.message)} />
          <Input label={t('common.email')} type="email" {...register('email')} error={fe(errors.email?.message)} />
          <Input
            label={t('settings.newUserPassword')}
            type="password"
            autoComplete="new-password"
            {...register('password')}
            error={fe(errors.password?.message)}
            hint={t('auth.passwordHint')}
          />
          <Select label={t('settings.role')} {...register('role')}>
            <option value="staff">{t('settings.staff')}</option>
            <option value="admin">{t('settings.admin')}</option>
          </Select>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" loading={create.isPending}>
              {t('common.create')}
            </Button>
          </div>
        </form>
      </Modal>
      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={() => toDelete && del.mutate(toDelete.id)}
        loading={del.isPending}
        message={t('common.confirmDelete')}
      />
    </Card>
  );
}
