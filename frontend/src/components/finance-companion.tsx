'use client';
import { useEffect, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import { Sparkles, Send, X, ArrowUpRight } from 'lucide-react';
import { Link, usePathname } from '@/navigation';
import { api } from '@/lib/api-client';

const COPY = {
  uz: { name: 'IqtisodAI yordamchi', sub: 'Moliyangizni tushunishga yordam', hello: 'Salom! Jamg‘arma, xarajatlar yoki rejalaringiz haqida savol bering.', placeholder: 'Savolingizni yozing…', thinking: 'Javob tayyorlanmoqda…', error: 'Hozir javob olib bo‘lmadi. Qayta urinib ko‘ring.', full: 'To‘liq suhbat', close: 'Yopish', send: 'Yuborish', ideas: ['Jamg‘arishni qanday boshlayman?', 'Byudjetni qanday tuzaman?', 'Xarajatlarni qanday kamaytiraman?'] },
  en: { name: 'IqtisodAI companion', sub: 'Clarity for your money decisions', hello: 'Hi! Ask about saving, spending, or planning your next financial goal.', placeholder: 'Write your question…', thinking: 'Preparing your answer…', error: 'Could not get an answer. Please try again.', full: 'Open full conversation', close: 'Close', send: 'Send', ideas: ['How can I start saving?', 'Help me plan a budget', 'How can I reduce expenses?'] },
  ru: { name: 'Помощник IqtisodAI', sub: 'Помогаем разобраться в финансах', hello: 'Здравствуйте! Задайте вопрос о сбережениях, расходах или финансовых целях.', placeholder: 'Напишите свой вопрос…', thinking: 'Готовим ответ…', error: 'Не удалось получить ответ. Попробуйте ещё раз.', full: 'Открыть полный диалог', close: 'Закрыть', send: 'Отправить', ideas: ['Как начать копить?', 'Как составить бюджет?', 'Как сократить расходы?'] },
};
export function FinanceCompanion() {
  const locale = useLocale();
  const c = COPY[locale as keyof typeof COPY] || COPY.en;
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const input = useRef<HTMLTextAreaElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (open) input.current?.focus(); }, [open]);
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); } };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [open]);
  if (pathname === '/assistant') return null;
  async function ask() {
    if (!question.trim() || loading) return;
    setLoading(true); setError(''); setAnswer('');
    try {
      const { data } = await api.post('/ai/ask', { question: question.trim() });
      setAnswer(data.answer || c.error);
    } catch { setError(c.error); }
    finally { setLoading(false); }
  }
  return <>
    <button ref={trigger} type="button" className="finance-companion-trigger" aria-expanded={open} aria-controls="finance-companion" onClick={() => setOpen(!open)}><span className="finance-companion-face"><Sparkles size={21}/></span><span><strong>IqtisodAI</strong><small>{c.sub}</small></span></button>
    {open && <section id="finance-companion" role="dialog" aria-label={c.name} className="finance-companion-panel">
      <header><span className="finance-companion-face"><Sparkles size={21}/></span><div className="flex-1"><h2>{c.name}</h2><p>{c.sub}</p></div><button type="button" aria-label={c.close} onClick={() => {setOpen(false);trigger.current?.focus();}}><X size={18}/></button></header>
      <div className="finance-companion-body"><p>{c.hello}</p><div className="finance-companion-ideas">{c.ideas.map((idea) => <button type="button" key={idea} onClick={() => {setQuestion(idea);input.current?.focus();}}>{idea}</button>)}</div>
        <div aria-live="polite" aria-busy={loading}>{loading && <p className="mt-4">{c.thinking}</p>}{answer && <div className="finance-companion-answer">{answer}</div>}</div>
        {error && <p role="alert" className="mt-3 text-danger">{error}</p>}
        <Link href="/assistant" className="finance-companion-full">{c.full}<ArrowUpRight size={14}/></Link>
      </div>
      <form onSubmit={(event) => {event.preventDefault();void ask();}}><textarea ref={input} value={question} onChange={(event) => setQuestion(event.target.value)} placeholder={c.placeholder} aria-label={c.placeholder} maxLength={2000}/><button type="submit" disabled={!question.trim() || loading} aria-label={c.send}><Send size={17}/></button></form>
    </section>}
  </>;
}
