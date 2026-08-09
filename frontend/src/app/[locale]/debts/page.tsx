'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Plus, Trash2, Loader2, X, ArrowDownLeft, ArrowUpRight, Check, Clock, BookUser,
} from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { formatCurrency } from '@/lib/currency';
import type { Debt } from '@/types/finance';

const CURRENCIES = ['UZS', 'USD', 'EUR'];
type Filter = 'all' | 'lent' | 'borrowed';

export default function DebtsPage() {
  const checked = useRequireAuth();
  const t = useTranslations('debts');
  const tc = useTranslations('common');
  const user = useAuthStore((s) => s.user);

  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [personName, setPersonName] = useState('');
  const [direction, setDirection] = useState<'lent' | 'borrowed'>('lent');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(user?.currency || 'UZS');
  const [debtDate, setDebtDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');

  function loadDebts() {
    setLoading(true);
    api.get<Debt[]>('/debts').then(({ data }) => setDebts(data)).finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!checked) return;
    loadDebts();
  }, [checked]);

  const totals = useMemo(() => {
    const unpaid = debts.filter((d) => !d.is_paid);
    const lent = unpaid.filter((d) => d.direction === 'lent').reduce((sum, d) => sum + d.amount, 0);
    const borrowed = unpaid.filter((d) => d.direction === 'borrowed').reduce((sum, d) => sum + d.amount, 0);
    return { lent, borrowed };
  }, [debts]);

  if (!checked) return null;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/debts', {
        person_name: personName,
        direction,
        amount: parseFloat(amount),
        currency,
        debt_date: debtDate,
        due_date: dueDate || undefined,
        notes: notes || undefined,
      });
      setPersonName('');
      setAmount('');
      setDueDate('');
      setNotes('');
      setShowForm(false);
      loadDebts();
    } finally {
      setSubmitting(false);
    }
  }

  async function togglePaid(debt: Debt) {
    setDebts((prev) => prev.map((d) => (d.id === debt.id ? { ...d, is_paid: !d.is_paid } : d)));
    await api.patch(`/debts/${debt.id}`, { is_paid: !debt.is_paid });
  }

  async function handleDelete(id: string) {
    setDebts((prev) => prev.filter((d) => d.id !== id));
    await api.delete(`/debts/${id}`);
  }

  const filtered = debts.filter((d) => filter === 'all' || d.direction === filter);

  const mainCurrency = user?.currency || 'UZS';

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-textmain">{t('title')}</h1>
          <p className="text-sm text-textmuted mt-0.5">{t('subtitle')}</p>
        </div>
        <button onClick={() => setShowForm((v) => !v)} className="btn-primary">
          <Plus size={18} />
          {t('addDebt')}
        </button>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="glass-card p-4 flex items-center gap-3">
          <span className="h-10 w-10 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center shrink-0">
            <ArrowDownLeft size={18} />
          </span>
          <div className="min-w-0">
            <p className="text-xs text-textmuted">{t('owedToMe')}</p>
            <p className="font-semibold text-textmain tabular-nums truncate">{formatCurrency(totals.lent, mainCurrency)}</p>
          </div>
        </div>
        <div className="glass-card p-4 flex items-center gap-3">
          <span className="h-10 w-10 rounded-xl bg-danger/15 text-danger flex items-center justify-center shrink-0">
            <ArrowUpRight size={18} />
          </span>
          <div className="min-w-0">
            <p className="text-xs text-textmuted">{t('iOwe')}</p>
            <p className="font-semibold text-textmain tabular-nums truncate">{formatCurrency(totals.borrowed, mainCurrency)}</p>
          </div>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="glass-card p-6 mb-6 space-y-4 max-w-lg">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setDirection('lent')}
              className={`rounded-xl border px-3 py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                direction === 'lent' ? 'border-secondary bg-secondary/10 text-secondary' : 'border-textmain/10 text-textmuted'
              }`}
            >
              <ArrowDownLeft size={15} />
              {t('lent')}
            </button>
            <button
              type="button"
              onClick={() => setDirection('borrowed')}
              className={`rounded-xl border px-3 py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                direction === 'borrowed' ? 'border-danger bg-danger/10 text-danger' : 'border-textmain/10 text-textmuted'
              }`}
            >
              <ArrowUpRight size={15} />
              {t('borrowed')}
            </button>
          </div>

          <div>
            <label className="label-text">{t('personName')}</label>
            <input
              required
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
              className="input-field mt-1"
              placeholder={t('personNamePlaceholder')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-text">{t('amount')}</label>
              <input
                type="number"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="input-field mt-1"
                placeholder="500000"
              />
            </div>
            <div>
              <label className="label-text">{tc('currency')}</label>
              <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="input-field mt-1">
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-text">{t('debtDate')}</label>
              <input
                type="date"
                required
                value={debtDate}
                onChange={(e) => setDebtDate(e.target.value)}
                className="input-field mt-1"
              />
            </div>
            <div>
              <label className="label-text">{t('dueDate')}</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="input-field mt-1"
              />
            </div>
          </div>

          <div>
            <label className="label-text">{t('notes')}</label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input-field mt-1"
              placeholder={t('notesPlaceholder')}
            />
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

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {(['all', 'lent', 'borrowed'] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === f ? 'bg-primary text-white' : 'bg-textmain/[0.05] text-textmuted hover:text-textmain'
            }`}
          >
            {f === 'all' ? t('all') : f === 'lent' ? t('lent') : t('borrowed')}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="glass-card p-10 text-center text-sm text-textmuted">{tc('loading')}</div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <BookUser className="mx-auto text-textmuted mb-2" size={28} />
          <p className="font-semibold text-textmain">{t('empty')}</p>
          <p className="text-sm text-textmuted mt-1">{t('emptySubtitle')}</p>
        </div>
      ) : (
        <div className="glass-card divide-y divide-textmain/[0.06] overflow-hidden">
          {filtered.map((debt) => {
            const overdue = !debt.is_paid && debt.due_date && new Date(debt.due_date) < new Date();
            return (
              <div key={debt.id} className={`flex items-center gap-3 p-4 ${debt.is_paid ? 'opacity-50' : ''}`}>
                <span
                  className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                    debt.direction === 'lent' ? 'bg-secondary/15 text-secondary' : 'bg-danger/15 text-danger'
                  }`}
                >
                  {debt.direction === 'lent' ? <ArrowDownLeft size={17} /> : <ArrowUpRight size={17} />}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-textmain truncate">{debt.person_name}</p>
                    {debt.is_paid && (
                      <span className="text-[10px] font-semibold text-secondary bg-secondary/10 rounded px-1.5 py-0.5 shrink-0">
                        {t('paid')}
                      </span>
                    )}
                    {overdue && (
                      <span className="text-[10px] font-semibold text-danger bg-danger/10 rounded px-1.5 py-0.5 shrink-0 flex items-center gap-0.5">
                        <Clock size={10} />
                        {t('overdue')}
                      </span>
                    )}
                  </div>
                  {debt.notes && <p className="text-xs text-textmuted truncate mt-0.5">{debt.notes}</p>}
                  <p className="text-xs text-textmuted mt-0.5">
                    {debt.debt_date}
                    {debt.due_date && ` \u2192 ${debt.due_date}`}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <p className={`text-sm font-semibold tabular-nums ${debt.direction === 'lent' ? 'text-secondary' : 'text-danger'}`}>
                    {formatCurrency(debt.amount, debt.currency)}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => togglePaid(debt)}
                    title={debt.is_paid ? t('markUnpaid') : t('markPaid')}
                    className={`h-8 w-8 rounded-lg flex items-center justify-center transition-colors ${
                      debt.is_paid ? 'text-secondary bg-secondary/10' : 'text-textmuted hover:bg-textmain/5 hover:text-secondary'
                    }`}
                  >
                    <Check size={15} />
                  </button>
                  <button
                    onClick={() => handleDelete(debt.id)}
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-textmuted hover:bg-danger/10 hover:text-danger transition-colors"
                    aria-label={tc('delete')}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
