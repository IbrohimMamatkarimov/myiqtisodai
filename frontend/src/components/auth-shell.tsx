'use client';

import { ReactNode } from 'react';
import { LanguageSwitcher } from './language-switcher';
import { Send } from 'lucide-react';
import { useTranslations } from 'next-intl';

function HappySaverIllustration() {
  return (
    <svg viewBox="0 0 400 420" className="w-full max-w-sm mx-auto">
      <circle cx="200" cy="210" r="190" fill="currentColor" className="text-gold-500/10" />
      <circle cx="110" cy="80" r="12" fill="currentColor" className="text-gold-400" />
      <circle cx="300" cy="60" r="9" fill="currentColor" className="text-emerald-400" />
      <circle cx="330" cy="150" r="7" fill="currentColor" className="text-gold-400" />
      <circle cx="70" cy="180" r="8" fill="currentColor" className="text-emerald-400" />
      <ellipse cx="200" cy="380" rx="120" ry="16" fill="currentColor" className="text-ink-900/10" />
      <ellipse cx="140" cy="300" rx="55" ry="60" fill="currentColor" className="text-gold-500" />
      <circle cx="185" cy="255" r="10" fill="currentColor" className="text-gold-500" />
      <circle cx="200" cy="170" r="58" fill="currentColor" className="text-gold-400" />
      <circle cx="178" cy="172" r="6" fill="currentColor" className="text-ink-950" />
      <circle cx="222" cy="172" r="6" fill="currentColor" className="text-ink-950" />
      <path d="M175 195 Q200 215 225 195" stroke="currentColor" strokeWidth="5" fill="none" strokeLinecap="round" className="text-ink-950" />
      <rect x="160" y="222" width="80" height="70" rx="20" fill="currentColor" className="text-emerald-500" />
      <path d="M120 260 Q100 230 110 200" stroke="currentColor" strokeWidth="10" fill="none" strokeLinecap="round" className="text-emerald-500" />
      <path d="M280 260 Q300 220 290 195" stroke="currentColor" strokeWidth="10" fill="none" strokeLinecap="round" className="text-emerald-500" />
      <rect x="85" y="185" width="30" height="12" rx="6" fill="currentColor" className="text-gold-600" />
      <rect x="270" y="180" width="30" height="12" rx="6" fill="currentColor" className="text-gold-600" />
      <circle cx="270" cy="330" r="14" fill="currentColor" className="text-gold-500" />
      <circle cx="300" cy="345" r="10" fill="currentColor" className="text-gold-400" />
    </svg>
  );
}

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

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-cream-50 via-cream-100 to-cream-50 dark:from-ink-950 dark:via-ink-900 dark:to-ink-950">
      <div className="absolute top-6 right-6">
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-4xl grid md:grid-cols-2 gap-8 items-center animate-fade-up">
        {/* Left side */}
        <div className="hidden md:flex flex-col items-center justify-center">
          <img
            src="/iqtisodai2.png"
            alt="Save money"
            className="w-full max-w-sm mx-auto"
          />

          <p className="mt-4 text-center text-sm text-ink-700/60 dark:text-cream-100/60 max-w-xs">
            {t('illustrationText')}
          </p>
        </div>
        
            <h1 className="font-display text-2xl font-bold">{title}</h1>

            <p className="mt-1 text-sm text-ink-700/60 dark:text-cream-100/60">
              {subtitle}
            </p>
          </div>

          <div className="glass-card p-8">
            {children}
          </div>

          <p className="mt-6 text-center text-sm font-medium bg-gradient-to-r from-gold-500 via-emerald-500 to-gold-500 bg-clip-text text-transparent">
            Created by Ibrohim Mamatkarimov
          </p>
        </div>
      </div>

      <a
        href="https://t.me/ibrohimmamatkarimov"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-30 flex items-center gap-2 rounded-full bg-[#229ED9] text-white px-4 py-3 shadow-glass hover:opacity-90 transition-opacity"
      >
        <Send size={18} />
        <span className="text-sm font-medium">Support</span>
      </a>
    </div>
  );
}
