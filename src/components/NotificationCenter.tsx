import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, CheckCheck, Trash2, CreditCard, CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { AppNotification } from '../types';
import { Language, Translations, translations as defaultTranslations } from '../i18n';

interface NotificationCenterProps {
  notifications: AppNotification[];
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
  onSelectNotification?: (notification: AppNotification) => void;
  lang?: Language;
  t?: Translations;
}

export function NotificationCenter({ 
  notifications, 
  onMarkAllAsRead, 
  onClearAll,
  onSelectNotification,
  lang = 'en',
  t
}: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'payment'>('all');
  const panelRef = useRef<HTMLDivElement>(null);

  const activeT = t || defaultTranslations[lang] || defaultTranslations.en;
  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'payment') return n.type === 'payment';
    return true;
  });

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const diffMs = Date.now() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return activeT.notifications.justNow;
      if (diffMins < 60) return `${diffMins}${activeT.notifications.minsAgo}`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}${activeT.notifications.hoursAgo}`;
      return date.toLocaleDateString(lang === 'en' ? 'en-US' : 'id-ID', { day: 'numeric', month: 'short' });
    } catch {
      return activeT.notifications.justNow;
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg text-[#666] dark:text-[#a1a1aa] hover:text-[#171717] dark:hover:text-[#ededed] hover:bg-[#fafafa] dark:hover:bg-[#1f1f1f] transition-colors cursor-pointer"
        title={activeT.notifications.centerTitle}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-[#111]">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Flyout Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-[#141414] rounded-xl shadow-2xl border border-[#eaeaea] dark:border-[#282828] overflow-hidden z-50 flex flex-col max-h-[80vh]"
          >
            {/* Header */}
            <div className="p-3.5 border-b border-[#eaeaea] dark:border-[#282828] flex items-center justify-between bg-[#fafafa] dark:bg-[#181818] shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-xs tracking-tight text-[#171717] dark:text-[#ededed]">
                  {activeT.notifications.centerTitle}
                </span>
                {unreadCount > 0 && (
                  <span className="text-[10px] font-medium bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300 px-1.5 py-0.5 rounded-full">
                    {unreadCount} {activeT.notifications.newBadge}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={onMarkAllAsRead}
                    title={activeT.notifications.markAllRead}
                    className="p-1 text-xs text-[#666] dark:text-[#aaa] hover:text-[#0070f3] dark:hover:text-[#3291ff] rounded hover:bg-white dark:hover:bg-[#222] transition-colors cursor-pointer"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    type="button"
                    onClick={onClearAll}
                    title={activeT.notifications.clearAll}
                    className="p-1 text-xs text-[#666] dark:text-[#aaa] hover:text-red-600 rounded hover:bg-white dark:hover:bg-[#222] transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1 text-xs text-[#666] dark:text-[#aaa] hover:text-[#171717] dark:hover:text-white rounded hover:bg-white dark:hover:bg-[#222] transition-colors cursor-pointer ml-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center px-3 pt-2 pb-1 border-b border-[#eaeaea] dark:border-[#262626] gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`text-[11px] font-medium px-2 py-1 rounded transition-colors cursor-pointer ${
                  filter === 'all' 
                    ? 'bg-[#171717] text-white dark:bg-white dark:text-black font-semibold' 
                    : 'text-[#666] dark:text-[#aaa] hover:text-[#171717] dark:hover:text-white'
                }`}
              >
                {activeT.notifications.allTab} ({notifications.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter('payment')}
                className={`text-[11px] font-medium px-2 py-1 rounded transition-colors cursor-pointer flex items-center gap-1 ${
                  filter === 'payment' 
                    ? 'bg-[#171717] text-white dark:bg-white dark:text-black font-semibold' 
                    : 'text-[#666] dark:text-[#aaa] hover:text-[#171717] dark:hover:text-white'
                }`}
              >
                <CreditCard className="w-3 h-3" />
                {activeT.notifications.txTab} ({notifications.filter(n => n.type === 'payment').length})
              </button>
            </div>

            {/* Notifications List */}
            <div className="overflow-y-auto flex-1 divide-y divide-[#f0f0f0] dark:divide-[#222]">
              {filteredNotifications.length > 0 ? (
                filteredNotifications.map((notif) => {
                  const isPayment = notif.type === 'payment';
                  return (
                    <div
                      key={notif.id}
                      onClick={() => {
                        if (onSelectNotification) onSelectNotification(notif);
                      }}
                      className={`p-3.5 hover:bg-[#fafafa] dark:hover:bg-[#1a1a1a] transition-colors cursor-pointer flex items-start gap-3 ${
                        !notif.read ? 'bg-blue-50/30 dark:bg-blue-950/15' : ''
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        isPayment 
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' 
                          : notif.type === 'approval'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                      }`}>
                        {isPayment ? (
                          <CreditCard className="w-4 h-4" />
                        ) : notif.type === 'approval' ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <Info className="w-4 h-4" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className={`text-xs font-semibold truncate ${
                            !notif.read ? 'text-[#171717] dark:text-[#ededed]' : 'text-[#555] dark:text-[#aaa]'
                          }`}>
                            {notif.title}
                          </span>
                          <span className="text-[10px] text-[#999] whitespace-nowrap shrink-0">
                            {formatTime(notif.timestamp)}
                          </span>
                        </div>

                        <p className="text-[11px] text-[#666] dark:text-[#aaa] leading-relaxed line-clamp-2">
                          {notif.message}
                        </p>

                        {notif.metadata?.amount && (
                          <div className="mt-1.5 flex items-center gap-2">
                            <span className="text-[10px] font-mono bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.5 rounded font-semibold border border-emerald-200 dark:border-emerald-800">
                              Rp {Number(notif.metadata.amount).toLocaleString(lang === 'en' ? 'en-US' : 'id-ID')}
                            </span>
                            {notif.metadata.poId && (
                              <span className="text-[10px] font-mono text-[#888]">
                                {notif.metadata.poId}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-[#888] space-y-1">
                  <Bell className="w-7 h-7 mx-auto text-[#bbb] dark:text-[#555] stroke-[1.5]" />
                  <p className="text-xs font-medium text-[#666] dark:text-[#aaa]">{activeT.notifications.emptyText}</p>
                  <p className="text-[10px] text-[#999]">{activeT.notifications.clickToOpenPo}</p>
                </div>
              )}
            </div>

            {/* Footer Summary */}
            <div className="p-2.5 bg-[#fafafa] dark:bg-[#181818] border-t border-[#eaeaea] dark:border-[#282828] text-center text-[10px] text-[#888] shrink-0">
              {lang === 'en' 
                ? 'Automated real-time notifications for procurement & settlements' 
                : 'Notifikasi terintegrasi otomatis dengan Pengadaan PO'}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
