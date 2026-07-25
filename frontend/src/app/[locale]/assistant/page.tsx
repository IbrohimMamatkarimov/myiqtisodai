'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Sparkles, Send, Loader2 } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { api } from '@/lib/api-client';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function AssistantPage() {
  const checked = useRequireAuth();
  const t = useTranslations('assistant');

  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;

    const q = question;
    setMessages((prev) => [...prev, { role: 'user', content: q }]);
    setQuestion('');
    setLoading(true);

    try {
      const { data } = await api.post('/ai/ask', { question: q });
      setMessages((prev) => [...prev, { role: 'assistant', content: data.answer }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, something went wrong answering that.' },
      ]);
    } finally {
      setLoading(false);
    }
  }

  if (!checked) return null;

  return (
    <AppShell>
      <div className="mb-6 flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-ink-900 dark:bg-gold-500 flex items-center justify-center">
          <Sparkles size={18} className="text-gold-400 dark:text-ink-950" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold">{t('title')}</h1>
          <p className="text-sm text-ink-700/60 dark:text-cream-100/60">{t('subtitle')}</p>
        </div>
      </div>

      <div className="glass-card p-5 mb-4 min-h-[360px] flex flex-col gap-4">
        {messages.length === 0 && (
          <p className="text-sm text-ink-700/50 dark:text-cream-100/50 m-auto text-center max-w-sm">
            Ask about your budget, spending habits, or whether you can afford something —
            the assistant reads your real transactions before answering.
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${
              m.role === 'user'
                ? 'self-end bg-ink-900 text-cream-50 dark:bg-gold-500 dark:text-ink-950'
                : 'self-start bg-ink-900/5 dark:bg-cream-100/10'
            }`}
          >
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="self-start flex items-center gap-2 text-sm text-ink-700/60 dark:text-cream-100/60">
            <Loader2 size={14} className="animate-spin" /> Thinking…
          </div>
        )}
      </div>

      <form onSubmit={handleAsk} className="flex gap-2">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          className="input-field flex-1"
          placeholder={t('placeholder')}
        />
        <button type="submit" disabled={loading} className="btn-primary">
          <Send size={16} />
          {t('send')}
        </button>
      </form>
    </AppShell>
  );
}
