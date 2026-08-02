'use client';

import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Camera, Loader2, UploadCloud, Receipt as ReceiptIcon } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { useRouter } from '@/navigation';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { api } from '@/lib/api-client';
import { SCAN_DRAFT_STORAGE_KEY } from '@/components/quick-actions';
import type { Expense, PaginatedExpenses, ReceiptScanResult } from '@/types/finance';

export default function ReceiptsPage() {
  const checked = useRequireAuth();
  const t = useTranslations('receipts');
  const te = useTranslations('expenses');
  const tc = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();

  const [scanning, setScanning] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [receipts, setReceipts] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!checked) return;
    api
      .get<PaginatedExpenses>('/expenses', { params: { page: 1, page_size: 50 } })
      .then(({ data }) => setReceipts(data.items.filter((e) => e.receipt_image || e.ai_image_url)))
      .catch(() => setReceipts([]))
      .finally(() => setLoading(false));
  }, [checked]);

  async function handleScanFile(file: File | null | undefined) {
    if (!file) return;
    setScanning(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('language', locale);
      const { data } = await api.post<ReceiptScanResult>('/expenses/scan', formData, { timeout: 25000 });
      sessionStorage.setItem(SCAN_DRAFT_STORAGE_KEY, JSON.stringify(data));
      router.push('/expenses');
    } catch {
      sessionStorage.setItem(SCAN_DRAFT_STORAGE_KEY, JSON.stringify({ warning: te('scanErrorGeneric') }));
      router.push('/expenses');
    } finally {
      setScanning(false);
    }
  }

  if (!checked) return null;

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-textmain">{t('title')}</h1>
        <p className="text-sm text-textmuted mt-0.5">{t('subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
        <label
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleScanFile(e.dataTransfer.files?.[0]);
          }}
          className={`glass-card flex flex-col items-center justify-center gap-2 border-2 border-dashed px-6 py-10 text-center cursor-pointer transition-colors ${
            dragOver ? 'border-primary bg-primary/5' : 'border-textmain/15 hover:border-primary/40'
          }`}
        >
          <input
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif"
            className="hidden"
            disabled={scanning}
            onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; handleScanFile(f); }}
          />
          <UploadCloud size={30} className="text-textmuted mb-1" />
          <p className="text-sm font-medium text-textmain">{t('uploadTitle')}</p>
          <p className="text-xs text-textmuted">{t('uploadHint')}</p>
        </label>

        <label className="glass-card flex flex-col items-center justify-center gap-2 px-6 py-10 text-center cursor-pointer hover:brightness-[0.98] transition-all">
          <input
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif"
            capture="environment"
            className="hidden"
            disabled={scanning}
            onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; handleScanFile(f); }}
          />
          <span className="h-12 w-12 rounded-full bg-primary/15 text-primary flex items-center justify-center">
            {scanning ? <Loader2 size={22} className="animate-spin" /> : <Camera size={22} />}
          </span>
          <p className="text-sm font-medium text-textmain">
            {scanning ? te('scanning') : t('scanWithCamera')}
          </p>
        </label>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="px-5 py-4 border-b border-textmain/[0.06]">
          <h2 className="font-display font-semibold text-textmain">{t('recentScans')}</h2>
        </div>
        {loading ? (
          <div className="p-8 text-center text-sm text-textmuted">{tc('loading')}</div>
        ) : receipts.length === 0 ? (
          <div className="p-8 text-center text-sm text-textmuted">{t('empty')}</div>
        ) : (
          <div className="divide-y divide-textmain/[0.06]">
            {receipts.map((r) => {
              const thumb = r.receipt_image || r.ai_image_url;
              return (
                <div key={r.id} className="flex items-center gap-3 px-5 py-3">
                  {thumb ? (
                    <img src={thumb} alt="" className="h-10 w-10 rounded-lg object-cover shrink-0" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <ReceiptIcon size={16} />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-textmain truncate">
                      {r.merchant_name || r.description || te('uncategorized')}
                    </p>
                    <p className="text-xs text-textmuted">{r.expense_date}</p>
                  </div>
                  <p className="text-sm font-semibold tabular-nums text-textmain shrink-0">
                    {r.amount.toLocaleString()} {r.currency}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
