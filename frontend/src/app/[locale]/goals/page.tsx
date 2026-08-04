'use client';

import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Plus, Target, Sparkles, Trash2, Loader2, X, Lock, Unlock } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { api, getErrorMessage } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { formatAmount, formatCurrency } from '@/lib/currency';
import type { Goal } from '@/types/finance';

const LANGUAGE_NAMES: Record<string, string> = { uz: 'Uzbek', en: 'English', ru: 'Russian' };
const CURRENCIES = ['UZS', 'USD', 'EUR'];

// Small emoji badge shown next to the title (always present, works even
// when there's no cover photo). The cover photo itself, when available,
// comes from the backend via Pexels (app/services/stock_photos.py) - a real
// moderated stock-photo library, picked by keyword-mapped category rather
// than a raw title search, specifically to avoid the inappropriate/off-topic
// results an earlier unmoderated AI image generator used to produce.
const GOAL_EMOJI: [RegExp, string][] = [
  [/noutbuk|laptop|kompyuter|computer/i, '\ud83d\udcbb'],
  [/telefon|phone|smartfon|iphone/i, '\ud83d\udcf1'],
  [/sayohat|travel|trip|dam olish|vacation|holiday/i, '\u2708\ufe0f'],
  [/mashina|avto|car|avtomobil/i, '\ud83d\ude97'],
  [/\buy\b|dom|house|kvartira|apartment|home/i, '\ud83c\udfe0'],
  [/to'y|toy|wedding/i, '\ud83d\udc8d'],
  [/talim|ta'lim|education|study|o'qish|kurs|course/i, '\ud83d\udcda'],
  [/sog'liq|salomatlik|health/i, '\ud83d\udcaa'],
  [/zaxira|jamg'arma|emergency|fund/i, '\ud83d\udc37'],
  [/biznes|business|startup/i, '\ud83d\udcbc'],
  [/sovg'a|gift|present/i, '\ud83c\udf81'],
  [/velosiped|bicycle|bike/i, '\ud83d\udeb2'],
  [/kiyim|clothes|fashion/i, '\ud83d\udc55'],
];

function emojiForGoal(title: string): string {
  const match = GOAL_EMOJI.find(([pattern]) => pattern.test(title));
  return match ? match[1] : '\ud83c\udfaf';
}

export default function GoalsPage() {
  const checked = useRequireAuth();
  const t = useTranslations('goals');
  const tc = useTranslations('common');
  const locale = useLocale();
  const user = useAuthStore((s) => s.user);

  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [currency, setCurrency] = useState(user?.currency || 'UZS');

  // Allocate (add funds) panel state
  const [allocateFor, setAllocateFor] = useState<string | null>(null);
  const [fundsAmount, setFundsAmount] = useState('');
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [allocateError, setAllocateError] = useState('');

  // Withdraw (unlock) panel state
  const [withdrawFor, setWithdrawFor] = useState<string | null>(null);
  const [withdrawPin, setWithdrawPin] = useState('');
  const [withdrawError, setWithdrawError] = useState('');

  const [advice, setAdvice] = useState<Record<string, { loading: boolean; text?: string }>>({});

  function loadGoals() {
    setLoading(true);
    api.get<Goal[]>('/goals').then(({ data }) => setGoals(data)).finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!checked) return;
    loadGoals();
  }, [checked]);

  if (!checked) return null;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/goals', {
        title,
        target_amount: parseFloat(targetAmount),
        deadline: deadline || undefined,
        currency,
      });
      setTitle('');
      setTargetAmount('');
      setDeadline('');
      setCurrency(user?.currency || 'UZS');
      setShowForm(false);
      loadGoals();
    } finally {
      setSubmitting(false);
    }
  }

  function openAllocate(goal: Goal) {
    setAllocateFor(goal.id);
    setFundsAmount('');
    setPin('');
    setPinConfirm('');
    setAllocateError('');
  }

  async function handleAllocate(goal: Goal) {
    setAllocateError('');
    const amount = parseFloat(fundsAmount);
    if (!amount || amount <= 0) return;

    // A PIN is only captured (and needs confirming) the first time this
    // goal is locked - once it's locked, adding more doesn't need it again.
    if (!goal.is_locked) {
      if (pin.length < 4) {
        setAllocateError(t('pinPlaceholder'));
        return;
      }
      if (pin !== pinConfirm) {
        setAllocateError(t('pinMismatch'));
        return;
      }
    }

    setSubmitting(true);
    try {
      await api.post(`/goals/${goal.id}/allocate`, {
        amount,
        pin: goal.is_locked ? '0000' : pin, // ignored server-side once already locked
      });
      setAllocateFor(null);
      loadGoals();
    } catch (err: any) {
      setAllocateError(getErrorMessage(err, t('pinMismatch')));
    } finally {
      setSubmitting(false);
    }
  }

  function openWithdraw(goalId: string) {
    setWithdrawFor(goalId);
    setWithdrawPin('');
    setWithdrawError('');
  }

  async function handleWithdraw(goalId: string) {
    if (withdrawPin.length < 4) return;
    setSubmitting(true);
    setWithdrawError('');
    try {
      await api.post(`/goals/${goalId}/withdraw`, { pin: withdrawPin });
      setWithdrawFor(null);
      loadGoals();
    } catch (err: any) {
      setWithdrawError(getErrorMessage(err, t('wrongPin')));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(goalId: string) {
    setGoals((prev) => prev.filter((g) => g.id !== goalId));
    await api.delete(`/goals/${goalId}`);
  }

  async function getAdvice(goal: Goal) {
    setAdvice((prev) => ({ ...prev, [goal.id]: { loading: true } }));
    const languageName = LANGUAGE_NAMES[locale] || 'English';
    try {
      const { data } = await api.post('/ai/ask', {
        question: `Respond only in ${languageName}, regardless of any other instruction. I have a savings goal called "${goal.title}": I've saved ${goal.current_amount} out of ${goal.target_amount}${goal.deadline ? `, deadline ${goal.deadline}` : ''}. In 2-3 short sentences, tell me realistically how I'm doing based on my actual income/expenses and ONE specific thing I could do to reach it faster.`,
        save_history: false,
      });
      setAdvice((prev) => ({ ...prev, [goal.id]: { loading: false, text: data.answer } }));
    } catch {
      setAdvice((prev) => ({ ...prev, [goal.id]: { loading: false, text: undefined } }));
    }
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold text-textmain">{t('title')}</h1>
        <button onClick={() => setShowForm((v) => !v)} className="btn-primary">
          <Plus size={18} />
          {t('addGoal')}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="glass-card p-6 mb-6 space-y-4 max-w-lg">
          <div>
            <label className="label-text">{t('titleLabel')}</label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-field mt-1"
              placeholder={t('titlePlaceholder')}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label-text">{t('target')}</label>
              <input
                type="number"
                required
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                className="input-field mt-1"
                placeholder="5000000"
              />
            </div>
            <div>
              <label className="label-text">{tc('currency')}</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="input-field mt-1"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-text">{t('deadline')}</label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="input-field mt-1"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
              {tc('cancel')}
            </button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? <Loader2 className="animate-spin" size={16} /> : tc('save')}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="glass-card p-10 text-center text-sm text-textmuted">{tc('loading')}</div>
      ) : goals.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <Target className="mx-auto text-textmuted mb-2" size={28} />
          <p className="font-semibold text-textmain">{t('noGoals')}</p>
          <p className="text-sm text-textmuted mt-1">{t('noGoalsSubtitle')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {goals.map((goal) => {
            const goalAdvice = advice[goal.id];
            const goalCurrency = goal.currency || user?.currency || 'UZS';
            return (
              <div key={goal.id} className="glass-card overflow-hidden">
                {goal.image_url && (
                  <div className="h-32 w-full overflow-hidden bg-textmain/[0.04]">
                    <img
                      src={goal.image_url}
                      alt=""
                      className="h-full w-full object-cover"
                      onError={(e) => { e.currentTarget.parentElement!.style.display = 'none'; }}
                    />
                  </div>
                )}
                <div className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="h-10 w-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0 text-lg">
                      {emojiForGoal(goal.title)}
                    </span>
                    <div className="min-w-0">
                      <h2 className="font-display font-semibold text-textmain truncate">{goal.title}</h2>
                      {goal.deadline && (
                        <p className="text-xs text-textmuted mt-0.5">{t('deadline')}: {goal.deadline}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(goal.id)}
                    className="text-textmuted hover:text-danger transition-colors shrink-0"
                    aria-label={tc('delete')}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                <div className="mt-4">
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-semibold text-textmain tabular-nums">
                      {formatCurrency(goal.current_amount, goalCurrency)}
                    </span>
                    <span className="text-textmuted tabular-nums">
                      / {formatCurrency(goal.target_amount, goalCurrency)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-textmain/[0.06] overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${Math.min(goal.progress_percent, 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-textmuted">{goal.progress_percent}%</p>
                    {goal.is_locked && (
                      <span className="flex items-center gap-1 text-xs font-medium text-primary">
                        <Lock size={11} />
                        {t('locked')}
                      </span>
                    )}
                  </div>
                </div>

                {allocateFor === goal.id ? (
                  <div className="mt-4 space-y-2.5 bg-textmain/[0.03] rounded-xl p-3.5">
                    <div>
                      <label className="label-text">{t('amountLabel')} ({goalCurrency})</label>
                      <div className="relative mt-1">
                        <input
                          type="number"
                          autoFocus
                          value={fundsAmount}
                          onChange={(e) => setFundsAmount(e.target.value)}
                          className="input-field pr-16"
                          placeholder="100000"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-textmuted">
                          {goalCurrency}
                        </span>
                      </div>
                    </div>
                    {!goal.is_locked && (
                      <>
                        <p className="text-xs text-textmuted">{t('setPinHint')}</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="label-text">{t('setPinLabel')}</label>
                            <input
                              type="password"
                              inputMode="numeric"
                              value={pin}
                              onChange={(e) => setPin(e.target.value)}
                              className="input-field mt-1"
                              placeholder={t('pinPlaceholder')}
                              maxLength={32}
                            />
                          </div>
                          <div>
                            <label className="label-text">{t('confirmPinLabel')}</label>
                            <input
                              type="password"
                              inputMode="numeric"
                              value={pinConfirm}
                              onChange={(e) => setPinConfirm(e.target.value)}
                              className="input-field mt-1"
                              placeholder={t('pinPlaceholder')}
                              maxLength={32}
                            />
                          </div>
                        </div>
                      </>
                    )}
                    {allocateError && <p className="text-xs text-danger">{allocateError}</p>}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => handleAllocate(goal)}
                        disabled={submitting}
                        className="btn-primary flex-1 text-sm"
                      >
                        {submitting ? <Loader2 size={14} className="animate-spin" /> : tc('save')}
                      </button>
                      <button onClick={() => setAllocateFor(null)} className="btn-secondary px-2.5">
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ) : withdrawFor === goal.id ? (
                  <div className="mt-4 space-y-2.5 bg-danger/5 rounded-xl p-3.5 border border-danger/10">
                    <p className="text-xs text-textmuted">{t('withdrawHint')}</p>
                    <div>
                      <label className="label-text">{t('enterPinLabel')}</label>
                      <input
                        type="password"
                        inputMode="numeric"
                        autoFocus
                        value={withdrawPin}
                        onChange={(e) => setWithdrawPin(e.target.value)}
                        className="input-field mt-1"
                        placeholder={t('pinPlaceholder')}
                        maxLength={32}
                      />
                    </div>
                    {withdrawError && <p className="text-xs text-danger">{withdrawError}</p>}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => handleWithdraw(goal.id)}
                        disabled={submitting}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-danger text-white font-medium px-4 py-2.5 flex-1 text-sm hover:brightness-95 transition-all"
                      >
                        {submitting ? <Loader2 size={14} className="animate-spin" /> : <Unlock size={14} />}
                        {t('withdraw')}
                      </button>
                      <button onClick={() => setWithdrawFor(null)} className="btn-secondary px-2.5">
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2 mt-4">
                      <button onClick={() => openAllocate(goal)} className="btn-secondary flex-1 text-sm">
                        <Plus size={14} />
                        {goal.is_locked ? t('addMore') : t('allocate')}
                      </button>
                      <button
                        onClick={() => getAdvice(goal)}
                        disabled={goalAdvice?.loading}
                        className="btn-secondary flex-1 text-sm text-primary border-primary/20"
                      >
                        {goalAdvice?.loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                        {t('aiAdvice')}
                      </button>
                    </div>
                    {goal.is_locked && (
                      <button
                        onClick={() => openWithdraw(goal.id)}
                        className="w-full mt-2 text-xs font-medium text-textmuted hover:text-danger transition-colors flex items-center justify-center gap-1"
                      >
                        <Unlock size={12} />
                        {t('withdraw')}
                      </button>
                    )}
                  </>
                )}

                {goalAdvice?.text && (
                  <p className="text-sm text-textmuted mt-3 bg-primary/5 rounded-lg p-3 border border-primary/10">
                    {goalAdvice.text}
                  </p>
                )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
