'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, MessageCircle, Send, Users } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import type { Goal, GoalMember } from '@/types/finance';

interface GoalChatOverlayProps {
  goal: Goal;
  onClose: () => void;
}

type GoalChatMessage = { id: string; user_id: string; full_name: string; body: string; created_at: string };

const AVATAR_COLORS = ['#2AABEE', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4'];

/** Full-screen, Telegram-styled chat for a single group goal. Self-contained
 * - fetches its own members (for the header count + avatar colors) and
 * messages, and owns its own send state - so any page can drop this in with
 * just a goal + a close handler, instead of duplicating the whole thread UI
 * per page (this used to only exist inline on the Goals page). */
export function GoalChatOverlay({ goal, onClose }: GoalChatOverlayProps) {
  const user = useAuthStore((s) => s.user);
  const [members, setMembers] = useState<GoalMember[]>([]);
  const [messages, setMessages] = useState<GoalChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get<GoalMember[]>(`/goals/${goal.id}/members`)
      .then(({ data }) => { if (!cancelled) setMembers(data); })
      .catch(() => {});
    api
      .get(`/goals/${goal.id}/messages`)
      .then(({ data }) => {
        if (cancelled) return;
        setMessages(data);
        setTimeout(() => endRef.current?.scrollIntoView({ block: 'nearest' }), 80);
      })
      .catch(() => setMessages([]))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [goal.id]);

  async function handleSend() {
    if (newMessage.trim().length === 0) return;
    setSending(true);
    try {
      const { data } = await api.post(`/goals/${goal.id}/messages`, { body: newMessage.trim() });
      setMessages((prev) => [...prev, data]);
      setNewMessage('');
      setTimeout(() => endRef.current?.scrollIntoView({ block: 'nearest' }), 50);
    } finally {
      setSending(false);
    }
  }

  const colorMap: Record<string, string> = {};
  let ci = 0;
  messages.forEach((m) => {
    if (!colorMap[m.user_id]) { colorMap[m.user_id] = AVATAR_COLORS[ci % AVATAR_COLORS.length]; ci++; }
  });

  type MGroup = { userId: string; fullName: string; msgs: GoalChatMessage[] };
  const groups: MGroup[] = [];
  messages.forEach((m) => {
    const last = groups[groups.length - 1];
    if (last && last.userId === m.user_id) last.msgs.push(m);
    else groups.push({ userId: m.user_id, fullName: m.full_name, msgs: [m] });
  });

  const fmt = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const fmtDate = (iso: string) => {
    const d = new Date(iso), today = new Date(), yest = new Date(today);
    yest.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Bugun';
    if (d.toDateString() === yest.toDateString()) return 'Kecha';
    return d.toLocaleDateString([], { day: 'numeric', month: 'long' });
  };
  const shownDates = new Set<string>();
  const acceptedCount = members.filter((m) => m.status === 'accepted').length;

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#0e1621' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-3 shrink-0" style={{ background: '#17212b', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={onClose} className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors shrink-0">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2AABEE" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className="h-10 w-10 rounded-full flex items-center justify-center shrink-0 text-white font-bold text-sm" style={{ background: 'linear-gradient(135deg,#2AABEE,#1a6fa8)' }}>
          <Users size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-white truncate text-[15px] leading-tight">{goal.title}</p>
          <p className="text-xs" style={{ color: '#8a9bb0' }}>{acceptedCount} a'zo</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-2" style={{ background: '#0e1621' }}>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 size={24} className="animate-spin" style={{ color: '#2AABEE' }} />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="h-16 w-16 rounded-full flex items-center justify-center" style={{ background: '#17212b' }}>
              <MessageCircle size={28} style={{ color: '#2AABEE' }} />
            </div>
            <p className="text-sm" style={{ color: '#8a9bb0' }}>Hali xabar yo'q. Birinchi bo'ling!</p>
          </div>
        ) : (
          <div className="space-y-[1px] pb-2">
            {groups.map((grp, gi) => {
              const mine = grp.userId === user?.id;
              const color = colorMap[grp.userId] || '#8a9bb0';
              const initials = grp.fullName.split(' ').map((w) => w[0] || '').join('').slice(0, 2).toUpperCase();
              return (
                <div key={gi} className={`flex items-end gap-2 mt-3 ${mine ? 'flex-row-reverse' : 'flex-row'}`}>
                  {!mine ? (
                    <div className="h-8 w-8 rounded-full shrink-0 flex items-center justify-center text-[11px] font-bold text-white mb-0.5 self-end" style={{ background: color }}>
                      {initials}
                    </div>
                  ) : (
                    <div className="w-8 shrink-0" />
                  )}
                  <div className={`flex flex-col gap-[2px] max-w-[78%] ${mine ? 'items-end' : 'items-start'}`}>
                    {!mine && <p className="text-[11px] font-semibold px-1 mb-0.5" style={{ color }}>{grp.fullName}</p>}
                    {grp.msgs.map((m, mi) => {
                      const dk = new Date(m.created_at).toDateString();
                      const showDate = !shownDates.has(dk);
                      if (showDate) shownDates.add(dk);
                      const isFirst = mi === 0;
                      const isLast = mi === grp.msgs.length - 1;
                      const br = mine
                        ? isFirst && isLast ? '18px 4px 18px 18px'
                          : isFirst ? '18px 4px 4px 18px'
                          : isLast ? '4px 18px 18px 18px'
                          : '4px 4px 4px 18px'
                        : isFirst && isLast ? '4px 18px 18px 18px'
                          : isFirst ? '4px 18px 18px 4px'
                          : isLast ? '18px 18px 18px 4px'
                          : '4px 18px 18px 4px';
                      return (
                        <div key={m.id}>
                          {showDate && (
                            <div className="flex items-center justify-center my-4">
                              <span className="text-[11px] px-3 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', color: '#8a9bb0' }}>
                                {fmtDate(m.created_at)}
                              </span>
                            </div>
                          )}
                          <div
                            className="px-3 py-2 text-[14px] leading-snug break-words"
                            style={{ background: mine ? '#2AABEE' : '#17212b', color: mine ? '#fff' : '#e8edf2', borderRadius: br, maxWidth: '100%' }}
                          >
                            {m.body}
                            {isLast && (
                              <span className="inline-block ml-2 text-[10px] align-bottom whitespace-nowrap" style={{ color: mine ? 'rgba(255,255,255,0.65)' : '#8a9bb0' }}>
                                {fmt(m.created_at)}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 flex items-center gap-2 px-3 py-2" style={{ background: '#17212b', borderTop: '1px solid rgba(255,255,255,0.06)', paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}>
        <div className="flex-1 flex items-center rounded-2xl px-3 py-1.5 min-h-[40px]" style={{ background: '#242f3d' }}>
          <input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Xabar yozing..."
            maxLength={2000}
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: '#e8edf2', caretColor: '#2AABEE' }}
          />
        </div>
        <button
          onClick={handleSend}
          disabled={sending || newMessage.trim().length === 0}
          className="h-10 w-10 rounded-full flex items-center justify-center shrink-0 transition-all"
          style={{ background: newMessage.trim().length > 0 ? '#2AABEE' : '#242f3d', opacity: sending ? 0.6 : 1 }}
        >
          {sending ? (
            <Loader2 size={16} className="animate-spin" style={{ color: '#fff' }} />
          ) : (
            <Send size={16} style={{ color: newMessage.trim().length > 0 ? '#fff' : '#8a9bb0', marginLeft: '1px' }} />
          )}
        </button>
      </div>
    </div>
  );
}
