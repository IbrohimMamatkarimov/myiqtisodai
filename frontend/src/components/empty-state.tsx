'use client';

import { ReactNode } from 'react';
import { Link } from '@/navigation';
import { Plus } from 'lucide-react';

export function EmptyState({
  emoji,
  title,
  subtitle,
  ctaLabel,
  ctaHref,
}: {
  emoji: string;
  title: string;
  subtitle: string;
  ctaLabel?: string;
  ctaHref?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 px-4">
      <div className="text-5xl mb-3">{emoji}</div>
      <p className="font-semibold text-textmain">{title}</p>
      <p className="text-sm text-textmuted mt-1 max-w-xs">{subtitle}</p>
      {ctaLabel && ctaHref && (
        <Link href={ctaHref} className="btn-primary mt-4">
          <Plus size={16} />
          {ctaLabel}
        </Link>
      )}
    </div>
  );
}
