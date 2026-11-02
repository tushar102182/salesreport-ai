import type { Request } from 'express';
import type { Paginated } from '@salesreport/shared';
import { unauthorized } from './errors';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'staff';
  organizationId: string;
}

/** Returns the authenticated user or throws 401. Use inside routes behind `requireAuth`. */
export function getAuth(req: Request): AuthUser {
  if (!req.auth) throw unauthorized();
  return req.auth;
}

export function paginate<T>(items: T[], total: number, page: number, pageSize: number): Paginated<T> {
  return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);
export const isoDay = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : null);
