'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/navigation';
import { AuthShell } from '@/components/auth-shell';
import { api } from '@/lib/api-client';
import { Loader2, MailCheck } from 'lucide-react';

export default function ForgotPasswordPage() {
  const t = useTranslations('auth');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [devLink, setDevLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post('/auth/forgot-password', { email });
      if (data?.dev_reset_link) setDevLink(data.dev_reset_link);
      setSent(true);
    } catch (err: any) {
      setError(
        err?.response
          ? "Something went wrong. Please try again."
          : "Can't reach the server — check that the backend is running and try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title={t('resetPassword')} subtitle="We'll email you a reset link.">
      {sent ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <MailCheck className="text-emerald-500" size={40} />
          <p className="font-medium text-textmain">If that email exists, a reset link is on its way.</p>
          {devLink && (
            <div className="w-full rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-3 py-2 text-left">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">
                Dev mode - SMTP isn't configured, so here's the link directly:
              </p>
              <a href={devLink} className="text-xs text-amber-700 dark:text-amber-400 underline break-all">
                {devLink}
              </a>
            </div>
          )}
          <Link href="/login" className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline">
            {t('signIn')}
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label-text">{t('email')}</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field mt-1"
              placeholder="you@example.com"
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? <Loader2 className="animate-spin" size={18} /> : t('sendResetLink')}
          </button>
          {error && <p className="text-sm text-danger text-center">{error}</p>}
        </form>
      )}
    </AuthShell>
  );
}
