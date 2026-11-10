'use client';
import { UzbekVoice } from "@/components/UzbekVoice";

import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { LayoutDashboard, TrendingDown, TrendingUp, PiggyBank, Receipt, HandCoins, LineChart, Sparkles, Send, X } from 'lucide-react';
import { Link } from '@/navigation';
import { AuthHeader, trackPointer } from '@/components/auth-shell';
import { RobotMascot } from '@/components/robot-mascot';
import { FinancePlanner } from '@/components/finance-planner';
import { HowItWorks } from '@/components/how-it-works';

const INSIDE = [
  { key: 'dashboard', Icon: LayoutDashboard }, { key: 'expenses', Icon: TrendingDown },
  { key: 'income', Icon: TrendingUp }, { key: 'goals', Icon: PiggyBank },
  { key: 'receipts', Icon: Receipt }, { key: 'debts', Icon: HandCoins },
  { key: 'investments', Icon: LineChart }, { key: 'assistant', Icon: Sparkles },
] as const;


function FinanceAnswer({ value }: { value: string }) {
  return <div className="space-y-2 rounded-2xl border border-emerald-200/70 bg-emerald-50 p-3 text-sm leading-6">{value.split(/\n\s*\n/).filter(Boolean).map((part, index) => <p key={index}>{part.replaceAll("**", "")}</p>)}</div>;
}

function QutiCompanion() {
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
      if (!response.ok) throw new Error(data.error || "Try again shortly.");
      if (!data.answer?.trim()) throw new Error("Please try again."); setAnswer(data.answer); setQuestion(draft => draft.trim() === question.trim() ? "" : draft);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Try again shortly."); }
    finally { setLoading(false); }
  }
  return <div className="fixed bottom-5 right-5 z-50">
    {open && <section role="dialog" aria-label="Quti companion" className="mb-3 w-[min(370px,calc(100vw-2.5rem))] overflow-hidden rounded-3xl border border-[#377553]/30 bg-[#f8fcf8] shadow-2xl">
      <header className="flex items-center gap-3 bg-[#173d29] px-4 py-3 text-white"><img src="/coach-avatar.png" alt="" className="h-12 w-12 shrink-0 rounded-2xl object-cover object-top" /><div className="flex-1"><strong className="text-sm">Sizning jamg‘arish murabbiyingiz</strong><p className="text-xs text-emerald-100">Quti bilan birga reja qilamiz</p></div><button type="button" onClick={() => setOpen(false)} aria-label="Close"><X size={18}/></button></header>
      <div className="space-y-3 p-4 text-sm text-[#173d29]"><p>Jamg‘arish yoki byudjetni boshlash haqida so‘rang. Shaxsiy raqamlaringizni kiritmang — hisobingizga kirgach, Quti ularni xavfsiz tahlil qiladi.</p>{answer && <FinanceAnswer value={answer}/>}{error && <p role="alert" className="text-red-700">{error}</p>}<textarea value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={event=>{if(event.key==="Enter"&&!event.shiftKey&&!event.nativeEvent.isComposing&&!event.repeat){event.preventDefault();void ask();}}} maxLength={1200} className="min-h-24 w-full rounded-2xl border border-[#377553]/30 bg-white p-3" placeholder="Har oy qanday pul jamg‘arsam bo‘ladi?" /></div>
      <UzbekVoice answer={answer} onText={setQuestion}/><div className="flex justify-end border-t border-[#377553]/15 p-3"><button type="button" onClick={ask} disabled={!question.trim() || loading} className="inline-flex items-center gap-2 rounded-xl bg-[#2d7550] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><Send size={15}/>{loading ? "O‘ylayapman…" : "Qutidan so‘rash"}</button></div>
    </section>}
    <button type="button" onClick={() => setOpen((value) => !value)} aria-label="Ask Quti" className="group flex items-center gap-2 rounded-full border border-[#a5d4af] bg-[#f7fcf7] py-1.5 pl-2 pr-4 text-sm font-bold text-[#173d29] shadow-[0_10px_30px_rgba(24,68,43,.22)]"><img src="/coach-avatar.png" alt="" className="h-11 w-11 rounded-full object-cover object-top ring-2 ring-emerald-200 transition-transform group-hover:-translate-y-1" /><span>Jamg‘arish bo‘yicha yordam</span></button>
  </div>;
}

export default function AboutPage() {
  const locale = useLocale();
  const companionLabel = locale === 'uz' ? 'Quti — jamg‘arma hamrohingiz' : locale === 'ru' ? 'Quti — ваш помощник по накоплениям' : 'Quti — your savings companion';
  const t = useTranslations('auth'); const nav = useTranslations('nav'); const common = useTranslations('common');
  return <div className="finance-auth-page min-h-screen"><AuthHeader /><main className="finance-about"><section className="finance-auth-story finance-about__hero" onPointerMove={trackPointer}><div className="finance-auth-story__copy"><p className="finance-auth-eyebrow"><span />{t('boxEyebrow')}</p><h1 className="finance-about__title">{t('aboutTitle')}</h1><p className="finance-auth-story__description">{t('aboutLead')}</p><div className="finance-about__actions"><Link href="/register" className="finance-about__cta">{t('register')}</Link><Link href="/login" className="finance-about__ghost">{t('signIn')}</Link></div></div><div className="finance-auth-visual" aria-hidden="true"><div className="finance-welcome-scene"><span className="finance-welcome-orbit finance-welcome-orbit--one"/><span className="finance-welcome-orbit finance-welcome-orbit--two"/><RobotMascot tone="forest" className="finance-welcome-quti" /><span className="finance-welcome-label"><span/>{companionLabel}</span></div></div></section><section className="finance-about__inside" aria-label={t('aboutInside')}><h2>{t('aboutInside')}</h2><ul>{INSIDE.map(({ key, Icon }) => <li key={key}><span><Icon size={17} aria-hidden="true" /></span>{nav(key)}</li>)}</ul></section><FinancePlanner/></main><HowItWorks id="finance-about-how-title" /><p className="finance-auth-credit finance-about__credit">{common('createdBy')}</p><QutiCompanion /></div>;
}
