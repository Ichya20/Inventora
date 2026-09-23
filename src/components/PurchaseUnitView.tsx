import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles, FileText, Plus, Trash2, CheckCircle2, Calculator, Percent, ArrowLeft, Building2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Button } from './UI';
import { translations, Language, Translations } from '../i18n';
import { SmartInvoiceParserModal, ParsedInvoiceData } from './SmartInvoiceParserModal';
import { checkDepartmentBudgetLimit } from './DepartmentBudgetCard';
import { POLineItem, ToastType, AppNotification, PurchaseOrder } from '../types';
import { loadStoredData, saveStoredData } from '../lib/storageUtils';

interface PurchaseUnitViewProps {
  onNavigate: (menu: string) => void;
  onToast?: (msg: string, type?: ToastType, options?: { title?: string; actionLabel?: string; onAction?: () => void }) => void;
  onNotify?: (n: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void;
  t?: Translations;
  lang?: Language;
}

interface RequisitionItem {
  id: string;
  sku: string;
  name: string;
  qty: number;
  unitPrice: number;
  total: number;
}

const POPULAR_CATALOG = [
  { sku: 'NV-H100-TC', name: 'NVIDIA H100 Tensor Core GPU', unitPrice: 450000000, vendor: 'nvidia' },
  { sku: 'RS-W1-PRO', name: 'Rack Server Web Infrastructure', unitPrice: 120000000, vendor: 'dell' },
  { sku: 'NV-4090-FE', name: 'NVIDIA RTX 4090 Founders Edition', unitPrice: 32000000, vendor: 'nvidia' },
  { sku: 'SW-10GBE-L3', name: '10GbE Network L3 Managed Switch', unitPrice: 45000000, vendor: 'cisco' },
  { sku: 'STR-NVME-8TB', name: '8TB NVMe Enterprise Storage', unitPrice: 18000000, vendor: 'dell' },
  { sku: 'UPS-3KVA-RT', name: '3kVA Rackmount UPS', unitPrice: 28000000, vendor: 'cisco' },
  { sku: 'FW-NGFW-10G', name: 'Next-Gen Firewall 10Gbps', unitPrice: 165000000, vendor: 'cisco' },
];

export function PurchaseUnitView({ 
  onNavigate, 
  onToast, 
  onNotify, 
  t, 
  lang = 'en' 
}: PurchaseUnitViewProps) {
  const activeT = t || translations[lang] || translations.en;
  const numLocale = lang === 'en' ? 'en-US' : 'id-ID';

  const [step, setStep] = useState<'form' | 'success'>('form');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAiParserOpen, setIsAiParserOpen] = useState(false);
  const [createdPoNumber, setCreatedPoNumber] = useState('');

  // Form states
  const [department, setDepartment] = useState('IT Infrastructure');
  const [vendor, setVendor] = useState('nvidia');
  const [deliveryDate, setDeliveryDate] = useState('2026-09-15');
  const [notes, setNotes] = useState('');

  // Multi-line items
  const [items, setItems] = useState<RequisitionItem[]>([
    {
      id: 'item-1',
      sku: 'NV-H100-TC',
      name: 'NVIDIA H100 Tensor Core GPU',
      qty: 2,
      unitPrice: 450000000,
      total: 900000000
    }
  ]);

  // Tax and discount toggles
  const [applyVat, setApplyVat] = useState(true); // PPN 11%
  const [applyPph, setApplyPph] = useState(false); // PPh 22 (1.5%)
  const [discountPercent, setDiscountPercent] = useState<number>(0);

  // Financial calculations
  const subtotal = items.reduce((acc, it) => acc + (it.qty * it.unitPrice), 0);
  const discountAmount = Math.round((subtotal * discountPercent) / 100);
  const netSubtotal = Math.max(0, subtotal - discountAmount);
  const vatAmount = applyVat ? Math.round(netSubtotal * 0.11) : 0;
  const pphAmount = applyPph ? Math.round(netSubtotal * 0.015) : 0;
  const grandTotal = netSubtotal + vatAmount - pphAmount;

  // Real-time Department Budget Check
  const budgetCheck = checkDepartmentBudgetLimit(department, grandTotal);

