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
  const accentClasses: Record<string, string> = {
    default: 'text-ink-900 dark:text-cream-100',
    emerald: 'text-emerald-500',
    coral: 'text-coral-500',
    gold: 'text-gold-600 dark:text-gold-400',
  };

  return (
    <div className="glass-card p-5 animate-fade-up">
      <div className="flex items-center justify-between mb-3">
        <span className="label-text">{label}</span>
        <div className={accentClasses[accent]}>{icon}</div>
      </div>
      <div className="font-display text-2xl font-bold tabular-nums">{value}</div>
      {typeof changePercent === 'number' && (
        <div
          className={`mt-1.5 flex items-center gap-1 text-xs font-medium ${
            changePercent >= 0 ? 'text-emerald-500' : 'text-coral-500'
          }`}
        >
          {changePercent >= 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
          {Math.abs(changePercent)}%
        </div>
      )}
    </div>
  );
}
