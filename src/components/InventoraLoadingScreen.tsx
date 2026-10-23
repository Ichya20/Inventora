import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { LoaderCircle } from 'lucide-react';
import type { Role } from '../types';
import type { Language } from '../i18n';

interface InventoraLoadingScreenProps {
  role?: Role | 'Unassigned'; lang?: Language; onFinished?: () => void; durationMs?: number;
}

export function InventoraLoadingScreen({ role, lang = 'en', onFinished, durationMs = 450 }: InventoraLoadingScreenProps) {
  useEffect(() => {
    if (!onFinished) return;
    const timer = setTimeout(onFinished, durationMs);
    return () => clearTimeout(timer);
  }, [durationMs, onFinished]);
  return <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .18 }} className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[var(--ws-frame)] text-[var(--ws-text)]" role="status" aria-live="polite">
    <div className="flex items-center gap-3 mb-7">
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="2" y="2" width="8" height="8" rx="1.5" className="fill-[#171717] dark:fill-[#ededed]" />
        <rect x="14" y="2" width="8" height="8" rx="1.5" className="fill-[#171717] dark:fill-[#ededed]" fillOpacity="0.15" />
        <rect x="2" y="14" width="8" height="8" rx="1.5" className="fill-[#171717] dark:fill-[#ededed]" fillOpacity="0.15" />
        <rect x="14" y="14" width="8" height="8" rx="1.5" className="fill-[#171717] dark:fill-[#ededed]" />
      </svg><span className="text-xl font-semibold tracking-tight">Inventora</span>
    </div>
    <div className="flex items-center gap-2 text-xs text-[var(--ws-muted)]"><LoaderCircle size={15} className="animate-spin" aria-hidden="true"/>{lang === 'en' ? 'Preparing your workspace…' : 'Menyiapkan ruang kerja…'}</div>
    {role && role !== 'Unassigned' && <p className="mt-3 text-[10px] text-[var(--ws-muted)]">{role}</p>}
  </motion.div>;
}
