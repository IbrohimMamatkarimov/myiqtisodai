'use client';

import { useRef, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Camera, Loader2 } from 'lucide-react';
import { api } from '@/lib/api-client';
import type { ReceiptScanResult } from '@/types/finance';

export function ReceiptUploader({
  onScanned,
  disabled,
}: {
  onScanned: (result: ReceiptScanResult) => void;
  disabled?: boolean;
}) {
  const t = useTranslations('expenses');
  const locale = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file) return;

    setScanning(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('language', locale);
      const { data } = await api.post<ReceiptScanResult>('/expenses/scan', formData, { timeout: 10000 });
      onScanned(data);
      if (data.warning) setError(data.warning);
    } catch {
      setError(t('scanErrorGeneric'));
    } finally {
      setScanning(false);
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        capture="environment"
        className="hidden"
        onChange={handleFile}
      />
      <button
        type="button"
        disabled={disabled || scanning}
        onClick={() => inputRef.current?.click()}
        className="btn-secondary disabled:opacity-60"
      >
        {scanning ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
        {scanning ? t('scanning') : t('scanReceipt')}
      </button>
      {error && <p className="text-xs text-danger mt-1.5">{error}</p>}
    </div>
  );
}
