'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { api } from '@/lib/api-client';

interface Income {
  id: string;
  source_name: string;
  amount: number;
  currency: string;
  description: string | null;
  income_date: string;
}

export default function IncomePage() {
  const checked = useRequireAuth();
  const t = useTranslations('income');
  const tc = useTranslations('common');

  const [incomes, setIncomes] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [sourceName, setSourceName] = useState('');
  const [amount, setAmount] = useState('');
  const [incomeDate, setIncomeDate] = useState(new Date().toISOString().slice(0, 10));

  async function loadIncomes() {
    setLoading(true);
    try {
      const { data } = await api.get<Income[]>('/incomes');
      setIncomes(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (checked) loadIncomes();
  }, [checked]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/incomes', {
        source_name: sourceName,
        amount: parseFloat(amount),
        income_date: incomeDate,
      });
      setSourceName('');
      setAmount('');
      setShowForm(false);
      await loadIncomes();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    await api.delete(`/incomes/${id}`);
    await loadIncomes();
  }

  if (!checked) return null;

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold">{t('title')}</h1>
        <button onClick={() => setShowForm((v) => !v)} className="btn-primary">
          <Plus size={18} />
          {t('addIncome')}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="glass-card p-5 mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="label-text">{t('source')}</label>
            <input
              required
              value={sourceName}
              onChange={(e) => setSourceName(e.target.value)}
              className="input-field mt-1"
              placeholder="Salary"
            />
          </div>
          <div>
            <label className="label-text">Amount</label>
            <input
              type="number"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="input-field mt-1"
              placeholder="5000000"
            />
          </div>
          <div>
            <label className="label-text">Date</label>
            <input
              type="date"
              required
              value={incomeDate}
              onChange={(e) => setIncomeDate(e.target.value)}
              className="input-field mt-1"
            />
          </div>
          <div className="flex items-end gap-2">
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
        ) : incomes.length === 0 ? (
          <div className="p-8 text-center text-sm text-ink-700/60 dark:text-cream-100/60">
            No income recorded yet.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-700/10 dark:border-cream-100/10 text-left">
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">{t('source')}</th>
                <th className="px-5 py-3 font-medium text-right">Amount</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {incomes.map((income) => (
                <tr key={income.id} className="border-b border-ink-700/5 dark:border-cream-100/5 last:border-0">
                  <td className="px-5 py-3">{income.income_date}</td>
                  <td className="px-5 py-3">{income.source_name}</td>
                  <td className="px-5 py-3 text-right tabular-nums font-medium text-emerald-500">
                    +{income.amount.toLocaleString()} {income.currency}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => handleDelete(income.id)}
                      className="text-coral-500 hover:opacity-70"
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
