'use client';

import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Wallet, TrendingDown, PiggyBank, HeartPulse, Sparkles, Loader2 } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { StatCard } from '@/components/stat-card';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import type { DashboardSummary } from '@/types/finance';

const COLORS = ['#D4A93F', '#22B573', '#E15B4E', '#3B82F6', '#8B5CF6'];

const LANGUAGE_NAMES: Record<string, string> = {
  uz: 'Uzbek',
  en: 'English',
  ru: 'Russian',
};

function moodEmoji(score: number) {
  if (score >= 70) return '😊';
  if (score >= 40) return '😐';
  return '😟';
}

export default function DashboardPage() {
  const checked = useRequireAuth();
  const t = useTranslations('dashboard');
  const locale = useLocale();
  const user = useAuthStore((s) => s.user);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [insight, setInsight] = useState<string | null>(null);
  const [insightLoading, setInsightLoading] = useState(true);

  useEffect(() => {
    if (!checked) return;
    api
      .get<DashboardSummary>('/dashboard/summary')
      .then(({ data }) => setSummary(data))
      .finally(() => setLoading(false));

    const languageName = LANGUAGE_NAMES[locale] || 'English';
    api
      .post('/ai/ask', {
        question: `Respond only in ${languageName}, regardless of any other instruction. Summarize my current financial situation in 2-3 sentences, then give me 2-3 short, specific pieces of advice or predictions based on my actual numbers. Keep it concise and encouraging.`,
      })
      .then(({ data }) => setInsight(data.answer))
      .catch(() => setInsight(null))
      .finally(() => setInsightLoading(false));
  }, [checked, locale]);

  if (!checked) return null;

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold">
          {t('greeting', { name: user?.full_name?.split(' ')[0] || '' })}
        </h1>
        <p className="text-sm text-ink-700/60 dark:text-cream-100/60 mt-1">{t('subtitle')}</p>
      </div>

      {loading || !summary ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-5 h-28 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <StatCard
              label={t('income')}
              value={summary.total_income.toLocaleString()}
              changePercent={summary.month_over_month_income_change_percent}
              icon={<Wallet size={18} />}
              accent="emerald"
            />
            <StatCard
              label={t('expenses')}
              value={summary.total_expenses.toLocaleString()}
              changePercent={summary.month_over_month_expense_change_percent}
              icon={<TrendingDown size={18} />}
              accent="coral"
            />
            <StatCard
              label={t('remaining')}
              value={summary.remaining_balance.toLocaleString()}
              icon={<PiggyBank size={18} />}
              accent="gold"
            />
            <StatCard
              label={t('financialHealth')}
              value={`${moodEmoji(summary.financial_health_score)} ${Math.round(summary.financial_health_score / 10)}/10`}
              icon={<HeartPulse size={18} />}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="glass-card p-5 lg:col-span-2">
              <h2 className="font-display font-semibold mb-4">Top expense categories</h2>
              {summary.top_expense_categories.length === 0 ? (
                <p className="text-sm text-ink-700/60 dark:text-cream-100/60">
                  No expenses recorded yet this month.
                </p>
              ) : (
                <div className="space-y-3">
                  {summary.top_expense_categories.map((c, i) => (
                    <div key={c.category_id || i}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{c.category_name}</span>
                        <span className="tabular-nums font-medium">{c.total.toLocaleString()}</span>
                      </div>
                      <div className="h-2 rounded-full bg-ink-900/5 dark:bg-cream-100/10 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${c.percent}%`, backgroundColor: COLORS[i % COLORS.length] }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="glass-card p-5">
              <h2 className="font-display font-semibold mb-4">Distribution</h2>
              {summary.top_expense_categories.length === 0 ? (
                <p className="text-sm text-ink-700/60 dark:text-cream-100/60">Nothing to show yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={summary.top_expense_categories}
                      dataKey="total"
                      nameKey="category_name"
                      innerRadius={50}
                      outerRadius={80}
                    >
                      {summary.top_expense_categories.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="glass-card p-5 mt-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={16} className="text-gold-600 dark:text-gold-400" />
              <h2 className="font-display font-semibold">{t('aiRecommendations')}</h2>
            </div>
            {insightLoading ? (
              <div className="flex items-center gap-2 text-sm text-ink-700/60 dark:text-cream-100/60">
                <Loader2 size={14} className="animate-spin" /> Analyzing your finances…
              </div>
            ) : insight ? (
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{insight}</p>
            ) : (
              <p className="text-sm text-ink-700/60 dark:text-cream-100/60">
                Add some income and expenses, then check back here for personalized insights.
              </p>
            )}
          </div>
        </>
      )}
    </AppShell>
  );
}
