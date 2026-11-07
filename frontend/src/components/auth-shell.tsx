'use client';

import { type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from './language-switcher';
import { Sun, Moon, Wallet, ArrowUpRight, Check } from 'lucide-react';
import { useTheme } from './theme-provider';
import { Link, useRouter } from '@/navigation';

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const t = useTranslations('auth');
  const common = useTranslations('common');
  const settingsT = useTranslations('settings');
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();

  function trackPointer(event: ReactPointerEvent<HTMLElement>) {
    if (event.pointerType !== 'mouse') return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * 100;
    const y = ((event.clientY - bounds.top) / bounds.height) * 100;
    event.currentTarget.style.setProperty('--pointer-x', `${x}%`);
    event.currentTarget.style.setProperty('--pointer-y', `${y}%`);
    event.currentTarget.style.setProperty('--tilt-x', `${(0.5 - y / 100) * 5}deg`);
    event.currentTarget.style.setProperty('--tilt-y', `${(x / 100 - 0.5) * 7}deg`);
  }

  return (
    <div className="finance-auth-page min-h-screen">
      <header className="finance-auth-header">
        <Link
          href="/login"
          onClick={() => router.refresh()}
          className="finance-auth-brand select-none"
          aria-label="IqtisodAI"
        >
          Iqtisod<span>AI</span>
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="finance-auth-utility"
            aria-label={theme === 'dark' ? settingsT('lightMode') : settingsT('darkMode')}
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <LanguageSwitcher />
        </div>
      </header>

      <main className="finance-auth-layout">
        <section className="finance-auth-story" onPointerMove={trackPointer}>
          <div className="finance-auth-story__copy">
            <p className="finance-auth-eyebrow"><span />{t('boxEyebrow')}</p>
            <h2>{t('boxHeading')}</h2>
            <p className="finance-auth-story__description">{t('boxDescription')}</p>
          </div>

          <div className="finance-auth-visual">
            <div className="finance-auth-orbit finance-auth-orbit--one" />
            <div className="finance-auth-orbit finance-auth-orbit--two" />
            <div className="finance-auth-coin finance-auth-coin--one" aria-hidden="true" />
            <div className="finance-auth-coin finance-auth-coin--two" aria-hidden="true" />
            <div className="finance-auth-goal">
              <div className="finance-auth-goal__top">
                <span className="finance-auth-wallet"><Wallet size={19} /></span>
                <span className="finance-auth-goal__label">{t('boxGoalLabel')}</span>
                <ArrowUpRight size={17} className="ml-auto text-primary" />
              </div>
              <div className="finance-auth-goal__progress">
                <span>{t('boxProgressLabel')}</span>
                <strong>65%</strong>
              </div>
              <div className="finance-auth-progress-track"><span /></div>
              <div className="finance-auth-goal__footer">
                <span className="finance-auth-check"><Check size={13} /></span>
                <span>{t('boxActivity')}</span>
              </div>
            </div>
          </div>

          <p className="finance-auth-story__footnote">{t('boxFootnote')}</p>
        </section>

        <section className="finance-auth-form">
          <div className="finance-auth-form__heading">
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>

          <div className="finance-auth-form__card">{children}</div>

          <p className="finance-auth-credit">{common('createdBy')}</p>
        </section>
      </main>
    </div>
  );
}
