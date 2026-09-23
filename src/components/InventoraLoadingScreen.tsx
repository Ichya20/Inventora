import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Role } from '../types';
import { Language } from '../i18n';

interface InventoraLoadingScreenProps {
  role?: Role;
  lang?: Language;
  onFinished?: () => void;
  durationMs?: number;
}

export function InventoraLoadingScreen({
  role = 'Super Admin',
  lang = 'en',
  onFinished,
  durationMs = 1400
}: InventoraLoadingScreenProps) {
  const [progress, setProgress] = useState(12);
  const [statusIndex, setStatusIndex] = useState(0);

  const statusMessagesEn = [
    `Initializing session for ${role}...`,
    'Mounting inventory & procurement schemas...',
    'Synchronizing ledger & operational quotas...',
    'Launching Inventora Workspace...'
  ];

  const statusMessagesId = [
    `Menyiapkan sesi untuk ${role}...`,
    'Memuat skema inventaris & pengadaan...',
    'Sinkronisasi buku besar & kuota sistem...',
    'Membuka Workspace Inventora...'
  ];

  const currentMessages = lang === 'id' ? statusMessagesId : statusMessagesEn;

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(Math.round((elapsed / durationMs) * 100), 100);
      setProgress(pct);

      if (pct < 30) {
        setStatusIndex(0);
      } else if (pct < 65) {
        setStatusIndex(1);
      } else if (pct < 90) {
        setStatusIndex(2);
      } else {
        setStatusIndex(3);
      }

      if (elapsed >= durationMs) {
        clearInterval(interval);
        if (onFinished) {
          setTimeout(() => onFinished(), 120);
        }
      }
    }, 25);

    return () => clearInterval(interval);
  }, [durationMs, onFinished]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#fafafa] dark:bg-[#0a0a0a] text-[#171717] dark:text-[#ededed] select-none overflow-hidden"
    >
      {/* Ambient background glows */}
      <motion.div
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.35, 0.65, 0.35]
        }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute w-[450px] h-[450px] rounded-full bg-gradient-to-br from-blue-500/10 via-indigo-500/10 to-transparent blur-[80px] pointer-events-none"
      />
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.2, 0.45, 0.2]
        }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
        className="absolute w-[350px] h-[350px] rounded-full bg-gradient-to-tr from-purple-500/10 via-pink-500/5 to-transparent blur-[70px] pointer-events-none"
      />

      <div className="relative z-10 flex flex-col items-center max-w-sm w-full px-6 text-center">
        {/* Animated Inventora Logo with pulsing halo */}
        <div className="relative mb-6">
          <motion.div
            animate={{
              scale: [1, 1.08, 1],
              rotate: [0, 1, 0, -1, 0]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
            className="relative flex items-center justify-center w-20 h-20 rounded-2xl bg-white dark:bg-[#141414] shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.5)] border border-neutral-200/80 dark:border-neutral-800"
          >
            {/* Geometric 4-quadrant Inventora Logo with staggered micro-animations */}
            <svg
              width="44"
              height="44"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="drop-shadow-xs"
            >
              <motion.rect
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.05 }}
                x="2"
                y="2"
                width="8"
                height="8"
                rx="1.5"
                className="fill-[#171717] dark:fill-[#ededed]"
              />
              <motion.rect
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 0.3 }}
                transition={{ duration: 0.4, delay: 0.15 }}
                x="14"
                y="2"
                width="8"
                height="8"
                rx="1.5"
                className="fill-[#0070f3] dark:fill-[#3291ff]"
              />
              <motion.rect
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 0.3 }}
                transition={{ duration: 0.4, delay: 0.25 }}
                x="2"
                y="14"
                width="8"
                height="8"
                rx="1.5"
                className="fill-[#0070f3] dark:fill-[#3291ff]"
              />
              <motion.rect
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.35 }}
                x="14"
                y="14"
                width="8"
                height="8"
                rx="1.5"
                className="fill-[#171717] dark:fill-[#ededed]"
              />
            </svg>

            {/* Subtle rotating glow ring */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
              className="absolute -inset-1 rounded-2xl border border-blue-500/20 pointer-events-none"
            />
          </motion.div>
        </div>

        {/* Brand name & Category */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-1 mb-5"
        >
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
              Inventora
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              ERP
            </span>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 tracking-wide">
            {lang === 'en' ? 'Enterprise Management System' : 'Sistem Manajemen Enterprise'}
          </p>
        </motion.div>

        {/* Role Pill */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15, duration: 0.3 }}
          className="inline-flex items-center gap-2 px-3 py-1 mb-5 rounded-full bg-white dark:bg-[#161616] border border-neutral-200 dark:border-neutral-800 shadow-xs"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[11px] font-medium text-neutral-600 dark:text-neutral-300">
            {lang === 'en' ? 'Demo Mode' : 'Mode Demo'}: <strong className="text-neutral-900 dark:text-neutral-100 font-semibold">{role}</strong>
          </span>
        </motion.div>

        {/* Progress Bar Container */}
        <div className="w-full space-y-2 mb-2">
          <div className="w-full h-1.5 bg-neutral-200/80 dark:bg-neutral-800 rounded-full overflow-hidden p-0.5">
            <motion.div
              className="h-full bg-gradient-to-r from-neutral-900 via-blue-600 to-neutral-900 dark:from-neutral-200 dark:via-blue-400 dark:to-neutral-200 rounded-full transition-all duration-75"
              style={{ width: `${progress}%` }}
            />
          </div>
          
          <div className="flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400">
            <span className="truncate max-w-[240px] text-left">
              {currentMessages[statusIndex]}
            </span>
            <span className="font-mono font-medium text-neutral-700 dark:text-neutral-300 ml-2">
              {progress}%
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
