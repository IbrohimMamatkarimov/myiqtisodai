'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Wallet, TrendingUp, TrendingDown, PiggyBank } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { formatAmount } from '@/lib/currency';
import type { DashboardSummary } from '@/types/finance';

export default function AccountsPage() {
  const checked = useRequireAuth();
  const t = useTranslations('accounts');
  const tc = useTranslations('common');
  const user = useAuthStore((s) => s.user);

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!checked) return;
    api
      .get<DashboardSummary>('/dashboard/summary')
      .then(({ data }) => setSummary(data))
      .finally(() => setLoading(false));
  }, [checked]);

  if (!checked) return null;

  const currency = user?.currency || 'UZS';
  const balance = summary ? summary.total_income - summary.total_expenses : 0;

  const cards = summary
    ? [
        { label: t('currentBalance'), value: balance, icon: Wallet, bg: 'bg-primary/15', fg: 'text-primary' },
        { label: t('totalIncome'), value: summary.total_income, icon: TrendingUp, bg: 'bg-secondary/15', fg: 'text-secondary' },
        { label: t('totalExpenses'), value: summary.total_expenses, icon: TrendingDown, bg: 'bg-danger/15', fg: 'text-danger' },
        { label: t('totalSavings'), value: summary.total_savings, icon: PiggyBank, bg: 'bg-primary/15', fg: 'text-primary' },
      ]
    : [];

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-textmain">{t('title')}</h1>
        <p className="text-sm text-textmuted mt-0.5">{t('subtitle')}</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="glass-card animate-pulse" style={{ height: 100 }} />
          ))}
        </div>
      ) : !summary ? (
        <div className="glass-card p-8 text-center text-sm text-textmuted">{tc('loading')}</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            {cards.map(({ label, value, icon: Icon, bg, fg }) => (
              <div key={label} className="glass-card p-5">
                <div className="flex items-center gap-3">
                  <span className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${bg} ${fg}`}>
                    <Icon size={18} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs text-textmuted">{label}</p>
                    <p className="font-display text-xl font-bold text-textmain tabular-nums truncate">
                      {formatAmount(value, currency)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="glass-card p-6">
            <h2 className="font-display font-semibold text-textmain mb-4">{t('mainAccount')}</h2>
            <div className="flex items-center justify-between py-2.5 border-b border-textmain/[0.06]">
              <span className="flex items-center gap-2.5 text-sm text-textmain">
                <span className="h-8 w-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
                  <Wallet size={15} />
                </span>
                {t('mainAccount')}
              </span>
              <span className="text-sm font-semibold tabular-nums text-textmain">
                {formatAmount(balance, currency)}
              </span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <span className="flex items-center gap-2.5 text-sm text-textmain">
                <span className="h-8 w-8 rounded-lg bg-secondary/15 text-secondary flex items-center justify-center">
                  <PiggyBank size={15} />
                </span>
                {t('cash')}
              </span>
              <span className="text-sm font-semibold tabular-nums text-textmain">
                {formatAmount(summary.total_savings, currency)}
              </span>
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}
