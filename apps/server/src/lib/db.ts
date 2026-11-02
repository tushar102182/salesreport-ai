import { env } from '../config/env';

const isPostgres = /^postgres(ql)?:\/\//.test(env.DATABASE_URL);

/**
 * Case-insensitive "contains" filter that works on both SQLite (LIKE is already
 * case-insensitive for ASCII) and PostgreSQL (needs mode: 'insensitive').
 */
export function contains(q: string) {
  return isPostgres ? { contains: q, mode: 'insensitive' as const } : { contains: q };
}
