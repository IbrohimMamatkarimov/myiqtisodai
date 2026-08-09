'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { X, Send, Loader2, Headset } from 'lucide-react';
import { api } from '@/lib/api-client';

interface ChatMessage {
  id: string;
  sender_id: string;
  sender_is_admin: boolean;
  body: string;
  created_at: string;
}

export function SupportChatWidget() {
  const t = useTranslations('chat');
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unread, setUnread] = useState(0);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevUnread = useRef(0);

  function loadUnread() {
    api
      .get<{ unread_count: number }>('/chat/unread-count')
      .then(({ data }) => {
        if (data.unread_count > prevUnread.current) {
          // A new admin reply landed while the panel is closed - surface a
          // toast popup, not just the badge, so it's actually noticed.
          showToast(t('newMessage'));
        }
        prevUnread.current = data.unread_count;
        setUnread(data.unread_count);
      })
      .catch(() => {});
  }

  function showToast(text: string) {
    setToast(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 6000);
  }

  function loadMessages() {
    setLoading(true);
    api
      .get<ChatMessage[]>('/chat/messages')
      .then(({ data }) => {
        setMessages(data);
        setUnread(0);
        prevUnread.current = 0;
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  // Poll for the unread badge/toast even while the panel is closed.
  useEffect(() => {
    loadUnread();
    const interval = setInterval(() => {
      if (!open) loadUnread();
    }, 12000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Lets other parts of the app (e.g. a locked-goal card) open this widget
  // and pre-fill a message, without needing shared state management -
  // window.dispatchEvent(new CustomEvent('open-support-chat', { detail: { prefill } }))
  useEffect(() => {
    function handleOpenRequest(e: Event) {
      const detail = (e as CustomEvent<{ prefill?: string }>).detail;
      setOpen(true);
      if (detail?.prefill) setDraft(detail.prefill);
    }
    window.addEventListener('open-support-chat', handleOpenRequest);
    return () => window.removeEventListener('open-support-chat', handleOpenRequest);
  }, []);

  // Poll the thread itself while the panel is open.
  useEffect(() => {
    if (!open) return;
    loadMessages();
    const interval = setInterval(loadMessages, 8000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setDraft('');
    try {
      const { data } = await api.post<ChatMessage>('/chat/messages', { body });
      setMessages((prev) => [...prev, data]);
    } finally {
      setSending(false);
    }
  }

  function openFromToast() {
    setToast(null);
    setOpen(true);
  }

  return (
    <>
      {/* Toast popup - shown even if the panel is closed, so a reply is never missed */}
      {toast && !open && (
        <button
          onClick={openFromToast}
          className="fixed bottom-24 right-4 left-4 sm:left-auto sm:right-6 sm:w-80 z-40 flex items-center gap-3 rounded-2xl border border-textmain/10 bg-surface shadow-2xl px-4 py-3 text-left"
        >
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-danger" />
          </span>
          <span className="text-sm font-medium text-textmain truncate">{toast}</span>
        </button>
      )}

      {open && (
        <div className="fixed inset-x-3 bottom-24 sm:inset-x-auto sm:right-6 sm:w-80 sm:max-w-[calc(100vw-3rem)] h-[72vh] sm:h-[28rem] max-h-[80vh] z-40 flex flex-col rounded-2xl border border-textmain/10 bg-surface shadow-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-textmain/10 flex items-center justify-between bg-primary/5 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 bg-primary/10 text-primary">
                <Headset size={16} />
              </div>
              <div>
                <p className="text-sm font-semibold text-textmain">{t('title')}</p>
                <p className="text-xs text-textmuted">{t('subtitle')}</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-textmuted hover:text-textmain p-1"
              aria-label="Close chat"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
            {loading && messages.length === 0 && (
              <div className="flex justify-center pt-8">
                <Loader2 size={18} className="animate-spin text-textmuted" />
              </div>
            )}

            {!loading && messages.length === 0 && (
              <p className="text-sm text-textmuted text-center pt-8 px-4">{t('empty')}</p>
            )}

            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.sender_is_admin ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words ${
                    m.sender_is_admin
                      ? 'bg-textmain/[0.06] text-textmain rounded-bl-sm'
                      : 'bg-primary text-white rounded-br-sm'
                  }`}
                >
                  {m.body}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={sendMessage} className="p-2 border-t border-textmain/10 flex gap-2 shrink-0">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t('placeholder')}
              className="input-field flex-1 text-sm"
            />
            <button
              type="submit"
              disabled={sending || !draft.trim()}
              className="shrink-0 flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white disabled:opacity-40"
              aria-label="Send"
            >
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </form>
        </div>
      )}

      <button
        onClick={() => {
          setToast(null);
          setOpen((v) => !v);
        }}
        className="fixed z-30 flex items-center gap-2 rounded-full bg-primary text-white px-4 py-3 shadow-card hover:opacity-90 transition-opacity"
        style={{ bottom: 'max(1.5rem, env(safe-area-inset-bottom))', right: '1.5rem' }}
      >
        {open ? (
          <X size={18} />
        ) : (
          <Headset size={18} />
        )}
        <span className="text-sm font-medium">{t('button')}</span>
        {!open && unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-75" />
            <span className="relative flex h-5 min-w-5 items-center justify-center rounded-full bg-danger text-white text-[10px] font-bold px-1">
              {unread}
            </span>
          </span>
        )}
      </button>
    </>
  );
}
