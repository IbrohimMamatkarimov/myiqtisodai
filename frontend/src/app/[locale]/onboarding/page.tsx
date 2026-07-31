'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/navigation';
import { api } from '@/lib/api-client';
import { LanguageSwitcher } from '@/components/language-switcher';
import { CountrySelect } from '@/components/country-select';
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Sparkles,
} from 'lucide-react';

const STORAGE_KEY = 'onboarding-progress';

const TOTAL_SCREENS = 4;

const CURRENCIES = ['UZS', 'USD', 'EUR'];
const LANGUAGES = [
  { value: 'uz', label: "O'zbekcha" },
  { value: 'en', label: 'English' },
  { value: 'ru', label: 'Русский' },
];

const SPENDING_HABITS = [
  { key: 'coffee', labelKey: 'habitCoffee', emoji: '☕' },
  { key: 'restaurant', labelKey: 'habitRestaurant', emoji: '🍽️' },
  { key: 'taxi', labelKey: 'habitTaxi', emoji: '🚕' },
  { key: 'subscriptions', labelKey: 'habitSubscriptions', emoji: '📺' },
  { key: 'shopping', labelKey: 'habitShopping', emoji: '🛍️' },
  { key: 'gaming', labelKey: 'habitGaming', emoji: '🎮' },
  { key: 'travel', labelKey: 'habitTravel', emoji: '✈️' },
] as const;

type FormState = {
  full_name: string;
  age: string;
  gender: string;

  country: string;
  currency: string;
  occupation: string;
  monthly_income: string;

  monthly_budget: string;
  salary_day: string;
  language: string;

  spending_habits: Record<string, string>;
};

const initialState: FormState = {
  full_name: '',
  age: '',
  gender: 'male',
  country: '',
  currency: 'UZS',
  occupation: '',
  monthly_income: '',
  monthly_budget: '',
  salary_day: '',
  language: 'uz',
  spending_habits: {},
};

