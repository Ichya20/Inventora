import React, { useEffect, useState } from 'react';
import { Keyboard, Command, ArrowRight, CornerDownLeft, Sparkles } from 'lucide-react';
import { Modal } from './UI';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: 'en' | 'id';
}

export function ShortcutsModal({ isOpen, onClose, lang = 'en' }: ShortcutsModalProps) {
  const shortcuts = [
    { keys: ['Cmd / Ctrl', 'K'], desc: lang === 'en' ? 'Open Command Palette' : 'Buka Palet Perintah' },
    { keys: ['Cmd / Ctrl', 'J'], desc: lang === 'en' ? 'Toggle AI Copilot Drawer' : 'Buka / Tutup AI Copilot' },
    { keys: ['G', 'O'], desc: lang === 'en' ? 'Navigate to Overview' : 'Buka Ringkasan (Overview)' },
    { keys: ['G', 'P'], desc: lang === 'en' ? 'Navigate to Procurement' : 'Buka Pengadaan (Procurement)' },
    { keys: ['G', 'I'], desc: lang === 'en' ? 'Navigate to Inventory' : 'Buka Manajemen Stok (Inventory)' },
    { keys: ['G', 'F'], desc: lang === 'en' ? 'Navigate to Finance' : 'Buka Keuangan (Finance)' },
    { keys: ['G', 'H'], desc: lang === 'en' ? 'Navigate to HR / People' : 'Buka SDM & Karyawan (HR)' },
    { keys: ['G', 'S'], desc: lang === 'en' ? 'Navigate to Settings' : 'Buka Pengaturan (Settings)' },
    { keys: ['N', 'P'], desc: lang === 'en' ? 'Draft New Purchase Order' : 'Buat Purchase Order Baru' },
    { keys: ['?'], desc: lang === 'en' ? 'Show Keyboard Shortcuts' : 'Buka Panduan Pintasan Keyboard' },
    { keys: ['Esc'], desc: lang === 'en' ? 'Close Active Modal / Palette' : 'Tutup Modal atau Palet Aktif' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={lang === 'en' ? 'Executive Keyboard Shortcuts' : 'Pintasan Keyboard Eksekutif'}
    >
      <div className="space-y-4">
        <p className="text-xs text-neutral-600 dark:text-neutral-400">
          {lang === 'en'
            ? 'Navigate and control Inventora at high velocity with sequence hotkeys.'
            : 'Navigasi dan operasikan Inventora dengan kecepatan tinggi menggunakan kombinasi tombol.'}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-96 overflow-y-auto pr-1">
          {shortcuts.map((item, idx) => (
            <div
              key={idx}
              className="p-3 rounded-xl border border-neutral-200/70 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 flex items-center justify-between text-xs"
            >
              <span className="text-neutral-700 dark:text-neutral-300 font-medium pr-2">
                {item.desc}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                {item.keys.map((k, kIdx) => (
                  <kbd
                    key={kIdx}
                    className="px-2 py-1 text-[11px] font-mono font-semibold bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded shadow-xs text-neutral-800 dark:text-neutral-200"
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-2 border-t border-neutral-100 dark:border-neutral-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#0070f3] hover:bg-[#0060df] text-white text-xs font-semibold rounded-lg cursor-pointer transition-all shadow-sm"
          >
            {lang === 'en' ? 'Got it' : 'Mengerti'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// Hook for listening to global sequence shortcuts
export function useGlobalHotkeys({
  onNavigate,
  onNewPo,
  onOpenHelp,
  onToggleCmdK,
  onToggleCopilot,
}: {
  onNavigate: (menu: string) => void;
  onNewPo: () => void;
  onOpenHelp: () => void;
  onToggleCmdK: () => void;
  onToggleCopilot?: () => void;
}) {
  const [pendingSequence, setPendingSequence] = useState<string | null>(null);

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Allow Cmd+K and Cmd+J even inside or outside inputs
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        onToggleCopilot?.();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onToggleCmdK?.();
        return;
      }

      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      if (isInput) return;

      const key = e.key.toLowerCase();

      // Help modal (?)
      if (e.key === '?') {
        e.preventDefault();
        onOpenHelp();
        return;
      }

      // Check sequence hotkey 'g'
      if (pendingSequence === 'g') {
        setPendingSequence(null);
        if (key === 'o') { e.preventDefault(); onNavigate('overview'); return; }
        if (key === 'p') { e.preventDefault(); onNavigate('po'); return; }
        if (key === 'i') { e.preventDefault(); onNavigate('stok'); return; }
        if (key === 'f') { e.preventDefault(); onNavigate('keuangan'); return; }
        if (key === 'h') { e.preventDefault(); onNavigate('sdm'); return; }
        if (key === 's') { e.preventDefault(); onNavigate('settings'); return; }
        return;
      }

      // Check sequence hotkey 'n'
      if (pendingSequence === 'n') {
        setPendingSequence(null);
        if (key === 'p') { e.preventDefault(); onNewPo(); return; }
        return;
      }

      if (key === 'g' || key === 'n') {
        setPendingSequence(key);
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          setPendingSequence(null);
        }, 1200);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timeout);
    };
  }, [pendingSequence, onNavigate, onNewPo, onOpenHelp, onToggleCmdK]);

  return { pendingSequence };
}
