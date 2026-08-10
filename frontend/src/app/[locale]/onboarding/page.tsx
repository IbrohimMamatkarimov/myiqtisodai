'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/navigation';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { LanguageSwitcher } from '@/components/language-switcher';
import { CountrySelect } from '@/components/country-select';
import { Loader2, Sparkles } from 'lucide-react';

export default function OnboardingPage() {
  const t = useTranslations('onboarding');
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [country, setCountry] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);

  async function finish(e: React.FormEvent) {
    e.preventDefault();
    if (fullName.trim().length < 2) {
      setError(t('nameRequiredError'));
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const { data } = await api.post('/users/complete-onboarding', {
        full_name: fullName,
        date_of_birth: dateOfBirth || undefined,
        country: country || undefined,
      });

      useAuthStore.getState().setUser(data);
      setLoading(false);
      setShowWelcome(true);
      setTimeout(() => router.push('/dashboard'), 3200);
    } catch (e) {
      console.error(e);
      setError(t('error'));
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      {showWelcome ? (
        <div className="flex flex-col items-center text-center max-w-md">
          <div className="h-24 w-24 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-2xl animate-pop-in">
            <Sparkles className="w-11 h-11 text-white" />
          </div>
          <h1
            className="mt-8 font-display text-2xl sm:text-3xl font-bold text-textmain animate-fade-up"
            style={{ animationDelay: '.25s' }}
          >
            {t('welcomeTitle', { name: fullName.split(' ')[0] || '' })}
          </h1>
          <p
            className="mt-3 text-textmuted animate-fade-up"
            style={{ animationDelay: '.45s' }}
          >
            {t('welcomeSubtitle')}
          </p>
          <div className="mt-8 h-1 w-48 rounded-full bg-black/10 overflow-hidden">
            <div className="h-full bg-primary animate-progress-fill" />
          </div>
        </div>
      ) : (
        <>
          <div className="fixed top-6 right-6 z-50">
            <LanguageSwitcher />
          </div>

          <form onSubmit={finish} className="glass-card p-8 sm:p-10 w-full max-w-md">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-6 h-6 text-primary" />
              <h1 className="text-2xl sm:text-3xl font-bold font-display">{t('screen1Title')}</h1>
            </div>
            <p className="text-textmuted mb-6">{t('screen1Subtitle')}</p>

            <div className="space-y-5">
              <div>
                <label className="label-text block mb-1">{t('name')}</label>
                <input
                  required
                  autoFocus
                  className="input-field"
                  placeholder={t('namePlaceholder')}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              <div>
                <label className="label-text block mb-1">{t('dateOfBirth')}</label>
                <input
                  type="date"
                  className="input-field"
                  max={new Date().toISOString().slice(0, 10)}
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                />
              </div>

              <div>
                <label className="label-text block mb-1">{t('place')}</label>
                <CountrySelect
                  value={country}
                  onChange={setCountry}
                  placeholder={t('countryPlaceholder')}
                />
              </div>
            </div>

            {error && <p className="text-sm text-red-500 mt-4">{error}</p>}

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center mt-8">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loading ? t('saving') : t('finish')}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
