'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link, useRouter } from '@/navigation';
import { AuthShell } from '@/components/auth-shell';
import { api, getErrorMessage } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const t = useTranslations('auth');
  const router = useRouter();
  const setTokens = useAuthStore((s) => s.setTokens);
  const setUser = useAuthStore((s) => s.setUser);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNeedsVerification(false);
    setResent(false);
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      setTokens(data.access_token, data.refresh_token);

      const me = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${data.access_token}` },
      });
      setUser(me.data);

      router.push(
        me.data.is_superuser
          ? '/admin'
          : me.data.onboarding_completed
            ? '/dashboard'
            : '/onboarding'
      );
    } catch (err: any) {
      const detail = getErrorMessage(err);
      setError(detail);
      if (detail.toLowerCase().includes('verify your email')) {
        setNeedsVerification(true);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResending(true);
    try {
      await api.post('/auth/resend-verification', { email });
      setResent(true);
    } finally {
      setResending(false);
    }
  }

  return (
    <AuthShell title={t('welcomeBack')} subtitle={t('welcomeBackSubtitle')}>
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
        <div>
          <label className="label-text">{t('password')}</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field mt-1"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <div>
            <p className="text-sm text-red-500">{error}</p>
            {needsVerification && (
              <button
                type="button"
                onClick={handleResend}
                disabled={resending || resent}
                className="text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:underline mt-1"
              >
                {resending ? 'Sending...' : resent ? 'Verification email sent - check your inbox' : 'Resend verification email'}
              </button>
            )}
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? <Loader2 className="animate-spin" size={18} /> : t('signIn')}
        </button>

        <div className="flex items-center justify-between text-sm pt-2">
          <Link href="/forgot-password" className="font-medium text-textmuted hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline">
            {t('forgotPassword')}
          </Link>
          <span className="text-textmuted">
            {t('noAccount')}{' '}
            <Link   href="/register"
              className="font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
              >
              {t('signUp')}
            </Link>
          </span>
        </div>
      </form>
    </AuthShell>
  );
}
