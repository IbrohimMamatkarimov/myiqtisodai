'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { locales, localeLabels, type Locale } from '@/i18n/config';
import { Globe } from 'lucide-react';
import { useState } from 'react';

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  function switchTo(next: Locale) {
    const segments = pathname.split('/');
    segments[1] = next;
    router.push(segments.join('/'));
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="btn-secondary text-sm py-2 px-3"
        aria-label="Switch language"
      >
        <Globe size={16} />
        {localeLabels[locale as Locale]}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-40 glass-card p-1 z-20">
          {locales.map((l) => (
            <button
              key={l}
              onClick={() => switchTo(l)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-ink-900/5 dark:hover:bg-cream-100/5 ${
                l === locale ? 'font-semibold' : ''
              }`}
            >
              {localeLabels[l]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
