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
  const t = useTranslations('auth');
  const common = useTranslations('common');

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-[#F9FCFA] to-[#ECFDF5] flex items-center justify-center px-6 py-12">

      {/* Header */}
      <div className="absolute top-6 left-8 right-8 flex items-center justify-between z-50">

        {/* Logo */}
        <h2 className="text-3xl font-extrabold tracking-tight select-none">
          <span className="text-slate-900">Iqtisod</span>
          <span className="text-emerald-500">AI</span>
        </h2>

        <LanguageSwitcher />
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
            <p className="mt-3 max-w-xs text-center text-lg leading-7 text-slate-600">
              {t('illustrationText')}
            </p>

          </div>

        </div>

        {/* RIGHT */}
        <div className="w-full max-w-lg mx-auto">

          {/* CHANGED */}
          <div className="mb-6 text-center">

            <h1 className="font-display text-5xl font-bold text-slate-900">
              {title}
            </h1>

            <p className="mt-3 text-lg text-slate-500">
              {subtitle}
            </p>

          </div>

          <div className="rounded-[32px] bg-white border border-emerald-100 shadow-[0_25px_60px_rgba(16,185,129,0.12)] p-10">
            {children}
          </div>

          <p className="mt-8 text-center text-sm font-semibold bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 bg-clip-text text-transparent">
            {common('createdBy')}
          </p>

        </div>

      </div>

      {/* Telegram Support */}
      <a
        href="https://t.me/ibrohimmamatkarimov"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-30 flex items-center gap-2 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-3 shadow-xl transition-all duration-300 hover:scale-105"
      >
        <Send size={18} />

        <span className="text-sm font-semibold">
          {common('support')}
        </span>
      </a>

    </div>
  );
}

