'use client';

import { ReactNode } from 'react';
import { LanguageSwitcher } from './language-switcher';

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-cream-50 via-cream-100 to-cream-50 dark:from-ink-950 dark:via-ink-900 dark:to-ink-950">
      <div className="absolute top-6 right-6">
        <LanguageSwitcher />
      </div>
      <div className="w-full max-w-md animate-fade-up">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-2xl bg-ink-900 dark:bg-gold-500 flex items-center justify-center">
            <span className="font-display font-bold text-lg text-gold-400 dark:text-ink-950">M</span>
          </div>
          <h1 className="font-display text-2xl font-bold">{title}</h1>
          <p className="mt-1 text-sm text-ink-700/60 dark:text-cream-100/60">{subtitle}</p>
        </div>
       <div className="glass-card p-8">{children}</div>
        <p className="mt-6 text-center text-sm font-medium bg-gradient-to-r from-gold-500 via-emerald-500 to-gold-500 bg-clip-text text-transparent">
           Created by Ibrohim Mamatkarimov 
        </p>
      </div>
    </div>
  );
}
