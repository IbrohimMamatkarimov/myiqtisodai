'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/navigation';
import { AuthShell } from '@/components/auth-shell';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';
import { api, getErrorMessage } from '@/lib/api-client';
import { Loader2, MailCheck } from 'lucide-react';

export default function RegisterPage() {
  const t = useTranslations('auth');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setError(null);

    try {
      await api.post('/auth/register', {
        email,
        password,
      });

      setSent(true);
    } catch (err: any) {
      setError(getErrorMessage(err, 'Please check your information and try again.'));
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

  if (sent) {
    return (
      <AuthShell title={t('createAccountTitle')} subtitle="One more step.">
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <MailCheck className="text-emerald-500" size={40} />
          <p className="font-medium text-textmain">Check your email to verify your account.</p>
          <p className="text-sm text-textmuted">
            We sent a verification link to <span className="font-medium text-textmain">{email}</span>.
            Click it, then sign in below.
          </p>

          <button
            type="button"
            onClick={handleResend}
            disabled={resending || resent}
            className="text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:underline mt-1"
          >
            {resending ? 'Sending...' : resent ? 'Verification email sent - check your inbox' : "Didn't get it? Resend"}
          </button>

          <Link href="/login" className="btn-primary mt-4">
            {t('signIn')}
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={t('createAccountTitle')}
      subtitle={t('createAccountSubtitle')}
    >
      <form onSubmit={handleSubmit} className="space-y-4">

        <div>
          <label className="label-text">
            {t('email')}
          </label>

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
          <label className="label-text">
            {t('password')}
          </label>

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

        {error && (
          <p className="text-sm text-danger">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full"
        >
          {loading
            ? <Loader2 className="animate-spin" size={18} />
            : t('signUp')}
        </button>

        <div className="flex items-center gap-3 py-1">
          <div className="h-px flex-1 bg-textmain/10" />
          <span className="text-xs text-textmuted">{t('orContinueWith')}</span>
          <div className="h-px flex-1 bg-textmain/10" />
        </div>
        <GoogleSignInButton />

        <p className="text-center text-sm text-textmuted pt-2">
          {t('haveAccount')}{' '}
          <Link
            href="/login"
            className="font-medium text-primary hover:underline"
          >
            {t('signIn')}
          </Link>
        </p>

      </form>
    </AuthShell>
  );
}
