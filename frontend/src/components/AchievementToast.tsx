'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/lib/auth-store';

const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100, 365];

interface AchievementSummaryInput {
  current_streak_days?: number;
  total_transactions_all_time?: number;
  completed_goals_count?: number;
}

interface SeenState {
  streak: number;
  firstTransaction: boolean;
  goalsCompleted: number;
}

function storageKey(userId: string) {
  return `achievements-seen:${userId}`;
}

function loadSeen(userId: string): SeenState {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return { streak: 0, firstTransaction: false, goalsCompleted: 0 };
}

function saveSeen(userId: string, seen: SeenState) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(seen));
  } catch {
    // ignore
  }
}

/** Small celebratory toast for streaks/milestones. Purely client-side -
 * compares the dashboard summary against what's already been celebrated
 * (tracked in localStorage per user) and queues up anything new. */
export function AchievementToast({ summary }: { summary: AchievementSummaryInput | null }) {
  const t = useTranslations('achievements');
  const user = useAuthStore((s) => s.user);
  const [queue, setQueue] = useState<string[]>([]);
  const [visible, setVisible] = useState<string | null>(null);

  useEffect(() => {
    if (!summary || !user?.id) return;

    const seen = loadSeen(user.id);
    const newly: string[] = [];
    let changed = false;

    const streak = summary.current_streak_days ?? 0;
    const hitMilestone = [...STREAK_MILESTONES].reverse().find((m) => streak >= m && seen.streak < m);
    if (hitMilestone) {
      newly.push(t('streak', { days: hitMilestone }));
      seen.streak = hitMilestone;
      changed = true;
    }

    if (!seen.firstTransaction && (summary.total_transactions_all_time ?? 0) >= 1) {
      newly.push(t('firstTransaction'));
      seen.firstTransaction = true;
      changed = true;
    }

    const goalsCompleted = summary.completed_goals_count ?? 0;
    if (goalsCompleted > seen.goalsCompleted) {
      newly.push(t('goalCompleted'));
      seen.goalsCompleted = goalsCompleted;
      changed = true;
    }

    if (changed) saveSeen(user.id, seen);
    if (newly.length > 0) setQueue((q) => [...q, ...newly]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summary, user?.id]);

  useEffect(() => {
    if (visible || queue.length === 0) return;
    setVisible(queue[0]);
    setQueue((q) => q.slice(1));
  }, [queue, visible]);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => setVisible(null), 4000);
    return () => clearTimeout(timer);
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-pop-in">
      <div className="flex items-center gap-2 rounded-full bg-textmain text-surface px-4 py-2.5 shadow-2xl text-sm font-semibold">
        {visible}
      </div>
    </div>
  );
}
