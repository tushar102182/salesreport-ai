import type { Organization } from '@prisma/client';
import type { OrganizationDto, OrganizationInput } from '@salesreport/shared';
import { type organizationInputSchema } from '@salesreport/shared';
import type { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { notFound } from '../../lib/errors';
import { iso } from '../../lib/http';

export const toOrganizationDto = (o: Organization): OrganizationDto => ({
  id: o.id,
  name: o.name,
  address: o.address,
  phone: o.phone,
  email: o.email,
  website: o.website,
  taxId: o.taxId,
  currency: o.currency,
  defaultLanguage: o.defaultLanguage === 'bn' ? 'bn' : 'en',
  invoicePrefix: o.invoicePrefix,
  nextInvoiceNumber: o.nextInvoiceNumber,
  defaultTaxRate: o.defaultTaxRate,
  invoiceFooter: o.invoiceFooter,
  invoiceNotes: o.invoiceNotes,
  hasLogo: Boolean(o.logo),
  logoUpdatedAt: iso(o.logoUpdatedAt),
});

export async function getOrganization(id: string) {
  const org = await prisma.organization.findUnique({ where: { id } });
  if (!org) throw notFound('Organization');
  return org;
}

export async function updateOrganization(id: string, input: z.output<typeof organizationInputSchema>) {
  return toOrganizationDto(await prisma.organization.update({ where: { id }, data: input }));
}

export async function setLogo(id: string, logo: Buffer | null, mime: string | null) {
  return toOrganizationDto(
    await prisma.organization.update({
      where: { id },
      data: { logo: logo ? new Uint8Array(logo) : null, logoMime: mime, logoUpdatedAt: logo ? new Date() : null },
    }),
  );
}

export type { OrganizationInput };
