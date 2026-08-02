'use client';

import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Plus, Target, Sparkles, Trash2, Loader2, X } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { formatAmount } from '@/lib/currency';
import type { Goal } from '@/types/finance';

const LANGUAGE_NAMES: Record<string, string> = { uz: 'Uzbek', en: 'English', ru: 'Russian' };
const CURRENCIES = ['UZS', 'USD', 'EUR'];

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

  const [addFundsFor, setAddFundsFor] = useState<string | null>(null);
  const [fundsAmount, setFundsAmount] = useState('');

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

  async function handleAddFunds(goalId: string) {
    const goal = goals.find((g) => g.id === goalId);
    if (!goal || !fundsAmount) return;
    setSubmitting(true);
    try {
      await api.patch(`/goals/${goalId}`, {
        current_amount: goal.current_amount + parseFloat(fundsAmount),
      });
      setAddFundsFor(null);
      setFundsAmount('');
      loadGoals();
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
            return (
              <div key={goal.id} className="glass-card overflow-hidden">
                <div className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="h-10 w-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                      <Target size={18} />
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
                    className="text-textmuted hover:text-danger transition-colors"
                    aria-label={tc('delete')}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                <div className="mt-4">
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-semibold text-textmain tabular-nums">
                      {formatAmount(goal.current_amount, goal.currency || user?.currency || 'UZS')}
                    </span>
                    <span className="text-textmuted tabular-nums">
                      / {formatAmount(goal.target_amount, goal.currency || user?.currency || 'UZS')}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-textmain/[0.06] overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${Math.min(goal.progress_percent, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-textmuted mt-1">{goal.progress_percent}%</p>
                </div>

                {addFundsFor === goal.id ? (
                  <div className="flex items-center gap-2 mt-4">
                    <input
                      type="number"
                      autoFocus
                      value={fundsAmount}
                      onChange={(e) => setFundsAmount(e.target.value)}
                      className="input-field flex-1"
                      placeholder="100000"
                    />
                    <button
                      onClick={() => handleAddFunds(goal.id)}
                      disabled={submitting}
                      className="btn-primary px-3"
                    >
                      {submitting ? <Loader2 size={14} className="animate-spin" /> : tc('save')}
                    </button>
                    <button
                      onClick={() => { setAddFundsFor(null); setFundsAmount(''); }}
                      className="btn-secondary px-2.5"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2 mt-4">
                    <button onClick={() => setAddFundsFor(goal.id)} className="btn-secondary flex-1 text-sm">
                      <Plus size={14} />
                      {t('addFunds')}
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
