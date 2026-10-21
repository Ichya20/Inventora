import React, { useState, useEffect } from 'react';
import { 
  CreditCard, ShieldCheck, Zap, CheckCircle2, Download, 
  ArrowUpRight, Users, HardDrive, Cpu, AlertCircle, 
  Building2, ChevronRight, Check, RefreshCw, X, Sparkles,
  Receipt, FileText, Lock, Plus, ExternalLink
} from 'lucide-react';
import { Card, Badge, Button, TableWrapper, Th, Td, Tr, Modal } from './UI';
import { ToastType } from '../types';
import { Language, Translations, translations as defaultTranslations } from '../i18n';
import { loadStoredData, saveStoredData } from '../lib/storageUtils';
import { billingWindow, businessDate, dateLabel } from '../lib/businessDates';
import { downloadInvoicePdf } from '../lib/pdfGenerator';
import { exportToJson } from '../lib/exportUtils';

interface BillingSubscriptionViewProps {
  onToast: (msg: string, type?: ToastType) => void;
  lang?: Language;
  t?: Translations;
}

export type SubscriptionTier = 'starter' | 'business' | 'enterprise';

interface PlanDefinition {
  id: SubscriptionTier;
  name: string;
  badge?: string;
  monthlyPrice: number;
  annualMonthlyPrice: number;
  description: string;
  userLimit: number;
  aiReportLimit: number | 'Unlimited';
  poLimit: number | 'Unlimited';
  storageGb: number;
  features: string[];
  recommended?: boolean;
}

const PLANS: PlanDefinition[] = [
  {
    id: 'starter',
    name: 'Starter Operations',
    monthlyPrice: 750000,
    annualMonthlyPrice: 600000,
    description: 'Essential procurement & stock control for single-facility businesses.',
    userLimit: 3,
    aiReportLimit: 50,
    poLimit: 150,
    storageGb: 10,
    features: [
      'Single-warehouse inventory management',
      'Basic Purchase Order generation',
      'Standard PDF invoices & receipts',
      'CSV data export & offline caching',
      'Standard community support'
    ]
  },
  {
    id: 'business',
    name: 'Business Scale',
    badge: 'Popular for Mid-Market',
    monthlyPrice: 2250000,
    annualMonthlyPrice: 1800000,
    description: 'Example plan for procurement, simulated payments & 3-way matching.',
    userLimit: 15,
    aiReportLimit: 250,
    poLimit: 1000,
    storageGb: 50,
    features: [
      'Multi-warehouse & location tracking',
      'Automated 3-Way matching compliance',
      'Local payment simulation',
      'Role-based Access Control (4 roles)',
      'Google Calendar HR onboarding sync',
      'Sample capacity limits for planning'
    ]
  },
  {
    id: 'enterprise',
    name: 'Enterprise AI & Autonomous Treasury',
    badge: 'Example Enterprise Plan',
    recommended: true,
    monthlyPrice: 5950000,
    annualMonthlyPrice: 4760000,
    description: 'Example capacity tier with AI tools requiring configured services.',
    userLimit: 50,
    aiReportLimit: 'Unlimited',
    poLimit: 'Unlimited',
    storageGb: 250,
    features: [
      'Gemini AI tools (server API key required)',
      'Server-side request limits',
      'Local payment and payroll simulations',
      'Local transaction and payroll history',
      'Sample PDF invoices and payslips',
      'Sample usage and capacity limits',
      '50 sample user seats; optional seat add-ons'
    ]
  }
];

