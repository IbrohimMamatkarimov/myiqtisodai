'use client';

import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
  Plus, Wallet, Sparkles, ArrowRight, Target, Loader2,
  ShoppingCart, Car, Utensils, ShoppingBag, CreditCard, Receipt as ReceiptIcon,
  Eye, EyeOff, Lock, Unlock, X, Users,
} from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { AchievementToast } from '@/components/AchievementToast';
import { Link } from '@/navigation';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { api, getErrorMessage } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { formatAmount, formatCurrency, convertBetween } from '@/lib/currency';
import type { DashboardSummary, Expense, Income, Goal } from '@/types/finance';

const LANGUAGE_NAMES: Record<string, string> = {
  uz: 'Uzbek',
  en: 'English',
  ru: 'Russian',
};

const CURRENCIES = ['UZS', 'USD', 'EUR'];

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
    return { Icon: CreditCard, bg: 'bg-primary/15', fg: 'text-primary' };
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
  const ta = useTranslations('accounts');
  const tg = useTranslations('goals');
  const tc = useTranslations('common');
  const locale = useLocale();
  const user = useAuthStore((s) => s.user);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [tips, setTips] = useState<string[]>([]);
  const [activeTip, setActiveTip] = useState(0);
  const [insightLoading, setInsightLoading] = useState(true);
  const [hideBalance, setHideBalance] = useState(false);

  // Allocate (add funds to a goal) - inline on the dashboard so people don't
  // have to leave it just to lock money away toward a goal.
  const [allocateFor, setAllocateFor] = useState<string | null>(null);
  const [fundsAmount, setFundsAmount] = useState('');
  const [fundsCurrency, setFundsCurrency] = useState('UZS');
  const [legacyPin, setLegacyPin] = useState('');
  const [legacyPinConfirm, setLegacyPinConfirm] = useState('');
  const [allocateError, setAllocateError] = useState('');
  const [allocating, setAllocating] = useState(false);

  // Withdraw (get locked money back) - same PIN flow as the Goals page,
  // surfaced here too since this card is often the first place people look.
  const [withdrawFor, setWithdrawFor] = useState<string | null>(null);
  const [withdrawPin, setWithdrawPin] = useState('');
  const [withdrawError, setWithdrawError] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [forgotPinSentFor, setForgotPinSentFor] = useState<string | null>(null);
  const [forgotPinSubmitting, setForgotPinSubmitting] = useState(false);

  // Early-unlock request (sent to admin for approval) - same flow as the
  // Goals page, not just a plain chat message, so it actually shows up in
  // the admin panel as a real request they can approve/reject.
  const [unlockRequestFor, setUnlockRequestFor] = useState<string | null>(null);
  const [unlockReason, setUnlockReason] = useState('');
  const [unlockRequestSubmitting, setUnlockRequestSubmitting] = useState(false);
  const [unlockRequestSentFor, setUnlockRequestSentFor] = useState<string | null>(null);
  const [unlockRequestError, setUnlockRequestError] = useState('');

  function loadGoals() {
    api
      .get<Goal[]>('/goals')
      .then(({ data }) => setGoals(data.slice(0, 2)))
      .catch(() => setGoals([]));
  }

  function loadSummary() {
    api
      .get<DashboardSummary>('/dashboard/summary')
      .then(({ data }) => setSummary(data))
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }

  function loadTxns() {
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
        // Sort by when it actually happened, not just the calendar date -
        // date-only comparison ties every "today" transaction together, so a
        // goal deposit/withdrawal (always dated today) could land anywhere
        // among today's rows instead of at the top, making it look like it
        // never happened. created_at (a real timestamp) breaks that tie.
        const merged = [...expenseTxns, ...incomeTxns]
          .sort((a, b) => new Date(b.item.created_at).getTime() - new Date(a.item.created_at).getTime())
          .slice(0, 5);
        setTxns(merged);
      })
      .catch(() => setTxns([]));
  }

  function openAllocate(goal: Goal) {
    setAllocateFor(goal.id);
    setFundsAmount('');
    setFundsCurrency(goal.currency || user?.currency || 'UZS');
    setAllocateError('');
    setLegacyPin('');
    setLegacyPinConfirm('');
  }

  async function handleAllocate(goal: Goal) {
    setAllocateError('');
    const typed = parseFloat(fundsAmount);
    if (!typed || typed <= 0) return;
    const goalCurrency = goal.currency || user?.currency || 'UZS';
    const amount = convertBetween(typed, fundsCurrency, goalCurrency);

    let legacyPinPayload: string | undefined;
    if (!goal.has_pin && !goal.is_group) {
      if (legacyPin.length < 4) {
        setAllocateError(tg('pinPlaceholder'));
        return;
      }
      if (legacyPin !== legacyPinConfirm) {
        setAllocateError(tg('pinMismatch'));
        return;
      }
      legacyPinPayload = legacyPin;
    }

    if (!window.confirm(tg('confirmAllocate', { amount: formatCurrency(amount, goalCurrency), goal: goal.title }))) {
      return;
    }

    setAllocating(true);
    try {
      await api.post(`/goals/${goal.id}/allocate`, { amount, pin: legacyPinPayload });
      setAllocateFor(null);
      loadGoals();
      loadSummary();
      loadTxns();
    } catch (err: any) {
      setAllocateError(getErrorMessage(err, tg('pinMismatch')));
    } finally {
      setAllocating(false);
    }
  }

  function openWithdraw(goalId: string) {
    setWithdrawFor(goalId);
    setWithdrawPin('');
    setWithdrawError('');
    setForgotPinSentFor(null);
  }

  async function handleForgotPin(goalId: string) {
    setForgotPinSubmitting(true);
    try {
      await api.post(`/goals/${goalId}/forgot-pin`);
      setForgotPinSentFor(goalId);
    } catch (err: any) {
      setWithdrawError(getErrorMessage(err, tg('unlockRequestError')));
    } finally {
      setForgotPinSubmitting(false);
    }
  }

  function openUnlockRequest(goalId: string) {
    setUnlockRequestFor(goalId);
    setUnlockReason('');
    setUnlockRequestError('');
  }

  async function submitUnlockRequest(goalId: string) {
    if (unlockReason.trim().length < 2) return;
    setUnlockRequestSubmitting(true);
    setUnlockRequestError('');
    try {
      await api.post(`/goals/${goalId}/request-unlock`, { reason: unlockReason.trim() });
      setUnlockRequestFor(null);
      setUnlockRequestSentFor(goalId);
    } catch (err: any) {
      setUnlockRequestError(getErrorMessage(err, tg('unlockRequestError')));
    } finally {
      setUnlockRequestSubmitting(false);
    }
  }

  async function handleWithdraw(goalId: string) {
    if (withdrawPin.length < 4) return;
    setWithdrawing(true);
    setWithdrawError('');
    try {
      await api.post(`/goals/${goalId}/withdraw`, { pin: withdrawPin });
      setWithdrawFor(null);
      loadGoals();
      loadSummary();
      loadTxns();
    } catch (err: any) {
      setWithdrawError(getErrorMessage(err, tg('wrongPin')));
    } finally {
      setWithdrawing(false);
    }
  }

  useEffect(() => {
    if (!checked) return;

    loadSummary();
    loadTxns();
    loadGoals();

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

  // Data can go stale the moment you leave this tab - e.g. scanning a
  // receipt navigates to /expenses to save it, then coming back here should
  // show the updated balance, not whatever was cached from the first mount.
  // Covers back-navigation, tab switching, and just returning to the tab.
  useEffect(() => {
    if (!checked) return;
    function refresh() {
      if (document.visibilityState === 'visible') {
        loadSummary();
        loadTxns();
        loadGoals();
      }
    }
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [checked]);

  // Auto-rotate through the tips every 6s
  useEffect(() => {
    if (tips.length <= 1) return;
    const interval = setInterval(() => {
      setActiveTip((i) => (i + 1) % tips.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [tips.length]);

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
  if (summary) {
    balance = summary.total_income - summary.total_expenses;
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
            <div className="hero-balance-card relative overflow-hidden">
              <img
                src="/wallet-illustration.png"
                alt=""
                className="absolute -right-2 bottom-0 h-36 w-36 sm:h-40 sm:w-40 object-contain pointer-events-none select-none"
              />
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

              <div className="flex items-center gap-1.5">
                <p className="text-sm text-white/75 font-medium">{t('balance')}</p>
                <button
                  type="button"
                  onClick={() => setHideBalance((v) => !v)}
                  aria-label={hideBalance ? 'Show balance' : 'Hide balance'}
                  className="text-white/60 hover:text-white/90 transition-colors"
                >
                  {hideBalance ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <p className="mt-1 font-display text-4xl font-bold text-white tabular-nums">
                {hideBalance ? '••••••' : formatAmount(balance, user?.currency || 'UZS')}
              </p>
              <p className="mt-1 text-sm text-white/75">
                {(summary?.recent_transactions_count ?? 0) > 0 ? t('heroNudgeActive') : t('heroNudgeEmpty')}
              </p>

              <div className="flex flex-wrap gap-2 mt-5 relative">
                <Link href="/expenses" className="inline-flex items-center justify-center gap-2 rounded-xl bg-white text-primary font-semibold px-4 py-3 hover:brightness-95 transition-all active:scale-[0.98]">
                  <Plus size={16} />
                  {t('qaAddExpense')}
                </Link>
                <Link href="/income" className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/15 text-white font-medium px-4 py-3 hover:bg-white/25 transition-colors">
                  <Plus size={16} />
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
                <Link href="/assistant" className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-textmain/[0.04] transition-colors">
                  <span className="h-9 w-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
                    <Sparkles size={17} />
                  </span>
                  <span className="text-sm font-medium text-textmain flex-1">{t('qaAskAI')}</span>
                  <ArrowRight size={14} className="text-textmuted" />
                </Link>
              </div>
            </div>

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
                          <p className={`text-sm font-semibold tabular-nums ${txn.type === 'income' ? 'text-primary' : 'text-textmain'}`}>
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
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display font-semibold text-textmain">{t('myGoalsTitle')}</h2>
                <Link href="/goals" className="text-sm text-secondary font-medium hover:underline flex items-center gap-1">
                  {t('seeAll')}
                  <ArrowRight size={13} />
                </Link>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {goals.map((goal) => {
                    const timeLocked = !!goal.locked_until && new Date(goal.locked_until) > new Date();
                    const daysLeft = timeLocked
                      ? Math.max(1, Math.ceil((new Date(goal.locked_until as string).getTime() - Date.now()) / 86400000))
                      : 0;
                    const completed = goal.is_completed;
                    return (
                    <div key={goal.id} className={`rounded-2xl overflow-hidden border transition-all ${completed ? 'border-amber-300/50 hover:border-amber-400/70 hover:shadow-lg' : 'border-textmain/[0.06] hover:border-primary/30 hover:shadow-lg'}`}>
                      <button
                        type="button"
                        onClick={() => (allocateFor === goal.id || withdrawFor === goal.id || completed ? undefined : openAllocate(goal))}
                        className="block w-full text-left group"
                      >
                        <div className="w-full h-20 sm:h-24 overflow-hidden relative">
                          <img
                            src="/box.png"
                            alt=""
                            className="h-full w-full object-contain group-hover:scale-105 transition-transform duration-300"
                          />
                          {/* The box art has a blank label plate baked in, just under the
                              padlock - the title sits there instead of floating over the lock.
                              Styled like an engraved nameplate (uppercase, letter-spaced, subtle
                              shadow) so it actually reads as a deliberate label, not filler text. */}
                          <p className="absolute left-1/2 top-[68%] -translate-x-1/2 -translate-y-1/2 w-[46%] text-center text-[9px] font-display font-extrabold uppercase tracking-wide text-primary leading-tight truncate pointer-events-none drop-shadow-sm">
                            {goal.title}
                          </p>
                          {timeLocked && (
                            <div className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/55 backdrop-blur flex items-center justify-center">
                              <Lock size={10} className="text-white" />
                            </div>
                          )}
                        </div>
                        <div className="p-2.5 pb-2">
                          <div className="h-1.5 rounded-full bg-textmain/[0.06] overflow-hidden mt-1">
                            <div
                              className={`h-full rounded-full ${completed ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500' : 'bg-primary'}`}
                              style={{ width: `${Math.min(goal.progress_percent, 100)}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-textmuted mt-1 truncate">
                            {formatCurrency(goal.current_amount, goal.currency || user?.currency || 'UZS')} / {formatCurrency(goal.target_amount, goal.currency || user?.currency || 'UZS')}
                          </p>
                          {completed && (
                            <p className="text-[10px] font-semibold text-amber-500 mt-0.5">{tg('completed')}</p>
                          )}
                        </div>
                      </button>

                      {allocateFor === goal.id ? (
                        <div className="px-3 pb-3 space-y-2" onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-1.5">
                            <input
                              type="number"
                              autoFocus
                              value={fundsAmount}
                              onChange={(e) => setFundsAmount(e.target.value)}
                              className="input-field text-sm flex-1"
                              placeholder="100000"
                            />
                            <select
                              value={fundsCurrency}
                              onChange={(e) => setFundsCurrency(e.target.value)}
                              className="input-field text-sm w-20 px-1"
                            >
                              {CURRENCIES.map((c) => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                          </div>
                          {fundsCurrency !== (goal.currency || user?.currency || 'UZS') && fundsAmount && !isNaN(parseFloat(fundsAmount)) && (
                            <p className="text-xs text-textmuted">
                              ≈ {formatCurrency(convertBetween(parseFloat(fundsAmount), fundsCurrency, goal.currency || user?.currency || 'UZS'), goal.currency || user?.currency || 'UZS')}
                            </p>
                          )}
                          {!goal.has_pin && !goal.is_group && (
                            <>
                              <p className="text-[11px] text-textmuted">{tg('setPinHint')}</p>
                              <div className="grid grid-cols-2 gap-2">
                                <input
                                  type="password"
                                  inputMode="numeric"
                                  autoComplete="new-password"
                                  name="goal-pin"
                                  value={legacyPin}
                                  onChange={(e) => setLegacyPin(e.target.value)}
                                  className="input-field text-sm"
                                  placeholder={tg('setPinLabel')}
                                  maxLength={32}
                                />
                                <input
                                  type="password"
                                  inputMode="numeric"
                                  autoComplete="new-password"
                                  name="goal-pin-confirm"
                                  value={legacyPinConfirm}
                                  onChange={(e) => setLegacyPinConfirm(e.target.value)}
                                  className="input-field text-sm"
                                  placeholder={tg('confirmPinLabel')}
                                  maxLength={32}
                                />
                              </div>
                            </>
                          )}
                          {allocateError && <p className="text-xs text-danger">{allocateError}</p>}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleAllocate(goal)}
                              disabled={allocating}
                              className="btn-primary flex-1 text-sm py-2"
                            >
                              {allocating ? <Loader2 size={14} className="animate-spin" /> : tc('save')}
                            </button>
                            <button onClick={() => setAllocateFor(null)} className="btn-secondary px-2.5 py-2">
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      ) : withdrawFor === goal.id ? (
                        <div className="px-3 pb-3 space-y-2" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="password"
                            inputMode="numeric"
                            autoComplete="new-password"
                            name="goal-withdraw-pin"
                            autoFocus
                            value={withdrawPin}
                            onChange={(e) => setWithdrawPin(e.target.value)}
                            className="input-field text-sm"
                            placeholder={tg('enterPinLabel')}
                            maxLength={32}
                          />
                          {withdrawError && <p className="text-xs text-danger">{withdrawError}</p>}
                          {forgotPinSentFor === goal.id ? (
                            <p className="text-[11px] text-primary font-medium">{tg('forgotPinSent')}</p>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleForgotPin(goal.id)}
                              disabled={forgotPinSubmitting}
                              className="text-[11px] font-medium text-textmuted hover:text-primary transition-colors disabled:opacity-50"
                            >
                              {tg('forgotPin')}
                            </button>
                          )}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleWithdraw(goal.id)}
                              disabled={withdrawing}
                              className="flex-1 text-sm py-2 rounded-xl bg-danger text-white font-medium hover:brightness-95 transition-all flex items-center justify-center gap-1.5"
                            >
                              {withdrawing ? <Loader2 size={14} className="animate-spin" /> : tg('withdraw')}
                            </button>
                            <button onClick={() => setWithdrawFor(null)} className="btn-secondary px-2.5 py-2">
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      ) : goal.is_group ? (
                        <div className="px-3 pb-3">
                          <Link
                            href="/goals"
                            onClick={(e) => e.stopPropagation()}
                            className={`btn-secondary w-full text-xs py-2 justify-center ${completed ? 'text-amber-600 border-amber-300/40' : 'text-secondary border-secondary/20'}`}
                          >
                            <Users size={13} />
                            {tg('members')}
                          </Link>
                        </div>
                      ) : completed ? (
                        <div className="px-3 pb-3 space-y-1.5">
                          {timeLocked ? (
                            <div className="space-y-1">
                              <p className="text-center text-[11px] font-medium text-textmuted flex items-center justify-center gap-1">
                                <Lock size={10} />
                                {tg('daysLeftLabel', { days: daysLeft })}
                              </p>
                              <button
                                onClick={() => openUnlockRequest(goal.id)}
                                disabled={unlockRequestSentFor === goal.id}
                                className="w-full text-[10px] font-medium text-primary hover:underline disabled:opacity-50 disabled:no-underline"
                              >
                                {unlockRequestSentFor === goal.id ? tg('unlockRequestSent') : tg('contactSupportUnlock')}
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => openWithdraw(goal.id)}
                              className="w-full text-xs py-2 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-white font-semibold hover:brightness-105 transition-all flex items-center justify-center gap-1.5"
                            >
                              <Unlock size={13} />
                              {tg('withdraw')}
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="px-3 pb-3 space-y-1.5">
                          <p className="text-center text-[10px] text-textmuted -mt-1 mb-1">
                            {tg('tapBoxHint')}
                          </p>
                          {goal.is_locked && (
                            timeLocked ? (
                              <div className="space-y-1">
                                <p className="text-center text-[11px] font-medium text-textmuted flex items-center justify-center gap-1">
                                  <Lock size={10} />
                                  {tg('daysLeftLabel', { days: daysLeft })}
                                </p>
                                <button
                                  onClick={() => openUnlockRequest(goal.id)}
                                  disabled={unlockRequestSentFor === goal.id}
                                  className="w-full text-[10px] font-medium text-primary hover:underline disabled:opacity-50 disabled:no-underline"
                                >
                                  {unlockRequestSentFor === goal.id ? tg('unlockRequestSent') : tg('contactSupportUnlock')}
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => openWithdraw(goal.id)}
                                className="btn-secondary w-full text-xs py-2 text-danger border-danger/20 hover:bg-danger/5"
                              >
                                <Unlock size={13} />
                                {tg('withdraw')}
                              </button>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  );
                  })}
                  <Link
                    href="/goals"
                    className="rounded-2xl border-2 border-dashed border-textmain/15 hover:border-primary/50 hover:bg-primary/[0.03] transition-all flex flex-col items-center justify-center gap-1.5 text-center p-3 min-h-[112px]"
                  >
                    <span className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                      <Target size={15} />
                    </span>
                    <span className="text-xs font-medium text-textmain">{tg('addNewGoal')}</span>
                  </Link>
                </div>
              </div>

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
            {/* Hisoblarim - account balances derived from real summary data */}
            <div className="glass-card p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display font-semibold text-textmain">{ta('title')}</h2>
                <Link href="/accounts" className="text-xs text-secondary font-medium hover:underline">
                  {t('seeAll')}
                </Link>
              </div>
              <div className="space-y-1">
                <Link href="/transactions" className="flex items-center justify-between rounded-xl px-3 py-2.5 hover:bg-textmain/[0.04] transition-colors">
                  <span className="flex items-center gap-2.5 text-sm text-textmain">
                    <span className="h-8 w-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
                      <Wallet size={15} />
                    </span>
                    {ta('mainAccount')}
                  </span>
                  <span className="text-sm font-semibold tabular-nums text-textmain">
                    {formatAmount(balance, user?.currency || 'UZS')}
                  </span>
                </Link>
                <Link href="/goals" className="flex items-center justify-between rounded-xl px-3 py-2.5 hover:bg-textmain/[0.04] transition-colors">
                  <span className="flex items-center gap-2.5 text-sm text-textmain">
                    <span className="h-8 w-8 rounded-lg bg-secondary/15 text-secondary flex items-center justify-center">
                      <Lock size={15} />
                    </span>
                    {ta('lockedInGoals')}
                  </span>
                  <span className="text-sm font-semibold tabular-nums text-textmain">
                    {formatAmount(summary.total_locked_in_goals, user?.currency || 'UZS')}
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Early-unlock request (sent to admin for approval) - same modal as
          the Goals page, so both surfaces produce a real, trackable request
          instead of this one silently doing nothing. */}
      {unlockRequestFor && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-textmain/20 p-4" onClick={() => setUnlockRequestFor(null)}>
          <div className="glass-card p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-display font-semibold text-textmain mb-1">{tg('unlockRequestTitle')}</h2>
            <p className="text-xs text-textmuted mb-4">{tg('unlockRequestHint')}</p>
            <textarea
              autoFocus
              value={unlockReason}
              onChange={(e) => setUnlockReason(e.target.value)}
              placeholder={tg('unlockRequestPlaceholder')}
              rows={3}
              className="input-field resize-none"
            />
            {unlockRequestError && <p className="text-xs text-danger mt-2">{unlockRequestError}</p>}
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setUnlockRequestFor(null)} className="btn-secondary">{tc('cancel')}</button>
              <button
                onClick={() => submitUnlockRequest(unlockRequestFor)}
                disabled={unlockRequestSubmitting || unlockReason.trim().length < 2}
                className="btn-primary"
              >
                {unlockRequestSubmitting ? <Loader2 size={16} className="animate-spin" /> : tg('unlockRequestSubmit')}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
