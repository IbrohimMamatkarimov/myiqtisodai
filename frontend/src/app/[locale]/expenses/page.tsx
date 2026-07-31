'use client';

import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Plus, Trash2, Pencil, Loader2, Receipt as ReceiptIcon } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { ReceiptUploader } from '@/components/ReceiptUploader';
import { SCAN_DRAFT_STORAGE_KEY } from '@/components/quick-actions';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { api } from '@/lib/api-client';
import type { Category, Expense, PaginatedExpenses, ReceiptScanResult } from '@/types/finance';

export default function ExpensesPage() {
  const checked = useRequireAuth();
  const t = useTranslations('expenses');
  const tc = useTranslations('common');
  const locale = useLocale();

  const [data, setData] = useState<PaginatedExpenses | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('UZS');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [merchantName, setMerchantName] = useState('');
  const [receiptTime, setReceiptTime] = useState('');
  const [taxAmount, setTaxAmount] = useState('');
  const [products, setProducts] = useState<{ name: string; price: number | null }[]>([]);
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [scanNotice, setScanNotice] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

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
    if (!checked) return;
    loadExpenses();
    api.get<Category[]>('/categories').then(({ data }) => {
      setCategories(data.filter((c) => c.type === 'expense'));
    });

    // Pick up a scan started from the Dashboard's quick action
    try {
      const draft = sessionStorage.getItem(SCAN_DRAFT_STORAGE_KEY);
      if (draft) {
        sessionStorage.removeItem(SCAN_DRAFT_STORAGE_KEY);
        const parsed = JSON.parse(draft);
        if (parsed.warning && !parsed.merchant_name && !parsed.amount) {
          setScanNotice(parsed.warning);
          setShowForm(true);
        } else {
          handleScanned(parsed);
        }
      }
    } catch {
      // ignore malformed/missing draft
    }
  }, [checked]);

  function resetForm() {
    setAmount('');
    setCurrency('UZS');
    setCategoryId('');
    setDescription('');
    setExpenseDate(new Date().toISOString().slice(0, 10));
    setMerchantName('');
    setReceiptTime('');
    setTaxAmount('');
    setProducts([]);
    setReceiptImage(null);
    setScanNotice(null);
    setEditingId(null);
  }

  function handleEditClick(expense: Expense) {
    setEditingId(expense.id);
    setAmount(String(expense.amount));
    setCurrency(expense.currency);
    setCategoryId(expense.category_id || '');
    setDescription(expense.description || '');
    setExpenseDate(expense.expense_date);
    setMerchantName(expense.merchant_name || '');
    setReceiptTime(expense.receipt_time || '');
    setTaxAmount(expense.tax_amount != null ? String(expense.tax_amount) : '');
    setProducts([]);
    setReceiptImage(null);
    setScanNotice(null);
    setShowForm(true);
  }

  function handleScanned(result: ReceiptScanResult) {
    if (result.amount) setAmount(String(result.amount));
    if (result.currency) setCurrency(result.currency);
    if (result.category_id) setCategoryId(result.category_id);
    if (result.description) setDescription(result.description);
    if (result.expense_date) setExpenseDate(result.expense_date);
    if (result.merchant_name) setMerchantName(result.merchant_name);
    if (result.receipt_time) setReceiptTime(result.receipt_time);
    if (typeof result.tax_amount === 'number') setTaxAmount(String(result.tax_amount));
    if (result.products?.length) setProducts(result.products);
    if (result.receipt_image) setReceiptImage(result.receipt_image);
    setScanNotice(result.warning || null);
    setShowForm(true);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        amount: parseFloat(amount),
        currency,
        category_id: categoryId || undefined,
        description,
        expense_date: expenseDate,
        merchant_name: merchantName || undefined,
        receipt_time: receiptTime || undefined,
        tax_amount: taxAmount ? parseFloat(taxAmount) : undefined,
        products: products.length ? products : undefined,
        receipt_image: receiptImage || undefined,
      };
      if (editingId) {
        await api.patch(`/expenses/${editingId}`, payload);
      } else {
        await api.post('/expenses', payload);
      }
      resetForm();
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
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="font-display text-2xl font-bold text-textmain">{t('title')}</h1>
        <div className="flex items-center gap-3">
          <ReceiptUploader onScanned={handleScanned} disabled={submitting} />
          <button
            onClick={() => {
              resetForm();
              setShowForm((v) => !v);
            }}
            className="btn-primary"
          >
            <Plus size={18} />
            {t('addExpense')}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="glass-card p-6 mb-6 space-y-4">
          <h2 className="font-display font-semibold text-textmain">
            {editingId ? tc('edit') : t('addExpense')}
          </h2>
          {receiptImage && (
            <div className="flex items-center gap-3 rounded-xl bg-black/5 p-3">
              <img src={receiptImage} alt="Receipt" className="h-16 w-16 object-cover rounded-lg" />
              <div className="text-xs text-textmuted flex items-center gap-1.5">
                <ReceiptIcon size={13} />
                {t('reviewTitle')}
              </div>
            </div>
          )}
          {scanNotice && <p className="text-xs text-warning">{scanNotice}</p>}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            <div>
              <label className="label-text">{t('currency')}</label>
              <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="input-field mt-1">
                <option value="UZS">UZS</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
            <div>
              <label className="label-text">{t('category')}</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="input-field mt-1"
              >
                <option value="">{t('uncategorized')}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-text">{t('date')}</label>
              <input
                type="date"
                lang={locale}
                required
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="input-field mt-1"
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
              <label className="label-text">{t('merchant')}</label>
              <input
                value={merchantName}
                onChange={(e) => setMerchantName(e.target.value)}
                className="input-field mt-1"
              />
            </div>
            <div>
              <label className="label-text">{t('time')}</label>
              <input
                value={receiptTime}
                onChange={(e) => setReceiptTime(e.target.value)}
                placeholder="14:30"
                className="input-field mt-1"
              />
            </div>

            <div>
              <label className="label-text">{t('tax')}</label>
              <input
                type="number"
                step="0.01"
                value={taxAmount}
                onChange={(e) => setTaxAmount(e.target.value)}
                className="input-field mt-1"
              />
            </div>
          </div>

          {products.length > 0 && (
            <div>
              <label className="label-text block mb-2">{t('products')}</label>
              <div className="space-y-1.5">
                {products.map((p, i) => (
                  <div key={i} className="flex justify-between text-sm text-textmain bg-black/5 rounded-lg px-3 py-2">
                    <span>{p.name}</span>
                    {typeof p.price === 'number' && (
                      <span className="tabular-nums text-textmuted">{p.price.toLocaleString()}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="btn-secondary">
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
          <div className="p-8 text-center text-sm text-textmuted">{tc('loading')}</div>
        ) : !data || data.items.length === 0 ? (
          <div className="p-8 text-center text-sm text-textmuted">{t('noResults')}</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/5 text-left">
                <th className="px-5 py-3 font-medium text-textmuted">{t('date')}</th>
                <th className="px-5 py-3 font-medium text-textmuted">{t('description')}</th>
                <th className="px-5 py-3 font-medium text-right text-textmuted">{t('amount')}</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((expense: Expense) => (
                <tr key={expense.id} className="border-b border-black/5 last:border-0">
                  <td className="px-5 py-3 text-textmain">{expense.expense_date}</td>
                  <td className="px-5 py-3 text-textmain">
                    {expense.merchant_name || expense.description || '—'}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums font-medium text-textmain">
                    {expense.amount.toLocaleString()} {expense.currency}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => handleEditClick(expense)}
                        className="text-textmuted hover:text-textmain hover:opacity-70"
                        aria-label={tc('edit')}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(expense.id)}
                        className="text-danger hover:opacity-70"
                        aria-label={tc('delete')}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
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