export default function OnboardingPage() {
  const t = useTranslations('onboarding');
  const router = useRouter();

  const [screen, setScreen] = useState(1);
  const [form, setForm] = useState<FormState>(initialState);
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);

  // Restore in-progress answers (e.g. after switching language, which navigates the page).
  // Must finish (and flip `hydrated`) before the persist effect below is allowed to write,
  // otherwise the persist effect can overwrite a real saved answer with blank initial state.
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.form) setForm(parsed.form);
        if (parsed.screen) setScreen(parsed.screen);
      }
    } catch {
      // ignore corrupt/unavailable storage
    } finally {
      setHydrated(true);
    }
  }, []);

  // Persist on every change so switching language mid-flow doesn't lose answers.
  // Gated on `hydrated` so this never fires with blank initial state before restore runs.
  useEffect(() => {
    if (!hydrated) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ form, screen }));
    } catch {
      // ignore
    }
  }, [form, screen, hydrated]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateHabit(key: string, value: string) {
    setForm((prev) => ({
      ...prev,
      spending_habits: { ...prev.spending_habits, [key]: value },
    }));
  }

  function next() {
    setError(null);
    setScreen((s) => Math.min(s + 1, TOTAL_SCREENS));
  }

  function back() {
    setError(null);
    setScreen((s) => Math.max(s - 1, 1));
  }

  async function finish() {
    setLoading(true);
    setError(null);

    const spendingHabitsPayload = Object.fromEntries(
      Object.entries(form.spending_habits).map(([k, v]) => [k, Number(v) || 0])
    );

    try {
      await api.post('/users/complete-onboarding', {
        full_name: form.full_name || undefined,
        age: form.age ? Number(form.age) : undefined,
        gender: form.gender || undefined,

        country: form.country || undefined,
        currency: form.currency || undefined,
        occupation: form.occupation || undefined,
        monthly_income: form.monthly_income ? Number(form.monthly_income) : undefined,

        monthly_budget: form.monthly_budget ? Number(form.monthly_budget) : undefined,
        salary_day: form.salary_day ? Number(form.salary_day) : undefined,
        language: form.language || undefined,

        spending_habits: Object.keys(spendingHabitsPayload).length
          ? spendingHabitsPayload
          : undefined,
      });

      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
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
            {t('welcomeTitle', { name: form.full_name.split(' ')[0] || '' })}
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

          <div className="glass-card p-8 sm:p-10 w-full max-w-xl">

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {Array.from({ length: TOTAL_SCREENS }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                i + 1 <= screen ? 'bg-primary' : 'bg-black/10'
              }`}
            />
          ))}
        </div>

        {screen === 1 && (
          <Screen
            icon={<Sparkles className="w-6 h-6 text-primary" />}
            title={t('screen1Title')}
            subtitle={t('screen1Subtitle')}
          >
            <Field label={t('name')}>
              <input
                className="input-field"
                placeholder={t('namePlaceholder')}
                value={form.full_name}
                onChange={(e) => update('full_name', e.target.value)}
              />
            </Field>

            <Field label={t('age')}>
              <input
                type="number"
                className="input-field"
                placeholder={t('agePlaceholder')}
                value={form.age}
                onChange={(e) => update('age', e.target.value)}
              />
            </Field>

            <Field label={t('gender')}>
              <select
                className="input-field"
                value={form.gender}
                onChange={(e) => update('gender', e.target.value)}
              >
                <option value="male">{t('genderMale')}</option>
                <option value="female">{t('genderFemale')}</option>
              </select>
            </Field>
          </Screen>
        )}

        {screen === 2 && (
          <Screen
            title={t('screen2Title')}
            subtitle={t('screen2Subtitle')}
          >
            <Field label={t('country')}>
              <CountrySelect
                value={form.country}
                onChange={(v) => update('country', v)}
                placeholder={t('countryPlaceholder')}
              />
            </Field>

            <Field label={t('currency')}>
              <select
                className="input-field"
                value={form.currency}
                onChange={(e) => update('currency', e.target.value)}
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Field>

            <Field label={t('occupation')}>
              <input
                className="input-field"
                placeholder={t('occupationPlaceholder')}
                value={form.occupation}
                onChange={(e) => update('occupation', e.target.value)}
              />
            </Field>

            <Field label={t('monthlyIncome')}>
              <input
                type="number"
                className="input-field"
                placeholder={t('monthlyIncomePlaceholder')}
                value={form.monthly_income}
                onChange={(e) => update('monthly_income', e.target.value)}
              />
            </Field>
          </Screen>
        )}

        {screen === 3 && (
          <Screen
            title={t('screen4Title')}
            subtitle={t('screen4Subtitle')}
          >
            <Field label={t('monthlyBudget')}>
              <input
                type="number"
                className="input-field"
                placeholder={t('monthlyBudgetPlaceholder')}
                value={form.monthly_budget}
                onChange={(e) => update('monthly_budget', e.target.value)}
              />
            </Field>

            <Field label={t('salaryDate')}>
              <input
                type="number"
                min={1}
                max={31}
                className="input-field"
                placeholder={t('salaryDatePlaceholder')}
                value={form.salary_day}
                onChange={(e) => update('salary_day', e.target.value)}
              />
            </Field>

            <Field label={t('preferredLanguage')}>
              <select
                className="input-field"
                value={form.language}
                onChange={(e) => update('language', e.target.value)}
              >
                {LANGUAGES.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </Field>
          </Screen>
        )}

        {screen === 4 && (
          <Screen
            title={t('screen5Title')}
            subtitle={t('screen5Subtitle')}
          >
            <div className="space-y-3">
              {SPENDING_HABITS.map((h) => (
                <div key={h.key} className="flex items-center gap-3">
                  <span className="text-xl w-8 text-center">{h.emoji}</span>
                  <span className="w-28 text-sm text-textmuted">{t(h.labelKey)}</span>
                  <input
                    type="number"
                    className="input-field"
                    placeholder="0"
                    value={form.spending_habits[h.key] ?? ''}
                    onChange={(e) => updateHabit(h.key, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </Screen>
        )}

        {error && (
          <p className="text-sm text-red-500 mt-4">{error}</p>
        )}

        <div className="flex items-center justify-between mt-8">
          <button
            type="button"
            onClick={back}
            disabled={screen === 1}
            className="btn-secondary disabled:opacity-0 disabled:pointer-events-none"
          >
            <ChevronLeft className="w-4 h-4" />
            {t('back')}
          </button>

          {screen < TOTAL_SCREENS ? (
            <button type="button" onClick={next} className="btn-primary">
              {t('next')}
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={finish}
              disabled={loading}
              className="btn-primary"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loading ? t('saving') : t('finish')}
            </button>
          )}
        </div>
          </div>
        </>
      )}
    </div>
  );
}

function Screen({
  icon,
  title,
  subtitle,
  children,
}: {
  icon?: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <h1 className="text-2xl sm:text-3xl font-bold font-display">{title}</h1>
      </div>
      <p className="text-textmuted mb-6">{subtitle}</p>
      <div className="space-y-5">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label-text block mb-1">{label}</label>
      {children}
    </div>
  );
}