export function BillingSubscriptionView({ onToast, lang = 'en', t }: BillingSubscriptionViewProps) {
  const activeT = t || defaultTranslations[lang] || defaultTranslations.en;
  const numLocale = lang === 'en' ? 'en-US' : 'id-ID';

  // State: Add-on counters
  const [addons, setAddons] = useState(() => {
    return loadStoredData('inventora_billing_addons_v1', {
      extraSeats: 0,
      extraAiPacks: 0,
      dedicatedDatabase: false
    });
  });

  // State: Payment Method
  const [paymentMethod, setPaymentMethod] = useState(() => {
    return loadStoredData('inventora_billing_pm_v1', {
      type: 'card',
      brand: 'Mastercard',
      last4: '8824',
      holder: 'PT INVENTORA TREASURY',
      exp: '12/28',
      billingEmail: 'billing@inventora.com'
    });
  });

  // Modals
  const [isChangePlanOpen, setIsChangePlanOpen] = useState(false);
  const [selectedPlanForUpgrade, setSelectedPlanForUpgrade] = useState<SubscriptionTier | null>(null);
  const [isUpdatePmOpen, setIsUpdatePmOpen] = useState(false);
  const [isAddonModalOpen, setIsAddonModalOpen] = useState(false);
  const [isContactSalesOpen, setIsContactSalesOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  // Forms state
  const [pmForm, setPmForm] = useState({ ...paymentMethod });
  const [salesMessage, setSalesMessage] = useState(() => loadStoredData('inventora_requirements_draft_v1', ''));
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Historical Subscription Invoices
  const [initialInvoices] = useState(() => loadStoredData('inventora_subscription_invoices_v1', [
    {
      id: 'INV-SUB-2026-09',
      date: '15 Sep 2026',
      total: 4760000,
      period: '15 Sep 2026 - 14 Oct 2026',
      status: 'Lunas',
      client: 'PT INVENTORA NUSANTARA TEKNOLOGI',
      planName: 'Enterprise AI & Autonomous Treasury',
      paymentMethod: 'Mastercard •••• 8824'
    },
    {
      id: 'INV-SUB-2026-08',
      date: '15 Aug 2026',
      total: 4760000,
      period: '15 Aug 2026 - 14 Sep 2026',
      status: 'Lunas',
      client: 'PT INVENTORA NUSANTARA TEKNOLOGI',
      planName: 'Enterprise AI & Autonomous Treasury',
      paymentMethod: 'Mastercard •••• 8824'
    },
    {
      id: 'INV-SUB-2026-07',
      date: '15 Jul 2026',
      total: 4760000,
      period: '15 Jul 2026 - 14 Aug 2026',
      status: 'Lunas',
      client: 'PT INVENTORA NUSANTARA TEKNOLOGI',
      planName: 'Enterprise AI & Autonomous Treasury',
      paymentMethod: 'Mastercard •••• 8824'
    }
  ]));

  const [subscription, setSubscription] = useState(() => loadStoredData('inventora_subscription_v2', {
    planId: loadStoredData<SubscriptionTier>('inventora_subscription_plan_v1', 'enterprise'),
    cycle: loadStoredData<'monthly' | 'annual'>('inventora_billing_cycle_v1', 'annual'),
    anchorDate: businessDate(), autoRenew: true, invoices: initialInvoices
  }));
  const [billingCycle, setBillingCycle] = useState(subscription.cycle);
  const currentPlanId = subscription.planId;
  const subscriptionInvoices = subscription.invoices;
  const window = billingWindow(subscription.anchorDate, subscription.cycle, businessDate(), subscription.autoRenew);
  const renewalDate = dateLabel(window.end, lang);
  const quotaReset = dateLabel(billingWindow(subscription.anchorDate, 'monthly', businessDate(), subscription.autoRenew).end, lang);
  const saveSubscription = (next: typeof subscription) => {
    try {
      saveStoredData('inventora_subscription_v2', next, true);
      setSubscription(next);
      return true;
    } catch {
      onToast(lang === 'en' ? 'Subscription could not be saved. No change applied.' : 'Langganan tidak dapat disimpan. Perubahan dibatalkan.', 'error');
      return false;
    }
  };
  useEffect(() => { saveStoredData('inventora_subscription_v2', subscription); }, [subscription]);

  useEffect(() => {
    saveStoredData('inventora_billing_addons_v1', addons);
  }, [addons]);

  useEffect(() => {
    saveStoredData('inventora_billing_pm_v1', paymentMethod);
  }, [paymentMethod]);

  const activePlan = PLANS.find(p => p.id === currentPlanId) || PLANS[2];
  const activePrice = subscription.cycle === 'annual' ? activePlan.annualMonthlyPrice : activePlan.monthlyPrice;

  const handleConfirmPlanChange = (tier: SubscriptionTier) => {
    const newPlan = PLANS.find(p => p.id === tier);
    if (!newPlan) return;
    const today = businessDate();
    const period = billingWindow(today, billingCycle, today);
    const monthlyPrice = billingCycle === 'annual' ? newPlan.annualMonthlyPrice : newPlan.monthlyPrice;
    const newInvoice = {
      id: `INV-SUB-${today.slice(0, 4)}-${crypto.randomUUID().slice(0, 8)}`,
      date: dateLabel(today, lang), total: monthlyPrice * (billingCycle === 'annual' ? 12 : 1),
      period: `${dateLabel(period.start, lang)} – ${dateLabel(period.end, lang)}`,
      status: 'Simulasi', client: 'PT INVENTORA NUSANTARA TEKNOLOGI', planName: newPlan.name,
      paymentMethod: `${paymentMethod.brand} •••• ${paymentMethod.last4}`
    };
    if (!saveSubscription({ planId: tier, cycle: billingCycle, anchorDate: today, autoRenew: true, invoices: [newInvoice, ...subscriptionInvoices] })) return;
    setIsChangePlanOpen(false);
    setSelectedPlanForUpgrade(null);
    onToast(lang === 'en' ? `Simulated plan changed to ${newPlan.name}. No payment charged.` : `Paket simulasi diubah ke ${newPlan.name}. Tidak ada pembayaran ditagih.`, 'success');
  };

  // Handle saving payment method
  const handleSavePaymentMethod = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      try {
        saveStoredData('inventora_billing_pm_v1', pmForm, true);
        setPaymentMethod({ ...pmForm });
        setIsUpdatePmOpen(false);
        onToast(lang === 'en' ? 'Test payment label saved locally.' : 'Label pembayaran uji disimpan lokal.', 'success');
      } catch {
        onToast(lang === 'en' ? 'Test label could not be saved.' : 'Label uji tidak dapat disimpan.', 'error');
      } finally { setIsSubmitting(false); }
    }, 400);
  };

  // Handle downloading subscription invoice as PDF
  const handleDownloadInvoice = (inv: typeof subscriptionInvoices[0]) => {
    downloadInvoicePdf({
      id: inv.id,
      client: inv.client,
      date: inv.date,
      total: inv.total,
      status: inv.status,
      desc: `Inventora Cloud ERP Subscription - ${inv.planName} (${inv.period})`,
      isOverdue: false
    }, lang);

    onToast(
      lang === 'en' ? `Downloaded ${inv.id}.pdf` : `Mengunduh berkas ${inv.id}.pdf`,
      'success'
    );
  };

  return (
    <div className="p-4 md:p-8 flex-1 flex flex-col gap-8 overflow-y-auto max-w-7xl mx-auto w-full">
      {/* Top Header & Context */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-blue-500/10 text-[#0070f3] dark:text-[#3291ff] border border-blue-500/20 uppercase tracking-wider">
              {lang === 'en' ? 'Billing Simulation' : 'Simulasi Tagihan & Langganan'}
            </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            {lang === 'en' ? 'Cloud Subscription & Capacity Management' : 'Kelola Paket Langganan & Kuota Cloud'}
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
            {lang === 'en' 
              ? 'Simulate subscription plans and download sample invoices. Usage figures below are examples; no charges are made.'
              : 'Simulasikan paket langganan dan unduh contoh invoice. Angka penggunaan di bawah adalah contoh; tidak ada pembayaran ditagih.'}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsChangePlanOpen(true)}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#0070f3] hover:bg-[#0060df] text-white transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{lang === 'en' ? 'Change Plan' : 'Ubah Paket'}</span>
          </button>
          <button
            type="button"
            onClick={() => setIsUpdatePmOpen(true)}
            className="px-3.5 py-2 text-xs font-medium rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <CreditCard className="w-3.5 h-3.5 text-neutral-500" />
            <span>{lang === 'en' ? 'Payment Method' : 'Metode Bayar'}</span>
          </button>
        </div>
      </div>

      {/* Hero Active Plan Overview Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Plan Detail Box */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-gradient-to-br from-neutral-900 to-neutral-800 dark:from-[#161616] dark:to-[#0f0f0f] text-white shadow-xl relative overflow-hidden border border-neutral-700/40">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Zap className="w-48 h-48 text-[#0070f3]" />
          </div>

          <div className="relative z-10 space-y-6">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#0070f3] text-white inline-flex items-center gap-1 mb-3">
                  <ShieldCheck className="w-3 h-3" />
                  {activePlan.badge || 'Current Active Tier'}
                </span>
                <h3 className="text-2xl font-bold tracking-tight text-white">{activePlan.name}</h3>
                <p className="text-xs text-neutral-300 mt-1 max-w-lg">{activePlan.description}</p>
              </div>

              <div className="text-right">
                <span className="text-3xl font-extrabold text-white tracking-tight">
                  Rp {activePrice.toLocaleString(numLocale)}
                </span>
                <span className="text-xs text-neutral-400 block mt-0.5">
                  / {lang === 'en' ? 'month' : 'bulan'} {subscription.cycle === 'annual' && (lang === 'en' ? '(annual simulation)' : '(simulasi tahunan)')}
                </span>
              </div>
            </div>

            {/* Quick Specs Pill Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-white/5 backdrop-blur-xs border border-white/10">
                <span className="text-[11px] text-neutral-400 block uppercase font-medium">{lang === 'en' ? 'User Seats' : 'Lisensi Tim'}</span>
                <span className="text-base font-bold text-white mt-0.5 block">{activePlan.userLimit + addons.extraSeats} Seats</span>
              </div>
              <div className="p-3 rounded-xl bg-white/5 backdrop-blur-xs border border-white/10">
                <span className="text-[11px] text-neutral-400 block uppercase font-medium">{lang === 'en' ? 'AI Inferences' : 'AI Copilot'}</span>
                <span className="text-base font-bold text-white mt-0.5 block">{activePlan.aiReportLimit}</span>
              </div>
              <div className="p-3 rounded-xl bg-white/5 backdrop-blur-xs border border-white/10">
                <span className="text-[11px] text-neutral-400 block uppercase font-medium">{lang === 'en' ? 'Doc Storage' : 'Kapasitas Cloud'}</span>
                <span className="text-base font-bold text-white mt-0.5 block">{activePlan.storageGb} GB</span>
              </div>
              <div className="p-3 rounded-xl bg-white/5 backdrop-blur-xs border border-white/10">
                <span className="text-[11px] text-neutral-400 block uppercase font-medium">{lang === 'en' ? 'Example SLA Target' : 'Contoh Target SLA'}</span>
                <span className="text-base font-bold text-emerald-400 mt-0.5 block">99.95% (example)</span>
              </div>
            </div>

            {/* Subscription Renewal Info */}
            <div className="pt-2 flex items-center justify-between text-xs text-neutral-400 border-t border-white/10 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>
                  {lang === 'en' 
                    ? `${subscription.autoRenew ? 'Next simulated renewal' : window.expired ? 'Simulation cycle ended' : 'Simulation paused until'}: ${renewalDate}`
                    : `${subscription.autoRenew ? 'Perpanjangan simulasi berikutnya' : window.expired ? 'Siklus simulasi berakhir' : 'Simulasi dijeda hingga'}: ${renewalDate}`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => { if (subscription.autoRenew) setIsCancelModalOpen(true); else saveSubscription({ ...subscription, autoRenew: true }); }}
                className="text-neutral-400 hover:text-red-400 text-xs underline cursor-pointer"
              >
                {subscription.autoRenew ? (lang === 'en' ? 'Pause simulated renewal' : 'Jeda perpanjangan simulasi') : (lang === 'en' ? 'Resume simulated renewal' : 'Lanjutkan perpanjangan simulasi')}
              </button>
            </div>
          </div>
        </div>

        {/* Payment & Corporate Tax Card */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#151515] border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                {lang === 'en' ? 'Payment Method on File' : 'Metode Pembayaran Aktif'}
              </span>
              <Badge color="gray">{lang === 'en' ? 'Test label' : 'Label uji'}</Badge>
            </div>

            <div className="p-4 rounded-xl bg-neutral-50 dark:bg-[#1e1e1e] border border-neutral-200 dark:border-neutral-800 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-neutral-900 text-white flex items-center justify-center font-bold text-xs">
                {paymentMethod.brand === 'Mastercard' ? 'MC' : 'VISA'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  {paymentMethod.brand} •••• {paymentMethod.last4}
                </p>
                <p className="text-xs text-neutral-500">Expires {paymentMethod.exp} • {paymentMethod.holder}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsUpdatePmOpen(true)}
                className="text-xs text-[#0070f3] dark:text-[#3291ff] hover:underline font-medium cursor-pointer"
              >
                {lang === 'en' ? 'Edit' : 'Ubah'}
              </button>
            </div>

            <div className="text-xs space-y-2 text-neutral-600 dark:text-neutral-400 pt-1">
              <div className="flex justify-between">
                <span>{lang === 'en' ? 'Billing Contact' : 'Kontak Penagihan'}:</span>
                <span className="font-medium text-neutral-800 dark:text-neutral-200">{paymentMethod.billingEmail}</span>
              </div>
              <div className="flex justify-between">
                <span>{lang === 'en' ? 'Tax Identification' : 'Identitas Pajak'}:</span>
                <span className="text-neutral-800 dark:text-neutral-200">{lang === 'en' ? 'Not verified' : 'Belum diverifikasi'}</span>
              </div>
              <div className="flex justify-between">
                <span>{lang === 'en' ? 'Tax Exemption Status' : 'Status Pajak'}:</span>
                <span className="text-neutral-800 dark:text-neutral-200 font-medium">{lang === 'en' ? 'Sample PPN 11%' : 'Contoh PPN 11%'}</span>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-neutral-200 dark:border-neutral-800">
            <button
              type="button"
              onClick={() => setIsAddonModalOpen(true)}
              className="w-full py-2 px-3 text-xs font-semibold rounded-lg bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#0070f3]" />
              <span>{lang === 'en' ? 'Manage Add-on Capacity Packs' : 'Tambah Kuota Ekstra'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Operational Quota Consumption Meters */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[#0070f3]" />
            <span>{lang === 'en' ? 'Example Quota & Capacity Usage' : 'Penggunaan Kuota & Kapasitas Operasional'}</span>
          </h3>
          <span className="text-xs text-neutral-500 font-mono">{lang === 'en' ? 'Quota example resets' : 'Reset contoh kuota'}: {quotaReset}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Active Seats Meter */}
          <div className="p-4 rounded-xl bg-white dark:bg-[#151515] border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-semibold text-neutral-500 uppercase">{lang === 'en' ? 'Team Member Seats' : 'Lisensi Anggota Tim'}</span>
                <h4 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mt-0.5">5 / {activePlan.userLimit + addons.extraSeats}</h4>
              </div>
              <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-[#0070f3]">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="w-full h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
              <div className="h-full rounded-full bg-[#0070f3]" style={{ width: `${Math.min(100, Math.round((5 / (activePlan.userLimit + addons.extraSeats)) * 100))}%` }} />
            </div>
            <span className="text-[11px] text-neutral-500 block">
              {Math.max(0, activePlan.userLimit + addons.extraSeats - 5)} {lang === 'en' ? 'seats available to invite' : 'kursi tersedia untuk diundang'}
            </span>
          </div>

          {/* Monthly Procurement Volume */}
          <div className="p-4 rounded-xl bg-white dark:bg-[#151515] border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-semibold text-neutral-500 uppercase">{lang === 'en' ? 'Monthly PO Flow' : 'Volume Nilai PO Bulanan'}</span>
                <h4 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mt-0.5">Rp 1.48B</h4>
              </div>
              <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
            <div className="w-full h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
              <div className="h-full rounded-full bg-emerald-500" style={{ width: '30%' }} />
            </div>
            <span className="text-[11px] text-neutral-500 block">
              30% {lang === 'en' ? 'of monthly throughput limit' : 'dari batas transaksi bulanan'}
            </span>
          </div>

          {/* AI Executive Summaries */}
          <div className="p-4 rounded-xl bg-white dark:bg-[#151515] border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-semibold text-neutral-500 uppercase">{lang === 'en' ? 'Gemini AI Inferences' : 'Inferensi AI Copilot'}</span>
                <h4 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mt-0.5">
                  142 {activePlan.aiReportLimit === 'Unlimited' ? '/ ∞' : `/ ${activePlan.aiReportLimit}`}
                </h4>
              </div>
              <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <div className="w-full h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
              <div className="h-full rounded-full bg-purple-500" style={{ width: '28%' }} />
            </div>
            <span className="text-[11px] text-neutral-500 block">
              {lang === 'en' ? 'Executive analytics & reorder predictions' : 'Analisis eksekutif & prakiraan reorder'}
            </span>
          </div>

          {/* Cloud Storage */}
          <div className="p-4 rounded-xl bg-white dark:bg-[#151515] border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-semibold text-neutral-500 uppercase">{lang === 'en' ? 'Document Storage' : 'Penyimpanan Dokumen'}</span>
                <h4 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mt-0.5">18.4 / {activePlan.storageGb} GB</h4>
              </div>
              <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600">
                <HardDrive className="w-4 h-4" />
              </div>
            </div>
            <div className="w-full h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
              <div className="h-full rounded-full bg-amber-500" style={{ width: `${Math.min(100, Math.round((18.4 / activePlan.storageGb) * 100))}%` }} />
            </div>
            <span className="text-[11px] text-neutral-500 block">
              {lang === 'en' ? 'PDF vouchers, GRN scans & invoices' : 'Voucher PDF, scan Surat Jalan & faktur'}
            </span>
          </div>
        </div>
      </div>

      {/* Plan Comparison & Tiers */}
      <div className="space-y-6 pt-4 border-t border-neutral-200 dark:border-neutral-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
              {lang === 'en' ? 'Compare Operational Plans' : 'Pilihan Paket Operasional'}
            </h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              {lang === 'en' ? 'Scale your license tier based on headcount, supply chain footprint, and AI automation.' : 'Sesuaikan skala lisensi sesuai jumlah personil, jangkauan gudang, dan otomatisasi AI.'}
            </p>
          </div>

          {/* Monthly vs Annual Toggle */}
          <div className="flex items-center self-start sm:self-auto bg-neutral-100 dark:bg-[#1a1a1a] p-1 rounded-xl border border-neutral-200 dark:border-neutral-800">
            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                billingCycle === 'monthly'
                  ? 'bg-white dark:bg-[#252525] text-neutral-900 dark:text-neutral-100 shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100'
              }`}
            >
              {lang === 'en' ? 'Monthly' : 'Bulanan'}
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('annual')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                billingCycle === 'annual'
                  ? 'bg-white dark:bg-[#252525] text-[#0070f3] dark:text-[#3291ff] shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100'
              }`}
            >
              <span>{lang === 'en' ? 'Annual' : 'Tahunan'}</span>
              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                -20%
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {PLANS.map(plan => {
            const isCurrent = plan.id === currentPlanId && billingCycle === subscription.cycle;
            const price = billingCycle === 'annual' ? plan.annualMonthlyPrice : plan.monthlyPrice;

            return (
              <div 
                key={plan.id}
                className={`p-6 rounded-2xl flex flex-col justify-between transition-all duration-200 ${
                  isCurrent
                    ? 'border-2 border-[#0070f3] bg-blue-50/20 dark:bg-blue-950/10 shadow-lg relative'
                    : 'border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#141414] hover:border-neutral-300 dark:hover:border-neutral-700'
                }`}
              >
                <div className="space-y-4">
                  {/* Top Badge */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                      {plan.name}
                    </span>
                    {isCurrent ? (
                      <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-[#0070f3] text-white">
                        {lang === 'en' ? 'Current Plan' : 'Paket Aktif'}
                      </span>
                    ) : plan.badge ? (
                      <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                        {plan.badge}
                      </span>
                    ) : null}
                  </div>

                  {/* Pricing */}
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-extrabold text-neutral-900 dark:text-neutral-100">
                        Rp {price.toLocaleString(numLocale)}
                      </span>
                      <span className="text-xs text-neutral-500">/ {lang === 'en' ? 'mo' : 'bln'}</span>
                    </div>
                    <p className="text-xs text-neutral-500 mt-1">{plan.description}</p>
                  </div>

                  {/* Features List */}
                  <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800 space-y-2.5">
                    {plan.features.map((feat, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-neutral-700 dark:text-neutral-300">
                        <Check className="w-3.5 h-3.5 text-[#0070f3] shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Plan Action Button */}
                <div className="pt-6 mt-6 border-t border-neutral-200 dark:border-neutral-800">
                  {isCurrent ? (
                    <div
                      className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 select-none flex items-center justify-center gap-1.5 border border-neutral-200 dark:border-neutral-700/60"
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{lang === 'en' ? 'Active Subscription' : 'Paket Langganan Aktif'}</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPlanForUpgrade(plan.id);
                        setIsChangePlanOpen(true);
                      }}
                      className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-neutral-900 dark:bg-white hover:bg-[#0070f3] dark:hover:bg-[#0070f3] text-white dark:text-neutral-900 hover:text-white dark:hover:text-white transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                    >
                      <span>
                        {plan.id === 'enterprise' 
                          ? (lang === 'en' ? 'Upgrade to Enterprise' : 'Tingkatkan ke Enterprise') 
                          : (lang === 'en' ? `Switch to ${plan.name}` : `Beralih ke ${plan.name}`)}
                      </span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Subscription Invoices History Table */}
      <div className="space-y-4 pt-4 border-t border-neutral-200 dark:border-neutral-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#0070f3]" />
              <span>{lang === 'en' ? 'Subscription Invoice Records' : 'Riwayat Invoice Langganan'}</span>
            </h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              {lang === 'en' 
                ? 'Sample PDF invoices for local records. These are not signed tax invoices.'
                : 'Contoh invoice PDF untuk arsip lokal. Dokumen ini bukan faktur pajak bertanda tangan digital.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              exportToJson(`inventora-subscription-invoices-${businessDate()}`, subscriptionInvoices);
              onToast(lang === 'en' ? 'Invoice records exported as JSON.' : 'Riwayat invoice diekspor sebagai JSON.', 'success');
            }}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{lang === 'en' ? 'Export Invoice JSON' : 'Ekspor JSON Invoice'}</span>
          </button>
        </div>

        <TableWrapper>
          <thead>
            <tr>
              <Th>{lang === 'en' ? 'Invoice Reference' : 'Nomor Faktur'}</Th>
              <Th>{lang === 'en' ? 'Billing Period' : 'Periode Langganan'}</Th>
              <Th>{lang === 'en' ? 'Plan Tier' : 'Paket'}</Th>
              <Th>{lang === 'en' ? 'Payment Method' : 'Metode Bayar'}</Th>
              <Th>{lang === 'en' ? 'Amount (IDR)' : 'Total (IDR)'}</Th>
              <Th>{lang === 'en' ? 'Status' : 'Status'}</Th>
              <Th align="right">{lang === 'en' ? 'Document' : 'Dokumen'}</Th>
            </tr>
          </thead>
          <tbody>
            {subscriptionInvoices.map((inv, idx) => (
              <Tr key={inv.id} index={idx}>
                <Td>
                  <span className="font-mono font-semibold text-neutral-900 dark:text-neutral-100 text-xs">
                    {inv.id}
                  </span>
                </Td>
                <Td>
                  <div className="text-xs">
                    <span className="font-medium text-neutral-900 dark:text-neutral-100 block">{inv.period}</span>
                    <span className="text-neutral-500 text-[11px]">{inv.date}</span>
                  </div>
                </Td>
                <Td>
                  <span className="text-xs font-medium text-neutral-800 dark:text-neutral-200">
                    {inv.planName}
                  </span>
                </Td>
                <Td>
                  <span className="text-xs text-neutral-600 dark:text-neutral-400 font-mono">
                    {inv.paymentMethod}
                  </span>
                </Td>
                <Td>
                  <span className="font-mono font-bold text-neutral-900 dark:text-neutral-100 text-xs">
                    Rp {inv.total.toLocaleString(numLocale)}
                  </span>
                </Td>
                <Td>
                  <Badge color="green">{inv.status}</Badge>
                </Td>
                <Td align="right">
                  <button
                    type="button"
                    onClick={() => handleDownloadInvoice(inv)}
                    className="px-2.5 py-1 text-xs font-medium text-[#0070f3] dark:text-[#3291ff] hover:underline bg-blue-50/80 dark:bg-blue-950/30 rounded border border-blue-200/60 dark:border-blue-900/40 transition-colors inline-flex items-center gap-1 cursor-pointer"
                    title={lang === 'en' ? `Directly download ${inv.id}.pdf` : `Unduh langsung berkas ${inv.id}.pdf`}
                  >
                    <Download className="w-3 h-3" />
                    <span>PDF</span>
                  </button>
                </Td>
              </Tr>
            ))}
          </tbody>
        </TableWrapper>
      </div>

      {/* Enterprise Custom SLA Banner */}
      <div className="p-6 rounded-2xl bg-neutral-100 dark:bg-[#181818] border border-neutral-200 dark:border-neutral-800 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center md:text-left">
          <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center justify-center md:justify-start gap-1.5">
            <Building2 className="w-4 h-4 text-[#0070f3]" />
            <span>{lang === 'en' ? 'Need Multi-Entity Holding ERP or Custom Data Residency?' : 'Butuh ERP Konsolidasi Holding atau Data Residency Khusus?'}</span>
          </h4>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 max-w-2xl">
            {lang === 'en'
              ? 'Record requirements for a future implementation. Custom hosting, banking integrations and service agreements require separate setup.'
              : 'Catat kebutuhan untuk implementasi berikutnya. Hosting kustom, integrasi perbankan dan perjanjian layanan memerlukan penyiapan terpisah.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsContactSalesOpen(true)}
          className="px-4 py-2 text-xs font-semibold rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-[#0070f3] dark:hover:bg-[#0070f3] hover:text-white dark:hover:text-white transition-colors cursor-pointer shrink-0"
        >
          {lang === 'en' ? 'Draft Requirements' : 'Draf Kebutuhan'}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: Confirm Plan Upgrade / Change */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isChangePlanOpen}
        onClose={() => {
          setIsChangePlanOpen(false);
          setSelectedPlanForUpgrade(null);
        }}
        title={lang === 'en' ? 'Confirm Plan Modification' : 'Konfirmasi Perubahan Paket'}
      >
        <div className="space-y-5">
          <p className="text-xs text-neutral-600 dark:text-neutral-400">
            {lang === 'en' 
              ? 'Choose a simulated plan. Confirmation starts a new full cycle today; annual invoices cover 12 months. No proration or real charge is performed.'
              : 'Pilih paket simulasi. Konfirmasi memulai siklus penuh hari ini; invoice tahunan mencakup 12 bulan. Tidak ada prorata atau tagihan nyata.'}
          </p>

          <div className="space-y-3">
            {PLANS.map(plan => {
              const isSelected = (selectedPlanForUpgrade || currentPlanId) === plan.id;
              const price = billingCycle === 'annual' ? plan.annualMonthlyPrice : plan.monthlyPrice;

              return (
                <div
                  key={plan.id}
                  onClick={() => setSelectedPlanForUpgrade(plan.id)}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-[#0070f3] bg-blue-50/30 dark:bg-blue-950/20 shadow-xs'
                      : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h5 className="font-bold text-sm text-neutral-900 dark:text-neutral-100">{plan.name}</h5>
                        {plan.id === currentPlanId && (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                            Current
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-500 mt-0.5">{plan.description}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                        Rp {price.toLocaleString(numLocale)}
                      </span>
                      <span className="text-[11px] text-neutral-500 block">/ bln</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-3 rounded-lg bg-neutral-50 dark:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-800 text-[11px] text-neutral-600 dark:text-neutral-400 space-y-1">
            <div className="flex justify-between">
              <span>{lang === 'en' ? 'Current Cycle Terms:' : 'Ketentuan Penagihan:'}</span>
              <span className="font-medium text-neutral-900 dark:text-neutral-100">
                {billingCycle === 'annual' ? (lang === 'en' ? 'Annual (20% Savings)' : 'Tahunan (Hemat 20%)') : (lang === 'en' ? 'Monthly Standard' : 'Bulanan')}
              </span>
            </div>
            <div className="flex justify-between">
              <span>{lang === 'en' ? 'Payment Source:' : 'Sumber Dana:'}</span>
              <span className="font-mono text-neutral-900 dark:text-neutral-100">{paymentMethod.brand} •••• {paymentMethod.last4}</span>
            </div>
          </div>

          <div className="flex gap-2.5 justify-end pt-3 border-t border-neutral-200 dark:border-neutral-800">
            <Button variant="secondary" onClick={() => setIsChangePlanOpen(false)}>
              {activeT.common.cancel}
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                const target = selectedPlanForUpgrade || currentPlanId;
                handleConfirmPlanChange(target);
              }}
            >
              <Check className="w-3.5 h-3.5 mr-1" />
              {lang === 'en' ? 'Confirm & Apply Plan' : 'Konfirmasi & Terapkan Paket'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: Update Payment Method */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isUpdatePmOpen}
        onClose={() => setIsUpdatePmOpen(false)}
        title={lang === 'en' ? 'Update Corporate Payment Method' : 'Perbarui Metode Pembayaran Perusahaan'}
      >
        <form onSubmit={handleSavePaymentMethod} className="space-y-4">
          <p className="text-xs text-neutral-600 dark:text-neutral-400">
            {lang === 'en'
              ? 'Use test details only. This form stores a local payment-method label; no card is verified or charged.'
              : 'Gunakan data uji saja. Formulir ini menyimpan label metode bayar lokal; kartu tidak diverifikasi atau ditagih.'}
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                {lang === 'en' ? 'Last 4 digits (test card)' : '4 digit terakhir (kartu uji)'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={pmForm.last4} maxLength={4} pattern="[0-9]{4}"
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9]/g, '');
                    setPmForm(prev => ({ ...prev, last4: raw.slice(-4) }));
                  }}
                  className="w-full text-xs font-mono py-2 pl-9 pr-3 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#1a1a1a] outline-none focus:border-[#0070f3]"
                  placeholder="8824"
                />
                <CreditCard className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  {lang === 'en' ? 'Expiry Date' : 'Masa Berlaku'}
                </label>
                <input
                  type="text"
                  required
                  value={pmForm.exp}
                  onChange={(e) => setPmForm(prev => ({ ...prev, exp: e.target.value }))}
                  className="w-full text-xs font-mono py-2 px-3 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#1a1a1a] outline-none focus:border-[#0070f3]"
                  placeholder="MM/YY"
                />
              </div>

            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                {lang === 'en' ? 'Cardholder / Entity Name' : 'Nama Pemegang Kartu / Entitas'}
              </label>
              <input
                type="text"
                required
                value={pmForm.holder}
                onChange={(e) => setPmForm(prev => ({ ...prev, holder: e.target.value }))}
                className="w-full text-xs py-2 px-3 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#1a1a1a] outline-none focus:border-[#0070f3]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                {lang === 'en' ? 'AP Billing Email' : 'Email Penagihan Akuntansi (AP)'}
              </label>
              <input
                type="email"
                required
                value={pmForm.billingEmail}
                onChange={(e) => setPmForm(prev => ({ ...prev, billingEmail: e.target.value }))}
                className="w-full text-xs py-2 px-3 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#1a1a1a] outline-none focus:border-[#0070f3]"
              />
            </div>
          </div>

          <div className="flex gap-2.5 justify-end pt-3 border-t border-neutral-200 dark:border-neutral-800">
            <Button variant="secondary" onClick={() => setIsUpdatePmOpen(false)} type="button">
              {activeT.common.cancel}
            </Button>
            <Button variant="primary" type="submit" isLoading={isSubmitting}>
              {lang === 'en' ? 'Save Payment Method' : 'Simpan Metode Pembayaran'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 3: Add-on Packs */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isAddonModalOpen}
        onClose={() => setIsAddonModalOpen(false)}
        title={lang === 'en' ? 'Modular Capacity Add-on Packs' : 'Tambah Paket Kapasitas Modular'}
      >
        <div className="space-y-4">
          <p className="text-xs text-neutral-600 dark:text-neutral-400">
            {lang === 'en'
              ? 'Need more capacity without jumping to a higher tier? Attach monthly modular capacity packs directly to your active billing cycle.'
              : 'Butuh tambahan kuota tanpa harus mengganti paket utama? Tambahkan paket kapasitas modular langsung ke siklus tagihan aktif Anda.'}
          </p>

          <div className="space-y-3">
            {/* Addon 1: Extra 5 Seats */}
            <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
              <div>
                <h5 className="font-semibold text-xs text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#0070f3]" />
                  <span>+5 Additional Team Member Seats</span>
                </h5>
                <p className="text-[11px] text-neutral-500 mt-0.5">Rp 350.000 / month</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAddons(prev => ({ ...prev, extraSeats: Math.max(0, prev.extraSeats - 5) }))}
                  disabled={addons.extraSeats === 0}
                  className="w-7 h-7 rounded-lg border border-neutral-200 dark:border-neutral-800 text-xs font-bold disabled:opacity-40 cursor-pointer"
                >
                  -
                </button>
                <span className="font-mono text-xs font-bold w-6 text-center">{addons.extraSeats}</span>
                <button
                  type="button"
                  onClick={() => setAddons(prev => ({ ...prev, extraSeats: prev.extraSeats + 5 }))}
                  className="w-7 h-7 rounded-lg border border-neutral-200 dark:border-neutral-800 text-xs font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            {/* Addon 2: Dedicated Cloud SQL DB */}
            <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
              <div>
                <h5 className="font-semibold text-xs text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                  <HardDrive className="w-3.5 h-3.5 text-purple-600" />
                  <span>{lang === 'en' ? 'Database capacity example' : 'Contoh kapasitas database'}</span>
                </h5>
                <p className="text-[11px] text-neutral-500 mt-0.5">{lang === 'en' ? 'Rp 1,200,000 / month (simulation; no database provisioned)' : 'Rp 1.200.000 / bulan (simulasi; tidak membuat database)'}</p>
              </div>
              <button
                type="button"
                onClick={() => setAddons(prev => ({ ...prev, dedicatedDatabase: !prev.dedicatedDatabase }))}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  addons.dedicatedDatabase
                    ? 'bg-purple-600 text-white'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                {addons.dedicatedDatabase ? 'Active' : 'Add Pack'}
              </button>
            </div>
          </div>

          <div className="flex gap-2.5 justify-end pt-3 border-t border-neutral-200 dark:border-neutral-800">
            <Button variant="secondary" onClick={() => setIsAddonModalOpen(false)}>
              {activeT.common.cancel}
            </Button>
            <Button variant="primary" onClick={() => {
              setIsAddonModalOpen(false);
              onToast(lang === 'en' ? 'Add-on capacity updated successfully' : 'Kapasitas add-on berhasil diperbarui', 'success');
            }}>
              {lang === 'en' ? 'Save & Apply Changes' : 'Simpan Perubahan'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 4: Inquire Enterprise SLA */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isContactSalesOpen}
        onClose={() => setIsContactSalesOpen(false)}
        title={lang === 'en' ? 'Draft Implementation Requirements' : 'Draf Kebutuhan Implementasi'}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            try {
              saveStoredData('inventora_requirements_draft_v1', salesMessage, true);
              setIsContactSalesOpen(false);
              onToast(
                lang === 'en' 
                  ? 'Requirements draft saved in this browser. No message was sent.'
                  : 'Draf kebutuhan disimpan di browser ini. Tidak ada pesan dikirim.',
                'success'
              );
            } catch {
              onToast(lang === 'en' ? 'Draft could not be saved.' : 'Draf tidak dapat disimpan.', 'error');
            }
          }}
          className="space-y-4"
        >
          <p className="text-xs text-neutral-600 dark:text-neutral-400">
            {lang === 'en'
              ? 'Keep a local draft of your headcount, expected PO volume and integration requirements. This form does not contact a sales team.'
              : 'Simpan draf lokal jumlah personel, estimasi volume PO dan kebutuhan integrasi. Formulir ini tidak menghubungi tim penjualan.'
            }
          </p>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              {lang === 'en' ? 'Requirements & Scope' : 'Kebutuhan Spesifik'}
            </label>
            <textarea
              required
              rows={4}
              value={salesMessage}
              onChange={(e) => setSalesMessage(e.target.value)}
              placeholder={lang === 'en' ? 'e.g. 500+ employees across 3 subsidiaries, custom host-to-host bank disbursement with Mandiri, and on-premise staging.' : 'Contoh: 500+ karyawan di 3 anak perusahaan, integrasi H2H Mandiri, dan kepatuhan audit BPK.'}
              className="w-full text-xs p-3 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#1a1a1a] outline-none focus:border-[#0070f3]"
            />
          </div>

          <div className="flex gap-2.5 justify-end pt-3 border-t border-neutral-200 dark:border-neutral-800">
            <Button variant="secondary" onClick={() => setIsContactSalesOpen(false)} type="button">
              {activeT.common.cancel}
            </Button>
            <Button variant="primary" type="submit" isLoading={isSubmitting}>
              {lang === 'en' ? 'Save Local Draft' : 'Simpan Draf Lokal'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 5: Cancel / Pause Subscription Confirmation */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title={lang === 'en' ? 'Subscription Cancellation Policy' : 'Ketentuan Pembatalan Langganan'}
      >
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold mb-0.5">
                {lang === 'en' ? `Simulation cycle ends ${renewalDate}` : `Siklus simulasi berakhir ${renewalDate}`}
              </p>
              <p className="text-[11px] leading-relaxed">
                {lang === 'en'
                  ? 'Pausing stops the simulated cycle from renewing. Local records and module access are preserved. No subscription charges are made.'
                  : 'Jeda menghentikan perpanjangan siklus simulasi. Catatan lokal dan akses modul tetap tersedia. Tidak ada biaya langganan ditagih.'}
              </p>
            </div>
          </div>

          <div className="flex gap-2.5 justify-end pt-3 border-t border-neutral-200 dark:border-neutral-800">
            <Button variant="secondary" onClick={() => setIsCancelModalOpen(false)}>
              {lang === 'en' ? 'Keep Subscription Active' : 'Pertahankan Langganan'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                if (!saveSubscription({ ...subscription, autoRenew: false, anchorDate: window.start })) return;
                setIsCancelModalOpen(false);
                onToast(
                  lang === 'en' ? `Simulated renewal paused until ${renewalDate}.` : `Perpanjangan simulasi dijeda hingga ${renewalDate}.`,
                  'info'
                );
              }}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
            >
              {lang === 'en' ? 'Confirm Pause Auto-Renewal' : 'Jeda Perpanjangan Otomatis'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
