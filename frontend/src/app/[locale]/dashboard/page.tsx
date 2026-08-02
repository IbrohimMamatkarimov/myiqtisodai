'use client';

import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Plus, Wallet, Sparkles, ArrowRight, Target } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { ScanReceiptFab } from '@/components/ScanReceiptFab';
import { QuickAddExpenseFab } from '@/components/QuickAddExpenseFab';
import { Link } from '@/navigation';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { formatAmount } from '@/lib/currency';
import type { DashboardSummary, Expense, Income } from '@/types/finance';

const LANGUAGE_NAMES: Record<string, string> = {
  uz: 'Uzbek',
  en: 'English',
  ru: 'Russian',
};

const INSIGHT_CACHE_KEY = 'dashboard-insight-cache';
const INSIGHT_CACHE_TTL_MS = 5 * 60 * 1000;

type Txn =
  | { type: 'expense'; date: string; item: Expense }
  | { type: 'income'; date: string; item: Income };

export default function DashboardPage() {
  const checked = useRequireAuth();
  const t = useTranslations('dashboard');
  const locale = useLocale();
  const user = useAuthStore((s) => s.user);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [insight, setInsight] = useState<string | null>(null);
  const [insightLoading, setInsightLoading] = useState(true);

  useEffect(() => {
    if (!checked) return;

    api
      .get<DashboardSummary>('/dashboard/summary')
      .then(({ data }) => setSummary(data))
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));

    Promise.all([
      api.get('/expenses', { params: { page_size: 5 } }),
      api.get('/incomes', { params: { page_size: 5 } }),
    ])
      .then(([expensesRes, incomesRes]) => {
        const expenseTxns: Txn[] = expensesRes.data.items.map((item: Expense) => ({
          type: 'expense' as const,
          date: item.expense_date,
          item,
        }));
        const incomeTxns: Txn[] = incomesRes.data.map((item: Income) => ({
          type: 'income' as const,
          date: item.income_date,
          item,
        }));
        const merged = [...expenseTxns, ...incomeTxns]
          .sort((a, b) => (a.date < b.date ? 1 : -1))
          .slice(0, 5);
        setTxns(merged);
      })
      .catch(() => setTxns([]));

    let cached: { locale: string; insight: string; ts: number } | null = null;
    try {
      const raw = sessionStorage.getItem(INSIGHT_CACHE_KEY);
      if (raw) cached = JSON.parse(raw);
    } catch {
      // ignore
    }

    if (cached && cached.locale === locale && Date.now() - cached.ts < INSIGHT_CACHE_TTL_MS) {
      setInsight(cached.insight);
      setInsightLoading(false);
      return;
    }

    const languageName = LANGUAGE_NAMES[locale] || 'English';
    api
      .post('/ai/ask', {
        question: `Respond only in ${languageName}, regardless of any other instruction. In exactly 1-2 short sentences, tell me how my spending is trending and ONE specific, actionable way to save money, based on my actual numbers. No preamble, no bullet points, just the 1-2 sentences.`,
        save_history: false,
      })
      .then(({ data }) => {
        setInsight(data.answer);
        try {
          sessionStorage.setItem(
            INSIGHT_CACHE_KEY,
            JSON.stringify({ locale, insight: data.answer, ts: Date.now() })
          );
        } catch {
          // ignore
        }
      })
      .catch(() => setInsight(null))
      .finally(() => setInsightLoading(false));
  }, [checked, locale]);

  if (!checked) return null;

  if (loadError) {
    return (
      <AppShell>
        <div className="glass-card p-10 text-center">
          <p className="font-semibold text-textmain">Couldn't load your dashboard</p>
          <p className="text-sm text-textmuted mt-1">Check your connection and try refreshing the page.</p>
        </div>
      </AppShell>
    );
  }

  let balance = 0;
  let balanceDelta: number | null = null;
  if (summary) {
    balance = summary.total_income - summary.total_expenses;
    const incomePct = summary.month_over_month_income_change_percent;
    const expensePct = summary.month_over_month_expense_change_percent;
    if (incomePct > -100 && expensePct > -100) {
      const prevIncome = summary.total_income / (1 + incomePct / 100);
      const prevExpenses = summary.total_expenses / (1 + expensePct / 100);
      balanceDelta = Math.round(balance - (prevIncome - prevExpenses));
    }
  }

  return (
    <AppShell>
      {loading || !summary ? (
        <div className="space-y-4">
          <div className="glass-card animate-pulse" style={{ height: 140 }} />
          <div className="glass-card animate-pulse" style={{ height: 220 }} />
        </div>
      ) : (
        <div className="space-y-5 max-w-2xl">
          {/* Hero: personal greeting + balance, warmer than a bare number */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full overflow-hidden shrink-0">
                <img src="/iqtisod-newphoto.png" alt="" className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0">
                <p className="font-display font-semibold text-textmain truncate">
                  {t('greeting', { name: user?.full_name?.split(' ')[0] || '' })} 👋
                </p>
                <p className="text-xs text-textmuted">{t('heroSubtitle')}</p>
              </div>
            </div>

            <p className="label-text">{t('balance')}</p>
            <p className="mt-1 font-display text-4xl font-bold text-textmain tabular-nums">
              {formatAmount(balance, user?.currency || 'UZS')}
            </p>
            {balanceDelta !== null ? (
              <p className={`mt-1 text-sm font-medium ${balanceDelta >= 0 ? 'text-secondary' : 'text-danger'}`}>
                {balanceDelta >= 0 ? '+' : ''}
                {formatAmount(balanceDelta, user?.currency || 'UZS')} {t('vsLastMonthShort')}
              </p>
            ) : (
              <p className="mt-1 text-sm text-textmuted">
                {(summary?.recent_transactions_count ?? 0) > 0 ? t('heroNudgeActive') : t('heroNudgeEmpty')}
              </p>
            )}

            <div className="flex flex-wrap gap-2 mt-5">
              <Link href="/expenses" className="btn-primary">
                <Plus size={16} />
                {t('qaAddExpense')}
              </Link>
              <Link href="/income" className="btn-secondary">
                <Wallet size={16} />
                {t('qaAddIncome')}
              </Link>
              <Link href="/assistant" className="btn-secondary">
                <Sparkles size={16} />
                {t('qaAskAI')}
              </Link>
            </div>
          </div>

          {/* Goal card - only shown once the person actually has an active goal */}
          {summary && summary.active_goals.length > 0 && (
            <Link href="/goals" className="glass-card p-6 block hover:brightness-[0.98] transition-all">
              <div className="flex items-center gap-2 mb-3">
                <Target size={16} className="text-primary" />
                <h2 className="font-display font-semibold text-textmain">{summary.active_goals[0].title}</h2>
                <span className="ml-auto text-sm font-semibold text-primary">
                  {Math.round(summary.active_goals[0].progress_percent)}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-textmain/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${Math.min(100, summary.active_goals[0].progress_percent)}%` }}
                />
              </div>
              <p className="text-xs text-textmuted mt-2">
                {formatAmount(summary.active_goals[0].current_amount, user?.currency || 'UZS')} /{' '}
                {formatAmount(summary.active_goals[0].target_amount, user?.currency || 'UZS')}
                {' — '}
                {t('goalCardRemaining', {
                  amount: formatAmount(
                    Math.max(0, summary.active_goals[0].target_amount - summary.active_goals[0].current_amount),
                    user?.currency || 'UZS'
                  ),
                })}
              </p>
            </Link>
          )}

          {/* Recent transactions */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-semibold text-textmain">{t('recentTransactions')}</h2>
              <Link href="/expenses" className="text-sm text-secondary font-medium hover:underline flex items-center gap-1">
                {t('seeAll')}
                <ArrowRight size={13} />
              </Link>
            </div>

            {txns.length === 0 ? (
              <p className="text-sm text-textmuted py-6 text-center">{t('emptyTodaySubtitle')}</p>
            ) : (
              <div className="divide-y divide-textmain/[0.06]">
                {txns.map((txn, i) => (
                  <div key={i} className="flex items-center justify-between py-2.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-lg shrink-0">{txn.type === 'income' ? '💰' : '🧾'}</span>
                      <span className="text-sm text-textmain truncate">
                        {txn.type === 'expense'
                          ? txn.item.merchant_name || txn.item.description || t('uncategorized')
                          : (txn.item as Income).source_name}
                      </span>
                    </div>
                    <span className={`text-sm font-semibold tabular-nums shrink-0 ${txn.type === 'income' ? 'text-secondary' : 'text-textmain'}`}>
                      {txn.type === 'income' ? '+' : '-'}
                      {txn.item.amount.toLocaleString()} {txn.item.currency}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-textmain/[0.06]">
              <ScanReceiptFab variant="inline" />
            </div>
          </div>

          {/* AI Coach - short, no fluff */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={16} className="text-primary" />
              <h2 className="font-display font-semibold text-textmain">{t('aiCoachBadge')}</h2>
            </div>
            <p className="text-sm text-textmuted min-h-[1.5rem]">
              {insightLoading ? t('aiCoachLoading') : insight || t('aiCoachEmpty')}
            </p>
            <Link href="/assistant" className="inline-flex items-center gap-1 text-sm font-medium text-primary mt-3 hover:underline">
              {t('aiCoachChat')}
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      )}
      <QuickAddExpenseFab />
    </AppShell>
  );
}
