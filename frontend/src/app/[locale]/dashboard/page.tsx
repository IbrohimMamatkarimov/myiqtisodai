'use client';

import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
  Plus, Wallet, Sparkles, ArrowRight, Target, Camera, Loader2, UploadCloud,
  ShoppingCart, Car, Utensils, ShoppingBag, CreditCard, Receipt as ReceiptIcon,
} from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { AchievementToast } from '@/components/AchievementToast';
import { Link, useRouter } from '@/navigation';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { formatAmount } from '@/lib/currency';
import { SCAN_DRAFT_STORAGE_KEY } from '@/components/quick-actions';
import type { DashboardSummary, Expense, Income, Goal, ReceiptScanResult } from '@/types/finance';

const LANGUAGE_NAMES: Record<string, string> = {
  uz: 'Uzbek',
  en: 'English',
  ru: 'Russian',
};

const INSIGHT_CACHE_KEY = 'dashboard-insight-cache';
const INSIGHT_CACHE_TTL_MS = 5 * 60 * 1000;

/** Rough keyword-based icon/color for a transaction row - the app doesn't
 * join full category data (color/icon) into expense/income list responses,
 * so this gives a close visual match without a backend change. */
type Txn =
  | { type: 'expense'; date: string; item: Expense }
  | { type: 'income'; date: string; item: Income };

function txnVisual(txn: Txn): { Icon: typeof ShoppingCart; bg: string; fg: string } {
  if (txn.type === 'income') {
    return { Icon: CreditCard, bg: 'bg-secondary/15', fg: 'text-secondary' };
  }
  const text = `${txn.item.merchant_name || ''} ${(txn.item as Expense).ai_category || ''} ${txn.item.description || ''}`.toLowerCase();
  if (/(grocer|market|korzinka|oziq|produkt)/.test(text)) return { Icon: ShoppingCart, bg: 'bg-danger/15', fg: 'text-danger' };
  if (/(taxi|yandex|go|transport|bus|metro)/.test(text)) return { Icon: Car, bg: 'bg-warning/15', fg: 'text-warning' };
  if (/(cafe|kafe|restoran|restaurant|food|ovqat)/.test(text)) return { Icon: Utensils, bg: 'bg-warning/15', fg: 'text-warning' };
  if (/(shop|xarid|do'kon|clothes|kiyim)/.test(text)) return { Icon: ShoppingBag, bg: 'bg-primary/15', fg: 'text-primary' };
  return { Icon: ReceiptIcon, bg: 'bg-textmain/[0.06]', fg: 'text-textmuted' };
}

const SHORT_MONTHS: Record<string, string[]> = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  ru: ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'],
  uz: ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyun', 'Iyul', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'],
};

function formatTxnTime(createdAt: string | undefined, locale: string, todayLabel: string): string {
  if (!createdAt) return '';
  const d = new Date(createdAt);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const hhmm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return `${todayLabel}, ${hhmm}`;
  const months = SHORT_MONTHS[locale] || SHORT_MONTHS.en;
  return `${d.getDate()} ${months[d.getMonth()]}, ${hhmm}`;
}

/** The AI is asked for exactly 3 tips, one per line. Splits + cleans up
 * common formatting the model might still add (numbering, dashes) despite
 * being told not to, and falls back gracefully to whatever it got. */
function parseTips(raw: string): string[] {
  const lines = raw
    .split('\n')
    .map((l) => l.replace(/^[\s\-•*\d.)]+/, '').trim())
    .filter(Boolean);
  return lines.length > 0 ? lines.slice(0, 3) : [raw.trim()].filter(Boolean);
}

