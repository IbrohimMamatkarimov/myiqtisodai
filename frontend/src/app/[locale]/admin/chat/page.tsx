'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { useRouter } from '@/navigation';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { Loader2, Send, MessageCircle, ChevronLeft } from 'lucide-react';

interface Conversation {
  user_id: string;
  email: string;
  full_name: string;
  last_message: string;
  last_message_at: string;
  last_sender_is_admin: boolean;
  unread_count: number;
}

interface ChatMessage {
  id: string;
  sender_id: string;
  sender_is_admin: boolean;
  body: string;
  created_at: string;
}

export default function AdminChatPage() {
  const checked = useRequireAuth();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const searchParams = useSearchParams();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [convosLoading, setConvosLoading] = useState(true);
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevTotalUnread = useRef(0);

  function loadConversations() {
    api
      .get<Conversation[]>('/admin/chat/conversations')
      .then(({ data }) => {
        const total = data.reduce((sum, c) => sum + (c.unread_count || 0), 0);
        if (total > prevTotalUnread.current) {
          const newest = [...data].sort(
            (a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
          )[0];
          showToast(`New message from ${newest?.full_name || newest?.email || 'a user'}`);
        }
        prevTotalUnread.current = total;
        setConversations(data);
      })
      .catch(() => {})
      .finally(() => setConvosLoading(false));
  }

  function showToast(text: string) {
    setToast(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 6000);
  }

  function loadMessages(userId: string) {
    setMessagesLoading(true);
    api
      .get<ChatMessage[]>(`/admin/chat/${userId}/messages`)
      .then(({ data }) => {
        setMessages(data);
        setConversations((prev) =>
          prev.map((c) => (c.user_id === userId ? { ...c, unread_count: 0 } : c))
        );
      })
      .catch(() => {})
      .finally(() => setMessagesLoading(false));
  }

  useEffect(() => {
    if (!checked) return;
    if (user && !user.is_superuser) {
      router.push('/dashboard');
      return;
    }
    if (user?.is_superuser) {
      loadConversations();
      const interval = setInterval(loadConversations, 12000);
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checked, user]);

  // Allow deep-linking straight into a user's thread, e.g. from the Admin
  // users page: /admin/chat?user=<id>
  useEffect(() => {
    const preselect = searchParams.get('user');
    if (preselect) setActiveUserId(preselect);
  }, [searchParams]);

  useEffect(() => {
    if (!activeUserId) return;
    loadMessages(activeUserId);
    const interval = setInterval(() => loadMessages(activeUserId), 8000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUserId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendReply(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || !activeUserId || sending) return;
    setSending(true);
    setDraft('');
    try {
      const { data } = await api.post<ChatMessage>(`/admin/chat/${activeUserId}/messages`, { body });
      setMessages((prev) => [...prev, data]);
      loadConversations();
    } finally {
      setSending(false);
    }
  }

  if (!checked || !user?.is_superuser) return null;

  const activeConvo = conversations.find((c) => c.user_id === activeUserId);
  const activeName = activeConvo?.full_name || activeConvo?.email || 'Conversation';

  return (
    <AppShell>
      {toast && (
        <button
          onClick={() => setToast(null)}
          className="fixed top-4 right-4 left-4 sm:left-auto sm:w-80 z-40 flex items-center gap-3 rounded-2xl border border-textmain/10 bg-surface shadow-2xl px-4 py-3 text-left"
        >
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-danger" />
          </span>
          <span className="text-sm font-medium text-textmain truncate">{toast}</span>
        </button>
      )}

      <h1 className="font-display text-2xl font-bold text-textmain mb-6">Support chat</h1>

      <div className="glass-card overflow-hidden flex h-[75vh] md:h-[65vh]">
        {/* Conversation list - full width on mobile until one is picked, fixed sidebar on desktop */}
        <div
          className={`${
            activeUserId ? 'hidden md:block' : 'block'
          } w-full md:w-72 shrink-0 border-r border-textmain/[0.06] overflow-y-auto`}
        >
          {convosLoading ? (
            <div className="p-6 text-center text-sm text-textmuted">Loading...</div>
          ) : conversations.length === 0 ? (
            <div className="p-6 text-center text-sm text-textmuted">No conversations yet.</div>
          ) : (
            conversations.map((c) => (
              <button
                key={c.user_id}
                onClick={() => setActiveUserId(c.user_id)}
                className={`w-full text-left px-4 py-3 border-b border-textmain/[0.06] hover:bg-textmain/[0.02] transition-colors ${
                  activeUserId === c.user_id ? 'bg-primary/5' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-textmain truncate">
                    {c.full_name || c.email}
                  </p>
                  {c.unread_count > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-danger text-white text-[10px] font-bold px-1 shrink-0">
                      {c.unread_count}
                    </span>
                  )}
                </div>
                <p className="text-xs text-textmuted truncate mt-0.5">
                  {c.last_sender_is_admin ? 'You: ' : ''}
                  {c.last_message}
                </p>
              </button>
            ))
          )}
        </div>

        {/* Thread - full width on mobile once a conversation is picked, with a back button */}
        <div className={`${activeUserId ? 'flex' : 'hidden md:flex'} flex-1 flex-col min-w-0`}>
          {!activeUserId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-textmuted gap-2">
              <MessageCircle size={28} />
              <p className="text-sm">Select a conversation to start replying</p>
            </div>
          ) : (
            <>
              <div className="px-3 md:px-5 py-3 border-b border-textmain/[0.06] flex items-center gap-2">
                <button
                  onClick={() => setActiveUserId(null)}
                  className="md:hidden shrink-0 text-textmuted hover:text-textmain p-1 -ml-1"
                  aria-label="Back to conversations"
                >
                  <ChevronLeft size={20} />
                </button>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-textmain truncate">{activeName}</p>
                  {activeConvo && <p className="text-xs text-textmuted truncate">{activeConvo.email}</p>}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-3 md:px-4 py-4 space-y-2">
                {messagesLoading && messages.length === 0 ? (
                  <div className="flex justify-center pt-8">
                    <Loader2 size={18} className="animate-spin text-textmuted" />
                  </div>
                ) : (
                  messages.map((m) => (
                    <div key={m.id} className={`flex ${m.sender_is_admin ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words ${
                          m.sender_is_admin
                            ? 'bg-primary text-white rounded-br-sm'
                            : 'bg-textmain/[0.06] text-textmain rounded-bl-sm'
                        }`}
                      >
                        {m.body}
                      </div>
                    </div>
                  ))
                )}
                <div ref={bottomRef} />
              </div>

              <form onSubmit={sendReply} className="p-2 md:p-3 border-t border-textmain/[0.06] flex gap-2">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Reply..."
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
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
