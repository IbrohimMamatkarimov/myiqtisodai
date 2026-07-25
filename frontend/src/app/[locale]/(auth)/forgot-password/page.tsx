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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
    } finally {
      setSent(true);
      setLoading(false);
    }
  }

  return (
    <AuthShell title={t('resetPassword')} subtitle="We'll email you a reset link.">
      {sent ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <MailCheck className="text-emerald-500" size={40} />
          <p className="font-medium">If that email exists, a reset link is on its way.</p>
          <Link href="/login" className="text-sm text-gold-600 dark:text-gold-400 hover:underline">
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
        </form>
      )}
    </AuthShell>
  );
}
