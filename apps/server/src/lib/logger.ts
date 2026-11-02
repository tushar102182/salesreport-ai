import pino from 'pino';
import { env } from '../config/env';

/** Paths that must never reach the logs. */
export const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-csrf-token"]',
  'res.headers["set-cookie"]',
  '*.password',
  '*.newPassword',
  '*.currentPassword',
  '*.passwordHash',
  '*.apiKey',
  '*.accessToken',
  '*.refreshToken',
  '*.token',
  '*.llmApiKeyEnc',
];

export const logger = pino({
  level: env.isTest ? 'silent' : env.LOG_LEVEL,
  redact: { paths: REDACT_PATHS, censor: '[REDACTED]' },
  base: { service: 'salesreport-api' },
  timestamp: pino.stdTimeFunctions.isoTime,
  ...(env.isProd || env.isTest
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname,service' },
        },
      }),
});