export default function DashboardPage() {
  const checked = useRequireAuth();
  const t = useTranslations('dashboard');
  const te = useTranslations('expenses');
  const ta = useTranslations('accounts');
  const tr = useTranslations('receipts');
  const locale = useLocale();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [tips, setTips] = useState<string[]>([]);
  const [activeTip, setActiveTip] = useState(0);
  const [insightLoading, setInsightLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [dragOver, setDragOver] = useState(false);

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

    api
      .get<Goal[]>('/goals')
      .then(({ data }) => setGoals(data.filter((g) => !g.is_completed).slice(0, 2)))
      .catch(() => setGoals([]));

    let cached: { locale: string; insight: string; ts: number } | null = null;
    try {
      const raw = sessionStorage.getItem(INSIGHT_CACHE_KEY);
      if (raw) cached = JSON.parse(raw);
    } catch {
      // ignore
    }

    if (cached && cached.locale === locale && Date.now() - cached.ts < INSIGHT_CACHE_TTL_MS) {
      setTips(parseTips(cached.insight));
      setInsightLoading(false);
      return;
    }

    const languageName = LANGUAGE_NAMES[locale] || 'English';
    api
      .post('/ai/ask', {
        question: `Respond only in ${languageName}, regardless of any other instruction. Give exactly 3 short, distinct, actionable money tips based on my actual numbers - each one specific and useful on its own. Return ONLY the 3 tips, one per line, no numbering, no bullet symbols, no preamble, no extra commentary.`,
        save_history: false,
      })
      .then(({ data }) => {
        setTips(parseTips(data.answer));
        try {
          sessionStorage.setItem(
            INSIGHT_CACHE_KEY,
            JSON.stringify({ locale, insight: data.answer, ts: Date.now() })
          );
        } catch {
          // ignore
        }
      })
      .catch(() => setTips([]))
      .finally(() => setInsightLoading(false));
  }, [checked, locale]);

  // Auto-rotate through the tips every 6s
  useEffect(() => {
    if (tips.length <= 1) return;
    const interval = setInterval(() => {
      setActiveTip((i) => (i + 1) % tips.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [tips.length]);

  async function handleScanFile(file: File | null | undefined) {
    if (!file) return;
    setScanning(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('language', locale);
      const { data } = await api.post<ReceiptScanResult>('/expenses/scan', formData, { timeout: 25000 });
      sessionStorage.setItem(SCAN_DRAFT_STORAGE_KEY, JSON.stringify(data));
      router.push('/expenses');
    } catch {
      sessionStorage.setItem(SCAN_DRAFT_STORAGE_KEY, JSON.stringify({ warning: te('scanErrorGeneric') }));
      router.push('/expenses');
    } finally {
      setScanning(false);
    }
  }

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
      <AchievementToast summary={summary} />
      {loading || !summary ? (
        <div className="space-y-4">
          <div className="glass-card animate-pulse" style={{ height: 140 }} />
          <div className="glass-card animate-pulse" style={{ height: 220 }} />
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5 items-start">
          {/* Main column */}
          <div className="space-y-5 min-w-0">
            {/* Hero: personal greeting + balance */}
            <div className="hero-balance-card">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-full overflow-hidden shrink-0 bg-white/15">
                  <img src="/robotiqtisod.png" alt="" className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0">
                  <p className="font-display font-semibold text-white truncate">
                    {t('greeting', { name: user?.full_name?.split(' ')[0] || '' })}
                  </p>
                  <p className="text-xs text-white/70">{t('heroSubtitle')}</p>
                </div>
              </div>

              <p className="text-sm text-white/75 font-medium">{t('balance')}</p>
              <p className="mt-1 font-display text-4xl font-bold text-white tabular-nums">
                {formatAmount(balance, user?.currency || 'UZS')}
              </p>
              {balanceDelta !== null ? (
                <p className="mt-1 text-sm font-medium text-white/85">
                  {balanceDelta >= 0 ? '+' : ''}
                  {formatAmount(balanceDelta, user?.currency || 'UZS')} {t('vsLastMonthShort')}
                </p>
              ) : (
                <p className="mt-1 text-sm text-white/75">
                  {(summary?.recent_transactions_count ?? 0) > 0 ? t('heroNudgeActive') : t('heroNudgeEmpty')}
                </p>
              )}

              <div className="flex flex-wrap gap-2 mt-5">
                <Link href="/expenses" className="inline-flex items-center justify-center gap-2 rounded-xl bg-white text-primary font-semibold px-4 py-3 hover:brightness-95 transition-all active:scale-[0.98]">
                  <Plus size={16} />
                  {t('qaAddExpense')}
                </Link>
                <Link href="/income" className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/15 text-white font-medium px-4 py-3 hover:bg-white/25 transition-colors">
                  <Wallet size={16} />
                  {t('qaAddIncome')}
                </Link>
              </div>
            </div>

            {/* Quick actions */}
            <div className="glass-card p-5">
              <h2 className="font-display font-semibold text-textmain mb-3">{t('quickActionsTitle')}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Link href="/expenses" className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-textmain/[0.04] transition-colors">
                  <span className="h-9 w-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
                    <Plus size={17} />
                  </span>
                  <span className="text-sm font-medium text-textmain flex-1">{t('qaAddExpense')}</span>
                  <ArrowRight size={14} className="text-textmuted" />
                </Link>
                <Link href="/income" className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-textmain/[0.04] transition-colors">
                  <span className="h-9 w-9 rounded-lg bg-secondary/15 text-secondary flex items-center justify-center shrink-0">
                    <Wallet size={17} />
                  </span>
                  <span className="text-sm font-medium text-textmain flex-1">{t('qaAddIncome')}</span>
                  <ArrowRight size={14} className="text-textmuted" />
                </Link>
                <label className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-textmain/[0.04] transition-colors cursor-pointer">
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif"
                    capture="environment"
                    className="hidden"
                    disabled={scanning}
                    onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; handleScanFile(f); }}
                  />
                  <span className="h-9 w-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
                    {scanning ? <Loader2 size={17} className="animate-spin" /> : <Camera size={17} />}
                  </span>
                  <span className="text-sm font-medium text-textmain flex-1">{te('scanReceipt')}</span>
                  <ArrowRight size={14} className="text-textmuted" />
                </label>
                <Link href="/assistant" className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-textmain/[0.04] transition-colors">
                  <span className="h-9 w-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
                    <Sparkles size={17} />
                  </span>
                  <span className="text-sm font-medium text-textmain flex-1">{t('qaAskAI')}</span>
                  <ArrowRight size={14} className="text-textmuted" />
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
                <Link href="/transactions" className="text-sm text-secondary font-medium hover:underline flex items-center gap-1">
                  {t('seeAll')}
                  <ArrowRight size={13} />
                </Link>
              </div>

              {txns.length === 0 ? (
                <p className="text-sm text-textmuted py-6 text-center">{t('emptyTodaySubtitle')}</p>
              ) : (
                <div className="divide-y divide-textmain/[0.06]">
                  {txns.map((txn, i) => {
                    const { Icon, bg, fg } = txnVisual(txn);
                    const label =
                      txn.type === 'expense'
                        ? txn.item.merchant_name || txn.item.description || t('uncategorized')
                        : (txn.item as Income).source_name;
                    const subtitle = txn.type === 'expense' ? (txn.item as Expense).ai_category : t('income');
                    return (
                      <div key={i} className="flex items-center justify-between py-2.5">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${bg} ${fg}`}>
                            <Icon size={16} />
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-textmain truncate">{label}</p>
                            {subtitle && <p className="text-xs text-textmuted truncate">{subtitle}</p>}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`text-sm font-semibold tabular-nums ${txn.type === 'income' ? 'text-secondary' : 'text-textmain'}`}>
                            {txn.type === 'income' ? '+' : '-'}
                            {txn.item.amount.toLocaleString()} {txn.item.currency}
                          </p>
                          <p className="text-xs text-textmuted">{formatTxnTime(txn.item.created_at, locale, t('today'))}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Goals - cover images match the Goals page */}
            {goals.length > 0 && (
              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-display font-semibold text-textmain">{t('myGoalsTitle')}</h2>
                  <Link href="/goals" className="text-sm text-secondary font-medium hover:underline flex items-center gap-1">
                    {t('seeAll')}
                    <ArrowRight size={13} />
                  </Link>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {goals.map((goal) => (
                    <Link key={goal.id} href="/goals" className="rounded-2xl overflow-hidden border border-textmain/[0.06] hover:brightness-[0.98] transition-all">
                      {goal.image_url && (
                        <div className="h-20 w-full overflow-hidden bg-textmain/[0.04]">
                          <img
                            src={goal.image_url}
                            alt=""
                            className="h-full w-full object-cover"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                        </div>
                      )}
                      <div className="p-3">
                        <p className="text-sm font-medium text-textmain truncate">{goal.title}</p>
                        <div className="h-1.5 rounded-full bg-textmain/[0.06] overflow-hidden mt-2">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(goal.progress_percent, 100)}%` }} />
                        </div>
                        <p className="text-xs text-textmuted mt-1.5">
                          {formatAmount(goal.current_amount, goal.currency || user?.currency || 'UZS')} / {formatAmount(goal.target_amount, goal.currency || user?.currency || 'UZS')}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* AI Coach - 3 rotating tips instead of one static paragraph */}
            <div className="glass-card p-6">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={16} className="text-primary" />
                <h2 className="font-display font-semibold text-textmain">{t('aiCoachBadge')}</h2>
              </div>
              <p key={activeTip} className="text-sm text-textmuted min-h-[2.5rem] animate-fade-up">
                {insightLoading ? t('aiCoachLoading') : tips[activeTip] || t('aiCoachEmpty')}
              </p>
              {tips.length > 1 && (
                <div className="flex items-center gap-1.5 mt-2">
                  {tips.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveTip(i)}
                      aria-label={`Tip ${i + 1}`}
                      className={`h-1.5 rounded-full transition-all ${
                        i === activeTip ? 'w-4 bg-primary' : 'w-1.5 bg-textmain/15'
                      }`}
                    />
                  ))}
                </div>
              )}
              <Link href="/assistant" className="inline-flex items-center gap-1 text-sm font-medium text-primary mt-3 hover:underline">
                {t('aiCoachChat')}
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-5 min-w-0">
            {/* Cheklar - receipt upload */}
            <div className="glass-card p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display font-semibold text-textmain">{tr('title')}</h2>
                <Link href="/receipts" className="text-xs text-secondary font-medium hover:underline">
                  {t('seeAll')}
                </Link>
              </div>
              <label
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  handleScanFile(e.dataTransfer.files?.[0]);
                }}
                className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed px-4 py-6 text-center cursor-pointer transition-colors ${
                  dragOver ? 'border-primary bg-primary/5' : 'border-textmain/15 hover:border-primary/40'
                }`}
              >
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif"
                  className="hidden"
                  disabled={scanning}
                  onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; handleScanFile(f); }}
                />
                <UploadCloud size={24} className="text-textmuted mb-1" />
                <p className="text-sm font-medium text-textmain">{tr('uploadTitle')}</p>
                <p className="text-xs text-textmuted">{tr('uploadHint')}</p>
              </label>
              <label className="btn-primary w-full mt-3 justify-center cursor-pointer">
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif"
                  capture="environment"
                  className="hidden"
                  disabled={scanning}
                  onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; handleScanFile(f); }}
                />
                {scanning ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                {scanning ? te('scanning') : tr('scanWithCamera')}
              </label>
            </div>

            {/* Hisoblarim - account balances derived from real summary data */}
            <div className="glass-card p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display font-semibold text-textmain">{ta('title')}</h2>
                <Link href="/accounts" className="text-xs text-secondary font-medium hover:underline">
                  {t('seeAll')}
                </Link>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between rounded-xl px-3 py-2.5 hover:bg-textmain/[0.04] transition-colors">
                  <span className="flex items-center gap-2.5 text-sm text-textmain">
                    <span className="h-8 w-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
                      <Wallet size={15} />
                    </span>
                    {ta('mainAccount')}
                  </span>
                  <span className="text-sm font-semibold tabular-nums text-textmain">
                    {formatAmount(balance, user?.currency || 'UZS')}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl px-3 py-2.5 hover:bg-textmain/[0.04] transition-colors">
                  <span className="flex items-center gap-2.5 text-sm text-textmain">
                    <span className="h-8 w-8 rounded-lg bg-secondary/15 text-secondary flex items-center justify-center">
                      <Target size={15} />
                    </span>
                    {ta('totalSavings')}
                  </span>
                  <span className="text-sm font-semibold tabular-nums text-textmain">
                    {formatAmount(summary.total_savings, user?.currency || 'UZS')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
