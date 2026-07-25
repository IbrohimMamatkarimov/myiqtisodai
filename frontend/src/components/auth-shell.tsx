'use client';

import { ReactNode } from 'react';
import { LanguageSwitcher } from './language-switcher';
import { Send } from 'lucide-react';

function SavingsIllustration() {
  return (
    <svg viewBox="0 0 400 400" className="w-full max-w-sm mx-auto">
      <circle cx="200" cy="200" r="180" fill="currentColor" className="text-gold-500/10" />
      <circle cx="120" cy="90" r="14" fill="currentColor" className="text-gold-400" />
      <circle cx="290" cy="70" r="10" fill="currentColor" className="text-emerald-400" />
      <circle cx="320" cy="160" r="8" fill="currentColor" className="text-gold-400" />
      <ellipse cx="200" cy="250" rx="110" ry="90" fill="currentColor" className="text-gold-500" />
      <circle cx="270" cy="190" r="18" fill="currentColor" className="text-gold-500" />
      <ellipse cx="150" cy="230" rx="8" ry="12" fill="currentColor" className="text-ink-950/70" />
      <ellipse cx="230" cy="230" rx="8" ry="12" fill="currentColor" className="text-ink-950/70" />
      <path d="M150 270 Q190 300 230 270" stroke="currentColor" strokeWidth="6" fill="none" strokeLinecap="round" className="text-ink-950/70" />
      <rect x="185" y="140" width="30" height="14" rx="7" fill="currentColor" className="text-gold-600" />
      <ellipse cx="140" cy="330" rx="90" ry="14" fill="currentColor" className="text-ink-900/10" />
      <circle cx="80" cy="300" r="16" fill="currentColor" className="text-emerald-400" />
      <circle cx="320" cy="300" r="12" fill="currentColor" className="text-gold-400" />
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
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-cream-50 via-cream-100 to-cream-50 dark:from-ink-950 dark:via-ink-900 dark:to-ink-950">
      <div className="absolute top-6 right-6">
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-4xl grid md:grid-cols-2 gap-8 items-center animate-fade-up">
        <div className="hidden md:flex flex-col items-center justify-center">
          <SavingsIllustration />
          <p className="mt-4 text-center text-sm text-ink-700/60 dark:text-cream-100/60 max-w-xs">
            Track your money, reach your goals, and grow your savings with confidence.
          </p>
        </div>

        <div className="w-full max-w-md mx-auto">
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
