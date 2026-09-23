import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, XCircle, Info, X, ExternalLink, Sparkles } from 'lucide-react';
import { ToastItem, ToastType } from '../types';

export function playNotificationChime(type: ToastType = 'success') {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    const now = ctx.currentTime;

    if (type === 'success') {
      // Crisp, pleasant two-tone executive chime (F5 -> A5)
      gain.gain.setValueAtTime(0.08, now);
      const osc1 = ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(698.46, now); // F5
      osc1.connect(gain);
      osc1.start(now);
      osc1.stop(now + 0.12);

      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now + 0.08); // A5
      osc2.connect(gain);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.38);
    } else if (type === 'error') {
      // Gentle warning double-tone
      gain.gain.setValueAtTime(0.08, now);
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(329.63, now); // E4
      osc.frequency.setValueAtTime(246.94, now + 0.1); // B3
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'warning') {
      // Attention prompt chime
      gain.gain.setValueAtTime(0.06, now);
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc.connect(gain);
      osc.start(now);
      osc.stop(now + 0.3);
    } else {
      // Subdued info chime
      gain.gain.setValueAtTime(0.06, now);
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now); // A5
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      osc.start(now);
      osc.stop(now + 0.25);
    }
  } catch {
    // Web Audio blocked or silent; fail silently
  }
}

interface ToastCardProps {
  toast: ToastItem;
  onDismiss: (id: number | string) => void;
}

function ToastCard({ toast, onDismiss }: ToastCardProps) {
  const duration = toast.duration ?? (toast.type === 'error' ? 6000 : 4500);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(100);
  const startTimeRef = useRef<number>(Date.now());
  const remainingTimeRef = useRef<number>(duration);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (!isPaused) {
      startTimeRef.current = Date.now();
      interval = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current;
        const remaining = Math.max(0, remainingTimeRef.current - elapsed);
        const pct = (remaining / duration) * 100;
        setProgress(pct);

        if (remaining <= 0) {
          clearInterval(interval);
          onDismiss(toast.id);
        }
      }, 100);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPaused, duration, toast.id, onDismiss]);

  const handleMouseEnter = () => {
    setIsPaused(true);
    remainingTimeRef.current = Math.max(0, remainingTimeRef.current - (Date.now() - startTimeRef.current));
  };

  const handleMouseLeave = () => {
    setIsPaused(false);
  };

  // Type styling configurations
  const config = {
    success: {
      border: 'border-emerald-500/30 dark:border-emerald-500/40',
      glow: 'shadow-[0_12px_36px_-8px_rgba(16,185,129,0.3)] dark:shadow-[0_12px_36px_-8px_rgba(16,185,129,0.2)]',
      bgBar: 'bg-emerald-500',
      badgeBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      icon: CheckCircle2,
      defaultTitle: 'Action Confirmed',
    },
    warning: {
      border: 'border-amber-500/30 dark:border-amber-500/40',
      glow: 'shadow-[0_12px_36px_-8px_rgba(245,158,11,0.3)] dark:shadow-[0_12px_36px_-8px_rgba(245,158,11,0.2)]',
      bgBar: 'bg-amber-500',
      badgeBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      icon: AlertCircle,
      defaultTitle: 'Attention Required',
    },
    error: {
      border: 'border-rose-500/30 dark:border-rose-500/40',
      glow: 'shadow-[0_12px_36px_-8px_rgba(239,68,68,0.35)] dark:shadow-[0_12px_36px_-8px_rgba(239,68,68,0.25)]',
      bgBar: 'bg-rose-500',
      badgeBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
      icon: XCircle,
      defaultTitle: 'Action Notice',
    },
    info: {
      border: 'border-blue-500/30 dark:border-blue-500/40',
      glow: 'shadow-[0_12px_36px_-8px_rgba(0,112,243,0.3)] dark:shadow-[0_12px_36px_-8px_rgba(0,112,243,0.2)]',
      bgBar: 'bg-[#0070f3]',
      badgeBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
      icon: Info,
      defaultTitle: 'System Update',
    },
  }[toast.type];

  const Icon = config.icon;
  const title = toast.title || config.defaultTitle;

  return (
    <motion.div
      initial={{ opacity: 0, y: -24, scale: 0.92, filter: 'blur(4px)' }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: -16, scale: 0.92, filter: 'blur(4px)' }}
      transition={{ type: 'spring', stiffness: 420, damping: 28 }}
      layout
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`pointer-events-auto relative w-full max-w-md overflow-hidden rounded-2xl border ${config.border} ${config.glow} bg-white/95 dark:bg-[#151515]/95 backdrop-blur-xl transition-all duration-200`}
      role="status"
      aria-live="polite"
    >
      <div className="p-4 flex items-start gap-3.5">
        {/* Animated Icon Avatar */}
        <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center border ${config.badgeBg} relative mt-0.5`}>
          <Icon className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${config.bgBar}`} />
            <span className={`relative inline-flex rounded-full h-2 w-2 ${config.bgBar}`} />
          </span>
        </div>

        {/* Content body */}
        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5 truncate">
              <span>{title}</span>
            </h4>
            {toast.timestamp && (
              <span className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500 shrink-0">
                {toast.timestamp}
              </span>
            )}
          </div>

          <p className="mt-1 text-xs text-neutral-700 dark:text-neutral-300 font-medium leading-relaxed break-words">
            {toast.msg}
          </p>

          {/* Interactive Action Button (if provided) */}
          {toast.actionLabel && toast.onAction && (
            <div className="mt-2.5 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  toast.onAction?.();
                  onDismiss(toast.id);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors shadow-sm cursor-pointer active:scale-95"
              >
                <span>{toast.actionLabel}</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          className="shrink-0 p-1.5 rounded-lg text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800/80 transition-colors cursor-pointer"
          aria-label="Dismiss notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Interactive Micro Progress Bar */}
      <div className="h-1 w-full bg-neutral-100 dark:bg-neutral-800/60 overflow-hidden">
        <div
          className={`h-full ${config.bgBar} transition-all duration-75 ease-linear`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </motion.div>
  );
}

interface InteractiveToasterProps {
  toasts: ToastItem[];
  onDismiss: (id: number | string) => void;
}

export function InteractiveToaster({ toasts, onDismiss }: InteractiveToasterProps) {
  return (
    <aside
      aria-label="Notifications"
      className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2.5 pointer-events-none w-full max-w-md px-4"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </aside>
  );
}
