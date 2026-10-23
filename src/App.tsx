import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, MotionConfig } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, XCircle, LayoutDashboard, Settings as SettingsIcon, LogOut, Moon, Sun, Download, ChevronLeft, ChevronRight, ArrowUpDown, Menu, X, Command, Activity, BarChart3, Database, FileText, FileSearch, ArrowRight, UserCircle, ShoppingCart, Users, Search, Sparkles, ExternalLink, Copy, Check, ShieldAlert, CreditCard, Receipt, Printer, Lock, Building2, QrCode, BadgeCheck, Globe, Languages, Keyboard } from 'lucide-react';
import { ToastType, ToastItem, ToastFunction, Role, PurchaseOrder, PaymentTransaction, AppNotification, RestockDraft } from './types';
import { translations, Language, Translations } from './i18n';
import { NotificationCenter } from './components/NotificationCenter';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ViewSkeleton } from './components/ViewSkeleton';
import { useDebounce } from './lib/useDebounce';
import { NetworkStatusIndicator } from './components/NetworkStatusIndicator';
import { useNetworkStatus } from './lib/useNetworkStatus';
import { ShortcutsModal, useGlobalHotkeys } from './components/ShortcutsModal';
import { AiCopilotDrawer } from './components/AiCopilotDrawer';
import { InteractiveToaster, playNotificationChime } from './components/InteractiveToaster';
import { InventoraLoadingScreen } from './components/InventoraLoadingScreen';
import { OpeningSequence } from './components/OpeningSequence';
import { exportToCsv, exportToJson } from './lib/exportUtils';
import { loadStoredData, saveStoredData, clearAllInventoraStorage, createInventoraBackup } from './lib/storageUtils';
import { canAccessMenu, isRole } from './lib/authorization';
import { readDemoUser } from './lib/demoSession';
import { useWorkspaceSummary } from './lib/useWorkspaceSummary';
import { useNotifications } from './lib/useNotifications';
import { Card, Badge, Button, TableWrapper, Th, Td, Tr, Modal, UILanguageContext } from './components/UI';
import { OverviewView } from './components/OverviewView';

const InventoryView = lazy(() => import('./components/InventoryView').then(m => ({ default: m.InventoryView })));

// Lazy-loaded views for code splitting and instant initial page load
const ProcurementView = lazy(() => import('./components/ProcurementView').then(m => ({ default: m.ProcurementView })));
const FinanceView = lazy(() => import('./components/FinanceView').then(m => ({ default: m.FinanceView })));
const HRView = lazy(() => import('./components/HRView').then(m => ({ default: m.HRView })));
const PurchaseUnitView = lazy(() => import('./components/PurchaseUnitView').then(m => ({ default: m.PurchaseUnitView })));
const AnalyticsView = lazy(() => import('./components/AnalyticsView').then(m => ({ default: m.AnalyticsView })));
const BillingSubscriptionView = lazy(() => import('./components/BillingSubscriptionView').then(m => ({ default: m.BillingSubscriptionView })));

