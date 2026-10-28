import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { LoaderCircle } from 'lucide-react';
import type { Role } from '../types';
import type { Language } from '../i18n';
import { InventoraBrand } from './InventoraBrand';
import { workspaceMotion } from '../lib/motion';

interface InventoraLoadingScreenProps {
  role?: Role | 'Unassigned'; lang?: Language;
}

export function InventoraLoadingScreen({ lang = 'en' }: InventoraLoadingScreenProps) {
  const reduced = useReducedMotion();
  return <motion.div initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : workspaceMotion.dialog }} className="inventora-loading" role="status" aria-live="polite" aria-busy="true">
    <div className="inventora-loading-content">
      <InventoraBrand compact />
      <div className="inventora-loading-status"><LoaderCircle size={15} className="inventora-loading-spinner" aria-hidden="true" />{lang === 'en' ? 'Preparing your workspace…' : 'Menyiapkan ruang kerja…'}</div>
    </div>
  </motion.div>;
}
