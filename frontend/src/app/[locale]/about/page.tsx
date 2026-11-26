'use client';
import {useChatDrag} from "@/components/useChatDrag";
import { createPortal } from "react-dom";
import { UzbekVoice } from "@/components/UzbekVoice";

import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { LayoutDashboard, TrendingDown, TrendingUp, PiggyBank, Receipt, HandCoins, LineChart, MessageCircle, Send, X, ArrowRight, Wallet } from 'lucide-react';
import { Link } from '@/navigation';
import { AuthHeader } from '@/components/auth-shell';
import { RobotMascot } from '@/components/robot-mascot';
import { FinancePlanner } from '@/components/finance-planner';
import { HowItWorks } from '@/components/how-it-works';


const INSIDE = [
  { key: 'dashboard', Icon: LayoutDashboard }, { key: 'expenses', Icon: TrendingDown },
  { key: 'income', Icon: TrendingUp }, { key: 'goals', Icon: PiggyBank },
  { key: 'receipts', Icon: Receipt }, { key: 'debts', Icon: HandCoins },
  { key: 'investments', Icon: LineChart }, { key: 'assistant', Icon: MessageCircle },
] as const;


function FinanceAnswer({ value }: { value: string }) {
  return <div className="space-y-2 rounded-2xl border border-emerald-200/70 bg-emerald-50 p-3 text-sm leading-6">{value.split(/\n\s*\n/).filter(Boolean).map((part, index) => <p key={index}>{part.replaceAll("**", "")}</p>)}</div>;
}

function QutiCompanion() {
 const chatDrag=useChatDrag();
 const [mounted,setMounted]=useState(false);useEffect(()=>setMounted(true),[]);
  const language = useLocale();
  const t = useTranslations('auth');
  const launcher = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [sentQuestion,setSentQuestion]=useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  function close() {
    setOpen(false);
    launcher.current?.focus();
  }
  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  async function ask() {
    if (!question.trim() || loading) return;
    const submitted=question.trim();setSentQuestion(submitted);setQuestion("");
    setLoading(true); setError(""); setAnswer("");
    try {
      const response = await fetch("/api/guest-companion", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question:submitted,language }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Try again shortly.");
      if (!data.answer?.trim()) throw new Error("Please try again."); setAnswer(data.answer); 
    } catch (cause) { setQuestion(draft=>draft||submitted); setError(cause instanceof Error ? cause.message : "Try again shortly."); }
    finally { setLoading(false); }
  }
  if(!mounted)return null;
  return createPortal(<div className="quti-companion-root">
    {open && <section id="quti-public-chat" role="dialog" aria-label={t("qutiTitle")} onKeyDown={event => { if (event.key === "Escape") close(); }} className="quti-panel mb-3 w-[min(370px,calc(100vw-2.5rem))] overflow-hidden rounded-3xl border border-[#377553]/30 bg-[#f8fcf8] shadow-2xl">
      <header className="flex items-center gap-3 bg-[#173d29] px-4 py-3 text-white"><RobotMascot className="quti-chat-character" /><div className="flex-1"><strong className="text-sm">{t("qutiTitle")}</strong></div><button type="button" onClick={close} aria-label={t("qutiClose")}><X size={18}/></button></header>
      <div {...chatDrag} tabIndex={0} className="quti-body space-y-3 p-4 text-sm text-[#173d29]">{sentQuestion&&<p className="ml-6 rounded-2xl bg-emerald-100 p-3">{sentQuestion}</p>}<p>{t("qutiIntro")}</p>{answer && <FinanceAnswer value={answer}/>}{error && <p role="alert" className="text-red-700">{error}</p>}<textarea ref={input} aria-label={t("qutiPrompt")} value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={event=>{if(event.key==="Enter"&&!event.shiftKey&&!event.nativeEvent.isComposing&&!event.repeat){event.preventDefault();void ask();}}} maxLength={1200} className="min-h-24 w-full rounded-2xl border border-[#377553]/30 bg-white p-3" placeholder={t("qutiPrompt")} /></div>
      <UzbekVoice language={language} answer={answer} onText={setQuestion}/><div className="flex justify-end border-t border-[#377553]/15 p-3"><button type="button" onClick={ask} disabled={!question.trim() || loading} className="inline-flex items-center gap-2 rounded-xl bg-[#2d7550] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><Send size={15}/>{loading ? t("qutiLoading") : t("qutiAsk")}</button></div>
    </section>}
    <button
      ref={launcher}
      type="button"
      onClick={() => setOpen((value) => !value)}
      aria-expanded={open}
      aria-controls={open ? 'quti-public-chat' : undefined}
      className="quti-public-launch"
    >
      <RobotMascot className="quti-launch-art" />
      <span className="companion-caption"><strong>Quti</strong><small>{t('qutiRole')}</small></span>
    </button>
  </div>,document.body);
}

export default function AboutPage() {
  const locale = useLocale();
  const t = useTranslations('auth');
  const nav = useTranslations('nav');
  const common = useTranslations('common');
  const number = new Intl.NumberFormat(locale);
  const amount = (value: number) => `${number.format(value)} UZS`;

  return (
    <div className="finance-auth-page finance-editorial">
      <AuthHeader />
      <main className="finance-about">
        <section className="finance-editorial-hero" aria-labelledby="finance-about-title">
          <div className="finance-editorial-intro">
            <h1 id="finance-about-title">{t('aboutTitle')}</h1>
            <p>{t('aboutLead')}</p>
            <div className="finance-editorial-actions">
              <Link href="/register" className="finance-editorial-primary">
                {t('register')} <ArrowRight size={17} aria-hidden="true" />
              </Link>
              <Link href="/login" className="finance-editorial-login">{t('signIn')}</Link>
            </div>
          </div>

          <div className="finance-savings-scene">
            <div className="finance-savings-stage" aria-hidden="true">
              <RobotMascot className="finance-savings-character" />
            </div>
          <article className="finance-example" aria-labelledby="finance-example-title">
            <header>
              <span className="finance-example-icon"><Wallet size={20} aria-hidden="true" /></span>
              <h2 id="finance-example-title">{t('aboutExample')}</h2>
            </header>
            <dl>
              <div><dt>{nav('income')}</dt><dd>{amount(4800000)}</dd></div>
              <div><dt>{nav('expenses')}</dt><dd>{amount(3650000)}</dd></div>
              <div className="finance-example-total"><dt>{t('aboutRemaining')}</dt><dd>{amount(1150000)}</dd></div>
            </dl>
          </article>
          </div>
        </section>

        <section className="finance-about__inside" aria-labelledby="finance-features-title">
          <h2 id="finance-features-title">{t('aboutInside')}</h2>
          <ul>
            {INSIDE.map(({ key, Icon }) => (
              <li key={key}><Icon size={17} aria-hidden="true" />{nav(key)}</li>
            ))}
          </ul>
        </section>

        <FinancePlanner />
        <HowItWorks id="finance-about-how-title" />
      </main>
      <footer className="finance-auth-credit finance-about__credit">{common('createdBy')}</footer>
      <QutiCompanion />
    </div>
  );
}
