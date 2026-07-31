'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { AppShell } from '@/components/app-shell';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { useAuthStore } from '@/lib/auth-store';
import { useRouter } from '@/navigation';
import { api } from '@/lib/api-client';
import { Loader2 } from 'lucide-react';

const CURRENCIES = ['UZS', 'USD', 'EUR'];

export default function SettingsPage() {
  const checked = useRequireAuth();
  const t = useTranslations('settings');
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();

  const [currency, setCurrency] = useState(user?.currency || 'UZS');
  const [savingCurrency, setSavingCurrency] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function updateCurrency(next: string) {
    setCurrency(next);
    setSavingCurrency(true);
    try {
      const { data } = await api.patch('/users/me', { currency: next });
      setUser(data);
    } finally {
      setSavingCurrency(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      await api.delete('/users/me');
      logout();
      router.push('/login');
    } finally {
      setDeleting(false);
    }
  }

  if (!checked) return null;

  return (
    <AppShell>
      <h1 className="font-display text-2xl font-bold mb-6">{t('title')}</h1>

      <div className="space-y-4 max-w-xl">
        <section className="glass-card p-5">
          <h2 className="font-display font-semibold mb-4">{t('profile')}</h2>
          <div className="grid grid-cols-1 gap-3 text-sm">
            <div>
              <span className="label-text block mb-1">Full name</span>
              <span>{user?.full_name}</span>
            </div>
            <div>
              <span className="label-text block mb-1">Email</span>
              <span>{user?.email}</span>
            </div>
          </div>
        </section>

        <section className="glass-card p-5">
          <h2 className="font-display font-semibold mb-4">{t('currency')}</h2>
          <div className="flex gap-2 items-center">
            {CURRENCIES.map((c) => (
              <button
                key={c}
                onClick={() => updateCurrency(c)}
                className={`btn-secondary flex-1 ${currency === c ? 'ring-2 ring-primary/50' : ''}`}
              >
                {c}
              </button>
            ))}
            {savingCurrency && <Loader2 size={16} className="animate-spin" />}
          </div>
        </section>

        <section className="glass-card p-5 border border-coral-500/20">
          <h2 className="font-display font-semibold mb-2 text-coral-500">{t('deleteAccount')}</h2>
          <p className="text-sm text-textmuted mb-4">
            This permanently deletes your account and all financial data. This cannot be undone.
          </p>
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)} className="btn-secondary text-coral-500">
              {t('deleteAccount')}
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(false)} className="btn-secondary">
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="btn-primary bg-coral-500 dark:bg-coral-500"
              >
                {deleting ? <Loader2 size={16} className="animate-spin" /> : 'Yes, delete permanently'}
              </button>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
