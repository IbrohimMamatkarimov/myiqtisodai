'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Target, ArrowLeftRight, Receipt, LineChart } from 'lucide-react';

const STEPS = [
  { key: 'howStepOne', Icon: Target },
  { key: 'howStepTwo', Icon: ArrowLeftRight },
  { key: 'howStepThree', Icon: Receipt },
  { key: 'howStepFour', Icon: LineChart },
] as const;

export function HowItWorks({ id = 'finance-auth-how-title' }: { id?: string }) {
  const t = useTranslations('auth');
  const gridRef = useRef<HTMLDivElement>(null);

  // Cards rise in once, the first time the grid scrolls into view. Without
  // IntersectionObserver (or with reduced motion) everything is simply shown.
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || typeof IntersectionObserver === 'undefined') {
      grid.classList.add('is-in');
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          grid.classList.add('is-in');
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(grid);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="finance-auth-how" aria-labelledby={id}>
      <div className="finance-auth-how__heading">
        <p>{t('howEyebrow')}</p>
        <h2 id={id}>{t('howTitle')}</h2>
        <span>{t('howDescription')}</span>
      </div>
      <div className="finance-auth-how__grid" ref={gridRef}>
        {STEPS.map(({ key, Icon }, index) => (
          <article className="finance-auth-how__card" key={key} style={{ ['--i' as string]: index }}>
            <span className="finance-auth-how__number">
              <Icon size={16} aria-hidden="true" />
            </span>
            <h3>{t(key)}</h3>
            <p>{t(`${key}Description`)}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
