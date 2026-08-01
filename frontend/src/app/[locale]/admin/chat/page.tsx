'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { useRouter } from '@/navigation';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { Loader2, Send, MessageCircle } from 'lucide-react';

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
  const bottomRef = useRef<HTMLDivElement>(null);

  function loadConversations() {
    api
      .get<Conversation[]>('/admin/chat/conversations')
      .then(({ data }) => setConversations(data))
      .catch(() => {})
      .finally(() => setConvosLoading(false));
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
      const interval = setInterval(loadConversations, 15000);
      return () => clearInterval(interval);
    }
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
      <h1 className="font-display text-2xl font-bold text-textmain mb-6">Support chat</h1>

      <div className="glass-card overflow-hidden flex" style={{ height: '65vh' }}>
        {/* Conversation list */}
        <div className="w-72 shrink-0 border-r border-textmain/[0.06] overflow-y-auto">
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
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary text-white text-[10px] font-bold px-1 shrink-0">
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

        {/* Thread */}
        <div className="flex-1 flex flex-col min-w-0">
          {!activeUserId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-textmuted gap-2">
              <MessageCircle size={28} />
              <p className="text-sm">Select a conversation to start replying</p>
            </div>
          ) : (
            <>
              <div className="px-5 py-3 border-b border-textmain/[0.06]">
                <p className="text-sm font-semibold text-textmain">{activeName}</p>
                {activeConvo && <p className="text-xs text-textmuted">{activeConvo.email}</p>}
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
                {messagesLoading && messages.length === 0 ? (
                  <div className="flex justify-center pt-8">
                    <Loader2 size={18} className="animate-spin text-textmuted" />
                  </div>
                ) : (
                  messages.map((m) => (
                    <div key={m.id} className={`flex ${m.sender_is_admin ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[70%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words ${
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

              <form onSubmit={sendReply} className="p-3 border-t border-textmain/[0.06] flex gap-2">
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
