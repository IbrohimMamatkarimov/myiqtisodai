'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/navigation';
import { AuthShell } from '@/components/auth-shell';
import { api, getErrorMessage } from '@/lib/api-client';
import { Loader2 } from 'lucide-react';

export default function ResetPasswordPage() {
  const t = useTranslations('auth');
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, new_password: newPassword });
      router.push('/login');
    } catch (err: any) {
      setError(getErrorMessage(err, 'This reset link is invalid or expired.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title={t('resetPassword')} subtitle="Choose a new password.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label-text">{t('newPassword')}</label>
          <input
            type="password"
            required
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="input-field mt-1"
            placeholder="At least 8 characters"
          />
        </div>
        {error && <p className="text-sm text-coral-500">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? <Loader2 className="animate-spin" size={18} /> : t('resetPassword')}
        </button>
      </form>
    </AuthShell>
  );
}
