import { ReactNode } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';

export function StatCard({
  label,
  value,
  changePercent,
  icon,
  accent = 'default',
}: {
  label: string;
  value: string;
  changePercent?: number;
  icon: ReactNode;
  accent?: 'default' | 'emerald' | 'coral' | 'gold';
}) {
  const styles = {
    default: {
      icon: 'text-slate-700',
      bg: 'bg-slate-100',
      border: 'border-slate-200',
    },
    emerald: {
      icon: 'text-emerald-600',
      bg: 'bg-emerald-100',
      border: 'border-emerald-200',
    },
    coral: {
      icon: 'text-red-500',
      bg: 'bg-red-100',
      border: 'border-red-200',
    },
    gold: {
      icon: 'text-amber-500',
      bg: 'bg-amber-100',
      border: 'border-amber-200',
    },
  };

  const current = styles[accent];

  return (
    <div
      className={`rounded-3xl border ${current.border} bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl`}
    >
      <div className="flex items-center justify-between">

        <div>
          <p className="text-sm font-medium text-slate-500">
            {label}
          </p>

          <h2 className="mt-3 text-3xl font-bold text-slate-900 tabular-nums">
            {value}
          </h2>

          {typeof changePercent === 'number' && (
            <div
              className={`mt-3 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                changePercent >= 0
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'bg-red-50 text-red-500'
              }`}
            >
              {changePercent >= 0 ? (
                <ArrowUp size={12} />
              ) : (
                <ArrowDown size={12} />
              )}

              {Math.abs(changePercent)}%
            </div>
          )}
        </div>

        <div
          className={`flex h-14 w-14 items-center justify-center rounded-2xl ${current.bg} ${current.icon}`}
        >
          {icon}
        </div>

      </div>
    </div>
  );
}
