'use client';

import { useTranslations } from 'next-intl';
import {
  LayoutDashboard,
  TrendingDown,
  TrendingUp,
  PiggyBank,
  Receipt,
  HandCoins,
  LineChart,
  Sparkles,
} from 'lucide-react';
import { Link } from '@/navigation';
import { AuthHeader, trackPointer } from '@/components/auth-shell';
import { SavingsBox } from '@/components/savings-box';
import { HowItWorks } from '@/components/how-it-works';

// Public on purpose: no auth hook here, so anyone can see what's inside
// before creating an account.
const INSIDE = [
  { key: 'dashboard', Icon: LayoutDashboard },
  { key: 'expenses', Icon: TrendingDown },
  { key: 'income', Icon: TrendingUp },
  { key: 'goals', Icon: PiggyBank },
  { key: 'receipts', Icon: Receipt },
  { key: 'debts', Icon: HandCoins },
  { key: 'investments', Icon: LineChart },
  { key: 'assistant', Icon: Sparkles },
] as const;

export default function AboutPage() {
  const t = useTranslations('auth');
  const nav = useTranslations('nav');
  const common = useTranslations('common');

  return (
    <div className="finance-auth-page min-h-screen">
      <AuthHeader />

      <main className="finance-about">
        <section className="finance-auth-story finance-about__hero" onPointerMove={trackPointer}>
          <div className="finance-auth-story__copy">
            <p className="finance-auth-eyebrow"><span />{t('boxEyebrow')}</p>
            <h1 className="finance-about__title">{t('aboutTitle')}</h1>
            <p className="finance-auth-story__description">{t('aboutLead')}</p>
            <div className="finance-about__actions">
              <Link href="/register" className="finance-about__cta">{t('register')}</Link>
              <Link href="/login" className="finance-about__ghost">{t('signIn')}</Link>
            </div>
          </div>
          <div className="finance-auth-visual" aria-hidden="true">
            <SavingsBox className="finance-auth-illustration" />
          </div>
        </section>

        <section className="finance-about__inside" aria-label={t('aboutInside')}>
          <h2>{t('aboutInside')}</h2>
          <ul>
            {INSIDE.map(({ key, Icon }) => (
              <li key={key}>
                <span><Icon size={17} aria-hidden="true" /></span>
                {nav(key)}
              </li>
            ))}
          </ul>
        </section>
      </main>

      <HowItWorks id="finance-about-how-title" />

      <p className="finance-auth-credit finance-about__credit">{common('createdBy')}</p>
    </div>
  );
}
