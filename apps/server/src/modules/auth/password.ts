import argon2 from 'argon2';

/** OWASP-recommended argon2id parameters (m=19 MiB, t=2, p=1). */
const OPTIONS: argon2.Options = { type: argon2.argon2id, memoryCost: 19_456, timeCost: 2, parallelism: 1 };

export const hashPassword = (plain: string) => argon2.hash(plain, OPTIONS);

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    return false;
  }
}

// Used to equalize response time when the e-mail does not exist (prevents user enumeration).
let dummyHash: Promise<string> | undefined;
export const getDummyHash = () => (dummyHash ??= hashPassword('dummy-password-for-timing-only'));
