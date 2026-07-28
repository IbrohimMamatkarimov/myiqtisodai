'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link, useRouter } from '@/navigation';
import { AuthShell } from '@/components/auth-shell';
import { api } from '@/lib/api-client';
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      setTokens(data.access_token, data.refresh_token);

      const me = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${data.access_token}` },
      });
      setUser(me.data);

      router.push('/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
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

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? <Loader2 className="animate-spin" size={18} /> : t('signIn')}
        </button>

        <div className="flex items-center justify-between text-sm pt-2">
          <Link href="/forgot-password" className="text-ink-700/70 dark:text-cream-100/70 hover:underline">
            {t('forgotPassword')}
          </Link>
          <span className="text-ink-700/60 dark:text-cream-100/60">
            {t('noAccount')}{' '}
            <Link   href="/register"
              className="font-medium text-emerald-600 hover:underline"
              >
              {t('signUp')}
            </Link>
          </span>
        </div>
      </form>
    </AuthShell>
  );
}
