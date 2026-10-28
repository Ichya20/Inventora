import React from 'react';
import type { Language } from '../types';

export function ViewSkeleton({ title, lang = 'en', variant = 'table' }: { title?: string; lang?: Language; variant?: 'table' | 'form' | 'pos' }) {
  const loading = lang === 'en' ? 'Loading' : 'Memuat';
  return <div className={`view-skeleton view-skeleton-${variant}`} role="status" aria-label={`${loading} ${title ?? ''}`} aria-busy="true">
    <div className="skeleton-module-heading" aria-hidden="true"><div className="skeleton-block skeleton-title" /><div className="skeleton-block skeleton-subtitle" /></div>
    <div className="skeleton-content" aria-hidden="true">
      <div className="skeleton-panel">
        <div className="skeleton-block skeleton-search" />
        {Array.from({ length: variant === 'form' ? 3 : 5 }, (_, index) => <div key={index} className="skeleton-row"><div className="skeleton-block skeleton-name" /><div className="skeleton-block skeleton-value" /><div className="skeleton-block skeleton-value" /></div>)}
      </div>
      {variant !== 'table' && <div className="skeleton-panel skeleton-checkout"><div className="skeleton-block skeleton-title" /><div className="skeleton-block skeleton-search" /><div className="skeleton-block skeleton-search" /><div className="skeleton-block skeleton-search" /></div>}
    </div>
    <span className="sr-only">{loading} {title ?? (lang === 'en' ? 'module content' : 'isi menu')}…</span>
  </div>;
}
