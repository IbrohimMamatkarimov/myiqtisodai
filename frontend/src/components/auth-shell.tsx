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
            <a href="#finance-auth-how-title" className="finance-auth-tour-link">{t('howTitle')} <ArrowUpRight size={15} aria-hidden="true" /></a>
          </div>

          <div className="finance-auth-visual" aria-hidden="true">
            <svg className="finance-auth-illustration" viewBox="0 0 380 250" fill="none">
              <ellipse cx="196" cy="225" rx="144" ry="13" fill="#dfece2"/>
              <circle cx="110" cy="66" r="29" fill="#f2c39d"/>
              <path d="M82 65c0-23 15-39 34-39 20 0 31 16 29 36-8-2-14-9-18-17-10 12-25 18-45 20Z" fill="#344a3a"/>
              <path d="M96 73c5 4 11 4 16 0" stroke="#75533b" strokeWidth="2" strokeLinecap="round"/>
              <path d="M93 100c11-8 27-8 39 0l19 68-70 0 12-68Z" fill="#6ca27b"/>
              <path d="M92 108 69 148l38 19 8-12-22-15 17-24M132 108l25 30 31-9 5 13-39 14-28-29" fill="#f2c39d" stroke="#e4b48e" strokeWidth="2" strokeLinejoin="round"/>
              <path d="M91 167h61l9 52h-35l-7-29-9 29H75l16-52Z" fill="#425d49"/>
              <path d="M78 219h42M127 219h39" stroke="#344a3a" strokeWidth="8" strokeLinecap="round"/>
              <rect x="211" y="125" width="112" height="91" rx="23" fill="#fff" stroke="#cfe0d3" strokeWidth="3"/>
              <path d="M221 136c0-16 13-29 29-29h34c16 0 29 13 29 29" fill="#eaf5ed"/>
              <rect x="250" y="118" width="34" height="7" rx="3.5" fill="#4a8c60"/>
              <rect x="238" y="151" width="57" height="27" rx="9" fill="#eff7f0"/>
              <path d="M248 165h37" stroke="#7eaa87" strokeWidth="2" strokeDasharray="3 4"/>
              <circle cx="267" cy="194" r="10" fill="#e6f2e8"/>
              <path d="M264 194h6M267 191v6" stroke="#438455" strokeWidth="2" strokeLinecap="round"/>
              <circle className="finance-auth-depositPulse" cx="267" cy="165" r="14" stroke="#73b783" strokeWidth="2"/>
              <path d="M187 122c14-4 29-7 49-4" stroke="#f2c39d" strokeWidth="13" strokeLinecap="round"/>
              <path d="M180 120c5-6 12-7 18-4" stroke="#f2c39d" strokeWidth="11" strokeLinecap="round"/>
              <g className="finance-auth-coinDrop">
                <circle cx="196" cy="113" r="10" fill="#eab94f"/>
                <circle cx="196" cy="113" r="6.5" stroke="#fff0b9" strokeWidth="1.5"/>
                <path d="M196 109v8M193 111h5" stroke="#fff5d7" strokeWidth="1.2" strokeLinecap="round"/>
              </g>
              <path d="M343 79v26M330 92h26" stroke="#94bd9b" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="342" cy="92" r="20" stroke="#d6e9d9"/>
            </svg>
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

      <section className="finance-auth-how" aria-labelledby="finance-auth-how-title">
        <div className="finance-auth-how__heading">
          <p>{t('howEyebrow')}</p>
          <h2 id="finance-auth-how-title">{t('howTitle')}</h2>
          <span>{t('howDescription')}</span>
        </div>
        <div className="finance-auth-how__grid">
          {(['howStepOne', 'howStepTwo', 'howStepThree', 'howStepFour'] as const).map((key, index) => (
            <article className="finance-auth-how__card" key={key}>
              <span className="finance-auth-how__number">0{index + 1}</span>
              <h3>{t(key)}</h3>
              <p>{t(`${key}Description`)}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
