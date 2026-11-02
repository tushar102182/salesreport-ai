import type { CreateUserInput, UpdateUserInput } from '@salesreport/shared';
import { prisma } from '../../lib/prisma';
import { badRequest, conflict, forbidden, notFound } from '../../lib/errors';
import { env } from '../../config/env';
import { hashPassword } from '../auth/password';
import { revokeAllForUser } from '../auth/token.service';
import { toUserDto } from './users.mapper';
import { DEMO_EMAILS } from '../../demo/constants';

export async function listUsers(organizationId: string) {
  const users = await prisma.user.findMany({ where: { organizationId }, orderBy: { createdAt: 'asc' } });
  return users.map(toUserDto);
}

export async function createUser(organizationId: string, input: CreateUserInput) {
  if (await prisma.user.findUnique({ where: { email: input.email } })) {
    throw conflict('An account with this e-mail already exists', 'EMAIL_TAKEN');
  }
  const user = await prisma.user.create({
    data: {
      organizationId,
      email: input.email,
      name: input.name,
      role: input.role,
      passwordHash: await hashPassword(input.password),
    },
  });
  return toUserDto(user);
}

async function getScoped(organizationId: string, id: string) {
  const user = await prisma.user.findFirst({ where: { id, organizationId } });
  if (!user) throw notFound('User');
  return user;
}

async function assertNotLastAdmin(organizationId: string, userId: string) {
  const admins = await prisma.user.count({ where: { organizationId, role: 'admin', NOT: { id: userId } } });
  if (admins === 0) throw badRequest('An organization needs at least one admin', undefined, 'LAST_ADMIN');
}

export async function updateUser(organizationId: string, actorId: string, id: string, input: UpdateUserInput) {
  const user = await getScoped(organizationId, id);
  if (env.DEMO_MODE && DEMO_EMAILS.includes(user.email)) throw forbidden('Demo accounts cannot be modified');
  if (input.role && input.role !== 'admin' && user.role === 'admin') await assertNotLastAdmin(organizationId, id);
  if (input.role && id === actorId && input.role !== user.role) throw badRequest('You cannot change your own role');
  const updated = await prisma.user.update({
    where: { id },
    data: {
      ...(input.name ? { name: input.name } : {}),
      ...(input.role ? { role: input.role } : {}),
      ...(input.password ? { passwordHash: await hashPassword(input.password), passwordChangedAt: new Date() } : {}),
    },
  });
  if (input.password || input.role) await revokeAllForUser(id);
  return toUserDto(updated);
}

export async function deleteUser(organizationId: string, actorId: string, id: string) {
  if (id === actorId) throw badRequest('You cannot delete your own account here');
  const user = await getScoped(organizationId, id);
  if (env.DEMO_MODE && DEMO_EMAILS.includes(user.email)) throw forbidden('Demo accounts cannot be deleted');
  if (user.role === 'admin') await assertNotLastAdmin(organizationId, id);
  await prisma.user.delete({ where: { id } });
}
