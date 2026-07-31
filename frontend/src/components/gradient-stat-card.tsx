'use client';

import { ReactNode } from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { ArrowUp, ArrowDown } from 'lucide-react';

type GradientKey = 'income' | 'expense' | 'savings' | 'health';

// Single accent colors, used sparingly (icon chip + sparkline + change badge)
// rather than as a full card-filling gradient - calmer, less "toy app" look.
const ACCENTS: Record<GradientKey, string> = {
  income: '#16A34A',
  expense: '#64748B',
  savings: '#3B82F6',
  health: '#8B5CF6',
};

export function GradientStatCard({
  label,
  value,
  changePercent,
  icon,
  gradient,
  sparkline,
}: {
  label: string;
  value: string;
  changePercent?: number;
  icon: ReactNode;
  gradient: GradientKey;
  sparkline?: number[];
}) {
  const accent = ACCENTS[gradient];
  const chartData = (sparkline && sparkline.length > 1 ? sparkline : [0, 0, 0, 0, 0, 0, 0]).map(
    (v, i) => ({ i, v })
  );
  const gradId = `spark-${gradient}`;

  return (
    <div className="glass-card p-6" style={{ height: 170 }}>
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-textmuted">{label}</p>
        <div
          className="flex h-9 w-9 items-center justify-center rounded-xl"
          style={{ background: `${accent}1A`, color: accent }}
        >
          {icon}
        </div>
      </div>

      <h2 className="mt-4 text-[28px] leading-tight font-bold tabular-nums font-display text-textmain">
        {value}
      </h2>

      <div className="mt-2 flex items-end justify-between">
        {typeof changePercent === 'number' ? (
          <div
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold"
            style={{ background: `${accent}1A`, color: accent }}
          >
            {changePercent >= 0 ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
            {Math.abs(changePercent)}%
          </div>
        ) : (
          <span />
        )}

        <div className="h-10 w-24">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={accent} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={accent} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke={accent}
                strokeWidth={2}
                fill={`url(#${gradId})`}
                isAnimationActive
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
