'use client';

import { useRef, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link, useRouter } from '@/navigation';
import { Plus, Wallet, FileText, Camera, Loader2 } from 'lucide-react';
import { api } from '@/lib/api-client';
import type { ReceiptScanResult } from '@/types/finance';

export const SCAN_DRAFT_STORAGE_KEY = 'scanned-receipt-draft';

export function QuickActions() {
  const t = useTranslations('dashboard');
  const te = useTranslations('expenses');
  const locale = useLocale();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(false);

  const actions = [
    { href: '/expenses', label: t('qaAddExpense'), icon: Plus, tint: 'text-[#64748B] bg-[#64748B]/10 border-[#64748B]/20' },
    { href: '/income', label: t('qaAddIncome'), icon: Wallet, tint: 'text-[#16A34A] bg-[#16A34A]/10 border-[#16A34A]/20' },
    { href: '/assistant', label: t('qaMonthlyReport'), icon: FileText, tint: 'text-[#8B5CF6] bg-[#8B5CF6]/10 border-[#8B5CF6]/20' },
  ];

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
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
      sessionStorage.setItem(
        SCAN_DRAFT_STORAGE_KEY,
        JSON.stringify({ warning: te('scanErrorGeneric') })
      );
      router.push('/expenses');
    } finally {
      setScanning(false);
    }
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif"
        capture="environment"
        className="hidden"
        onChange={handleFile}
      />
      <button
        type="button"
        disabled={scanning}
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary px-5 py-4 font-semibold text-sm transition-all hover:bg-primary/15 disabled:opacity-60"
      >
        {scanning ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
        {scanning ? te('scanning') : te('scanReceipt')}
      </button>

      {actions.map((a) => (
        <Link
          key={a.label}
          href={a.href}
          className={`flex items-center gap-3 rounded-2xl border ${a.tint} px-5 py-4 font-semibold text-sm transition-all hover:brightness-95`}
        >
          <a.icon size={18} />
          <span className="text-textmain">{a.label}</span>
        </Link>
      ))}
    </div>
  );
}
