'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Sparkles, Send, Plus, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { AppShell } from '@/components/app-shell';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { api } from '@/lib/api-client';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface HistoryItem {
  id: string;
  question: string;
  answer: string;
  created_at: string;
}

// The backend only stores flat individual Q&A rows, no conversation/thread id.
// Group consecutive items into one "topic" whenever they're within 20 minutes
// of each other, so a back-and-forth session shows as ONE history entry
// instead of one scattered row per question.
const GROUP_GAP_MS = 20 * 60 * 1000;

function groupHistory(items: HistoryItem[]): HistoryItem[][] {
  const sorted = [...items].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  const groups: HistoryItem[][] = [];
  for (const item of sorted) {
    const last = groups[groups.length - 1];
    const lastTime = last ? new Date(last[last.length - 1].created_at).getTime() : -Infinity;
    if (last && new Date(item.created_at).getTime() - lastTime <= GROUP_GAP_MS) {
      last.push(item);
    } else {
      groups.push([item]);
    }
  }
  return groups.reverse(); // newest topic first
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-1 py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-textmuted animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

export default function AssistantPage() {
  const checked = useRequireAuth();
  const t = useTranslations('assistant');

  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  function loadHistory() {
    api
      .get<HistoryItem[]>('/ai/history')
      .then(({ data }) => setHistory(data))
      .catch(() => {});
  }

  useEffect(() => {
    if (checked) loadHistory();
  }, [checked]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim() || loading) return;

    const q = question;
    setMessages((prev) => [...prev, { role: 'user', content: q }]);
    setQuestion('');
    setLoading(true);
    setActiveId(null);

    try {
      const { data } = await api.post('/ai/ask', { question: q });
      setMessages((prev) => [...prev, { role: 'assistant', content: data.answer }]);
      loadHistory();
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: t('errorGeneric') }]);
    } finally {
      setLoading(false);
    }
  }

  function startNewChat() {
    setMessages([]);
    setActiveId(null);
  }

  function openHistoryItem(group: HistoryItem[]) {
    const msgs: Message[] = [];
    for (const item of group) {
      msgs.push({ role: 'user', content: item.question });
      msgs.push({ role: 'assistant', content: item.answer });
    }
    setMessages(msgs);
    setActiveId(group[0].id);
  }

  async function deleteHistoryItem(e: React.MouseEvent, group: HistoryItem[]) {
    e.stopPropagation();
    const ids = new Set(group.map((g) => g.id));
    setHistory((prev) => prev.filter((h) => !ids.has(h.id)));
    if (activeId === group[0].id) startNewChat();
    try {
      await Promise.all(group.map((item) => api.delete(`/ai/history/${item.id}`)));
    } catch {
      loadHistory(); // restore on failure
    }
  }

  async function clearAllHistory() {
    setHistory([]);
    startNewChat();
    try {
      await api.delete('/ai/history');
    } catch {
      loadHistory();
    }
  }

  if (!checked) return null;

  const historyGroups = groupHistory(history);

  return (
    <AppShell>
      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6 h-[calc(100vh-140px)] min-h-[500px]">
        {/* History sidebar */}
        <div className="glass-card p-5 hidden md:flex md:flex-col overflow-hidden">
          <button
            type="button"
            onClick={startNewChat}
            className="flex items-center gap-2 rounded-xl bg-primary/10 border border-primary/20 text-primary font-semibold text-sm px-3 py-2.5 mb-5 hover:bg-primary/15 transition-colors"
          >
            <Plus size={15} />
            {t('newChat')}
          </button>

          <div className="flex items-center justify-between mb-3 px-1">
            <p className="text-xs font-semibold text-textmuted uppercase tracking-wide">
              {t('history')}
            </p>
            {history.length > 0 && (
              <button
                type="button"
                onClick={clearAllHistory}
                className="text-[11px] text-textmuted hover:text-danger transition-colors"
              >
                {t('clearAll')}
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto -mx-1 px-1 divide-y divide-black/5">
            {historyGroups.length === 0 && (
              <p className="text-xs text-textmuted px-2 py-2">{t('noHistory')}</p>
            )}
            {historyGroups.map((group) => {
              const active = activeId === group[0].id;
              return (
                <button
                  key={group[0].id}
                  type="button"
                  onClick={() => openHistoryItem(group)}
                  className={`group w-full text-left flex items-start gap-2 rounded-lg px-3 py-3 border-l-2 transition-colors ${
                    active
                      ? 'border-l-primary bg-primary/10'
                      : 'border-l-transparent hover:bg-black/[0.03]'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <span className={`block text-sm truncate ${active ? 'text-primary font-semibold' : 'text-textmain font-medium'}`}>
                      {group[0].question}
                    </span>
                  </div>
                  <span
                    role="button"
                    onClick={(e) => deleteHistoryItem(e, group)}
                    className="opacity-0 group-hover:opacity-100 shrink-0 p-1 rounded text-textmuted hover:text-danger transition-all"
                  >
                    <Trash2 size={13} />
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Chat panel */}
        <div className="glass-card p-5 flex flex-col overflow-hidden">
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-black/5">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden">
              <Sparkles size={18} className="text-primary" />
            </div>
            <div>
              <h1 className="font-display text-lg font-bold text-textmain">{t('title')}</h1>
              <p className="text-xs text-textmuted">{t('subtitle')}</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto flex flex-col gap-5 pr-1">
            {messages.length === 0 && (
              <p className="text-sm text-textmuted m-auto text-center max-w-sm">
                {t('emptyState')}
              </p>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex items-end gap-2 ${m.role === 'user' ? 'self-end flex-row-reverse' : 'self-start'}`}
              >
                {m.role === 'assistant' && (
                  <div className="h-7 w-7 rounded-full overflow-hidden shrink-0 relative">
                    <Image src="/coach-avatar.png" alt="" fill className="object-cover" />
                  </div>
                )}
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-primary text-bgdark'
                      : 'bg-black/5 text-textmain'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-end gap-2 self-start">
                <div className="h-7 w-7 rounded-full overflow-hidden shrink-0 relative">
                  <Image src="/coach-avatar.png" alt="" fill className="object-cover" />
                </div>
                <div className="rounded-2xl px-3 py-2 bg-black/5">
                  <TypingDots />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={handleAsk} className="flex gap-2 mt-4 pt-4 border-t border-black/5">
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
        </div>
      </div>
    </AppShell>
  );
}
