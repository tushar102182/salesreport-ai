import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { cn } from './cn';

interface Toast {
  id: number;
  kind: 'success' | 'error';
  message: string;
}
const ToastContext = createContext<{ success: (m: string) => void; error: (m: string) => void } | null>(null);

/** Tiny accessible toast system (no third-party CSS injection, keeps CSP strict). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((kind: Toast['kind'], message: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-3), { id, kind, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'error' ? 6000 : 3500);
  }, []);
  return (
    <ToastContext.Provider value={{ success: (m) => push('success', m), error: (m) => push('error', m) }}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:items-end sm:pr-6"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.kind === 'error' ? 'alert' : 'status'}
            className={cn(
              'pointer-events-auto flex w-full max-w-sm animate-fade-in items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg',
              t.kind === 'success'
                ? 'border-emerald-200 bg-white text-slate-800 dark:border-emerald-900 dark:bg-slate-900 dark:text-slate-100'
                : 'border-red-200 bg-white text-slate-800 dark:border-red-900 dark:bg-slate-900 dark:text-slate-100',
            )}
          >
            {t.kind === 'success' ? (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
            ) : (
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-500" />
            )}
            <span className="flex-1">{t.message}</span>
            <button
              onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}
              className="text-slate-400 hover:text-slate-600"
              aria-label="Dismiss"
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
