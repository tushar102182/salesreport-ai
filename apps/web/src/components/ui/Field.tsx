import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { cn } from '../../lib/cn';

interface FieldProps {
  label?: ReactNode;
  error?: string;
  hint?: ReactNode;
  className?: string;
  children: (id: string, describedBy?: string) => ReactNode;
}

export function Field({ label, error, hint, className, children }: FieldProps) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="label">
          {label}
        </label>
      )}
      {children(id, describedBy)}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: ReactNode;
  error?: string;
  hint?: ReactNode;
  wrapperClassName?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, wrapperClassName, className, ...props },
  ref,
) {
  return (
    <Field label={label} error={error} hint={hint} className={wrapperClassName}>
      {(id, describedBy) => (
        <input
          ref={ref}
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={cn('input', error && 'border-red-400 focus:border-red-500 focus:ring-red-500/20', className)}
          {...props}
        />
      )}
    </Field>
  );
});

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: ReactNode;
  error?: string;
  hint?: ReactNode;
  wrapperClassName?: string;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, hint, wrapperClassName, className, children, ...props },
  ref,
) {
  return (
    <Field label={label} error={error} hint={hint} className={wrapperClassName}>
      {(id, describedBy) => (
        <select
          ref={ref}
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={cn('input pr-8', error && 'border-red-400', className)}
          {...props}
        >
          {children}
        </select>
      )}
    </Field>
  );
});

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: ReactNode;
  error?: string;
  hint?: ReactNode;
  wrapperClassName?: string;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, hint, wrapperClassName, className, ...props },
  ref,
) {
  return (
    <Field label={label} error={error} hint={hint} className={wrapperClassName}>
      {(id, describedBy) => (
        <textarea
          ref={ref}
          id={id}
          rows={3}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={cn('input resize-y', error && 'border-red-400', className)}
          {...props}
        />
      )}
    </Field>
  );
});
