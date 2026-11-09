'use client';

import { type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from './language-switcher';
import { SavingsBox } from './savings-box';
import { HowItWorks } from './how-it-works';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from './theme-provider';
import { Link, useRouter } from '@/navigation';

export function trackPointer(event: ReactPointerEvent<HTMLElement>) {
  if (event.pointerType !== 'mouse') return;
  const bounds = event.currentTarget.getBoundingClientRect();
  const x = ((event.clientX - bounds.left) / bounds.width) * 100;
  const y = ((event.clientY - bounds.top) / bounds.height) * 100;
  const style = event.currentTarget.style;
  style.setProperty('--pointer-x', `${x}%`);
  style.setProperty('--pointer-y', `${y}%`);
  style.setProperty('--tilt-x', `${(0.5 - y / 100) * 5}deg`);
  style.setProperty('--tilt-y', `${(x / 100 - 0.5) * 7}deg`);
}

export function AuthHeader() {
  const settingsT = useTranslations('settings');
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  return <header className="finance-auth-header"><Link href="/" onClick={() => router.refresh()} className="finance-auth-brand select-none" aria-label="IqtisodAI">Iqtisod<span>AI</span></Link><div className="flex items-center gap-2"><button onClick={toggleTheme} className="finance-auth-utility" aria-label={theme === 'dark' ? settingsT('lightMode') : settingsT('darkMode')}>{theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}</button><LanguageSwitcher /></div></header>;
}

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode; }) {
  const t = useTranslations('auth');
  const common = useTranslations('common');
  return <div className="finance-auth-page min-h-screen"><AuthHeader /><main className="finance-auth-layout"><section className="finance-auth-story" onPointerMove={trackPointer}><div className="finance-auth-story__copy"><p className="finance-auth-eyebrow"><span />{t('boxEyebrow')}</p><h2>{t('boxHeading')}</h2><p className="finance-auth-story__description">{t('boxDescription')}</p></div><div className="finance-auth-visual" aria-hidden="true"><SavingsBox className="finance-auth-illustration" /></div><p className="finance-auth-story__footnote">{t('boxFootnote')}</p></section><section className="finance-auth-form"><div className="finance-auth-form__heading"><h1>{title}</h1><p>{subtitle}</p></div><div className="finance-auth-form__card">{children}</div><p className="finance-auth-credit">{common('createdBy')}</p></section></main><HowItWorks /></div>;
}
