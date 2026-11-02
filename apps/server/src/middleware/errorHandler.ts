import type { ErrorRequestHandler, RequestHandler } from 'express';
import multer from 'multer';
import { Prisma } from '@prisma/client';
import { env } from '../config/env';
import { AppError } from '../lib/errors';

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` } });
};

/** Centralized error handler. Never leaks stack traces or internals in production. */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const requestId = String(req.id ?? '');
  let status = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'Something went wrong. Please try again.';
  let details: unknown;

  if (err instanceof AppError) {
    ({ status, code, message, details } = err);
  } else if (err instanceof multer.MulterError) {
    status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    code = err.code === 'LIMIT_FILE_SIZE' ? 'FILE_TOO_LARGE' : 'UPLOAD_ERROR';
    message = err.code === 'LIMIT_FILE_SIZE' ? 'File is too large' : 'Invalid upload';
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      status = 409;
      code = 'CONFLICT';
      message = 'A record with the same unique value already exists';
    } else if (err.code === 'P2025') {
      status = 404;
      code = 'NOT_FOUND';
      message = 'Resource not found';
    } else if (err.code === 'P2003') {
      status = 409;
      code = 'IN_USE';
      message = 'This record is referenced by other records';
    }
  } else if (err?.type === 'entity.too.large') {
    status = 413;
    code = 'PAYLOAD_TOO_LARGE';
    message = 'Request body is too large';
  } else if (err?.type === 'entity.parse.failed') {
    status = 400;
    code = 'INVALID_JSON';
    message = 'Malformed JSON body';
  }

  if (status >= 500) req.log?.error({ err }, 'unhandled error');
  else req.log?.debug({ code, status }, 'request error');

  if (res.headersSent) return;
  res.status(status).json({
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
      requestId,
      ...(!env.isProd && status >= 500 && err instanceof Error ? { debug: err.message } : {}),
    },
  });
};
