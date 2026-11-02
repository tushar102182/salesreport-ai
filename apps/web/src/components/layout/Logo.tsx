import { BarChart3 } from 'lucide-react';

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex size-9 items-center justify-center rounded-xl bg-linear-to-br from-brand-600 to-cyan-500 text-white shadow-md shadow-brand-600/20">
        <BarChart3 className="size-5" />
      </div>
      {!compact && (
        <div className="leading-tight">
          <div className="text-[15px] font-bold tracking-tight text-slate-900 dark:text-white">
            SalesReport{' '}
            <span className="bg-linear-to-r from-brand-600 to-cyan-500 bg-clip-text text-transparent">AI</span>
          </div>
        </div>
      )}
    </div>
  );
}
