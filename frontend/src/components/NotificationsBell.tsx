'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Bell, Loader2, X } from 'lucide-react';
import { api } from '@/lib/api-client';

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

export function NotificationsBell() {
  const tb = useTranslations('topbar');
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  function load() {
    setLoading(true);
    api
      .get<NotificationItem[]>('/notifications')
      .then(({ data }) => setItems(data))
      .catch(() => setItems([]))
      .finally(() => {
        setLoading(false);
        setLoaded(true);
      });
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function markRead(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    try {
      await api.patch(`/notifications/${id}/read`);
    } catch {
      // best-effort
    }
  }

  async function remove(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setItems((prev) => prev.filter((n) => n.id !== id));
    try {
      await api.delete(`/notifications/${id}`);
    } catch {
      // best-effort
    }
  }

  const unreadCount = items.filter((n) => !n.is_read).length;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-textmain/10 text-textmuted hover:text-textmain hover:bg-textmain/5 transition-colors"
        aria-label={tb('notifications')}
      >
        <Bell size={15} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
        )}
      </button>

      {open && (
        <div className="absolute top-full mt-2 w-80 right-0 rounded-xl border border-black/10 bg-surface shadow-xl overflow-hidden z-50 max-h-96 overflow-y-auto">
          <div className="px-4 py-3 border-b border-black/5 flex items-center justify-between">
            <span className="text-sm font-semibold text-textmain">{tb('notifications')}</span>
            {loading && <Loader2 size={13} className="animate-spin text-textmuted" />}
          </div>

          {loaded && items.length === 0 && (
            <p className="text-sm text-textmuted px-4 py-6 text-center">{tb('notificationsEmpty')}</p>
          )}

          {items.map((n) => (
            <div
              key={n.id}
              role="button"
              tabIndex={0}
              onClick={() => markRead(n.id)}
              className={`w-full flex items-start gap-2 px-4 py-3 text-left border-b border-black/5 last:border-0 transition-colors hover:bg-black/5 cursor-pointer ${
                n.is_read ? '' : 'bg-primary/5'
              }`}
            >
              {!n.is_read && <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0 mt-1.5" />}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-textmain truncate">{n.title}</p>
                <p className="text-xs text-textmuted mt-0.5">{n.message}</p>
              </div>
              <button
                type="button"
                onClick={(e) => remove(n.id, e)}
                className="text-textmuted hover:text-danger transition-colors shrink-0 mt-0.5"
                aria-label="Dismiss"
              >
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
