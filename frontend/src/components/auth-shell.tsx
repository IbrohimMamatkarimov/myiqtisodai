'use client';

import { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from './language-switcher';
import { Send, Sun, Moon } from 'lucide-react';
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E4D9F7] via-[#DCD3F5] to-[#C9E9E4] dark:from-bgpage dark:via-bgpage dark:to-bgdark flex items-center justify-center px-6 py-12">

      {/* Header */}
      <div className="absolute top-6 left-8 right-8 flex items-center justify-between z-50">

        {/* Logo */}
        <Link
          href="/login"
          onClick={() => router.refresh()}
          className="text-3xl font-extrabold tracking-tight select-none"
        >
          <span className="text-textmain">Iqtisod</span>
          <span className="text-emerald-500">AI</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-textmain/10 bg-surface text-textmuted hover:text-textmain hover:bg-textmain/5 transition-colors"
            aria-label={theme === 'dark' ? settingsT('lightMode') : settingsT('darkMode')}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <LanguageSwitcher />
        </div>
      </div>

      {/* CHANGED: gap-12 -> gap-10 */}
      <div className="w-full max-w-7xl grid md:grid-cols-2 gap-10 items-center">

        {/* LEFT */}
        {/* CHANGED: moved illustration slightly upward */}
        <div className="hidden md:flex justify-center -mt-10">

          <div className="flex flex-col items-center">

            <img
              src="/iqtisodai5.png"
              alt="IqtisodAI"
              draggable={false}
              /* CHANGED */
              className="w-full max-w-sm select-none"
            />

            {/* CHANGED */}
            <p className="mt-3 max-w-xs text-center text-lg leading-7 text-textmuted">
              {t('illustrationText')}
            </p>

          </div>

        </div>

        {/* RIGHT */}
        <div className="w-full max-w-lg mx-auto">

          {/* CHANGED */}
          <div className="mb-6 text-center">

            <h1 className="font-display text-5xl font-bold text-textmain">
              {title}
            </h1>

            <p className="mt-3 text-lg text-textmuted">
              {subtitle}
            </p>

          </div>

          <div className="rounded-[32px] bg-surface border border-violet-100 dark:border-textmain/10 shadow-[0_25px_60px_rgba(124,58,237,0.10)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.25)] p-10">
            {children}
          </div>

          <p className="mt-8 text-center text-sm font-semibold bg-gradient-to-r from-violet-500 via-fuchsia-400 to-teal-500 bg-clip-text text-transparent">
            {common('createdBy')}
          </p>

        </div>

      </div>

      {/* Telegram Support */}
      <a
        href="https://t.me/ibrohimmamatkarimov"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-30 flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-500 to-teal-500 hover:brightness-110 text-white px-5 py-3 shadow-xl transition-all duration-300 hover:scale-105"
      >
        <Send size={18} />

        <span className="text-sm font-semibold">
          {common('support')}
        </span>
      </a>

    </div>
  );
}

