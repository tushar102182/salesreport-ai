import multer from 'multer';
import path from 'node:path';
import { UPLOAD_LIMITS } from '@salesreport/shared';
import { AppError } from '../lib/errors';

const SHEET_MIME = new Set([
  'text/csv',
  'application/csv',
  'text/plain',
  'application/vnd.ms-excel', // Windows reports .csv like this
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/octet-stream',
]);
const SHEET_EXT = new Set(['.csv', '.xlsx']);

const IMAGE_MIME = new Set(['image/png', 'image/jpeg']);
const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg']);

/** Files are parsed in memory and never written to disk. */
export const spreadsheetUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: UPLOAD_LIMITS.maxFileBytes, files: 1, fields: 10, fieldSize: 10_000, parts: 12 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!SHEET_EXT.has(ext) || !SHEET_MIME.has(file.mimetype)) {
      cb(new AppError(415, 'UNSUPPORTED_FILE', 'Only .csv and .xlsx files are supported'));
      return;
    }
    cb(null, true);
  },
}).single('file');

export const logoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: UPLOAD_LIMITS.maxLogoBytes, files: 1, fields: 0, parts: 1 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!IMAGE_EXT.has(ext) || !IMAGE_MIME.has(file.mimetype)) {
      cb(new AppError(415, 'UNSUPPORTED_FILE', 'Logo must be a PNG or JPEG image'));
      return;
    }
    cb(null, true);
  },
}).single('logo');

/** Verifies file content by magic bytes (never trust the client-provided MIME type). */
export function detectSpreadsheetType(buf: Buffer, originalName: string): 'csv' | 'xlsx' {
  const ext = path.extname(originalName).toLowerCase();
  const isZip = buf.length > 4 && buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04;
  if (ext === '.xlsx') {
    if (!isZip) throw new AppError(415, 'UNSUPPORTED_FILE', 'File content is not a valid .xlsx workbook');
    return 'xlsx';
  }
  if (isZip || buf.subarray(0, 8192).includes(0)) {
    throw new AppError(415, 'UNSUPPORTED_FILE', 'File content is not a valid CSV text file');
  }
  return 'csv';
}

export function detectImageMime(buf: Buffer): 'image/png' | 'image/jpeg' {
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'image/png';
  }
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  throw new AppError(415, 'UNSUPPORTED_FILE', 'Logo must be a PNG or JPEG image');
}
