import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../src/app';

let app: Express | undefined;
export const getApp = () => (app ??= createApp());

let counter = 0;
export const uniqueEmail = (prefix = 'user') => `${prefix}.${Date.now()}.${++counter}@test.example`;
export const STRONG_PASSWORD = 'Sup3r$ecret!';

/** Registers a new organization + admin and returns an authenticated agent helper. */
export async function registerOrg(name = 'Test Co') {
  const email = uniqueEmail('admin');
  const agent = request.agent(getApp());
  const res = await agent
    .post('/api/auth/register')
    .send({ name: 'Test Admin', email, password: STRONG_PASSWORD, companyName: name })
    .expect(201);
  const token = res.body.accessToken as string;
  return { agent, token, email, user: res.body.user, auth: { Authorization: `Bearer ${token}` } };
}

/** Reads a cookie value from a supertest response. */
export function getCookie(res: request.Response, name: string): string | undefined {
  const raw = res.headers['set-cookie'] as unknown as string[] | undefined;
  const hit = raw?.find((c) => c.startsWith(`${name}=`));
  return hit?.split(';')[0]?.slice(name.length + 1);
}
