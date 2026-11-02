import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env';

const VERSION = 'v1';

/**
 * AES-256-GCM authenticated encryption. Output: v1:<iv>:<tag>:<ciphertext> (base64url).
 * `aad` binds the ciphertext to a context (e.g. organization id) so it can't be swapped between rows.
 */
export function encryptSecret(plain: string, aad: string, key: Buffer = env.ENCRYPTION_KEY): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(aad, 'utf8'));
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString('base64url'), tag.toString('base64url'), ct.toString('base64url')].join(':');
}

export function decryptSecret(payload: string, aad: string, key: Buffer = env.ENCRYPTION_KEY): string {
  const [version, iv, tag, ct] = payload.split(':');
  if (version !== VERSION || !iv || !tag || !ct) throw new Error('Unsupported ciphertext format');
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64url'));
  decipher.setAAD(Buffer.from(aad, 'utf8'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(ct, 'base64url')), decipher.final()]).toString('utf8');
}

/** "sk-proj-abc…wxyz" → "sk-p••••••••wxyz" */
export function maskSecret(secret: string): string {
  if (secret.length <= 8) return '••••••••';
  return `${secret.slice(0, 4)}••••••••${secret.slice(-4)}`;
}

export const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');
export const randomToken = (bytes = 32) => randomBytes(bytes).toString('base64url');

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}