  const handleAddItem = () => {
    const newItem: RequisitionItem = {
      id: `item-${Date.now()}`,
      sku: '',
      name: '',
      qty: 1,
      unitPrice: 0,
      total: 0
    };
    setItems(prev => [...prev, newItem]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const handleItemChange = (id: string, field: keyof RequisitionItem, value: any) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value };
      if (field === 'qty' || field === 'unitPrice') {
        const q = field === 'qty' ? Number(value) : item.qty;
        const p = field === 'unitPrice' ? Number(value) : item.unitPrice;
        updated.total = (isNaN(q) ? 0 : q) * (isNaN(p) ? 0 : p);
      }
      return updated;
    }));
  };

  const handleSelectCatalogItem = (rowId: string, sku: string) => {
    const cat = POPULAR_CATALOG.find(c => c.sku === sku);
    if (!cat) return;
    setItems(prev => prev.map(item => {
      if (item.id !== rowId) return item;
      return {
        ...item,
        sku: cat.sku,
        name: cat.name,
        unitPrice: cat.unitPrice,
        total: item.qty * cat.unitPrice
      };
    }));
    if (cat.vendor && !vendor) {
      setVendor(cat.vendor);
    }
  };

  const handleApplyAiInvoice = (data: ParsedInvoiceData) => {
    if (data.vendor) {
      const vLower = data.vendor.toLowerCase();
      if (vLower.includes('cisco')) setVendor('cisco');
      else if (vLower.includes('dell')) setVendor('dell');
      else if (vLower.includes('nvidia')) setVendor('nvidia');
      else setVendor('nvidia');
    }

    if (data.items && data.items.length > 0) {
      const mapped: RequisitionItem[] = data.items.map((it, idx) => ({
        id: `ai-item-${idx}-${Date.now()}`,
        sku: it.name.substring(0, 14).toUpperCase(),
        name: it.name,
        qty: it.qty || 1,
        unitPrice: it.unitPrice || 0,
        total: (it.qty || 1) * (it.unitPrice || 0)
      }));
      setItems(mapped);
    }

    if (data.taxAmount && data.taxAmount > 0) {
      setApplyVat(true);
    }

    const noteLines = [
      data.notes || '',
      `[AI Extracted Requisition: Ref #${data.invoiceNo || 'DRAFT'}]`,
      `Extracted Line Items: ${data.items?.length || 0}`,
      `Total Quoted: Rp ${data.grandTotal?.toLocaleString('id-ID') || 0}`
    ].filter(Boolean).join('\n');
    setNotes(noteLines);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Generate department code prefix
    const deptPrefix = department.includes('IT') ? 'IT' : department.includes('Operations') ? 'OPS' : department.includes('Engineering') ? 'RND' : 'GA';
    const randomSeq = Math.floor(1000 + Math.random() * 9000);
    const newPoId = `PO-2026-${deptPrefix}-${randomSeq}`;
    setCreatedPoNumber(newPoId);

    const vendorName = vendor === 'nvidia' ? 'NVIDIA Corp Indonesia'
      : vendor === 'cisco' ? 'Cisco Systems Indonesia'
      : vendor === 'dell' ? 'Dell EMC Indonesia'
      : vendor;

    const formattedDate = new Date().toLocaleDateString(lang === 'en' ? 'en-US' : 'id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    const newPo: PurchaseOrder = {
      id: newPoId,
      vendor: vendorName,
      desc: notes ? notes.split('\n')[0] : `${department} Requisition (${items.length} items)`,
      date: formattedDate,
      total: grandTotal,
      subtotal,
      discountAmount,
      taxAmount: vatAmount,
      withholdingTaxAmount: pphAmount,
      status: 'Pending Approval',
      color: 'orange',
      department: department as any,
      threeWayMatchStatus: 'PENDING_RECEIPT',
      items: items.map((it, idx) => ({
        id: `li-${Date.now()}-${idx}`,
        sku: it.sku,
        name: it.name,
        qty: it.qty,
        unitPrice: it.unitPrice,
        subtotal: it.total
      })),
      lineItems: items.map((it, idx) => ({
        id: `li-${Date.now()}-${idx}`,
        sku: it.sku,
        name: it.name,
        qty: it.qty,
        unitPrice: it.unitPrice,
        totalPrice: it.total
      }))
    };

    // 1. Immediately persist to localStorage so ProcurementView and all tables reflect it
    try {
      const existing = loadStoredData<PurchaseOrder[]>('inventora_procurement_pos_v1', []);
      saveStoredData('inventora_procurement_pos_v1', [newPo, ...existing]);
      window.dispatchEvent(new CustomEvent('inventora_po_created', { detail: newPo }));
    } catch (err) {
      console.warn("Local storage write error:", err);
    }

    // 2. Sync to Firebase Firestore if connected
    try {
      const { db } = await import('../firebase');
      const { setDoc, doc } = await import('firebase/firestore');
      await setDoc(doc(db, 'purchaseOrders', newPo.id), newPo);
    } catch (err) {
      console.warn("Firestore sync skipped:", err);
    }

    // 3. User feedback toast & notification
    if (onToast) {
      onToast(
        lang === 'en' 
          ? `Purchase Order ${newPoId} created successfully! Total: Rp ${grandTotal.toLocaleString('en-US')}` 
          : `Purchase Order ${newPoId} berhasil diajukan! Total: Rp ${grandTotal.toLocaleString('id-ID')}`, 
        'success',
        {
          title: lang === 'en' ? 'New PO Submitted' : 'PO Berhasil Diajukan',
          actionLabel: lang === 'en' ? 'Track Status' : 'Lacak Status',
          onAction: () => onNavigate('po')
        }
      );
    }

    if (onNotify) {
      onNotify({
        title: lang === 'en' ? 'New Purchase Order Created' : 'Purchase Order Baru Diajukan',
        message: lang === 'en' 
          ? `PO ${newPoId} totaling Rp ${grandTotal.toLocaleString('en-US')} for ${vendorName} is pending approval.`
          : `PO ${newPoId} senilai Rp ${grandTotal.toLocaleString('id-ID')} untuk ${vendorName} menunggu persetujuan.`,
        type: 'approval',
        metadata: {
          poId: newPoId,
          amount: grandTotal,
          vendor: vendorName
        }
      });
    }

    setTimeout(() => {
      setIsSubmitting(false);
      setStep('success');
    }, 600);
  };

  if (step === 'success') {
    return (
      <section className="p-4 md:p-8 flex-1 flex flex-col items-center justify-center overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="bg-white dark:bg-[#111] p-8 rounded-xl shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_4px_16px_rgba(0,0,0,0.04)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08)] text-center max-w-md w-full"
        >
          <div className="w-12 h-12 rounded-full bg-[#10b981]/10 flex items-center justify-center text-[#10b981] mx-auto mb-4">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-semibold tracking-tight text-[#171717] dark:text-[#ededed] mb-2">
            {activeT.purchase.confirmedTitle}
          </h2>
          <p className="text-sm text-[#666] dark:text-[#a1a1aa] mb-4">
            {activeT.purchase.confirmedDesc}{' '}
            <span className="font-mono text-[#0070f3] dark:text-[#3291ff] font-bold block text-base mt-1">
              {createdPoNumber || 'PO-2026-IT-1043'}
            </span>
          </p>

          <div className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-3 text-xs mb-6 text-left space-y-1.5">
            <div className="flex justify-between">
              <span className="text-neutral-500">{lang === 'en' ? 'Cost Center:' : 'Pusat Biaya:'}</span>
              <span className="font-medium text-neutral-800 dark:text-neutral-200">{department}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">{lang === 'en' ? 'Line Items:' : 'Item Barang:'}</span>
              <span className="font-medium text-neutral-800 dark:text-neutral-200">{items.length} items</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">{lang === 'en' ? 'Grand Total:' : 'Total Nilai:'}</span>
              <span className="font-mono font-bold text-neutral-900 dark:text-neutral-100">
                Rp {grandTotal.toLocaleString(numLocale)}
              </span>
            </div>
            <div className="flex justify-between pt-1 border-t border-neutral-200 dark:border-neutral-800">
              <span className="text-neutral-500">{lang === 'en' ? '3-Way Match Status:' : 'Status 3-Way Match:'}</span>
              <span className="text-amber-600 font-semibold">{lang === 'en' ? 'Awaiting GRN Receipt' : 'Menunggu Penerimaan GRN'}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <Button onClick={() => onNavigate('po')} variant="primary" className="flex-1">
              {lang === 'en' ? 'Return to Procurement' : 'Kembali ke Pengadaan'}
            </Button>
            <Button onClick={() => { setStep('form'); setItems([{ id: 'item-1', sku: '', name: '', qty: 1, unitPrice: 0, total: 0 }]); }} variant="secondary">
              {lang === 'en' ? 'New Requisition' : 'Buat Baru'}
            </Button>
          </div>
        </motion.div>
      </section>
    );
  }

  return (
    <section className="p-4 md:p-8 flex-1 flex flex-col overflow-y-auto">
      <div className="flex items-center justify-between mb-6 shrink-0 flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => onNavigate('po')} 
            className="text-[#666] dark:text-[#a1a1aa] hover:text-[#171717] dark:hover:text-[#ededed] transition-colors shadow-[0_0_0_1px_rgba(0,0,0,0.08)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.1)] bg-white dark:bg-[#1a1a1a] w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#fafafa] dark:hover:bg-[#333] cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-[#171717] dark:text-[#ededed]">
              {lang === 'en' ? 'Multi-Line Purchase Requisition Builder' : 'Penyusun Formulir Pengadaan Multi-Baris'}
            </h2>
            <p className="text-xs text-[#666] dark:text-[#a1a1aa] mt-0.5">
              {lang === 'en' ? 'Draft purchase orders with automated tax calculation, budget ceiling verification, and live catalog' : 'Susun PO dengan kalkulasi PPN/PPh otomatis, validasi plafon anggaran, dan katalog terpadu'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsAiParserOpen(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-linear-to-r from-[#0070f3] to-indigo-600 hover:from-[#0060df] hover:to-indigo-700 text-white text-xs font-semibold shadow-xs cursor-pointer transition-all hover:shadow"
        >
          <Sparkles className="w-4 h-4" />
          <span>{lang === 'en' ? 'AI Auto-Fill from Quote / Invoice' : 'AI Ekstrak dari Dokumen / Quote'}</span>
        </button>
      </div>

      <div className="max-w-5xl space-y-6">
        {/* Real-time Department Budget Ceiling Indicator */}
        <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
          budgetCheck.isExceeded
            ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
            : budgetCheck.isNearCap
            ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
            : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
        }`}>
          <div className="flex items-center gap-3">
            {budgetCheck.isExceeded ? (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            ) : budgetCheck.isNearCap ? (
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            ) : (
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            )}
            <div>
              <div className="font-semibold text-xs flex items-center gap-2">
                <span>{budgetCheck.departmentBudget?.name} ({budgetCheck.departmentBudget?.quarter})</span>
                <span className="font-mono text-[10px] uppercase px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10">
                  {budgetCheck.departmentBudget?.code}
                </span>
              </div>
              <p className="text-[11px] opacity-90 mt-0.5">
                {budgetCheck.isExceeded
                  ? (lang === 'en' ? `Requisition total of Rp ${grandTotal.toLocaleString(numLocale)} exceeds remaining budget by Rp ${(grandTotal - budgetCheck.availableBefore).toLocaleString(numLocale)}!` : `Total pengadaan Rp ${grandTotal.toLocaleString(numLocale)} melebihi sisa plafon anggaran sebesar Rp ${(grandTotal - budgetCheck.availableBefore).toLocaleString(numLocale)}!`)
                  : (lang === 'en' ? `Available budget before PO: Rp ${(budgetCheck.availableBefore).toLocaleString(numLocale)} • Projected utilization: ${budgetCheck.projectedPercentage}%` : `Sisa anggaran sebelum PO: Rp ${(budgetCheck.availableBefore).toLocaleString(numLocale)} • Proyeksi pemakaian: ${budgetCheck.projectedPercentage}%`)}
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="text-xs font-mono font-bold">
              {budgetCheck.projectedPercentage}% {lang === 'en' ? 'Used' : 'Terpakai'}
            </span>
            <div className="w-32 bg-black/10 dark:bg-white/10 h-1.5 rounded-full overflow-hidden mt-1">
              <div
                className={`h-full ${budgetCheck.isExceeded ? 'bg-rose-500' : budgetCheck.isNearCap ? 'bg-amber-500' : 'bg-emerald-500'}`}
                style={{ width: `${Math.min(100, budgetCheck.projectedPercentage)}%` }}
              />
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Header Metadata Section */}
          <div className="bg-white dark:bg-[#111] p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  {lang === 'en' ? 'Charging Department (Cost Center)' : 'Departemen Pengaju (Cost Center)'}
                </label>
                <div className="relative">
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs px-3 py-2 rounded-lg outline-none focus:border-[#0070f3] text-neutral-800 dark:text-neutral-200"
                  >
                    <option value="IT Infrastructure">IT Infrastructure (CC-101-IT)</option>
                    <option value="Operations & Logistics">Operations & Logistics (CC-202-OPS)</option>
                    <option value="Engineering & R&D">Engineering & R&D (CC-303-RND)</option>
                    <option value="HR & GA">HR & GA (CC-404-HR)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  {activeT.purchase.vendorLabel}
                </label>
                <select
                  required
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                  className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs px-3 py-2 rounded-lg outline-none focus:border-[#0070f3] text-neutral-800 dark:text-neutral-200 cursor-pointer"
                >
                  <option value="nvidia">NVIDIA Corp Indonesia (Tier-1 AI Partner)</option>
                  <option value="cisco">Cisco Systems Indonesia (Enterprise Network)</option>
                  <option value="dell">Dell EMC Indonesia (Server & Storage)</option>
                  <option value="lenovo">Lenovo Enterprise Solution</option>
                  <option value="apc">APC by Schneider Electric</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  {lang === 'en' ? 'Target Delivery Date' : 'Target Tanggal Kirim'}
                </label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs px-3 py-2 rounded-lg outline-none focus:border-[#0070f3] text-neutral-800 dark:text-neutral-200"
                />
              </div>
            </div>
          </div>

          {/* Multi-Line Items Table */}
          <div className="bg-white dark:bg-[#111] rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 bg-neutral-50 dark:bg-neutral-900/60 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-[#0070f3]" />
                  <span>{lang === 'en' ? 'Requisition Line Items' : 'Daftar Rincian Item Barang'}</span>
                </h3>
                <p className="text-[11px] text-neutral-500">
                  {lang === 'en' ? 'Select SKU from hardware catalog or enter custom description' : 'Pilih SKU dari katalog perangkat atau masukkan rincian kustom'}
                </p>
              </div>
              <Button type="button" variant="secondary" onClick={handleAddItem} className="text-xs h-8">
                <Plus className="w-3.5 h-3.5" />
                <span>{lang === 'en' ? 'Add Row' : 'Tambah Baris'}</span>
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-neutral-100/50 dark:bg-neutral-900/40 text-neutral-600 dark:text-neutral-400 font-semibold border-b border-neutral-200 dark:border-neutral-800">
                    <th className="py-2.5 px-3 w-12 text-center">#</th>
                    <th className="py-2.5 px-3 min-w-[200px]">{lang === 'en' ? 'Item SKU & Description' : 'SKU & Deskripsi Barang'}</th>
                    <th className="py-2.5 px-3 w-28">{lang === 'en' ? 'Qty' : 'Jumlah'}</th>
                    <th className="py-2.5 px-3 w-40">{lang === 'en' ? 'Unit Price (Rp)' : 'Harga Satuan (Rp)'}</th>
                    <th className="py-2.5 px-3 w-44 text-right">{lang === 'en' ? 'Subtotal (Rp)' : 'Total (Rp)'}</th>
                    <th className="py-2.5 px-3 w-12 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                  {items.map((row, index) => (
                    <tr key={row.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-900/20">
                      <td className="py-2.5 px-3 text-center text-neutral-400 font-mono">
                        {index + 1}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="space-y-1.5">
                          <div className="flex gap-2">
                            <select
                              onChange={(e) => handleSelectCatalogItem(row.id, e.target.value)}
                              defaultValue=""
                              className="text-[11px] bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded px-2 py-1 outline-none text-neutral-600 dark:text-neutral-400 cursor-pointer"
                            >
                              <option value="">{lang === 'en' ? '— Quick Catalog Autocomplete —' : '— Pilih dari Katalog Cepat —'}</option>
                              {POPULAR_CATALOG.map(c => (
                                <option key={c.sku} value={c.sku}>
                                  {c.sku} - {c.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <input
                              type="text"
                              required
                              value={row.sku}
                              onChange={(e) => handleItemChange(row.id, 'sku', e.target.value)}
                              placeholder="SKU (e.g. NV-H100)"
                              className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded px-2.5 py-1.5 font-mono text-xs outline-none focus:border-[#0070f3]"
                            />
                            <input
                              type="text"
                              required
                              value={row.name}
                              onChange={(e) => handleItemChange(row.id, 'name', e.target.value)}
                              placeholder="Item Name / Description"
                              className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded px-2.5 py-1.5 text-xs outline-none focus:border-[#0070f3]"
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 align-top">
                        <input
                          type="number"
                          min="1"
                          required
                          value={row.qty}
                          onChange={(e) => handleItemChange(row.id, 'qty', e.target.value)}
                          className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded px-2.5 py-1.5 text-xs outline-none focus:border-[#0070f3] font-mono"
                        />
                      </td>
                      <td className="py-2.5 px-3 align-top">
                        <input
                          type="number"
                          min="0"
                          step="10000"
                          required
                          value={row.unitPrice}
                          onChange={(e) => handleItemChange(row.id, 'unitPrice', e.target.value)}
                          className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded px-2.5 py-1.5 text-xs outline-none focus:border-[#0070f3] font-mono"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-right align-top font-mono font-semibold text-neutral-800 dark:text-neutral-200">
                        Rp {row.total.toLocaleString(numLocale)}
                      </td>
                      <td className="py-2.5 px-3 text-center align-top">
                        <button
                          type="button"
                          disabled={items.length <= 1}
                          onClick={() => handleRemoveItem(row.id)}
                          className="text-neutral-400 hover:text-rose-600 disabled:opacity-30 disabled:hover:text-neutral-400 transition-colors p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Summary & Tax Toggles */}
            <div className="p-5 bg-neutral-50/70 dark:bg-neutral-900/40 border-t border-neutral-200 dark:border-neutral-800 flex flex-col md:flex-row gap-6 justify-between">
              <div className="space-y-3 max-w-sm">
                <span className="font-semibold text-xs text-neutral-800 dark:text-neutral-200 block">
                  {lang === 'en' ? 'Tax Configuration (Indonesian Fiscal)' : 'Ketentuan Pajak & Diskon'}
                </span>
                <div className="space-y-2">
                  <label className="flex items-center gap-2.5 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={applyVat}
                      onChange={(e) => setApplyVat(e.target.checked)}
                      className="rounded text-[#0070f3] focus:ring-[#0070f3]"
                    />
                    <span className="text-neutral-700 dark:text-neutral-300">
                      {lang === 'en' ? 'PPN 11% (Indonesian Value Added Tax)' : 'PPN 11% (Pajak Pertambahan Nilai)'}
                    </span>
                  </label>
                  <label className="flex items-center gap-2.5 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={applyPph}
                      onChange={(e) => setApplyPph(e.target.checked)}
                      className="rounded text-[#0070f3] focus:ring-[#0070f3]"
                    />
                    <span className="text-neutral-700 dark:text-neutral-300">
                      {lang === 'en' ? 'PPh 22 / 23 Withholding (1.5%)' : 'PPh Pasal 22/23 Pemotongan (1,5%)'}
                    </span>
                  </label>
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-xs text-neutral-600 dark:text-neutral-400">
                      {lang === 'en' ? 'Volume Discount (%):' : 'Diskon Volume (%):'}
                    </span>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={discountPercent}
                      onChange={(e) => setDiscountPercent(Number(e.target.value) || 0)}
                      className="w-16 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded px-2 py-0.5 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="w-full md:w-80 space-y-2 text-xs">
                <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                  <span>Subtotal:</span>
                  <span className="font-mono">Rp {subtotal.toLocaleString(numLocale)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span>Discount ({discountPercent}%):</span>
                    <span className="font-mono">- Rp {discountAmount.toLocaleString(numLocale)}</span>
                  </div>
                )}
                {applyVat && (
                  <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                    <span>PPN 11%:</span>
                    <span className="font-mono">+ Rp {vatAmount.toLocaleString(numLocale)}</span>
                  </div>
                )}
                {applyPph && (
                  <div className="flex justify-between text-blue-600 dark:text-blue-400">
                    <span>PPh 22 (1.5% Withholding):</span>
                    <span className="font-mono">- Rp {pphAmount.toLocaleString(numLocale)}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800 flex justify-between text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  <span>{lang === 'en' ? 'Grand Total:' : 'Total Akhir:'}</span>
                  <span className="font-mono text-base text-[#0070f3] dark:text-[#3291ff]">
                    Rp {grandTotal.toLocaleString(numLocale)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes and Submissions */}
          <div className="bg-white dark:bg-[#111] p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-3">
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              {activeT.purchase.notesLabel}
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={activeT.purchase.notesPlaceholder}
              className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-3 text-xs outline-none focus:border-[#0070f3] text-neutral-800 dark:text-neutral-200 resize-none font-mono"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button onClick={() => onNavigate('po')} variant="secondary" type="button">
              {activeT.purchase.cancelBtn}
            </Button>
            <Button type="submit" disabled={isSubmitting || items.length === 0} variant="primary">
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {activeT.purchase.processing}
                </div>
              ) : (
                lang === 'en' ? 'Submit Requisition & Issue PO' : 'Ajukan Pengadaan & Terbitkan PO'
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* AI Quote / Invoice Parser Modal */}
      <SmartInvoiceParserModal
        isOpen={isAiParserOpen}
        onClose={() => setIsAiParserOpen(false)}
        onApply={handleApplyAiInvoice}
        lang={lang}
      />
    </section>
  );
}
export default PurchaseUnitView;
