'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { api } from '@/lib/api-client';
import type { Expense, PaginatedExpenses } from '@/types/finance';

export default function ExpensesPage() {
  const checked = useRequireAuth();
  const t = useTranslations('expenses');
  const tc = useTranslations('common');

  const [data, setData] = useState<PaginatedExpenses | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));

  async function loadExpenses() {
    setLoading(true);
    try {
      const { data } = await api.get<PaginatedExpenses>('/expenses', {
        params: { page: 1, page_size: 20 },
      });
      setData(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (checked) loadExpenses();
  }, [checked]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/expenses', {
        amount: parseFloat(amount),
        description,
        expense_date: expenseDate,
      });
      setAmount('');
      setDescription('');
      setShowForm(false);
      await loadExpenses();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    await api.delete(`/expenses/${id}`);
    await loadExpenses();
  }

  if (!checked) return null;

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold">{t('title')}</h1>
        <button onClick={() => setShowForm((v) => !v)} className="btn-primary">
          <Plus size={18} />
          {t('addExpense')}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="glass-card p-5 mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="label-text">{t('amount')}</label>
            <input
              type="number"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="input-field mt-1"
              placeholder="50000"
            />
          </div>
          <div className="md:col-span-2">
            <label className="label-text">{t('description')}</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field mt-1"
              placeholder="Lunch with colleagues"
            />
          </div>
          <div>
            <label className="label-text">{t('date')}</label>
            <input
              type="date"
              required
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              className="input-field mt-1"
            />
          </div>
          <div className="md:col-span-4 flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
              {tc('cancel')}
            </button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? <Loader2 className="animate-spin" size={16} /> : tc('save')}
            </button>
          </div>
        </form>
      )}

      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-ink-700/60 dark:text-cream-100/60">
            {tc('loading')}
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="p-8 text-center text-sm text-ink-700/60 dark:text-cream-100/60">
            {t('noResults')}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-700/10 dark:border-cream-100/10 text-left">
                <th className="px-5 py-3 font-medium">{t('date')}</th>
                <th className="px-5 py-3 font-medium">{t('description')}</th>
                <th className="px-5 py-3 font-medium text-right">{t('amount')}</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((expense: Expense) => (
                <tr
                  key={expense.id}
                  className="border-b border-ink-700/5 dark:border-cream-100/5 last:border-0"
                >
                  <td className="px-5 py-3">{expense.expense_date}</td>
                  <td className="px-5 py-3">{expense.description || '—'}</td>
                  <td className="px-5 py-3 text-right tabular-nums font-medium">
                    {expense.amount.toLocaleString()} {expense.currency}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => handleDelete(expense.id)}
                      className="text-coral-500 hover:opacity-70"
                      aria-label={tc('delete')}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AppShell>
  );
}
