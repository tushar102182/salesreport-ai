import { useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { ImageUp, Trash2, Building2 } from 'lucide-react';
import {
  CURRENCIES,
  formatInvoiceNumber,
  organizationInputSchema,
  type OrganizationDto,
  type OrganizationInput,
} from '@salesreport/shared';
import { api } from '../../lib/api';
import { qk, useLogoUrl } from '../../lib/queries';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../lib/toast';
import { useFieldError } from '../../lib/format';
import { applyServerErrors, errorMessage } from '../../lib/errors';
import { Button, Card, CardHeader, Input, Select, Textarea } from '../../components/ui';

export function CompanySettings({ org }: { org: OrganizationDto }) {
  const { t } = useTranslation();
  const fe = useFieldError();
  const toast = useToast();
  const qc = useQueryClient();
  const { isAdmin } = useAuth();
  const logo = useLogoUrl();
  const fileRef = useRef<HTMLInputElement>(null);
  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors, isDirty },
  } = useForm<OrganizationInput>({
    resolver: zodResolver(organizationInputSchema) as never,
    defaultValues: {
      name: org.name,
      address: org.address ?? '',
      phone: org.phone ?? '',
      email: org.email ?? '',
      website: org.website ?? '',
      taxId: org.taxId ?? '',
      currency: org.currency,
      defaultLanguage: org.defaultLanguage,
      invoicePrefix: org.invoicePrefix,
      defaultTaxRate: org.defaultTaxRate,
      invoiceFooter: org.invoiceFooter ?? '',
      invoiceNotes: org.invoiceNotes ?? '',
    },
  });
  const save = useMutation({
    mutationFn: (body: OrganizationInput) => api<OrganizationDto>('/organization', { method: 'PUT', body }),
    onSuccess: (data) => {
      qc.setQueryData(qk.org, data);
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(t('common.saved'));
    },
    onError: (err) => applyServerErrors(err, setError) || toast.error(errorMessage(err)),
  });
  const uploadLogo = useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append('logo', file);
      return api<OrganizationDto>('/organization/logo', { method: 'POST', form });
    },
    onSuccess: (data) => {
      qc.setQueryData(qk.org, data);
      toast.success(t('common.saved'));
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const removeLogo = useMutation({
    mutationFn: () => api<OrganizationDto>('/organization/logo', { method: 'DELETE' }),
    onSuccess: (data) => qc.setQueryData(qk.org, data),
    onError: (e) => toast.error(errorMessage(e)),
  });
  const prefix = useWatch({ control, name: 'invoicePrefix' });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title={t('settings.logo')} subtitle={t('settings.logoHint')} />
        <div className="flex flex-wrap items-center gap-5 p-5">
          <div className="flex size-20 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
            {logo ? (
              <img src={logo} alt={t('settings.logo')} className="size-full object-contain p-1" />
            ) : (
              <Building2 className="size-8 text-slate-300" />
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadLogo.mutate(file);
              e.target.value = '';
            }}
          />
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={!isAdmin}
              loading={uploadLogo.isPending}
              onClick={() => fileRef.current?.click()}
            >
              <ImageUp className="size-4" /> {t('settings.uploadLogo')}
            </Button>
            {org.hasLogo && (
              <Button variant="ghost" disabled={!isAdmin} onClick={() => removeLogo.mutate()}>
                <Trash2 className="size-4 text-red-500" /> {t('settings.removeLogo')}
              </Button>
            )}
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title={t('settings.company')} subtitle={!isAdmin ? t('settings.adminOnly') : undefined} />
        <form onSubmit={handleSubmit((v) => save.mutate(v))} noValidate>
          <fieldset disabled={!isAdmin} className="grid gap-4 p-5 sm:grid-cols-2">
            <Input
              label={t('settings.companyName')}
              {...register('name')}
              error={fe(errors.name?.message)}
              wrapperClassName="sm:col-span-2"
            />
            <Textarea label={t('common.address')} {...register('address')} wrapperClassName="sm:col-span-2" />
            <Input label={t('common.phone')} {...register('phone')} />
            <Input label={t('common.email')} type="email" {...register('email')} error={fe(errors.email?.message)} />
            <Input label={t('settings.website')} {...register('website')} />
            <Input label={t('settings.taxId')} {...register('taxId')} />
            <Select label={t('settings.currency')} {...register('currency')}>
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.symbol.trim()} {c.code} — {c.name}
                </option>
              ))}
            </Select>
            <Select label={t('settings.defaultLanguage')} {...register('defaultLanguage')}>
              <option value="en">English</option>
              <option value="bn">বাংলা</option>
            </Select>
            <Input
              label={t('settings.invoicePrefix')}
              {...register('invoicePrefix')}
              error={fe(errors.invoicePrefix?.message)}
              hint={t('settings.nextNumber', { number: formatInvoiceNumber(prefix ?? '', org.nextInvoiceNumber) })}
            />
            <Input
              label={t('settings.defaultTaxRate')}
              type="number"
              step="0.01"
              min="0"
              max="100"
              {...register('defaultTaxRate')}
              error={fe(errors.defaultTaxRate?.message)}
            />
            <Textarea
              label={t('settings.invoiceNotes')}
              {...register('invoiceNotes')}
              wrapperClassName="sm:col-span-2"
            />
            <Input
              label={t('settings.invoiceFooter')}
              {...register('invoiceFooter')}
              wrapperClassName="sm:col-span-2"
            />
            <div className="flex justify-end sm:col-span-2">
              <Button type="submit" loading={save.isPending} disabled={!isDirty}>
                {t('common.save')}
              </Button>
            </div>
          </fieldset>
        </form>
      </Card>
    </div>
  );
}
