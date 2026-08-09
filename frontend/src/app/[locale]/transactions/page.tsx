'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Plus, Wallet, Trash2, Loader2,
  ShoppingCart, Car, Utensils, ShoppingBag, CreditCard, Receipt as ReceiptIcon,
} from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { Link } from '@/navigation';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { api } from '@/lib/api-client';
import type { Expense, Income, PaginatedExpenses } from '@/types/finance';

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

type Filter = 'all' | 'expense' | 'income';

export default function TransactionsPage() {
  const checked = useRequireAuth();
  const t = useTranslations('transactions');
  const te = useTranslations('expenses');
  const ti = useTranslations('income');
  const tc = useTranslations('common');

  const [txns, setTxns] = useState<Txn[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function loadAll() {
    setLoading(true);
    try {
      const [expensesRes, incomesRes] = await Promise.all([
        api.get<PaginatedExpenses>('/expenses', { params: { page: 1, page_size: 50 } }),
        api.get<Income[]>('/incomes', { params: { page: 1, page_size: 50 } }),
      ]);
      const expenseTxns: Txn[] = expensesRes.data.items.map((item) => ({
        type: 'expense' as const,
        date: item.expense_date,
        item,
      }));
      const incomeTxns: Txn[] = incomesRes.data.map((item) => ({
        type: 'income' as const,
        date: item.income_date,
        item,
      }));
      // created_at (a real timestamp), not the plain date - two same-day
      // transactions (e.g. a goal deposit right after an expense) need a
      // real tiebreaker or the most recent one can end up buried instead of
      // first, which reads as "it didn't save."
      setTxns(
        [...expenseTxns, ...incomeTxns].sort(
          (a, b) => new Date(b.item.created_at).getTime() - new Date(a.item.created_at).getTime()
        )
      );
    } catch {
      setTxns([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (checked) loadAll();
  }, [checked]);

  async function handleDelete(txn: Txn) {
    setDeletingId(txn.item.id);
    try {
      if (txn.type === 'expense') {
        await api.delete(`/expenses/${txn.item.id}`);
      } else {
        await api.delete(`/incomes/${txn.item.id}`);
      }
      await loadAll();
    } finally {
      setDeletingId(null);
    }
  }

  if (!checked) return null;

  const visible = txns.filter((tx) => filter === 'all' || tx.type === filter);

  return (
    <AppShell>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <div>
          <h1 className="font-display text-2xl font-bold text-textmain">{t('title')}</h1>
          <p className="text-sm text-textmuted mt-0.5">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/expenses" className="btn-secondary">
            <Plus size={16} />
            {te('addExpense')}
          </Link>
          <Link href="/income" className="btn-primary">
            <Wallet size={16} />
            {ti('addIncome')}
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-2 my-4">
        {(['all', 'expense', 'income'] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-primary text-white'
                : 'bg-surface border border-textmain/10 text-textmuted hover:text-textmain'
            }`}
          >
            {f === 'all' ? t('all') : f === 'expense' ? t('expensesOnly') : t('incomeOnly')}
          </button>
        ))}
      </div>

      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-textmuted">{tc('loading')}</div>
        ) : visible.length === 0 ? (
          <div className="p-10 text-center">
            <img src="/transactions.png" alt="" className="h-32 w-32 mx-auto mb-4 object-contain rounded-2xl" />
            <p className="text-sm text-textmuted">{t('empty')}</p>
          </div>
        ) : (
          <div className="divide-y divide-textmain/[0.06]">
            {visible.map((txn) => {
              const { Icon, bg, fg } = txnVisual(txn);
              const label =
                txn.type === 'expense'
                  ? txn.item.merchant_name || txn.item.description || te('uncategorized')
                  : (txn.item as Income).source_name;
              const subtitle = txn.type === 'expense' ? (txn.item as Expense).ai_category : ti('title');
              return (
                <div key={`${txn.type}-${txn.item.id}`} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${bg} ${fg}`}>
                      <Icon size={16} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-textmain truncate">{label}</p>
                      <p className="text-xs text-textmuted truncate">
                        {subtitle ? `${subtitle} · ` : ''}{txn.date}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <p className={`text-sm font-semibold tabular-nums ${txn.type === 'income' ? 'text-secondary' : 'text-textmain'}`}>
                      {txn.type === 'income' ? '+' : '-'}
                      {txn.item.amount.toLocaleString()} {txn.item.currency}
                    </p>
                    <button
                      onClick={() => handleDelete(txn)}
                      disabled={deletingId === txn.item.id}
                      className="text-danger hover:opacity-70 disabled:opacity-40"
                      aria-label={tc('delete')}
                    >
                      {deletingId === txn.item.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
