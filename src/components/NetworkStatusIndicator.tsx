import React, { useState } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle2, Clock, ShieldCheck } from 'lucide-react';
import { QueuedMutation } from '../lib/useNetworkStatus';
import { Modal } from './UI';

interface NetworkStatusIndicatorProps {
  isOnline: boolean;
  queuedCount: number;
  queue: QueuedMutation[];
  onManualSync: () => void;
  lang?: 'en' | 'id';
}

export function NetworkStatusIndicator({
  isOnline,
  queuedCount,
  queue,
  onManualSync,
  lang = 'en'
}: NetworkStatusIndicatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncClick = () => {
    setIsSyncing(true);
    setTimeout(() => {
      onManualSync();
      setIsSyncing(false);
      setIsOpen(false);
    }, 800);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer border ${
          isOnline
            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/15'
            : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20 animate-pulse'
        }`}
        title={
          isOnline
            ? (lang === 'en' ? 'System Online & Synchronized' : 'Sistem Online & Terhubung')
            : (lang === 'en' ? `${queuedCount} operations queued offline` : `${queuedCount} operasi tertunda offline`)
        }
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            isOnline ? 'bg-emerald-500' : 'bg-amber-500 animate-ping'
          }`}
        />
        {isOnline ? (
          <span className="hidden sm:inline">
            {lang === 'en' ? 'Live Sync' : 'Sinkron'}
          </span>
        ) : (
          <span>
            {lang === 'en' ? `Offline (${queuedCount})` : `Offline (${queuedCount})`}
          </span>
        )}
      </button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={lang === 'en' ? 'Network & Synchronization Status' : 'Status Jaringan & Sinkronisasi'}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200/70 dark:border-neutral-800">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                isOnline
                  ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                  : 'bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
              }`}
            >
              {isOnline ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
            </div>
            <div>
              <div className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                {isOnline
                  ? (lang === 'en' ? 'Network Connection Stable' : 'Koneksi Jaringan Stabil')
                  : (lang === 'en' ? 'Working in Offline Mode' : 'Bekerja dalam Mode Offline')}
              </div>
              <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                {isOnline
                  ? (lang === 'en' ? 'Real-time ERP database socket active' : 'Koneksi database ERP real-time aktif')
                  : (lang === 'en' ? 'Mutations are queued securely in local browser storage' : 'Perubahan disimpan aman di penyimpanan browser lokal')}
              </div>
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-2 flex items-center justify-between">
              <span>{lang === 'en' ? 'Queued Offline Operations' : 'Operasi Tertunda Offline'}</span>
              <span className="text-[10px] text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full font-mono">
                {queuedCount} {lang === 'en' ? 'items' : 'item'}
              </span>
            </div>

            {queue.length === 0 ? (
              <div className="p-4 text-center rounded-lg border border-dashed border-neutral-200 dark:border-neutral-800 text-xs text-neutral-500 dark:text-neutral-400 flex flex-col items-center gap-1.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <span>{lang === 'en' ? 'All records are up to date with server' : 'Semua data telah sinkron dengan server'}</span>
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                {queue.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs flex items-center justify-between"
                  >
                    <div>
                      <div className="font-medium text-neutral-800 dark:text-neutral-200">
                        {item.description}
                      </div>
                      <div className="text-[10px] text-neutral-500 dark:text-neutral-400 font-mono">
                        {item.entityId} • {new Date(item.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                      Queued
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-1 text-[11px] text-neutral-500 dark:text-neutral-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>AES Local Persistence</span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3 py-1.5 text-xs text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg cursor-pointer"
              >
                {lang === 'en' ? 'Close' : 'Tutup'}
              </button>
              <button
                type="button"
                disabled={isSyncing || queuedCount === 0}
                onClick={handleSyncClick}
                className="px-3 py-1.5 bg-[#0070f3] hover:bg-[#0060df] disabled:opacity-50 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{lang === 'en' ? 'Sync Queue' : 'Sinkronkan'}</span>
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