function SettingsView({
  onToast,
  lang,
  onLanguageChange,
  t,
  onNavigate,
  account
}: {
  onToast: ToastFunction;
  lang: Language;
  onLanguageChange: (newLang: Language) => void;
  t: Translations;
  onNavigate?: (menu: string) => void;
  account: { displayName?: string; email?: string };
}) {
  const [activeTab, setActiveTab] = useState<'profile' | 'workspace' | 'language'>('profile');
  const [selectedLang, setSelectedLang] = useState<Language>(lang);
  const [confirmReset, setConfirmReset] = useState(false);
  const resetTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const [userAvatar, setUserAvatar] = useState<string | null>(() => {
    return localStorage.getItem('inventora_user_avatar') || null;
  });
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) {
        onToast(lang === 'en' ? 'Choose a PNG, JPEG, WebP, or GIF image.' : 'Pilih gambar PNG, JPEG, WebP, atau GIF.', 'error');
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        onToast(lang === 'en' ? 'Avatar image must be under 2MB' : 'Ukuran foto avatar maksimal 2MB', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        try {
          localStorage.setItem('inventora_user_avatar', base64);
          setUserAvatar(base64);
          onToast(lang === 'en' ? 'Profile avatar updated' : 'Foto avatar profil berhasil diperbarui', 'success');
        } catch {
          onToast(lang === 'en' ? 'Could not save the avatar in this browser.' : 'Foto belum dapat disimpan di browser ini.', 'error');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    setSelectedLang(lang);
  }, [lang]);

  return (
    <section className="p-4 md:p-8 flex-1 flex flex-col gap-6 overflow-y-auto">
      <div className="max-w-4xl w-full mx-auto flex flex-col md:flex-row gap-8">
        <div className="w-full md:w-64 shrink-0 space-y-1">
          <button type="button" aria-pressed={activeTab === 'profile'}
            onClick={() => setActiveTab('profile')}
            className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium cursor-pointer transition-colors ${activeTab === 'profile' ? 'bg-[#171717] text-white dark:bg-[#ededed] dark:text-[#171717]' : 'text-[#666] dark:text-[#a1a1aa] hover:bg-[#eaeaea] dark:hover:bg-[#333]'}`}
          >
            {t.settings.profileTab}
          </button>
          <button type="button" aria-pressed={activeTab === 'workspace'}
            onClick={() => setActiveTab('workspace')}
            className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium cursor-pointer transition-colors ${activeTab === 'workspace' ? 'bg-[#171717] text-white dark:bg-[#ededed] dark:text-[#171717]' : 'text-[#666] dark:text-[#a1a1aa] hover:bg-[#eaeaea] dark:hover:bg-[#333]'}`}
          >
            {t.settings.workspaceTab}
          </button>
          <button type="button" aria-pressed={activeTab === 'language'}
            onClick={() => setActiveTab('language')}
            className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium cursor-pointer transition-colors flex items-center justify-between ${activeTab === 'language' ? 'bg-[#171717] text-white dark:bg-[#ededed] dark:text-[#171717]' : 'text-[#666] dark:text-[#a1a1aa] hover:bg-[#eaeaea] dark:hover:bg-[#333]'}`}
          >
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              <span>{t.settings.languageTab}</span>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded uppercase font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400">
              {lang.toUpperCase()}
            </span>
          </button>
        </div>

        <div className="flex-1">
          <Card>
            <h2 className="text-xl font-semibold tracking-tight text-[#171717] dark:text-[#ededed] mb-6">
              {activeTab === 'profile' && t.settings.profileTitle}
              {activeTab === 'workspace' && t.settings.workspaceTitle}
              {activeTab === 'language' && t.settings.languageTitle}
            </h2>

            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 rounded-full bg-[#f0f0f0] dark:bg-[#1a1a1a] flex items-center justify-center text-[#999] text-3xl font-semibold shadow-inner overflow-hidden border border-neutral-200 dark:border-neutral-800">
                    {userAvatar ? (
                      <img src={userAvatar} alt="Profile Avatar" className="w-full h-full object-cover" />
                    ) : (
                      'A'
                    )}
                  </div>
                  <div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleAvatarFileChange}
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      className="hidden"
                    />
                    <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
                      {t.settings.changeAvatar}
                    </Button>
                    <p className="text-xs text-[#666] dark:text-[#a1a1aa] mt-2">{t.settings.avatarHint}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label htmlFor="profile-name" className="block text-sm font-medium text-[#171717] dark:text-[#ededed]">{t.settings.fullName}</label>
                    <input id="profile-name" type="text" value={account.displayName || '—'} readOnly className="w-full bg-white dark:bg-[#1a1a1a] shadow-[0_0_0_1px_rgba(0,0,0,0.08)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.1)] outline-none text-sm px-3 py-2 rounded-md focus:shadow-[0_0_0_1px_#0070f3,0_0_0_3px_rgba(0,112,243,0.24)] text-[#171717] dark:text-[#ededed]" />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="profile-email" className="block text-sm font-medium text-[#171717] dark:text-[#ededed]">{t.settings.emailAddress}</label>
                    <input id="profile-email" type="email" value={account.email || ''} readOnly className="w-full bg-white dark:bg-[#1a1a1a] shadow-[0_0_0_1px_rgba(0,0,0,0.08)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.1)] outline-none text-sm px-3 py-2 rounded-md focus:shadow-[0_0_0_1px_#0070f3,0_0_0_3px_rgba(0,112,243,0.24)] text-[#171717] dark:text-[#ededed]" />
                  </div>
                </div>
                <p className="text-xs text-[var(--ws-muted)]">{lang === 'en' ? 'Name and email follow your signed-in account. Avatar changes are saved in this browser.' : 'Nama dan email mengikuti akun yang masuk. Perubahan foto disimpan di browser ini.'}</p>
              </div>
            )}

            {activeTab === 'workspace' && (
              <div className="space-y-6 text-[#171717] dark:text-[#ededed]">
                <p className="text-sm text-[#666] dark:text-[#a1a1aa]">{lang === 'en' ? 'Manage language and data saved in this browser.' : 'Kelola bahasa dan data yang tersimpan di browser ini.'}</p>

                {/* Language section in Workspace tab */}
                <div className="p-4 rounded-lg bg-[#fafafa] dark:bg-[#1a1a1a] border border-[#eaeaea] dark:border-[#333] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-[#171717] dark:text-[#ededed] flex items-center gap-1.5">
                        <Globe className="w-4 h-4 text-[#0070f3]" />
                        <span>{t.settings.systemLanguage}</span>
                      </h4>
                      <p className="text-xs text-[#666] dark:text-[#a1a1aa] mt-0.5">{t.settings.systemLanguageHint}</p>
                    </div>
                    <select
                      value={selectedLang}
                      onChange={(e) => {
                        const val = e.target.value as Language;
                        setSelectedLang(val);
                        onLanguageChange(val);
                      }}
                      className="text-xs font-semibold bg-white dark:bg-[#222] border border-[#eaeaea] dark:border-[#444] rounded-md px-3 py-1.5 outline-none focus:border-[#0070f3] cursor-pointer"
                    >
                      <option value="en">English (US)</option>
                      <option value="id">Bahasa Indonesia</option>
                    </select>
                  </div>
                </div>

                {/* Data Management & Persistence */}
                <div className="p-4 rounded-lg bg-[#fafafa] dark:bg-[#1a1a1a] border border-[#eaeaea] dark:border-[#333] space-y-3">
                  <div>
                    <h4 className="text-sm font-medium text-[#171717] dark:text-[#ededed] flex items-center gap-1.5">
                      <Database className="w-4 h-4 text-[#0070f3]" />
                      <span>{lang === 'en' ? 'Local Storage & Demo State' : 'Penyimpanan Lokal & Data Demo'}</span>
                    </h4>
                    <p className="text-xs text-[#666] dark:text-[#a1a1aa] mt-0.5">
                      {lang === 'en'
                        ? 'This backup contains browser data only. Live purchase orders in Firestore are managed separately.'
                        : 'Cadangan ini hanya memuat data browser. PO aktif di Firestore dikelola secara terpisah.'}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        const allData = createInventoraBackup();
                        exportToJson(`inventora-backup-${new Date().toISOString().split('T')[0]}.json`, allData);
                        onToast(lang === 'en' ? 'Local browser data exported as JSON' : 'Data lokal browser diekspor sebagai JSON', 'success');
                      }}
                      className="px-3 py-1.5 text-xs font-medium rounded-md border border-[#eaeaea] dark:border-[#444] bg-white dark:bg-[#222] hover:bg-[#f5f5f5] dark:hover:bg-[#333] text-[#171717] dark:text-[#ededed] transition-colors cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      {lang === 'en' ? 'Export System JSON Backup' : 'Ekspor Cadangan JSON'}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (!confirmReset) {
                          setConfirmReset(true);
                          if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
                          resetTimerRef.current = setTimeout(() => setConfirmReset(false), 4000);
                        } else {
                          if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
                          setConfirmReset(false);
                          clearAllInventoraStorage();
                          onToast(lang === 'en' ? 'Demo data reset. Reloading...' : 'Data demo direset. Memuat ulang...', 'info');
                          setTimeout(() => window.location.reload(), 600);
                        }
                      }}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                        confirmReset
                          ? 'border-red-600 bg-red-600 text-white font-semibold shadow-sm'
                          : 'border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400'
                      }`}
                    >
                      <AlertCircle className="w-3.5 h-3.5" />
                      {confirmReset
                        ? (lang === 'en' ? 'Confirm Reset (4s)?' : 'Konfirmasi Reset (4 detik)?')
                        : (lang === 'en' ? 'Reset Demo Data' : 'Reset Data Demo')}
                    </button>
                  </div>
                </div>

                <p className="text-xs text-[var(--ws-muted)]">{lang === 'en' ? 'Language changes are saved automatically in this browser. Email notifications are not configured.' : 'Perubahan bahasa tersimpan otomatis di browser ini. Notifikasi email belum dikonfigurasi.'}</p>
              </div>
            )}

            {activeTab === 'language' && (
              <div className="space-y-6">
                <div>
                  <p className="text-sm text-[#666] dark:text-[#a1a1aa]">
                    {t.common.languageDescription}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* English Card */}
                  <div
                    onClick={() => {
                      setSelectedLang('en');
                      onLanguageChange('en');
                    }}
                    className={`p-5 rounded-xl border-2 cursor-pointer transition-all duration-200 relative ${
                      lang === 'en'
                        ? 'border-[#0070f3] bg-[#0070f3]/[0.03] dark:bg-[#0070f3]/10 shadow-sm'
                        : 'border-[#eaeaea] dark:border-[#333] hover:border-[#ccc] dark:hover:border-[#555] bg-white dark:bg-[#111]'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">🇺🇸</span>
                        <div>
                          <h3 className="text-base font-semibold text-[#171717] dark:text-[#ededed]">
                            English (US)
                          </h3>
                          <span className="text-xs text-[#888] font-mono">en-US</span>
                        </div>
                      </div>
                      {lang === 'en' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0070f3] dark:text-[#3291ff] bg-[#0070f3]/10 px-2 py-0.5 rounded-full">
                          <Check className="w-3 h-3" /> {t.settings.currentLanguageBadge}
                        </span>
                      ) : (
                        <span className="text-xs text-[#888] hover:text-[#171717] font-medium">
                          Select
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-[#666] dark:text-[#a1a1aa] leading-relaxed mb-4">
                      Standard international enterprise localization with USD/IDR currency parsing and English menu headers.
                    </p>

                    <div className="p-3 bg-[#fafafa] dark:bg-[#1a1a1a] rounded-lg border border-[#eaeaea] dark:border-[#2b2b2b] text-[11px] space-y-1.5 font-mono text-[#555] dark:text-[#aaa]">
                      <div className="flex justify-between">
                        <span>Date Format:</span>
                        <span className="text-[#171717] dark:text-[#ededed] font-medium">MM/DD/YYYY (e.g. Sep 21, 2026)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Currency Format:</span>
                        <span className="text-[#171717] dark:text-[#ededed] font-medium">IDR / USD $</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Number Separator:</span>
                        <span className="text-[#171717] dark:text-[#ededed] font-medium">1,234,567.89</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedLang('en');
                        onLanguageChange('en');
                      }}
                      className={`w-full mt-4 text-xs font-semibold py-2 px-3 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                        lang === 'en'
                          ? 'bg-[#0070f3] text-white shadow-sm'
                          : 'bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-[#171717] dark:text-[#ededed]'
                      }`}
                    >
                      {lang === 'en' ? 'Active Language' : 'Switch to English'}
                    </button>
                  </div>

                  {/* Indonesian Card */}
                  <div
                    onClick={() => {
                      setSelectedLang('id');
                      onLanguageChange('id');
                    }}
                    className={`p-5 rounded-xl border-2 cursor-pointer transition-all duration-200 relative ${
                      lang === 'id'
                        ? 'border-[#0070f3] bg-[#0070f3]/[0.03] dark:bg-[#0070f3]/10 shadow-sm'
                        : 'border-[#eaeaea] dark:border-[#333] hover:border-[#ccc] dark:hover:border-[#555] bg-white dark:bg-[#111]'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">🇮🇩</span>
                        <div>
                          <h3 className="text-base font-semibold text-[#171717] dark:text-[#ededed]">
                            Bahasa Indonesia
                          </h3>
                          <span className="text-xs text-[#888] font-mono">id-ID</span>
                        </div>
                      </div>
                      {lang === 'id' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0070f3] dark:text-[#3291ff] bg-[#0070f3]/10 px-2 py-0.5 rounded-full">
                          <Check className="w-3 h-3" /> {t.settings.currentLanguageBadge}
                        </span>
                      ) : (
                        <span className="text-xs text-[#888] hover:text-[#171717] font-medium">
                          Pilih
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-[#666] dark:text-[#a1a1aa] leading-relaxed mb-4">
                      Format nasional Indonesia dengan pemisah ribuan titik, mata uang Rupiah (Rp), dan nomenklatur ERP standar Indonesia.
                    </p>

                    <div className="p-3 bg-[#fafafa] dark:bg-[#1a1a1a] rounded-lg border border-[#eaeaea] dark:border-[#2b2b2b] text-[11px] space-y-1.5 font-mono text-[#555] dark:text-[#aaa]">
                      <div className="flex justify-between">
                        <span>Format Tanggal:</span>
                        <span className="text-[#171717] dark:text-[#ededed] font-medium">DD/MM/YYYY (cth: 21 Sep 2026)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Format Mata Uang:</span>
                        <span className="text-[#171717] dark:text-[#ededed] font-medium">Rupiah (Rp)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Pemisah Angka:</span>
                        <span className="text-[#171717] dark:text-[#ededed] font-medium">1.234.567,89</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedLang('id');
                        onLanguageChange('id');
                      }}
                      className={`w-full mt-4 text-xs font-semibold py-2 px-3 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                        lang === 'id'
                          ? 'bg-[#0070f3] text-white shadow-sm'
                          : 'bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-[#171717] dark:text-[#ededed]'
                      }`}
                    >
                      {lang === 'id' ? 'Bahasa Aktif' : 'Ganti ke Bahasa Indonesia'}
                    </button>
                  </div>
                </div>

                <div className="p-4 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg text-xs text-blue-900 dark:text-blue-200 flex items-start gap-3">
                  <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold mb-0.5">
                      {lang === 'en' ? 'Seamless Persistence' : 'Tersimpan Otomatis'}
                    </p>
                    <p className="text-blue-800 dark:text-blue-300 text-[11px] leading-relaxed">
                      {lang === 'en'
                        ? 'Your language selection is saved locally across sessions and synchronized with the top navigation bar quick switcher.'
                        : 'Pilihan bahasa Anda disimpan secara otomatis untuk seluruh sesi kerja dan disinkronkan langsung dengan tombol cepat di header atas.'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </section>
  );
}

function CommandPalette({
  isOpen,
  onClose,
  onNavigate,
  toggleDarkMode,
  lang = 'en',
  onLanguageChange,
  role
}: {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (menu: string) => void;
  toggleDarkMode: () => void;
  lang?: Language;
  onLanguageChange?: (newLang: Language) => void;
  role: Role | null;
}) {
  const [search, setSearch] = useState('');

  useEffect(() => { if (isOpen) setSearch(''); }, [isOpen]);

  const commands = [
    { id: 'overview', name: lang === 'en' ? 'Open overview' : 'Buka ringkasan', icon: LayoutDashboard, action: () => onNavigate('overview') },
    { id: 'analytics', name: lang === 'en' ? 'View Analytics & Reports' : 'Buka Analytics & Pelaporan', icon: BarChart3, action: () => onNavigate('analytics') },
    { id: 'stok', name: lang === 'en' ? 'Check Inventory Stock' : 'Periksa Stok Inventaris', icon: Database, action: () => onNavigate('stok') },
    { id: 'po', name: lang === 'en' ? 'Open procurement' : 'Buka pengadaan', icon: ShoppingCart, action: () => onNavigate('po') },
    { id: 'keuangan', name: lang === 'en' ? 'Go to Finance & Invoices' : 'Buka Keuangan & Invoice', icon: FileText, action: () => onNavigate('keuangan') },
    { id: 'sdm', name: lang === 'en' ? 'Manage HR & Payroll' : 'Kelola SDM & Payroll', icon: Users, action: () => onNavigate('sdm') },
    { id: 'billing', name: lang === 'en' ? 'Manage Billing & Cloud Subscription' : 'Kelola Langganan & Tagihan Cloud', icon: CreditCard, action: () => onNavigate('billing') },
    { id: 'settings', name: lang === 'en' ? 'Open Workspace & Language Settings' : 'Buka Pengaturan Workspace & Bahasa', icon: SettingsIcon, action: () => onNavigate('settings') },
    {
      id: 'lang-en',
      name: 'Switch Language to English (US)',
      icon: Globe,
      action: () => onLanguageChange && onLanguageChange('en')
    },
    {
      id: 'lang-id',
      name: 'Ganti Bahasa ke Bahasa Indonesia',
      icon: Globe,
      action: () => onLanguageChange && onLanguageChange('id')
    },
    { id: 'theme', name: lang === 'en' ? 'Toggle Dark Mode' : 'Ganti Tema Gelap / Terang', icon: Moon, action: () => toggleDarkMode() },
  ];

  const filtered = commands.filter(c => (['lang-en', 'lang-id', 'theme'].includes(c.id) || canAccessMenu(role, c.id)) && c.name.toLowerCase().includes(search.toLowerCase()));

  return <Modal isOpen={isOpen} onClose={onClose} title={lang === 'en' ? 'Search workspace' : 'Cari di ruang kerja'}>
    <input autoFocus type="search" value={search} onChange={event => setSearch(event.target.value)} aria-label={lang === 'en' ? 'Search modules and actions' : 'Cari modul dan tindakan'} placeholder={lang === 'en' ? 'Find a module or action…' : 'Cari modul atau tindakan…'} className="w-full rounded-md border border-[var(--ws-border)] bg-[var(--ws-raised)] px-3 py-2 text-sm mb-3"/>
    <div className="max-h-[55vh] overflow-y-auto space-y-1">{filtered.map(cmd => <button key={cmd.id} type="button" onClick={() => { cmd.action(); onClose(); }} className="flex w-full items-center gap-3 px-3 py-3 rounded-md text-left text-xs hover:bg-[var(--ws-raised)] cursor-pointer"><cmd.icon size={16} className="text-[var(--ws-muted)]"/>{cmd.name}</button>)}
    {!filtered.length && <p className="py-6 text-center text-xs text-[var(--ws-muted)]">{lang === 'en' ? 'No matching modules or actions.' : 'Tidak ada modul atau tindakan yang cocok.'}</p>}</div>
  </Modal>;
}

function Dashboard() {
  const navigate = useNavigate();
  const [activeMenu, setActiveMenu] = useState('overview');
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('inventora_language');
    if (saved === 'en' || saved === 'id') return saved;
    return 'en';
  });

  useEffect(() => {
    if (!isSidebarOpen) return;
    const mobile = window.matchMedia('(max-width: 767px)');
    if (!mobile.matches) { setIsSidebarOpen(false); return; }
    const sidebar = document.getElementById('workspace-navigation');
    const main = document.querySelector<HTMLElement>('.app-main');
    const previous = document.activeElement as HTMLElement | null;
    const wasInert = main?.inert ?? false;
    if (main) main.inert = true;
    const controls = () => Array.from(sidebar?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input, [tabindex="0"]') ?? []).filter(element => element.getClientRects().length > 0);
    controls()[0]?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); setIsSidebarOpen(false); }
      if (event.key !== 'Tab') return;
      const items = controls();
      if (!items.length) return;
      const first = items[0]; const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    const handleResize = () => { if (!mobile.matches) setIsSidebarOpen(false); };
    document.addEventListener('keydown', handleKey);
    mobile.addEventListener('change', handleResize);
    return () => {
      if (main) main.inert = wasInert;
      document.removeEventListener('keydown', handleKey);
      mobile.removeEventListener('change', handleResize);
      previous?.focus();
    };
  }, [isSidebarOpen]);

  const t = translations[language];

  const handleLanguageChange = (newLang: Language) => {
    setLanguage(newLang);
    localStorage.setItem('inventora_language', newLang);
    showToast(newLang === 'en' ? 'Language switched to English' : 'Bahasa dialihkan ke Bahasa Indonesia', 'info');
  };

  const [demoUser] = useState(readDemoUser);
  const isDemo = !!demoUser;
  const [user, setUser] = useState<any>(demoUser);
  const [currentRole, setCurrentRole] = useState<Role | null>(demoUser?.role ?? null);
  const draftOwner = `${isDemo ? 'demo' : 'live'}:${user?.uid ?? demoUser?.email ?? ''}:${currentRole ?? ''}`;
  const [restockDraft, setRestockDraft] = useState<{ owner: string; key: string; item: RestockDraft } | null>(null);
  const activeRestockDraft = restockDraft?.owner === draftOwner ? restockDraft : null;
  const [authReady, setAuthReady] = useState(isDemo);
  const summary = useWorkspaceSummary(isDemo, user?.uid ?? 'demo', currentRole);
  const [isCmdKOpen, setIsCmdKOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isAiCopilotOpen, setIsAiCopilotOpen] = useState(false);

  const { isOnline, queue, queuedCount, enqueue, flushQueue } = useNetworkStatus({
    ownerId: !isDemo && currentRole ? user?.uid ?? null : null,
    execute: async item => { const { replayPoMutation } = await import('./lib/purchaseOrderStore'); await replayPoMutation(item); },
    onSynced: count => showToast(language === 'en' ? `${count} queued changes synchronized` : `${count} perubahan tersinkronkan`, 'success'),
    onError: error => showToast((language === 'en' ? 'Sync failed; queued data is retained. ' : 'Sinkronisasi gagal; antrean tetap disimpan. ') + String(error), 'error'),
  });

  const { pendingSequence } = useGlobalHotkeys({
    onNavigate: (menu) => handleMenuClick(menu),
    onNewPo: () => handleMenuClick('purchase'),
    onOpenHelp: () => setIsShortcutsOpen(true),
    onToggleCmdK: () => setIsCmdKOpen(prev => !prev),
    onToggleCopilot: () => setIsAiCopilotOpen(prev => !prev),
  });

  const {
    notifications, notify: handleNewNotification, markAllAsRead: handleMarkAllAsRead,
    clearAll: handleClearAllNotifications, clearSession: clearNotificationSession,
  } = useNotifications(isDemo, authReady ? user?.uid ?? (isDemo ? demoUser.email.trim().toLowerCase() : null) : null, currentRole);

  useEffect(() => {
    if (demoUser) return;
    let disposed = false;
    let unsub = () => {};
    import('./firebase').then(({ auth }) => {
      if (disposed) return;
      unsub = auth.onIdTokenChanged(async u => {
        setAuthReady(false);
        setCurrentRole(null);
        setUser(u);
        if (!u) { navigate('/login'); return; }
        try {
          const { claims } = await u.getIdTokenResult();
          if (!disposed && auth.currentUser?.uid === u.uid) setCurrentRole(isRole(claims.role) ? claims.role : null);
        } catch (error) {
          console.error('Unable to verify account role', error);
        } finally { if (!disposed) setAuthReady(true); }
      });
    }).catch(err => {
      console.warn("Auth initialization error:", err);
      if (!disposed) setAuthReady(true);
    });
    return () => { disposed = true; unsub(); };
  }, [navigate, demoUser]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCmdKOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleDarkMode = () => {
    document.documentElement.classList.toggle('dark');
  };

  const showToast = (
    msg: string,
    type: ToastType = 'success',
    options?: {
      title?: string;
      actionLabel?: string;
      onAction?: () => void;
      duration?: number;
    }
  ) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);

    // Auto-detect high-context category title if not explicitly passed
    let determinedTitle = options?.title;
    if (!determinedTitle) {
      const lower = msg.toLowerCase();
      if (type === 'error') {
        determinedTitle = language === 'en' ? 'Action Failed' : 'Tindakan Gagal';
      } else if (type === 'warning') {
        determinedTitle = language === 'en' ? 'Attention Required' : 'Perlu Diperiksa';
      } else if (type === 'info') {
        determinedTitle = language === 'en' ? 'Information' : 'Informasi';
      } else if (lower.includes('pembayaran') || lower.includes('payment') || lower.includes('lunas') || lower.includes('settled') || lower.includes('receipt')) {
        determinedTitle = language === 'en' ? 'Payment Confirmed' : 'Pembayaran Lunas';
      } else if (lower.includes('deploy') || lower.includes('stok') || lower.includes('unit') || lower.includes('dispatched')) {
        determinedTitle = language === 'en' ? 'Inventory Dispatched' : 'Stok Berkurang';
      } else if (lower.includes('download') || lower.includes('unduh') || lower.includes('.pdf') || lower.includes('.csv')) {
        determinedTitle = language === 'en' ? 'Document Export Ready' : 'Dokumen Siap Diunduh';
      } else if (lower.includes('purchase order') || lower.includes('po-') || lower.includes('pesanan')) {
        determinedTitle = language === 'en' ? 'Procurement Update' : 'Status Pengadaan PO';
      } else if (lower.includes('avatar') || lower.includes('profile') || lower.includes('settings') || lower.includes('pengaturan')) {
        determinedTitle = language === 'en' ? 'Settings Saved' : 'Pengaturan Tersimpan';
      } else if (lower.includes('language') || lower.includes('bahasa')) {
        determinedTitle = language === 'en' ? 'Language Changed' : 'Bahasa Diperbarui';
      } else if (lower.includes('sync') || lower.includes('sinkronisasi')) {
        determinedTitle = language === 'en' ? 'Cloud Sync Restored' : 'Sinkronisasi Pulih';
      }
    }

    const item: ToastItem = {
      id,
      msg,
      type,
      title: determinedTitle,
      actionLabel: options?.actionLabel,
      onAction: options?.onAction,
      duration: options?.duration ?? (type === 'error' ? 6000 : 4500),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };

    // Synthesized chime audio cue so the user immediately notices the event
    playNotificationChime(type);

    setToasts(prev => [item, ...prev.slice(0, 2)]);
  };

  const handleDismissToast = (id: number | string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const handleMenuClick = (menuName: string) => {
    if (!canAccessMenu(currentRole, menuName)) {
      showToast(language === 'en' ? 'You do not have access to this module.' : 'Anda tidak memiliki akses ke modul ini.', 'error');
      return;
    }
    setRestockDraft(null);
    setActiveMenu(menuName);
    setIsSidebarOpen(false); // Close mobile sidebar on navigation
  };

  const handleRestockDraft = (item: RestockDraft) => {
    if (!canAccessMenu(currentRole, 'purchase')) { handleMenuClick('purchase'); return; }
    if (!item || typeof item.skuId !== 'string' || !item.skuId.trim() || typeof item.name !== 'string' || !item.name.trim() || !Number.isSafeInteger(item.recommendedOrderQty) || item.recommendedOrderQty <= 0) {
      showToast(language === 'en' ? 'The restock recommendation is incomplete. Review stock before creating a PO.' : 'Rekomendasi restok belum lengkap. Periksa stok sebelum membuat PO.', 'error');
      return;
    }
    handleMenuClick('purchase');
    setRestockDraft({ owner: draftOwner, key: crypto.randomUUID(), item: { skuId: item.skuId, name: item.name, recommendedOrderQty: item.recommendedOrderQty } });
  };

  const getMenuClass = (menuName: string) => `sidebar-link ${activeMenu === menuName || (menuName === 'po' && ['purchase', 'new-po'].includes(activeMenu)) ? 'is-active' : ''}`;

  const getHeaderTitle = () => {
    switch(activeMenu) {
      case 'overview': return t.headers.overview;
      case 'analytics': return t.headers.analytics;
      case 'stok': return t.headers.inventory;
      case 'po': return t.headers.procurement;
      case 'keuangan': return t.headers.finance;
      case 'sdm': return t.headers.hr;
      case 'billing': return t.headers.billing;
      case 'purchase':
      case 'new-po':
        return t.headers.newPo;
      case 'settings': return t.headers.settings;
      default: return t.headers.inventory;
    }
  };

  const hasAccess = (menu: string) => canAccessMenu(currentRole, menu);

  const handleLogout = async () => {
    setRestockDraft(null);
    clearNotificationSession();
    setIsAiCopilotOpen(false);
    sessionStorage.removeItem('inventora_demo_user');
    try {
      const { logout } = await import('./firebase');
      await logout();
    } catch {}
    navigate('/');
  };

  if (!user || !authReady) {
    return <InventoraLoadingScreen role={currentRole ?? 'Unassigned'} lang={language} durationMs={800} />;
  }

  if (!currentRole) {
    return <div className="min-h-screen flex items-center justify-center p-8"><div className="max-w-md space-y-4">
      <h1 className="text-xl font-semibold">{language === 'en' ? 'Account access has not been assigned' : 'Akses akun belum ditetapkan'}</h1>
      <p>{language === 'en' ? 'Ask your administrator to assign a verified account role, then sign in again.' : 'Minta administrator menetapkan peran akun terverifikasi, lalu masuk kembali.'}</p>
      <button className="underline" onClick={handleLogout}>{language === 'en' ? 'Sign out' : 'Keluar'}</button>
    </div></div>;
  }

  return (
    <UILanguageContext.Provider value={language}>
    <div className="app-shell flex h-dvh w-full text-[#171717] dark:text-[#ededed] font-sans overflow-hidden">

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside id="workspace-navigation" aria-label={language === 'en' ? 'Main navigation' : 'Navigasi utama'} className={`app-sidebar fixed md:static inset-y-0 left-0 z-30 flex flex-col shrink-0 ${isSidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="flex-shrink-0 flex items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="2" y="2" width="8" height="8" rx="1.5" className="fill-[#171717] dark:fill-[#ededed]" />
                <rect x="14" y="2" width="8" height="8" rx="1.5" className="fill-[#171717] dark:fill-[#ededed]" fillOpacity="0.15" />
                <rect x="2" y="14" width="8" height="8" rx="1.5" className="fill-[#171717] dark:fill-[#ededed]" fillOpacity="0.15" />
                <rect x="14" y="14" width="8" height="8" rx="1.5" className="fill-[#171717] dark:fill-[#ededed]" />
              </svg>
            </div>
            <div className="flex flex-col justify-center mt-0.5">
              <span className="text-lg font-semibold tracking-tight text-[#171717] dark:text-[#ededed] leading-none">Inventora</span>
            </div>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            aria-label={language === 'en' ? 'Close navigation' : 'Tutup navigasi'}
            className="md:hidden text-[#666] dark:text-[#a1a1aa]"
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <div className="workspace-label"><span className="workspace-monogram">IN</span><div><strong>Inventora</strong><span>{language === 'en' ? 'Operations workspace' : 'Ruang kerja operasional'}</span></div><span className="workspace-role">{isDemo ? 'DEMO' : 'ERP'}</span></div>
        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
          <p className="nav-group-label">{language === 'en' ? 'Workspace' : 'Ruang kerja'}</p>
          {[
            { id: 'overview', label: t.nav.overview, icon: LayoutDashboard },
            { id: 'analytics', label: t.nav.analytics, icon: BarChart3 },
            { id: 'stok', label: t.nav.inventory, icon: Database },
            { id: 'po', label: t.nav.procurement, icon: ShoppingCart },
            { id: 'keuangan', label: t.nav.finance, icon: FileText },
            { id: 'sdm', label: t.nav.hr, icon: Users },
            { id: 'billing', label: t.nav.billing, icon: CreditCard },
          ].filter(item => hasAccess(item.id)).map(item => <button key={item.id} type="button" aria-current={getMenuClass(item.id).includes('is-active') ? 'page' : undefined} onClick={() => handleMenuClick(item.id)} className={getMenuClass(item.id)}>
            {getMenuClass(item.id).includes('is-active') && <motion.span layoutId="navigation-active" className="sidebar-active-indicator" transition={{ type: 'spring', stiffness: 420, damping: 38 }} />}
            <item.icon className="w-[18px] h-[18px]" strokeWidth={1.7} /><span>{item.label}</span>
            {item.id === 'po' && !!summary.pendingApprovalsCount && <span className="nav-count">{summary.pendingApprovalsCount}</span>}
          </button>)}
          {hasAccess('settings') && <div className="nav-settings"><p className="nav-group-label">{language === 'en' ? 'Manage' : 'Pengelolaan'}</p><button type="button" aria-current={activeMenu === 'settings' ? 'page' : undefined} onClick={() => handleMenuClick('settings')} className={getMenuClass('settings')}>
            {activeMenu === 'settings' && <motion.span layoutId="navigation-active" className="sidebar-active-indicator" transition={{ type: 'spring', stiffness: 420, damping: 38 }} />}
            <SettingsIcon size={18} strokeWidth={1.7}/><span>{t.nav.settings}</span></button></div>}
        </nav>

        <div className="sidebar-account text-xs space-y-4">
          <p>{t.nav.activeSession}:<br/><span className="text-[#171717] dark:text-[#ededed] font-medium text-sm truncate block" title={user?.email}>{user?.email || 'admin@inventora.com'}</span></p>
          <div className="flex gap-2">
            <button onClick={toggleDarkMode} aria-label={language === 'en' ? 'Toggle color theme' : 'Ganti tema warna'} className="flex-1 bg-white dark:bg-[#1a1a1a] text-[#171717] dark:text-[#ededed] font-medium shadow-[0_0_0_1px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.12)] hover:bg-[#fafafa] dark:hover:bg-[#333] px-3 py-2 rounded-md transition-colors flex items-center justify-center">
              <svg className="hidden dark:block w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
              <svg className="block dark:hidden w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>
            </button>
            <button onClick={handleLogout} className="flex-[4] bg-white dark:bg-[#1a1a1a] text-[#171717] dark:text-[#ededed] font-medium shadow-[0_0_0_1px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.12)] hover:bg-[#fafafa] dark:hover:bg-[#333] px-3 py-2 rounded-md transition-colors text-xs flex items-center justify-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
              {t.nav.logout}
            </button>
          </div>
        </div>
      </aside>


      <main className="app-main flex-1 flex flex-col min-w-0">
        <header className="app-topbar flex items-center justify-between gap-2 px-4 md:px-6 shrink-0 z-10">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button
              onClick={() => setIsSidebarOpen(true)}
              aria-label={language === 'en' ? 'Open navigation' : 'Buka navigasi'}
              aria-expanded={isSidebarOpen} aria-controls="workspace-navigation"
              className="md:hidden shrink-0 text-[#171717] dark:text-[#ededed] p-1 -ml-1 rounded hover:bg-[#fafafa] dark:hover:bg-[#333]"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0 flex items-center gap-3"><h1 className="min-w-0 text-base font-medium tracking-tight">
              <span className="block truncate" title={getHeaderTitle()}>{getHeaderTitle()}</span>
            </h1><button type="button" className="command-trigger hidden lg:flex" onClick={() => setIsCmdKOpen(true)} aria-label={language === 'en' ? 'Search modules (Ctrl+K)' : 'Cari modul (Ctrl+K)'}><Search size={14}/><span>{language === 'en' ? 'Search modules' : 'Cari modul'}</span><kbd>Ctrl K</kbd></button>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-3 shrink-0">
            {pendingSequence && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-mono font-bold animate-pulse border border-blue-500/20">
                Key: {pendingSequence.toUpperCase()}...
              </span>
            )}

            <NetworkStatusIndicator
              isOnline={isOnline}
              queuedCount={queuedCount}
              queue={queue}
              onManualSync={flushQueue}
              lang={language}
            />

            <button
              type="button"
              onClick={() => setIsShortcutsOpen(true)}
              className="hidden sm:block p-1.5 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              title={language === 'en' ? 'Keyboard shortcuts (?)' : 'Pintasan keyboard (?)'}
            >
              <Keyboard className="w-4 h-4" />
            </button>

            {/* Quick Language Switcher Pill */}
            <div className="flex items-center rounded-lg border border-[#eaeaea] dark:border-[#333] p-0.5 bg-[#fafafa] dark:bg-[#1a1a1a]">
              <button
                type="button"
                onClick={() => handleLanguageChange('en')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                  language === 'en'
                    ? 'bg-white dark:bg-[#262626] text-[#0070f3] dark:text-[#3291ff] shadow-sm'
                    : 'text-[#666] dark:text-[#888] hover:text-[#171717] dark:hover:text-[#ededed]'
                }`}
                aria-pressed={language === 'en'}
                title="Switch language to English (US)"
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => handleLanguageChange('id')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                  language === 'id'
                    ? 'bg-white dark:bg-[#262626] text-[#0070f3] dark:text-[#3291ff] shadow-sm'
                    : 'text-[#666] dark:text-[#888] hover:text-[#171717] dark:hover:text-[#ededed]'
                }`}
                aria-pressed={language === 'id'}
                title="Ganti bahasa ke Bahasa Indonesia"
              >
                ID
              </button>
            </div>

            <NotificationCenter
              lang={language} t={t}
              notifications={notifications}
              onMarkAllAsRead={handleMarkAllAsRead}
              onClearAll={handleClearAllNotifications}
              onSelectNotification={(n) => {
                if (n.metadata?.poId) {
                  handleMenuClick('po');
                  showToast(language === 'en' ? `Opening PO ${n.metadata.poId}` : `Membuka PO ${n.metadata.poId}`, 'info');
                }
              }}
            />

            <div className="w-8 h-8 rounded-full shadow-[0_0_0_1px_rgba(0,0,0,0.08)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.12)] flex items-center justify-center text-[#171717] dark:text-[#ededed] text-xs font-semibold bg-[#fafafa] dark:bg-[#1a1a1a]">
              {user?.displayName ? user.displayName.slice(0, 2).toUpperCase() : 'AD'}
            </div>
          </div>
        </header>

        <div className="workspace-sheet">
        <div key={activeMenu} className="workspace-page">
        <Suspense fallback={<div className="p-6 md:p-8"><ViewSkeleton title={getHeaderTitle()} /></div>}>
          <ErrorBoundary fallbackTitle={getHeaderTitle()} onReset={() => setActiveMenu('overview')}>
            {hasAccess('overview') && activeMenu === 'overview' && <OverviewView onNavigate={handleMenuClick} t={t} lang={language} summary={summary} role={currentRole} isDemo={isDemo} notifications={notifications} />}
            {hasAccess('analytics') && activeMenu === 'analytics' && <AnalyticsView t={t} lang={language} />}
            {hasAccess('billing') && activeMenu === 'billing' && <BillingSubscriptionView onToast={showToast} t={t} lang={language} />}
            {hasAccess('settings') && activeMenu === 'settings' && <SettingsView account={user} onToast={showToast} lang={language} onLanguageChange={handleLanguageChange} t={t} onNavigate={handleMenuClick} />}
            {hasAccess('stok') && activeMenu === 'stok' && <InventoryView onToast={showToast} onNavigate={handleMenuClick} onRestock={handleRestockDraft} t={t} lang={language} />}
            {hasAccess('po') && activeMenu === 'po' && (
              <ProcurementView
                onNavigate={handleMenuClick}
                onToast={showToast}
                onNotify={handleNewNotification}
                t={t}
                lang={language}
                isOnline={isOnline}
                onQueueOffline={enqueue}
                role={currentRole}
                isDemo={isDemo}
                ownerId={user.uid ?? "demo"}
              />
            )}
            {hasAccess('keuangan') && activeMenu === 'keuangan' && <FinanceView onToast={showToast} t={t} lang={language} />}
            {hasAccess('sdm') && activeMenu === 'sdm' && <HRView onToast={showToast} t={t} lang={language} />}
            {hasAccess(activeMenu) && (activeMenu === 'purchase' || activeMenu === 'new-po') && (
              <PurchaseUnitView key={`${draftOwner}:${activeRestockDraft?.key ?? 'manual'}`} initialDraft={activeRestockDraft?.item} role={currentRole} isDemo={isDemo} ownerId={user.uid ?? "demo"}
                onNavigate={handleMenuClick}
                onToast={showToast}
                onNotify={handleNewNotification}
                t={t}
                lang={language}
              />
            )}
          </ErrorBoundary>
        </Suspense>
        </div>
        </div>

        <button type="button" onClick={() => setIsAiCopilotOpen(true)} className="copilot-launcher" title={language === 'en' ? 'Open assistant (Ctrl+J)' : 'Buka asisten (Ctrl+J)'} aria-label={language === 'en' ? 'Open AI assistant' : 'Buka asisten AI'}><Sparkles size={17}/><span>{language === 'en' ? 'Assistant' : 'Asisten'}</span><kbd>Ctrl J</kbd></button>

        {/* Executive AI Copilot Drawer */}
        <AiCopilotDrawer
          key={`${isDemo ? 'demo' : 'live'}:${user?.uid ?? 'none'}:${currentRole ?? 'none'}`}
          isOpen={isAiCopilotOpen}
          onClose={() => setIsAiCopilotOpen(false)}
          currentRole={currentRole}
          lang={language}
          erpContext={{
            activeMenu,
            activePosCount: summary.activePosCount,
            pendingApprovalsCount: summary.pendingApprovalsCount,
            recordedPoValue: summary.poValue,
            totalHeadcount: summary.totalHeadcount,
            infrastructureUnits: summary.infrastructureUnits,
            currency: "IDR"
          }}
        />

        <InteractiveToaster toasts={toasts} onDismiss={handleDismissToast} />
        <CommandPalette
          role={currentRole}
          isOpen={isCmdKOpen}
          onClose={() => setIsCmdKOpen(false)}
          onNavigate={handleMenuClick}
          toggleDarkMode={toggleDarkMode}
          lang={language}
          onLanguageChange={handleLanguageChange}
        />

        <ShortcutsModal
          isOpen={isShortcutsOpen}
          onClose={() => setIsShortcutsOpen(false)}
          lang={language}
        />
      </main>
    </div>
    </UILanguageContext.Provider>
  );
}

function Home() {
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('inventora_language');
    return (saved === 'en' || saved === 'id') ? saved : 'en';
  });

  const handleLangToggle = (newLang: Language) => {
    setLang(newLang);
    localStorage.setItem('inventora_language', newLang);
  };

  return <OpeningSequence lang={lang} onLanguageChange={handleLangToggle} />;
}

function Login() {
  const navigate = useNavigate();
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('inventora_language');
    return (saved === 'en' || saved === 'id') ? saved : 'en';
  });

  const handleLangToggle = (newLang: Language) => {
    setLang(newLang);
    localStorage.setItem('inventora_language', newLang);
  };

  const [isLoading, setIsLoading] = useState(false);
  const [demoLoadingRole, setDemoLoadingRole] = useState<Role | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [unauthorizedDomain, setUnauthorizedDomain] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleDemoLogin = (role: Role = 'Super Admin') => {
    sessionStorage.setItem('inventora_demo_user', JSON.stringify({
      email: `${role.toLowerCase().replace(/\s+/g, '.')}@inventora.com`,
      displayName: `${role} (Preview)`,
      role
    }));
    setDemoLoadingRole(role);
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMsg('');
    setUnauthorizedDomain(null);
    try {
      const { googleSignIn } = await import('./firebase');
      const res = await googleSignIn();
      if (res) {
        navigate('/dashboard');
      }
    } catch (e: any) {
      if (e?.code === 'auth/unauthorized-domain' || e?.message?.includes('auth/unauthorized-domain')) {
        setUnauthorizedDomain(typeof window !== 'undefined' ? window.location.hostname : 'run.app');
      } else if (
        e?.code === 'auth/popup-closed-by-user' ||
        e?.code === 'auth/cancelled-popup-request' ||
        e?.message?.includes('auth/popup-closed-by-user') ||
        e?.message?.includes('auth/cancelled-popup-request')
      ) {
        // User closed or dismissed popup intentionally; no error banner needed
      } else if (e?.code === 'auth/popup-blocked' || e?.message?.includes('auth/popup-blocked')) {
        setErrorMsg(
          lang === 'en'
            ? 'Sign-in popup was blocked by your browser. Please allow popups or use Demo Login below.'
            : 'Popup login diblokir oleh browser. Harap izinkan popup atau gunakan Login Demo di bawah.'
        );
      } else {
        setErrorMsg(e.message || (lang === 'en' ? 'Login failed' : 'Gagal masuk'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-gradient-to-br from-[#fafafa] via-[#f4f6f9] to-[#eaedf2] flex flex-col items-center justify-center font-sans px-4 py-8 overflow-hidden">
      {/* Dynamic Inventora Demo Mode Loading Screen */}
      <AnimatePresence>
        {demoLoadingRole && (
          <InventoraLoadingScreen
            role={demoLoadingRole}
            lang={lang}
            durationMs={1300}
            onFinished={() => navigate('/dashboard')}
          />
        )}
      </AnimatePresence>

      {/* Language Switcher Top Right */}
      <div className="absolute top-6 right-6 z-20 flex items-center rounded-lg border border-[#eaeaea] bg-white/80 backdrop-blur-md p-1 shadow-sm">
        <button
          type="button"
          onClick={() => handleLangToggle('en')}
          className={`px-2.5 py-1 text-xs font-semibold rounded transition-all cursor-pointer ${
            lang === 'en'
              ? 'bg-[#171717] text-white shadow-sm'
              : 'text-[#666] hover:text-[#171717]'
          }`}
        >
          EN
        </button>
        <button
          type="button"
          onClick={() => handleLangToggle('id')}
          className={`px-2.5 py-1 text-xs font-semibold rounded transition-all cursor-pointer ${
            lang === 'id'
              ? 'bg-[#171717] text-white shadow-sm'
              : 'text-[#666] hover:text-[#171717]'
          }`}
        >
          ID
        </button>
      </div>

      <motion.div
        animate={{ scale: [1, 1.1, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] bg-gradient-to-br from-[#0070f3]/[0.06] to-transparent rounded-full blur-[100px] pointer-events-none"
      />
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] bg-gradient-to-tl from-[#7928ca]/[0.06] to-transparent rounded-full blur-[100px] pointer-events-none"
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-sm bg-white p-8 rounded-2xl shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_4px_16px_rgba(0,0,0,0.04)]"
      >
        <div className="flex justify-center items-center gap-2 mb-6">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="2" y="2" width="8" height="8" rx="1.5" fill="#171717" />
            <rect x="14" y="2" width="8" height="8" rx="1.5" fill="#171717" fillOpacity="0.15" />
            <rect x="2" y="14" width="8" height="8" rx="1.5" fill="#171717" fillOpacity="0.15" />
            <rect x="14" y="14" width="8" height="8" rx="1.5" fill="#171717" />
          </svg>
          <span className="text-2xl font-semibold tracking-tight text-[#171717] leading-none mt-0.5">Inventora</span>
        </div>
        <div className="text-center mb-6">
          <h1 className="text-lg font-medium tracking-tight text-[#171717]">
            {lang === 'en' ? 'Sign in to workspace' : 'Masuk ke Workspace'}
          </h1>
          <p className="text-sm text-[#666] mt-1">
            {lang === 'en' ? 'Authenticate to access the dashboard and integrations' : 'Otentikasi untuk mengakses dashboard dan integrasi sistem'}
          </p>
        </div>

        {unauthorizedDomain && (
          <div className="mb-5 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-left">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1 text-xs">
                <h4 className="font-semibold text-amber-900 text-xs mb-1">
                  {lang === 'en' ? 'Preview Domain Authorization Required' : 'Otorisasi Domain Preview Diperlukan'}
                </h4>
                <p className="text-amber-800 leading-relaxed mb-2 text-[11px]">
                  {lang === 'en'
                    ? "Google Sign-In blocked this request because the preview domain isn't yet listed in Firebase Authorized Domains."
                    : 'Google Sign-In memblokir permintaan ini karena domain preview belum terdaftar di Firebase Authorized Domains.'}
                </p>
                <div className="flex items-center justify-between gap-1.5 bg-amber-100/80 px-2 py-1.5 rounded font-mono text-[10px] text-amber-950 mb-2.5 border border-amber-200">
                  <span className="truncate max-w-[190px]">{unauthorizedDomain}</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(unauthorizedDomain);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="flex items-center gap-1 text-amber-800 hover:text-amber-950 font-sans font-medium text-[11px] shrink-0 cursor-pointer"
                  >
                    {copied ? <Check className="w-3 h-3 text-green-700" /> : <Copy className="w-3 h-3" />}
                    {copied ? (lang === 'en' ? 'Copied' : 'Tersalin') : (lang === 'en' ? 'Copy' : 'Salin')}
                  </button>
                </div>
                <div className="flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleDemoLogin('Super Admin')}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white font-medium py-1.5 px-2.5 rounded text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> {lang === 'en' ? 'Enter Instantly as Demo Admin' : 'Masuk Langsung sebagai Demo Admin'}
                  </button>
                  <a
                    href="https://console.firebase.google.com/project/gen-lang-client-0135204887/authentication/settings"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-800 hover:underline flex items-center justify-center gap-1 text-[11px] pt-0.5"
                  >
                    <ExternalLink className="w-3 h-3" /> {lang === 'en' ? 'Add domain in Firebase Console' : 'Tambah domain di Firebase Console'}
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {errorMsg && !unauthorizedDomain && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-100">
            {errorMsg}
          </div>
        )}

        <button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full bg-white text-[#171717] border border-[#eaeaea] font-medium px-4 py-2 rounded-md text-sm hover:bg-[#fafafa] transition-all shadow-[0_1px_2px_rgba(0,0,0,0.04)] active:scale-[0.98] disabled:opacity-80 disabled:active:scale-100 flex items-center justify-center gap-2 h-10 cursor-pointer"
        >
          {isLoading ? (
            <svg className="animate-spin h-4 w-4 text-[#171717]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              {lang === 'en' ? 'Sign in with Google' : 'Masuk dengan Google'}
            </>
          )}
        </button>

        <div className="relative my-4 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#eaeaea]"></div></div>
          <span className="relative bg-white px-2 text-xs text-[#888]">
            {lang === 'en' ? 'or test with demo' : 'atau uji coba demo'}
          </span>
        </div>

        <div className="space-y-2">
          <p className="text-[11px] text-neutral-500 font-medium uppercase tracking-wider text-center">
            {lang === 'en' ? 'Select Instant Demo Role' : 'Pilih Peran Uji Coba Cepat'}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleDemoLogin('Super Admin')}
              className="p-2.5 rounded-lg border border-neutral-200 hover:border-neutral-900 bg-neutral-900 text-white hover:bg-neutral-800 transition-all text-left cursor-pointer shadow-xs"
            >
              <span className="block text-xs font-semibold">Super Admin</span>
              <span className="block text-[10px] text-neutral-400">{lang === 'en' ? 'Full System Access' : 'Akses Penuh'}</span>
            </button>
            <button
              onClick={() => handleDemoLogin('Warehouse Manager')}
              className="p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 bg-neutral-50 hover:bg-white transition-all text-left cursor-pointer shadow-xs"
            >
              <span className="block text-xs font-semibold text-neutral-900">{lang === 'en' ? 'Warehouse Mgr' : 'Manajer Gudang'}</span>
              <span className="block text-[10px] text-neutral-500">{lang === 'en' ? 'Stock & GRN' : 'Stok & GRN'}</span>
            </button>
            <button
              onClick={() => handleDemoLogin('Finance Manager')}
              className="p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 bg-neutral-50 hover:bg-white transition-all text-left cursor-pointer shadow-xs"
            >
              <span className="block text-xs font-semibold text-neutral-900">{lang === 'en' ? 'Finance Lead' : 'Manajer Keuangan'}</span>
              <span className="block text-[10px] text-neutral-500">{lang === 'en' ? 'Invoices & Payouts' : 'Faktur & Bayar'}</span>
            </button>
            <button
              onClick={() => handleDemoLogin('HR Manager')}
              className="p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 bg-neutral-50 hover:bg-white transition-all text-left cursor-pointer shadow-xs"
            >
              <span className="block text-xs font-semibold text-neutral-900">{lang === 'en' ? 'HR Manager' : 'Manajer SDM'}</span>
              <span className="block text-[10px] text-neutral-500">{lang === 'en' ? 'Payroll & Staff' : 'Gaji & Karyawan'}</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
    </MotionConfig>
  );
}
