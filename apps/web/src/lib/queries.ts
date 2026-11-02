import { useQuery } from '@tanstack/react-query';
import type { OrganizationDto } from '@salesreport/shared';
import { api, fetchObjectUrl } from './api';
import { useAuth } from './auth';

export const qk = {
  org: ['organization'] as const,
  dashboard: (datasetId?: string) => ['dashboard', datasetId ?? 'latest'] as const,
  datasets: (params: object) => ['datasets', params] as const,
  dataset: (id: string) => ['dataset', id] as const,
  analytics: (id: string) => ['dataset', id, 'analytics'] as const,
  summary: (id: string, lang: string) => ['dataset', id, 'summary', lang] as const,
  customers: (params: object) => ['customers', params] as const,
  products: (params: object) => ['products', params] as const,
  invoices: (params: object) => ['invoices', params] as const,
  invoice: (id: string) => ['invoice', id] as const,
  users: ['users'] as const,
  ai: ['settings', 'ai'] as const,
  config: ['config'] as const,
};

export function useOrganization() {
  const { status } = useAuth();
  return useQuery({
    queryKey: qk.org,
    queryFn: () => api<OrganizationDto>('/organization'),
    enabled: status === 'authenticated',
  });
}

export interface PublicConfig {
  appName: string;
  allowRegistration: boolean;
  demoMode: boolean;
  demoCredentials?: { email: string; password: string };
}
export function usePublicConfig() {
  return useQuery({ queryKey: qk.config, queryFn: () => api<PublicConfig>('/config'), staleTime: Infinity });
}

/** Loads the organization logo (auth-protected) as an object URL. */
export function useLogoUrl() {
  const { data: org } = useOrganization();
  const { data } = useQuery({
    queryKey: ['organization', 'logo', org?.logoUpdatedAt ?? null],
    queryFn: () => fetchObjectUrl('/organization/logo'),
    enabled: Boolean(org?.hasLogo),
    staleTime: Infinity,
  });
  return org?.hasLogo ? (data ?? null) : null;
}
