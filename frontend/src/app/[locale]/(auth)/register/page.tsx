'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/navigation';
import { AuthShell } from '@/components/auth-shell';
import { api } from '@/lib/api-client';
import { Loader2, CheckCircle2 } from 'lucide-react';

export default function RegisterPage() {
  const t = useTranslations('auth');
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post('/auth/register', { email, password, full_name: fullName });
      setDone(true);
      setTimeout(() => router.push('/login'), 2000);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
setError(typeof detail === 'string' ? detail : 'Please check your information and try again.');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <AuthShell title={t('createAccountTitle')} subtitle={t('createAccountSubtitle')}>
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <CheckCircle2 className="text-emerald-500" size={40} />
          <p className="font-medium">Account created! Check your email to verify, redirecting to login…</p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={t('createAccountTitle')} subtitle={t('createAccountSubtitle')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label-text">{t('fullName')}</label>
          <input
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="input-field mt-1"
            placeholder="Aziz Karimov"
          />
        </div>
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
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field mt-1"
            placeholder="At least 8 characters"
          />
        </div>

        {error && <p className="text-sm text-coral-500">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? <Loader2 className="animate-spin" size={18} /> : t('signUp')}
        </button>

        <p className="text-center text-sm text-ink-700/60 dark:text-cream-100/60 pt-2">
          {t('haveAccount')}{' '}
          <Link href="/login" className="font-medium text-gold-600 dark:text-gold-400 hover:underline">
            {t('signIn')}
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
