'use client';

import { type PointerEvent as ReactPointerEvent, type ReactNode, useState } from 'react';
import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from './language-switcher';
import { SavingsBox } from './savings-box';
import { HowItWorks } from './how-it-works';
import { Sun, Moon, MessageCircle, Send, X } from 'lucide-react';
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
  return <header className="finance-auth-header">
    <Link href="/" onClick={() => router.refresh()} className="finance-auth-brand select-none" aria-label="IqtisodAI">Iqtisod<span>AI</span></Link>
    <div className="flex items-center gap-2"><button onClick={toggleTheme} className="finance-auth-utility" aria-label={theme === 'dark' ? settingsT('lightMode') : settingsT('darkMode')}>{theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}</button><LanguageSwitcher /></div>
  </header>;
}

function GuestCompanion() {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function ask() {
    if (!question.trim() || loading) return;
    setLoading(true); setError(""); setAnswer("");
    try {
      const response = await fetch("/api/guest-companion", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Please try again shortly.");
      setAnswer(data.answer || "");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Please try again shortly."); }
    finally { setLoading(false); }
  }
  return <div className="fixed bottom-5 right-5 z-50">
    {open && <section role="dialog" aria-label="IqtisodAI companion" className="mb-3 w-[min(360px,calc(100vw-2.5rem))] overflow-hidden rounded-3xl border border-emerald-900/10 bg-white shadow-2xl dark:bg-[#173226]">
      <header className="flex items-center justify-between bg-emerald-700 px-4 py-3 text-white"><div><strong className="text-sm">IqtisodAI guide</strong><p className="text-xs text-emerald-100">General money questions, no sign-in needed.</p></div><button type="button" onClick={() => setOpen(false)} aria-label="Close"><X size={18}/></button></header>
      <div className="space-y-3 p-4 text-sm"><p className="text-slate-600 dark:text-emerald-50">Ask about budgeting, saving, or getting started. Sign in when you want advice based on your own finances.</p>{answer && <p className="whitespace-pre-wrap rounded-2xl bg-emerald-50 p-3 text-slate-700 dark:bg-emerald-950/40 dark:text-emerald-50">{answer}</p>}{error && <p role="alert" className="text-red-600">{error}</p>}<textarea value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={1200} className="min-h-24 w-full rounded-2xl border border-emerald-900/15 bg-white p-3 text-slate-900 dark:bg-emerald-950/20 dark:text-white" placeholder="How can I start saving each month?" /></div>
      <div className="flex justify-end border-t border-emerald-900/10 p-3"><button type="button" onClick={ask} disabled={!question.trim() || loading} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><Send size={15}/>{loading ? "Thinking…" : "Ask"}</button></div>
    </section>}
    <button type="button" onClick={() => setOpen((value) => !value)} className="inline-flex items-center gap-2 rounded-full bg-emerald-700 px-4 py-3 text-sm font-semibold text-white shadow-lg"><MessageCircle size={18}/>Ask IqtisodAI</button>
  </div>;
}

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode; }) {
  const t = useTranslations('auth');
  const common = useTranslations('common');
  return <div className="finance-auth-page min-h-screen"><AuthHeader />
    <main className="finance-auth-layout"><section className="finance-auth-story" onPointerMove={trackPointer}><div className="finance-auth-story__copy"><p className="finance-auth-eyebrow"><span />{t('boxEyebrow')}</p><h2>{t('boxHeading')}</h2><p className="finance-auth-story__description">{t('boxDescription')}</p></div><div className="finance-auth-visual" aria-hidden="true"><SavingsBox className="finance-auth-illustration" /></div><p className="finance-auth-story__footnote">{t('boxFootnote')}</p></section>
      <section className="finance-auth-form"><div className="finance-auth-form__heading"><h1>{title}</h1><p>{subtitle}</p></div><div className="finance-auth-form__card">{children}</div><p className="finance-auth-credit">{common('createdBy')}</p></section>
    </main><HowItWorks /><GuestCompanion /></div>;
}
