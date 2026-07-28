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
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-white via-[#F8FBF9] to-[#EDF7F1]">
      
      {/* Language Switcher */}
      <div className="absolute top-6 right-6">
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-6xl grid md:grid-cols-2 gap-16 items-center">

        {/* Left Side */}
        <div className="hidden md:flex flex-col items-center justify-center">
          <img
            src="/iqtisodai2.png"
            alt="Iqtisod AI"
            className="w-full max-w-md"
          />

          <p className="mt-6 text-center text-lg text-gray-600 max-w-sm leading-8">
            {t('illustrationText')}
          </p>
        </div>

        {/* Right Side */}
        <div className="w-full max-w-lg mx-auto">

          <div className="mb-8 text-center">
            <h1 className="font-display text-5xl font-bold text-gray-900">
              {title}
            </h1>

            <p className="mt-3 text-lg text-gray-500">
              {subtitle}
            </p>
          </div>

          <div className="rounded-3xl bg-white border border-gray-100 shadow-2xl p-10">
            {children}
          </div>

          <p className="mt-8 text-center text-sm font-medium text-emerald-600">
            {common('createdBy')}
          </p>

        </div>
      </div>

      {/* Telegram Support */}
      <a
        href="https://t.me/ibrohimmamatkarimov"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-30 flex items-center gap-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 shadow-lg transition-all duration-300"
      >
        <Send size={18} />
        <span className="text-sm font-medium">
          Support
        </span>
      </a>

    </div>
  );
}
