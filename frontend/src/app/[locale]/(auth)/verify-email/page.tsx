'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link } from '@/navigation';
import { AuthShell } from '@/components/auth-shell';
import { api } from '@/lib/api-client';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export default function VerifyEmailPage() {
  const t = useTranslations('auth');
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setError('This verification link is missing its token.');
      return;
    }

    api
      .post('/auth/verify-email', { token })
      .then(() => setStatus('success'))
      .catch((err) => {
        setStatus('error');
        setError(err?.response?.data?.detail || 'This verification link is invalid or expired.');
      });
    // Only ever needs to run once per page load with whatever token is in the URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthShell title={t('verifyEmail')} subtitle="Confirming your email address.">
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="animate-spin text-textmuted" size={40} />
            <p className="text-textmuted">Verifying your email...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle2 className="text-emerald-500" size={40} />
            <p className="font-medium text-textmain">Your email has been verified.</p>
            <Link href="/login" className="btn-primary mt-2">
              {t('signIn')}
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="text-coral-500" size={40} />
            <p className="font-medium text-textmain">Couldn't verify your email</p>
            <p className="text-sm text-textmuted">{error}</p>
            <Link href="/login" className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline mt-2">
              {t('signIn')}
            </Link>
          </>
        )}
      </div>
    </AuthShell>
  );
}
