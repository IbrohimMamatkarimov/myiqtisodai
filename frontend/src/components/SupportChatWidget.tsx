'use client';

import { useEffect, useRef, useState } from 'react';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { api } from '@/lib/api-client';

interface ChatMessage {
  id: string;
  sender_id: string;
  sender_is_admin: boolean;
  body: string;
  created_at: string;
}

export function SupportChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unread, setUnread] = useState(0);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  function loadUnread() {
    api
      .get<{ unread_count: number }>('/chat/unread-count')
      .then(({ data }) => setUnread(data.unread_count))
      .catch(() => {});
  }

  function loadMessages() {
    setLoading(true);
    api
      .get<ChatMessage[]>('/chat/messages')
      .then(({ data }) => {
        setMessages(data);
        setUnread(0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  // Poll for the unread badge even while the panel is closed.
  useEffect(() => {
    loadUnread();
    const interval = setInterval(() => {
      if (!open) loadUnread();
    }, 30000);
    return () => clearInterval(interval);
  }, [open]);

  // Poll the thread itself while the panel is open.
  useEffect(() => {
    if (!open) return;
    loadMessages();
    const interval = setInterval(loadMessages, 8000);
    return () => clearInterval(interval);
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

  return (
    <>
      {open && (
        <div className="fixed bottom-24 right-6 z-40 w-80 max-w-[calc(100vw-3rem)] h-[28rem] max-h-[70vh] flex flex-col rounded-2xl border border-textmain/10 bg-surface shadow-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-textmain/10 flex items-center justify-between bg-primary/5">
            <div>
              <p className="text-sm font-semibold text-textmain">Support chat</p>
              <p className="text-xs text-textmuted">We usually reply soon</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-textmuted hover:text-textmain"
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
              <p className="text-sm text-textmuted text-center pt-8 px-4">
                Send us a message and an admin will get back to you here.
              </p>
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

          <form onSubmit={sendMessage} className="p-2 border-t border-textmain/10 flex gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Type a message..."
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
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-30 flex items-center gap-2 rounded-full bg-primary text-white px-4 py-3 shadow-card hover:opacity-90 transition-opacity"
      >
        {open ? <X size={18} /> : <MessageCircle size={18} />}
        <span className="text-sm font-medium">Chat</span>
        {!open && unread > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-danger text-white text-[10px] font-bold px-1">
            {unread}
          </span>
        )}
      </button>
    </>
  );
}
