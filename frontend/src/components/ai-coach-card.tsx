'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/navigation';
import { Loader2, CheckCircle2, BarChart3, FileText, MessageCircle } from 'lucide-react';
import { CoachAvatar } from './coach-avatar';

export function AICoachCard({
  name,
  loading,
  insight,
  highlights,
}: {
  name: string;
  loading: boolean;
  insight: string | null;
  highlights: string[];
}) {
  const t = useTranslations('dashboard');

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-primary/20 bg-gradient-to-br from-surface via-surface to-primary/5 p-6 sm:p-8 shadow-xl">
      <div className="flex items-start gap-4">
        <CoachAvatar size={56} />
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">{t('aiCoachBadge')}</p>
          <h2 className="font-display text-xl font-bold text-textmain">IqtisodAI</h2>
        </div>
      </div>

      <div className="mt-5">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-textmuted">
            <Loader2 size={14} className="animate-spin" /> {t('aiCoachLoading')}
          </div>
        ) : (
          <>
            <p className="text-sm text-textmain">
              {t('aiCoachGreeting', { name })} 👋
            </p>
            <p className="mt-2 text-sm leading-relaxed text-textmuted whitespace-pre-wrap">
              {insight || t('aiCoachEmpty')}
            </p>

            {highlights.length > 0 && (
              <ul className="mt-4 space-y-2">
                {highlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-textmain">
                    <CheckCircle2 size={16} className="text-primary shrink-0 mt-0.5" />
                    {h}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/settings"
          className="inline-flex items-center gap-2 rounded-xl bg-primary text-bgpage font-semibold text-sm px-4 py-2.5 hover:brightness-110 transition-all"
        >
          <BarChart3 size={15} />
          {t('aiCoachAnalyze')}
        </Link>
        <Link
          href="/assistant"
          className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-surface text-textmain font-medium text-sm px-4 py-2.5 hover:bg-black/5 transition-all"
        >
          <FileText size={15} />
          {t('aiCoachReport')}
        </Link>
        <Link
          href="/assistant"
          className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-surface text-textmain font-medium text-sm px-4 py-2.5 hover:bg-black/5 transition-all"
        >
          <MessageCircle size={15} />
          {t('aiCoachChat')}
        </Link>
      </div>
    </div>
  );
}
