'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, X, Loader2 } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import type { Category } from '@/types/finance';

/** Best-effort emoji for a category, so the quick-add chips feel friendly
 * without needing a full icon library wired up here. Falls back to a plain
 * wallet emoji for anything unrecognized (custom user categories, etc). */
function categoryEmoji(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('grocer') || n.includes('oziq')) return '🛒';
  if (n.includes('rent') || n.includes('utilit') || n.includes('uy')) return '🏠';
  if (n.includes('transport') || n.includes('taxi') || n.includes('yo\u02bblik')) return '🚗';
  if (n.includes('din') || n.includes('restaurant') || n.includes('cafe') || n.includes('ovqat')) return '🍔';
  if (n.includes('health') || n.includes('salomat') || n.includes('doctor')) return '❤️';
  if (n.includes('educ') || n.includes('ta\u02bblim') || n.includes('school')) return '📚';
  if (n.includes('entertain') || n.includes('dam olish') || n.includes('film')) return '🎬';
  if (n.includes('shop') || n.includes('xarid')) return '🛍️';
  return '💡';
}

/** Floating quick-add button: the fastest possible path to logging an
 * expense - amount, a category chip, save. No date picker, no notes, no
 * extra fields; today's date is used automatically. */
export function QuickAddExpenseFab() {
  const t = useTranslations('dashboard');
  const te = useTranslations('expenses');
  const tc = useTranslations('common');
  const user = useAuthStore((s) => s.user);

  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    api
      .get<Category[]>('/categories')
      .then(({ data }) => setCategories(data.filter((c) => c.type === 'expense')))
      .catch(() => setCategories([]));
  }, [open]);

  function close() {
    setOpen(false);
    setAmount('');
    setCategoryId(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;
    setSubmitting(true);
    try {
      await api.post('/expenses', {
        amount: parseFloat(amount),
        currency: user?.currency || 'UZS',
        category_id: categoryId || undefined,
        expense_date: new Date().toISOString().slice(0, 10),
      });
      close();
      // Simplest reliable way to refresh dashboard/expenses state after a
      // quick add from anywhere in the app, without prop-drilling a refetch
      // callback through every page that renders this FAB.
      window.location.reload();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('qaAddExpense')}
        className="fixed bottom-6 right-6 z-30 h-14 w-14 rounded-full bg-primary text-white shadow-card flex items-center justify-center hover:brightness-95 active:scale-95 transition-all"
      >
        <Plus size={26} />
      </button>

      {open && (
        <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/40 p-4" onClick={close}>
          <form
            onSubmit={handleSave}
            onClick={(e) => e.stopPropagation()}
            className="glass-card w-full sm:max-w-sm p-6 space-y-5"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display font-semibold text-textmain">{t('qaAddExpense')}</h2>
              <button type="button" onClick={close} className="text-textmuted hover:text-textmain">
                <X size={18} />
              </button>
            </div>

            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              autoFocus
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="input-field text-2xl font-display font-bold tabular-nums text-center py-4"
            />

            <div className="flex flex-wrap gap-2 justify-center">
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategoryId(c.id === categoryId ? null : c.id)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-medium transition-colors ${
                    categoryId === c.id
                      ? 'bg-primary text-white border-primary'
                      : 'border-textmain/10 text-textmain hover:bg-bgpage'
                  }`}
                >
                  <span>{categoryEmoji(c.name)}</span>
                  {c.name}
                </button>
              ))}
            </div>

            <button type="submit" disabled={submitting || !amount} className="btn-primary w-full">
              {submitting ? <Loader2 size={18} className="animate-spin" /> : tc('save')}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
