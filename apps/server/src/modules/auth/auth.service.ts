import type { ChangePasswordInput, LoginInput, RegisterInput, UserPreferencesInput } from '@salesreport/shared';
import { env } from '../../config/env';
import { prisma } from '../../lib/prisma';
import { AppError, conflict, forbidden, unauthorized } from '../../lib/errors';
import { getDummyHash, hashPassword, verifyPassword } from './password';
import { issueRefreshToken, revokeAllForUser, rotateRefreshToken, signAccessToken } from './token.service';
import { toUserDto } from '../users/users.mapper';
import { DEMO_EMAILS } from '../../demo/constants';

interface ClientMeta {
  userAgent?: string;
  ip?: string;
}

async function createSession(user: { id: string; organizationId: string; role: string }, meta: ClientMeta) {
  const accessToken = await signAccessToken({
    sub: user.id,
    org: user.organizationId,
    role: user.role === 'admin' ? 'admin' : 'staff',
  });
  const refresh = await issueRefreshToken(user.id, meta);
  return { accessToken, refresh };
}

export async function register(input: RegisterInput, meta: ClientMeta) {
  if (!env.ALLOW_REGISTRATION) throw forbidden('Registration is disabled');
  const exists = await prisma.user.findUnique({ where: { email: input.email } });
  if (exists) throw conflict('An account with this e-mail already exists', 'EMAIL_TAKEN');

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({ data: { name: input.companyName, email: input.email } });
    return tx.user.create({
      data: { name: input.name, email: input.email, passwordHash, role: 'admin', organizationId: org.id },
    });
  });
  const session = await createSession(user, meta);
  return { user: toUserDto(user), ...session };
}

/**
 * Login with progressive account lockout: after LOGIN_MAX_ATTEMPTS failures the
 * account is locked for LOGIN_LOCK_MINUTES, doubling for each further failure (max 24h).
 */
export async function login(input: LoginInput, meta: ClientMeta) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) {
    await verifyPassword(await getDummyHash(), input.password);
    throw unauthorized('Invalid e-mail or password', 'INVALID_CREDENTIALS');
  }
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const minutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60_000);
    throw new AppError(423, 'ACCOUNT_LOCKED', `Too many failed attempts. Try again in ${minutes} minute(s).`, {
      retryAfterMinutes: minutes,
    });
  }

  const ok = await verifyPassword(user.passwordHash, input.password);
  if (!ok) {
    const failed = user.failedLoginCount + 1;
    const over = failed - env.LOGIN_MAX_ATTEMPTS;
    const lockedUntil =
      over >= 0 ? new Date(Date.now() + Math.min(env.LOGIN_LOCK_MINUTES * 2 ** over, 1440) * 60_000) : null;
    await prisma.user.update({ where: { id: user.id }, data: { failedLoginCount: failed, lockedUntil } });
    throw unauthorized('Invalid e-mail or password', 'INVALID_CREDENTIALS');
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
  });
  const session = await createSession(updated, meta);
  return { user: toUserDto(updated), ...session };
}

export async function refresh(presented: string, meta: ClientMeta) {
  const rotated = await rotateRefreshToken(presented, meta);
  const user = await prisma.user.findUnique({ where: { id: rotated.userId } });
  if (!user) throw unauthorized('Invalid session', 'REFRESH_INVALID');
  const accessToken = await signAccessToken({
    sub: user.id,
    org: user.organizationId,
    role: user.role === 'admin' ? 'admin' : 'staff',
  });
  return { user: toUserDto(user), accessToken, refresh: rotated };
}

export async function me(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw unauthorized();
  return toUserDto(user);
}

export async function updatePreferences(userId: string, input: UserPreferencesInput) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { ...(input.displayCurrency !== undefined ? { displayCurrency: input.displayCurrency } : {}) },
  });
  return toUserDto(user);
}

export async function changePassword(userId: string, input: ChangePasswordInput, meta: ClientMeta) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw unauthorized();
  if (env.DEMO_MODE && DEMO_EMAILS.includes(user.email)) {
    throw forbidden('Password changes are disabled for demo accounts');
  }
  if (!(await verifyPassword(user.passwordHash, input.currentPassword))) {
    throw new AppError(400, 'INVALID_PASSWORD', 'Current password is incorrect', [
      { path: 'currentPassword', message: 'password.incorrect' },
    ]);
  }
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(input.newPassword), passwordChangedAt: new Date() },
  });
  // Sign out everywhere, then issue a fresh session for this device.
  await revokeAllForUser(userId);
  const session = await createSession(updated, meta);
  return { user: toUserDto(updated), ...session };
}
