import express, { type Express } from 'express';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from './config/env';
import { logger } from './lib/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimit';
import { authRouter } from './modules/auth/auth.routes';
import { usersRouter } from './modules/users/users.routes';
import { organizationRouter } from './modules/organization/organization.routes';
import { customersRouter } from './modules/customers/customers.routes';
import { productsRouter } from './modules/products/products.routes';
import { invoicesRouter } from './modules/invoices/invoices.routes';
import { datasetsRouter } from './modules/datasets/datasets.routes';
import { aiSettingsRouter } from './modules/ai/ai.routes';
import { dashboardRouter } from './modules/dashboard/dashboard.routes';
import { healthRouter } from './modules/health/health.routes';
import { publicConfigRouter } from './modules/config.routes';

function resolveWebDist(): string | null {
  if (env.WEB_DIST_PATH) return existsSync(env.WEB_DIST_PATH) ? env.WEB_DIST_PATH : null;
  let dir = path.dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 6; i++) {
    const candidate = path.join(dir, 'apps', 'web', 'dist');
    if (existsSync(path.join(candidate, 'index.html'))) return candidate;
    const sibling = path.join(dir, 'web', 'dist');
    if (existsSync(path.join(sibling, 'index.html'))) return sibling;
    dir = path.dirname(dir);
  }
  return null;
}

export function createApp(): Express {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', env.trustProxy);
  app.set('query parser', 'simple');

  app.use(
    pinoHttp({
      logger,
      genReqId: (req, res) => {
        const incoming = req.headers['x-request-id'];
        const id = typeof incoming === 'string' && /^[\w-]{8,64}$/.test(incoming) ? incoming : randomUUID();
        res.setHeader('x-request-id', id);
        return id;
      },
      autoLogging: { ignore: (req) => req.url === '/api/health' },
      // Log only what is useful; never headers, cookies or bodies.
      serializers: {
        req: (req: { id: string; method: string; url: string }) => ({
          id: req.id,
          method: req.method,
          url: req.url?.split('?')[0],
        }),
        res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
      },
      customLogLevel: (_req, res, err) =>
        err || res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
    }),
  );

  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          // React/Recharts set inline style *attributes* (not <style> tags).
          styleSrcAttr: ["'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'blob:'],
          fontSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameSrc: ["'none'"],
          frameAncestors: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          workerSrc: ["'self'", 'blob:'],
          manifestSrc: ["'self'"],
          ...(env.cookieSecure ? { upgradeInsecureRequests: [] } : {}),
        },
      },
      crossOriginEmbedderPolicy: false,
      strictTransportSecurity: env.cookieSecure ? { maxAge: 31_536_000, includeSubDomains: true } : false,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    }),
  );
  app.use((_req, res, next) => {
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
    next();
  });

  app.use(
    cors({
      origin: (origin, cb) => cb(null, !origin || env.corsOrigins.includes(origin)),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Request-Id'],
      exposedHeaders: ['Content-Disposition', 'X-Request-Id'],
      maxAge: 600,
    }),
  );
  app.use(compression());
  app.use(express.json({ limit: env.BODY_LIMIT }));
  app.use(express.urlencoded({ extended: false, limit: '100kb' }));
  app.use(cookieParser());

  app.use('/api/health', healthRouter);
  app.use('/api', apiLimiter);
  app.use('/api', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  app.use('/api/config', publicConfigRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/organization', organizationRouter);
  app.use('/api/settings/ai', aiSettingsRouter);
  app.use('/api/customers', customersRouter);
  app.use('/api/products', productsRouter);
  app.use('/api/invoices', invoicesRouter);
  app.use('/api/datasets', datasetsRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api', notFoundHandler);

  // Serve the built React app (single-service deploy).
  const webDist = env.SERVE_WEB ? resolveWebDist() : null;
  if (webDist) {
    app.use(
      express.static(webDist, {
        index: false,
        setHeaders: (res, filePath) => {
          if (filePath.includes(`${path.sep}assets${path.sep}`))
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        },
      }),
    );
    app.get('/{*splat}', (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.join(webDist, 'index.html'));
    });
    logger.info({ webDist }, 'serving web app');
  }

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
