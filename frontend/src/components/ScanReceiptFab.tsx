'use client';

import { useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from '@/navigation';
import { Camera, Loader2 } from 'lucide-react';
import { api } from '@/lib/api-client';
import { SCAN_DRAFT_STORAGE_KEY } from './quick-actions';
import type { ReceiptScanResult } from '@/types/finance';

/** Scan-receipt button. Reads a photographed receipt via AI and hands the parsed
 * draft to the Expenses page for review, via sessionStorage + a redirect. */
export function ScanReceiptFab({ variant = 'floating' }: { variant?: 'floating' | 'inline' }) {
  const te = useTranslations('expenses');
  const locale = useLocale();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setScanning(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('language', locale);
      // 25s, not 10s: the backend can do one quiet retry (up to ~20s) when it
      // hits Groq's per-minute rate limit, instead of failing immediately - a
      // 10s client timeout was cutting that retry off before it finished.
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

  const className =
    variant === 'floating'
      ? 'fixed bottom-6 right-6 z-30 flex items-center gap-2 rounded-full bg-primary text-white px-4 py-3 shadow-card hover:brightness-95 transition-all disabled:opacity-70'
      : 'btn-secondary w-full sm:w-auto';

  return (
    <>
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
        title={te('scanReceipt')}
        className={className}
      >
        {scanning ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
        <span className={variant === 'floating' ? 'text-sm font-medium hidden sm:inline' : 'text-sm font-medium'}>
          {scanning ? te('scanning') : te('scanReceipt')}
        </span>
      </button>
    </>
  );
}
