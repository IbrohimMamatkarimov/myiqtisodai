'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Search, Receipt, Wallet, Loader2 } from 'lucide-react';
import { useRouter } from '@/navigation';
import { api } from '@/lib/api-client';
import type { Expense, Income } from '@/types/finance';

type Result =
  | { type: 'expense'; item: Expense }
  | { type: 'income'; item: Income };

export function GlobalSearch() {
  const t = useTranslations('topbar');
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const handle = setTimeout(async () => {
      try {
        const [expensesRes, incomesRes] = await Promise.all([
          api.get('/expenses', { params: { search: trimmed, page_size: 5 } }),
          api.get('/incomes', { params: { search: trimmed, page_size: 5 } }),
        ]);
        const expenseResults: Result[] = expensesRes.data.items.map((item: Expense) => ({
          type: 'expense' as const,
          item,
        }));
        const incomeResults: Result[] = incomesRes.data.map((item: Income) => ({
          type: 'income' as const,
          item,
        }));
        setResults([...expenseResults, ...incomeResults]);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function goTo(result: Result) {
    setOpen(false);
    setQuery('');
    router.push(result.type === 'expense' ? '/expenses' : '/income');
  }

  const showDropdown = open && query.trim().length >= 2;

  return (
    <div ref={containerRef} className="relative w-full max-w-xs">
      <div className="flex items-center gap-2 rounded-xl border border-textmain/10 bg-textmain/[0.04] px-3 py-2 text-sm text-textmuted">
        <Search size={15} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={t('search')}
          className="bg-transparent outline-none w-full placeholder:text-textmuted text-textmain"
        />
        {loading && <Loader2 size={13} className="animate-spin shrink-0" />}
      </div>

      {showDropdown && (
        <div className="absolute top-full mt-2 left-0 right-0 sm:right-auto sm:w-80 rounded-xl border border-black/10 bg-surface shadow-xl overflow-hidden z-50 max-h-80 overflow-y-auto">
          {!loading && results.length === 0 && (
            <p className="text-sm text-textmuted px-4 py-4 text-center">{t('searchNoResults')}</p>
          )}
          {results.map((r, i) => (
            <button
              key={`${r.type}-${r.item.id}-${i}`}
              type="button"
              onClick={() => goTo(r)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-black/5 border-b border-black/5 last:border-0 transition-colors"
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                  r.type === 'expense' ? 'bg-danger/10 text-danger' : 'bg-primary/10 text-primary'
                }`}
              >
                {r.type === 'expense' ? <Receipt size={14} /> : <Wallet size={14} />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-textmain truncate">
                  {r.type === 'expense'
                    ? r.item.merchant_name || r.item.description || '—'
                    : (r.item as Income).source_name}
                </p>
                <p className="text-xs text-textmuted">
                  {r.type === 'expense' ? r.item.expense_date : (r.item as Income).income_date}
                </p>
              </div>
              <span
                className={`text-sm font-semibold tabular-nums shrink-0 ${
                  r.type === 'expense' ? 'text-danger' : 'text-primary'
                }`}
              >
                {r.type === 'expense' ? '-' : '+'}
                {r.item.amount.toLocaleString()}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
