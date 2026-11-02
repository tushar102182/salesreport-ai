import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import i18n from '../i18n';
import { ApiError } from './api';

/** Human message for any thrown error, localized where possible. */
export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === 'NETWORK_ERROR') return i18n.t('errors.network');
    if (err.status === 403 && err.code === 'FORBIDDEN') return err.message || i18n.t('errors.forbidden');
    return err.message || i18n.t('errors.generic');
  }
  return i18n.t('errors.generic');
}

/** Maps server-side VALIDATION_ERROR details onto react-hook-form fields. Returns true if any were applied. */
export function applyServerErrors<T extends FieldValues>(err: unknown, setError: UseFormSetError<T>): boolean {
  if (!(err instanceof ApiError) || !Array.isArray(err.details)) return false;
  let applied = false;
  for (const d of err.details as { path?: string; message?: string }[]) {
    if (d.path && d.message) {
      setError(d.path as Path<T>, { type: 'server', message: d.message });
      applied = true;
    }
  }
  return applied;
}
