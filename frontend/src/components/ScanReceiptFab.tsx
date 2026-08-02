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
      : 'group w-full flex items-center gap-3 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/[0.04] hover:bg-primary/[0.08] hover:border-primary/50 transition-all px-4 py-3.5 text-left disabled:opacity-70';

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
        {variant === 'inline' ? (
          <>
            <span className="shrink-0 flex h-11 w-11 items-center justify-center rounded-full bg-primary text-white group-hover:scale-105 transition-transform">
              {scanning ? <Loader2 size={20} className="animate-spin" /> : <Camera size={20} />}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-textmain">
                {scanning ? te('scanning') : te('scanReceipt')}
              </span>
              {!scanning && (
                <span className="block text-xs text-textmuted truncate">{te('scanReceiptSubtitle')}</span>
              )}
            </span>
          </>
        ) : (
          <>
            {scanning ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
            <span className="text-sm font-medium hidden sm:inline">
              {scanning ? te('scanning') : te('scanReceipt')}
            </span>
          </>
        )}
      </button>
    </>
  );
}
