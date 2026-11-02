import type { User } from '@prisma/client';
import type { UserDto } from '@salesreport/shared';
import { iso } from '../../lib/http';

export const toUserDto = (u: User): UserDto => ({
  id: u.id,
  email: u.email,
  name: u.name,
  role: u.role === 'admin' ? 'admin' : 'staff',
  organizationId: u.organizationId,
  createdAt: u.createdAt.toISOString(),
  lastLoginAt: iso(u.lastLoginAt),
});
