'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AppShell } from '@/components/app-shell';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { useAuthStore } from '@/lib/auth-store';
import { api } from '@/lib/api-client';
import { Loader2 } from 'lucide-react';

const CURRENCIES = ['UZS', 'USD', 'EUR'];

export default function SettingsPage() {
  const checked = useRequireAuth();
  const t = useTranslations('settings');
  const tc = useTranslations('common');
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [currency, setCurrency] = useState(user?.currency || 'UZS');
  const [savingCurrency, setSavingCurrency] = useState(false);
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [savingName, setSavingName] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showReasonForm, setShowReasonForm] = useState(false);
  const [reason, setReason] = useState('');

  // user loads asynchronously after mount (auth check + /auth/me), so the useState
  // initializer above often runs before user.currency exists yet and silently locks
  // in the 'UZS' fallback forever. Re-sync whenever the real value arrives/changes.
  useEffect(() => {
    if (user?.currency) setCurrency(user.currency);
  }, [user?.currency]);

  useEffect(() => {
    if (user?.full_name) setFullName(user.full_name);
  }, [user?.full_name]);

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

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    setSavingName(true);
    setNameSaved(false);
    try {
      const { data } = await api.patch('/users/me', { full_name: fullName });
      setUser(data);
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 2000);
    } finally {
      setSavingName(false);
    }
  }

  async function handleRequestDeletion(e: React.FormEvent) {
    e.preventDefault();
    setRequesting(true);
    try {
      const { data } = await api.post('/users/me/request-deletion', { reason });
      setUser(data);
      setShowReasonForm(false);
      setReason('');
    } finally {
      setRequesting(false);
    }
  }

  async function handleCancelDeletion() {
    setCancelling(true);
    try {
      const { data } = await api.post('/users/me/cancel-deletion-request');
      setUser(data);
    } finally {
      setCancelling(false);
    }
  }

  if (!checked) return null;

  return (
    <AppShell>
      <h1 className="font-display text-2xl font-bold mb-6">{t('title')}</h1>

      <div className="space-y-4 max-w-xl">
        <section className="glass-card p-5">
          <h2 className="font-display font-semibold mb-4">{t('profile')}</h2>
          <form onSubmit={handleSaveName} className="grid grid-cols-1 gap-3 text-sm">
            <div>
              <label className="label-text block mb-1">{t('fullName')}</label>
              <div className="flex gap-2">
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="input-field flex-1"
                  placeholder={t('fullNamePlaceholder')}
                />
                <button type="submit" disabled={savingName || !fullName.trim()} className="btn-secondary shrink-0">
                  {savingName ? <Loader2 size={16} className="animate-spin" /> : nameSaved ? t('saved') : tc('save')}
                </button>
              </div>
            </div>
            <div>
              <span className="label-text block mb-1">{t('email')}</span>
              <span>{user?.email}</span>
            </div>
          </form>
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

          {user?.deletion_requested ? (
            <div>
              <p className="text-sm text-textmain mb-1 font-medium">
                {t('waitingApproval')}
              </p>
              <p className="text-sm text-textmuted mb-4">
                {t('waitingApprovalDesc')}
              </p>
              <button
                onClick={handleCancelDeletion}
                disabled={cancelling}
                className="btn-secondary"
              >
                {cancelling ? <Loader2 size={16} className="animate-spin" /> : t('cancelRequest')}
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm text-textmuted mb-4">
                {t('deleteAccountDesc')}
              </p>
              {!showReasonForm ? (
                <button onClick={() => setShowReasonForm(true)} className="btn-secondary text-coral-500">
                  {t('deleteAccount')}
                </button>
              ) : (
                <form onSubmit={handleRequestDeletion} className="space-y-3">
                  <div>
                    <label className="label-text">{t('deleteReasonLabel')}</label>
                    <textarea
                      required
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="input-field mt-1 min-h-[80px]"
                      placeholder={t('deleteReasonPlaceholder')}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowReasonForm(false)}
                      className="btn-secondary"
                    >
                      {tc('cancel')}
                    </button>
                    <button
                      type="submit"
                      disabled={requesting}
                      className="btn-primary bg-coral-500 dark:bg-coral-500"
                    >
                      {requesting ? <Loader2 size={16} className="animate-spin" /> : t('sendRequest')}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </section>
      </div>
    </AppShell>
  );
}
