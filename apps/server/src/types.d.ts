import type { AuthUser } from './lib/http';

declare global {
  namespace Express {
    interface Request {
      auth?: AuthUser;
    }
  }
}

export {};
