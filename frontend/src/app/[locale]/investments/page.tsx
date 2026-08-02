'use client';

import { useTranslations } from 'next-intl';
import { LineChart, Sparkles } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { Link } from '@/navigation';
import { useRequireAuth } from '@/hooks/use-require-auth';

export default function InvestmentsPage() {
  const checked = useRequireAuth();
  const t = useTranslations('investments');
  const ta = useTranslations('assistant');

  if (!checked) return null;

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-textmain">{t('title')}</h1>
        <p className="text-sm text-textmuted mt-0.5">{t('subtitle')}</p>
      </div>

      <div className="glass-card p-10 text-center max-w-xl mx-auto">
        <div className="h-14 w-14 rounded-2xl bg-primary/15 text-primary flex items-center justify-center mx-auto mb-4">
          <LineChart size={26} />
        </div>
        <h2 className="font-display text-lg font-semibold text-textmain mb-2">{t('comingSoonTitle')}</h2>
        <p className="text-sm text-textmuted mb-6">{t('comingSoonDesc')}</p>
        <Link href="/assistant" className="btn-primary inline-flex">
          <Sparkles size={16} />
          {ta('title')}
        </Link>
      </div>
    </AppShell>
  );
}
