'use client';

import { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from './language-switcher';
import { Send } from 'lucide-react';

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const t = useTranslations("auth");
  const common = useTranslations("common");

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-cream-50 via-cream-100 to-cream-50 dark:from-ink-950 dark:via-ink-900 dark:to-ink-950">
      <div className="absolute top-6 right-6">
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-4xl grid md:grid-cols-2 gap-8 items-center animate-fade-up">
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

        <div className="w-full max-w-md mx-auto">
          <div className="mb-8 text-center">
            <h1 className="font-display text-2xl font-bold">{title}</h1>
            <p className="mt-1 text-sm text-ink-700/60 dark:text-cream-100/60">{subtitle}</p>
          </div>
          <div className="glass-card p-8">{children}</div>
          <p className="mt-6 text-center text-sm font-medium bg-gradient-to-r from-gold-500 via-emerald-500 to-gold-500 bg-clip-text text-transparent">
            Created by Ibrohim Mamatkarimov
          </p>
        </div>
      </div>

      
        <a href="https://t.me/ibrohimmamatkarimov"
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
