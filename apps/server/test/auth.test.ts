import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { getApp, getCookie, registerOrg, STRONG_PASSWORD, uniqueEmail } from './helpers';

describe('auth', () => {
  it('rejects weak passwords with field errors', async () => {
    const res = await request(getApp())
      .post('/api/auth/register')
      .send({ name: 'Weak', email: uniqueEmail(), password: 'password1', companyName: 'Weak Co' })
      .expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.some((d: { path: string }) => d.path === 'password')).toBe(true);
  });

  it('registers, returns an access token, sets httpOnly refresh + CSRF cookies, and /me works', async () => {
    const { token, user } = await registerOrg();
    expect(user.role).toBe('admin');
    expect(user).not.toHaveProperty('passwordHash');
    const me = await request(getApp()).get('/api/auth/me').set('Authorization', `Bearer ${token}`).expect(200);
    expect(me.body.user.id).toBe(user.id);
  });

  it('sets secure cookie attributes', async () => {
    const res = await request(getApp())
      .post('/api/auth/register')
      .send({ name: 'Cookie', email: uniqueEmail(), password: STRONG_PASSWORD, companyName: 'Cookie Co' })
      .expect(201);
    const cookies = (res.headers['set-cookie'] as unknown as string[]).join('\n');
    expect(cookies).toMatch(/sr_rt=.*HttpOnly/);
    expect(cookies).toMatch(/sr_rt=.*SameSite=Strict/);
    expect(cookies).toMatch(/sr_rt=.*Path=\/api\/auth/);
  });

  it('rejects requests without a valid token', async () => {
    await request(getApp()).get('/api/customers').expect(401);
    await request(getApp()).get('/api/customers').set('Authorization', 'Bearer not-a-jwt').expect(401);
  });

  it('requires CSRF token for refresh, rotates refresh tokens and detects reuse', async () => {
    const email = uniqueEmail();
    const login = await request(getApp())
      .post('/api/auth/register')
      .send({ name: 'Rot', email, password: STRONG_PASSWORD, companyName: 'Rot Co' })
      .expect(201);
    const rt1 = getCookie(login, 'sr_rt')!;
    const csrf = getCookie(login, 'sr_csrf')!;
    expect(rt1).toBeTruthy();
    expect(csrf).toBeTruthy();

    // Missing CSRF header → 403
    await request(getApp())
      .post('/api/auth/refresh')
      .set('Cookie', [`sr_rt=${rt1}`, `sr_csrf=${csrf}`])
      .expect(403);

    // Valid refresh rotates the token
    const r1 = await request(getApp())
      .post('/api/auth/refresh')
      .set('Cookie', [`sr_rt=${rt1}`, `sr_csrf=${csrf}`])
      .set('X-CSRF-Token', csrf)
      .expect(200);
    const rt2 = getCookie(r1, 'sr_rt')!;
    expect(rt2).toBeTruthy();
    expect(rt2).not.toBe(rt1);

    // Re-using the old token → 401 and the whole family (incl. rt2) is revoked
    const reuse = await request(getApp())
      .post('/api/auth/refresh')
      .set('Cookie', [`sr_rt=${rt1}`, `sr_csrf=${csrf}`])
      .set('X-CSRF-Token', csrf)
      .expect(401);
    expect(reuse.body.error.code).toBe('REFRESH_REUSED');
    await request(getApp())
      .post('/api/auth/refresh')
      .set('Cookie', [`sr_rt=${rt2}`, `sr_csrf=${csrf}`])
      .set('X-CSRF-Token', csrf)
      .expect(401);
  });

  it('locks the account after repeated failed logins', async () => {
    const { email } = await registerOrg('Lock Co');
    for (let i = 0; i < 5; i++) {
      await request(getApp()).post('/api/auth/login').send({ email, password: 'Wrong$Pass123' }).expect(401);
    }
    const locked = await request(getApp())
      .post('/api/auth/login')
      .send({ email, password: STRONG_PASSWORD })
      .expect(423);
    expect(locked.body.error.code).toBe('ACCOUNT_LOCKED');
  });

  it('uses a generic error for unknown e-mails (no user enumeration)', async () => {
    const res = await request(getApp())
      .post('/api/auth/login')
      .send({ email: uniqueEmail(), password: 'Whatever$123' })
      .expect(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('enforces RBAC: staff cannot manage users or AI settings', async () => {
    const { auth } = await registerOrg('RBAC Co');
    const staffEmail = uniqueEmail('staff');
    await request(getApp())
      .post('/api/users')
      .set(auth)
      .send({ name: 'Staff One', email: staffEmail, password: STRONG_PASSWORD, role: 'staff' })
      .expect(201);
    const login = await request(getApp())
      .post('/api/auth/login')
      .send({ email: staffEmail, password: STRONG_PASSWORD })
      .expect(200);
    const staffAuth = { Authorization: `Bearer ${login.body.accessToken}` };
    await request(getApp()).get('/api/users').set(staffAuth).expect(403);
    await request(getApp()).get('/api/settings/ai').set(staffAuth).expect(403);
    await request(getApp()).get('/api/customers').set(staffAuth).expect(200);
  });

  it('stores AI keys encrypted and only returns a masked key', async () => {
    const { auth } = await registerOrg('AI Co');
    const key = 'sk-test-1234567890abcdefWXYZ';
    const res = await request(getApp())
      .put('/api/settings/ai')
      .set(auth)
      .send({ provider: 'openai', apiKey: key })
      .expect(200);
    expect(JSON.stringify(res.body)).not.toContain(key);
    expect(res.body.apiKeyMasked).toBe('sk-t••••••••WXYZ');
    expect(res.body.effective.source).toBe('organization');
  });
});
