import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CreditCard, CheckCircle2, Printer, History, Layers, FileText, PackageCheck, AlertTriangle, Plus } from 'lucide-react';
import { Card, Badge, Button, TableWrapper, Th, Td, Tr, Modal } from './UI';
import { ToastType, PaymentTransaction, AppNotification, PurchaseOrder, GoodsReceiptNote, ThreeWayMatchStatus } from '../types';
import { translations, Language, Translations } from '../i18n';
import { useDebounce } from '../lib/useDebounce';
import { loadStoredData, saveStoredData } from '../lib/storageUtils';
import { AuditTrailDrawer } from './AuditTrailDrawer';
import { PrintableVoucher } from './PrintableVoucher';
import { VirtualizedTable, Column } from './VirtualizedTable';
import { PoRiskCard } from './PoRiskCard';
import { ThreeWayMatchModal } from './ThreeWayMatchModal';
import { checkDepartmentBudgetLimit } from './DepartmentBudgetCard';

const PaymentGatewayModal = lazy(() => import('./PaymentGatewayModal').then(m => ({ default: m.PaymentGatewayModal })));

interface ProcurementViewProps {
  onNavigate: (menu: string) => void;
  onToast: (msg: string, type?: ToastType) => void;
  onNotify?: (n: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void;
  t?: Translations;
  lang?: Language;
  isOnline?: boolean;
  onQueueOffline?: (mutation: any) => void;
}

export function ProcurementView({ 
  onNavigate, 
  onToast,
  onNotify,
  t,
  lang = 'en',
  isOnline = true,
  onQueueOffline
}: ProcurementViewProps) {
  const activeT = t || translations[lang] || translations.en;
  const numLocale = lang === 'en' ? 'en-US' : 'id-ID';

  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'kanban' | 'transactions'>('list');
  const [selectedPoForPayment, setSelectedPoForPayment] = useState<any | null>(null);
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [auditPoFilter, setAuditPoFilter] = useState<string | null>(null);
  const [poForPrint, setPoForPrint] = useState<PurchaseOrder | null>(null);
  const [isVirtualized, setIsVirtualized] = useState(false);
  const [threeWayPo, setThreeWayPo] = useState<PurchaseOrder | null>(null);
  
  const [transactions, setTransactions] = useState<PaymentTransaction[]>(() => {
    const saved = localStorage.getItem('inventora_po_transactions');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return [
      {
        id: 'TX-INVENTORA-8891',
        poId: 'PO-2026-1039',
        vendor: 'Lenovo Enterprise',
        amount: 450000000,
        taxAmount: 49500000,
        totalPaid: 499500000,
        method: 'virtual_account',
        methodLabel: 'MANDIRI Virtual Account',
        accountReference: '8902 2189 1039 504',
        status: 'SUCCESS',
        timestamp: '2026-08-12T10:30:00Z',
        receiptNumber: 'INV/PAY/2026/819201',
        notes: 'Pelunasan Pengadaan Server Cluster Lenovo'
      },
      {
        id: 'TX-INVENTORA-8890',
        poId: 'PO-2026-1038',
        vendor: 'APC by Schneider',
        amount: 320000000,
        taxAmount: 35200000,
        totalPaid: 355200000,
        method: 'bank_transfer',
        methodLabel: 'Corporate Wire / RTGS',
        accountReference: 'BCA Corporate Operating',
        status: 'SUCCESS',
        timestamp: '2026-08-10T14:15:00Z',
        receiptNumber: 'INV/PAY/2026/818104',
        notes: 'Pembayaran Pengadaan Power Infra APC'
      }
    ];
  });

  const defaultPOs = [
    {
      id: 'PO-2026-1042',
      vendor: 'NVIDIA Corp Indonesia',
      desc: lang === 'en' ? 'Primary Supplier - AI Cluster' : 'Supplier Utama - AI Cluster',
      date: '22 Aug 2026',
      total: 2100000000,
      status: 'Pending Approval',
      color: 'orange',
      department: 'IT Infrastructure',
      threeWayMatchStatus: 'PENDING_RECEIPT',
      lineItems: [
        { id: 'li-1', sku: 'NV-H100-TC', name: 'NVIDIA H100 Tensor Core GPU 80GB', qty: 4, unitPrice: 450000000, totalPrice: 1800000000 },
        { id: 'li-2', sku: 'NV-CONNECTX-7', name: 'NVIDIA ConnectX-7 400Gb/s InfiniBand', qty: 4, unitPrice: 75000000, totalPrice: 300000000 }
      ]
    },
    {
      id: 'PO-2026-1041',
      vendor: 'Cisco Systems Indonesia',
      desc: lang === 'en' ? 'Networking Vendor' : 'Networking Vendor',
      date: '18 Aug 2026',
      total: 850000000,
      status: 'Disetujui',
      color: 'green',
      department: 'IT Infrastructure',
      threeWayMatchStatus: 'MATCHED',
      lineItems: [
        { id: 'li-3', sku: 'SW-10GBE-L3', name: '10GbE Network L3 Managed Switch', qty: 10, unitPrice: 45000000, totalPrice: 450000000 },
        { id: 'li-4', sku: 'FW-NGFW-10G', name: 'Next-Gen Firewall 10Gbps Core', qty: 2, unitPrice: 200000000, totalPrice: 400000000 }
      ]
    },
    {
      id: 'PO-2026-1040',
      vendor: 'Dell EMC Indonesia',
      desc: lang === 'en' ? 'Server Partner' : 'Server Partner',
      date: '15 Aug 2026',
      total: 1200000000,
      status: 'Disetujui',
      color: 'green',
      department: 'Engineering & R&D',
      threeWayMatchStatus: 'DISCREPANCY',
      lineItems: [
        { id: 'li-5', sku: 'RS-W1-PRO', name: 'Rack Server Web Infrastructure', qty: 10, unitPrice: 120000000, totalPrice: 1200000000 }
      ]
    },
    {
      id: 'PO-2026-1039',
      vendor: 'Lenovo Enterprise',
      desc: lang === 'en' ? 'Hardware Vendor' : 'Hardware Vendor',
      date: '12 Aug 2026',
      total: 450000000,
      status: 'Selesai',
      color: 'blue',
      department: 'Operations & Logistics',
      threeWayMatchStatus: 'MATCHED',
      lineItems: [
        { id: 'li-6', sku: 'STR-NVME-8TB', name: '8TB NVMe Enterprise Storage Pod', qty: 25, unitPrice: 18000000, totalPrice: 450000000 }
      ]
    },
    {
      id: 'PO-2026-1038',
      vendor: 'APC by Schneider',
      desc: lang === 'en' ? 'Power Infra' : 'Power Infra',
      date: '10 Aug 2026',
      total: 320000000,
      status: 'Selesai',
      color: 'blue',
      department: 'Operations & Logistics',
      threeWayMatchStatus: 'MATCHED',
      lineItems: [
        { id: 'li-7', sku: 'UPS-3KVA-RT', name: '3kVA Rackmount Smart-UPS Online', qty: 10, unitPrice: 32000000, totalPrice: 320000000 }
      ]
    },
    {
      id: 'PO-2026-1037',
      vendor: 'Fortinet Indonesia',
      desc: lang === 'en' ? 'Security Vendor' : 'Security Vendor',
      date: '05 Aug 2026',
      total: 550000000,
      status: 'Ditolak',
      color: 'red',
      department: 'IT Infrastructure',
      threeWayMatchStatus: 'PENDING_RECEIPT'
    },
  ];
  const [pos, setPos] = useState<any[]>(() => {
    return loadStoredData('inventora_procurement_pos_v1', defaultPOs);
  });

  // Save changes locally to retain modifications across browser reloads
  useEffect(() => {
    saveStoredData('inventora_procurement_pos_v1', pos);
  }, [pos]);

  // Synchronize immediately if a new PO is issued in another view or modal
  useEffect(() => {
    const handlePoCreated = () => {
      const refreshed = loadStoredData<any[]>('inventora_procurement_pos_v1', defaultPOs);
      setPos(refreshed);
    };
    window.addEventListener('inventora_po_created', handlePoCreated);
    return () => window.removeEventListener('inventora_po_created', handlePoCreated);
  }, []);

  useEffect(() => {
    let unsub = () => {};
    import('../firebase').then(({ db }) => {
      import('firebase/firestore').then(({ collection, onSnapshot, setDoc, doc }) => {
        unsub = onSnapshot(collection(db, 'purchaseOrders'), (snap) => {
          if (snap.empty) {
            defaultPOs.forEach(item => setDoc(doc(db, 'purchaseOrders', item.id), item));
          } else {
            const loaded = snap.docs.map(d => ({ ...d.data(), id: d.id }));
            setPos(loaded);
          }
        }, (err) => {
          console.warn("Firestore snapshot unavailable, using local state:", err.message);
        });
      }).catch(err => console.warn("Firestore import error:", err));
    }).catch(err => console.warn("Firebase import error:", err));
    return () => unsub();
  }, []);

  const updateStatus = async (id: string, status: string, color: string) => {
    setPos(current => current.map(item => item.id === id ? { ...item, status, color } : item));
    const statusLabel = status === 'Disetujui' ? activeT.procurement.approved
      : status === 'Selesai' ? activeT.procurement.completed
      : status === 'Ditolak' ? activeT.procurement.rejected
      : status;
    try {
      const { db } = await import('../firebase');
      const { updateDoc, doc } = await import('firebase/firestore');
      await updateDoc(doc(db, 'purchaseOrders', id), { status, color });
      onToast(`PO ${id} -> ${statusLabel}`, 'success');
    } catch (e: any) {
      console.warn("Firestore update skipped or failed:", e);
      onToast(`PO ${id} -> ${statusLabel}`, 'success');
    }
  };

  const handleSaveGrn = (poId: string, grn: GoodsReceiptNote, matchStatus: ThreeWayMatchStatus) => {
    setPos(current => current.map(item => item.id === poId ? {
      ...item,
      grn,
      threeWayMatchStatus: matchStatus
    } : item));

    const statusText = matchStatus === 'MATCHED'
      ? (lang === 'en' ? 'Matched 100%' : 'Sesuai 100%')
      : (lang === 'en' ? 'Discrepancy Detected' : 'Ada Selisih Fisik');

    onToast(
      lang === 'en'
        ? `GRN ${grn.grnNumber} recorded for ${poId}: ${statusText}`
        : `GRN ${grn.grnNumber} dicatat untuk ${poId}: ${statusText}`,
      matchStatus === 'MATCHED' ? 'success' : 'warning'
    );

    if (onNotify) {
      onNotify({
        title: lang === 'en' ? 'Goods Receipt Note (GRN) Issued' : 'Penerimaan Barang (GRN) Diterbitkan',
        message: lang === 'en'
          ? `GRN ${grn.grnNumber} issued by ${grn.receivedBy} for ${poId}. 3-Way Match: ${matchStatus}.`
          : `GRN ${grn.grnNumber} diterbitkan oleh ${grn.receivedBy} untuk ${poId}. Status 3-Way Match: ${matchStatus}.`,
        type: 'status_change',
        metadata: { poId, grnNumber: grn.grnNumber, matchStatus }
      });
    }
  };

  const handlePaymentSuccess = async (tx: PaymentTransaction) => {
    setTransactions(prev => {
      const updated = [tx, ...prev];
      try { localStorage.setItem('inventora_po_transactions', JSON.stringify(updated)); } catch {}
      return updated;
    });

    setPos(current => current.map(item => item.id === tx.poId ? {
      ...item,
      status: 'Selesai',
      color: 'blue',
      paymentInfo: {
        paidAt: tx.timestamp,
        method: tx.methodLabel,
        txId: tx.id,
        amount: tx.totalPaid,
        receiptNo: tx.receiptNumber
      }
    } : item));

    try {
      const { db } = await import('../firebase');
      const { updateDoc, doc } = await import('firebase/firestore');
      await updateDoc(doc(db, 'purchaseOrders', tx.poId), {
        status: 'Selesai',
        color: 'blue',
        paymentInfo: {
          paidAt: tx.timestamp,
          method: tx.methodLabel,
          txId: tx.id,
          totalPaid: tx.totalPaid,
          receiptNumber: tx.receiptNumber
        }
      });
    } catch (e) {
      console.warn("Firestore update skipped:", e);
    }

    const toastMsg = lang === 'en'
      ? `Payment of Rp ${tx.totalPaid.toLocaleString('en-US')} for ${tx.poId} via ${tx.methodLabel} succeeded!`
      : `Pembayaran ${tx.poId} berhasil senilai Rp ${tx.totalPaid.toLocaleString('id-ID')} via ${tx.methodLabel}!`;
    onToast(toastMsg, 'success');

    if (onNotify) {
      onNotify({
        title: lang === 'en' ? 'PO Payment Transaction Successful' : 'Transaksi Pembayaran PO Berhasil',
        message: lang === 'en'
          ? `Payment for ${tx.poId} to ${tx.vendor} totaling Rp ${tx.totalPaid.toLocaleString('en-US')} via ${tx.methodLabel} has been verified successfully. PO Status: Completed.`
          : `Pembayaran ${tx.poId} ke ${tx.vendor} senilai Rp ${tx.totalPaid.toLocaleString('id-ID')} via ${tx.methodLabel} telah berhasil diverifikasi. Status PO: Selesai.`,
        type: 'payment',
        metadata: {
          poId: tx.poId,
          amount: tx.totalPaid,
          vendor: tx.vendor,
          method: tx.methodLabel,
          txId: tx.id,
          receiptNumber: tx.receiptNumber
        }
      });
    }
  };

  const [activeModal, setActiveModal] = useState<{ type: 'review' | 'detail', data: any } | null>(null);
  const [page, setPage] = useState(1);
  const itemsPerPage = 4;
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const debouncedSearch = useDebounce(search, 180);

  const sortedPos = useMemo(() => {
    return [...pos].sort((a, b) => {
      if (!sortConfig) return 0;
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [pos, sortConfig]);

  const filteredPos = useMemo(() => {
    return sortedPos.filter(po => 
      po.vendor?.toLowerCase().includes(debouncedSearch.toLowerCase()) || 
      po.id?.toLowerCase().includes(debouncedSearch.toLowerCase())
    );
  }, [sortedPos, debouncedSearch]);

  const totalPages = Math.max(1, Math.ceil(filteredPos.length / itemsPerPage));
  const paginatedPos = useMemo(() => {
    return filteredPos.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  }, [filteredPos, page, itemsPerPage]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const headers = ['PO Number', 'Vendor', 'Description', 'Date', 'Total (IDR)', 'Status', 'Department', '3-Way Match Status', 'Payment Receipt'];
      const rows = filteredPos.map(po => [
        `"${po.id}"`,
        `"${(po.vendor || '').replace(/"/g, '""')}"`,
        `"${(po.desc || '').replace(/"/g, '""')}"`,
        `"${po.date}"`,
        po.total,
        `"${po.status}"`,
        `"${po.department || 'IT Infrastructure'}"`,
        `"${po.threeWayMatchStatus || 'PENDING_RECEIPT'}"`,
        `"${po.paymentInfo?.receiptNo || '-'}"`
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `inventora-procurement-batch-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      onToast(lang === 'en' ? "Batch procurement records downloaded as CSV" : "Data batch pengadaan berhasil diunduh sebagai CSV", "success");
    } catch (e: any) {
      onToast(`Export failed: ${e.message}`, "error");
    } finally {
      setTimeout(() => setIsExporting(false), 500);
    }
  };

  const handleApprove = (id: string) => {
    updateStatus(id, 'Disetujui', 'green');
    if (!isOnline && onQueueOffline) {
      onQueueOffline({
        type: 'APPROVE_PO',
        entityId: id,
        payload: { status: 'Disetujui' },
        description: `Approve Purchase Order ${id}`,
      });
      onToast(lang === 'en' ? `PO ${id} approved in offline mode (queued)` : `PO ${id} disetujui dalam mode offline (antrean)`, 'warning');
    }
    setActiveModal(null);
  };

  const handleReject = (id: string) => {
    updateStatus(id, 'Ditolak', 'red');
    if (!isOnline && onQueueOffline) {
      onQueueOffline({
        type: 'REJECT_PO',
        entityId: id,
        payload: { status: 'Ditolak' },
        description: `Reject Purchase Order ${id}`,
      });
      onToast(lang === 'en' ? `PO ${id} rejected in offline mode (queued)` : `PO ${id} ditolak dalam mode offline (antrean)`, 'warning');
    }
    setActiveModal(null);
  };

  const onDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('po_id', id);
  };
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };
  const onDrop = (e: React.DragEvent, status: string, color: 'orange' | 'green' | 'blue' | 'red') => {
    e.preventDefault();
    const id = e.dataTransfer.getData('po_id');
    updateStatus(id, status, color);
  };

  const kanbanColumns = [
    { title: activeT.procurement.pendingApproval, status: 'Pending Approval', color: 'orange' as const },
    { title: activeT.procurement.approved, status: 'Disetujui', color: 'green' as const },
    { title: activeT.procurement.completed, status: 'Selesai', color: 'blue' as const },
    { title: activeT.procurement.rejected, status: 'Ditolak', color: 'red' as const },
  ];

  const getStatusBadgeText = (st: string) => {
    if (st === 'Disetujui') return activeT.procurement.approved;
    if (st === 'Selesai') return activeT.procurement.completed;
    if (st === 'Ditolak') return activeT.procurement.rejected;
    return activeT.procurement.pendingApproval;
  };

  return (
    <section className="p-4 md:p-8 flex-1 flex flex-col gap-6 overflow-y-auto">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
        <Card>
          <p className="text-[#666] dark:text-[#a1a1aa] text-sm font-medium tracking-tight">
            {lang === 'en' ? 'Active Purchase Orders' : 'Total PO Aktif'}
          </p>
          <h3 className="text-3xl font-semibold tracking-tighter mt-1 text-[#171717] dark:text-[#ededed] tabular-nums">45</h3>
          <p className="text-[#666] dark:text-[#a1a1aa] text-xs mt-2">
            <span className="text-[#0070f3] dark:text-[#3291ff] font-medium">12 PO</span> {lang === 'en' ? 'In Progress' : 'Dalam Proses'}
          </p>
        </Card>
        <Card>
          <p className="text-[#666] dark:text-[#a1a1aa] text-sm font-medium tracking-tight">
            {lang === 'en' ? 'Committed Value (This Month)' : 'Nilai Pengadaan (Bulan Ini)'}
          </p>
          <h3 className="text-3xl font-semibold tracking-tighter mt-1 text-[#171717] dark:text-[#ededed] tabular-nums">
            {lang === 'en' ? 'Rp 4.25B' : 'Rp 4,25 M'}
          </h3>
          <p className="text-[#666] dark:text-[#a1a1aa] text-xs mt-2">{activeT.procurement.awaitingReview}</p>
        </Card>
        <Card>
          <p className="text-[#666] dark:text-[#a1a1aa] text-sm font-medium tracking-tight">
            {activeT.procurement.activeVendors}
          </p>
          <h3 className="text-3xl font-semibold tracking-tighter mt-1 text-[#171717] dark:text-[#ededed] tabular-nums">128</h3>
          <p className="text-[#666] dark:text-[#a1a1aa] text-xs mt-2">
            <span className="text-[#10b981] dark:text-[#34d399] font-medium">
              {lang === 'en' ? '+3 Vendors' : '+3 Vendor'}
            </span> {lang === 'en' ? 'New this month' : 'Baru'}
          </p>
        </Card>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex bg-white dark:bg-[#1a1a1a] shadow-[0_0_0_1px_rgba(0,0,0,0.08)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.1)] rounded-md p-1">
          <button 
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 text-sm font-medium rounded transition-colors cursor-pointer ${viewMode === 'list' ? 'bg-[#fafafa] dark:bg-[#333] text-[#171717] dark:text-[#ededed] shadow-[0_1px_2px_rgba(0,0,0,0.04)]' : 'text-[#666] dark:text-[#a1a1aa] hover:text-[#171717] dark:hover:text-[#ededed]'}`}
          >
            {activeT.procurement.listView}
          </button>
          <button 
            onClick={() => setViewMode('kanban')}
            className={`px-3 py-1.5 text-sm font-medium rounded transition-colors cursor-pointer ${viewMode === 'kanban' ? 'bg-[#fafafa] dark:bg-[#333] text-[#171717] dark:text-[#ededed] shadow-[0_1px_2px_rgba(0,0,0,0.04)]' : 'text-[#666] dark:text-[#a1a1aa] hover:text-[#171717] dark:hover:text-[#ededed]'}`}
          >
            {activeT.procurement.kanbanView}
          </button>
          <button 
            onClick={() => setViewMode('transactions')}
            className={`px-3 py-1.5 text-sm font-medium rounded transition-colors flex items-center gap-1.5 cursor-pointer ${viewMode === 'transactions' ? 'bg-[#fafafa] dark:bg-[#333] text-[#171717] dark:text-[#ededed] shadow-[0_1px_2px_rgba(0,0,0,0.04)]' : 'text-[#666] dark:text-[#a1a1aa] hover:text-[#171717] dark:hover:text-[#ededed]'}`}
          >
            <CreditCard className="w-3.5 h-3.5 text-[#0070f3] dark:text-[#3291ff]" />
            <span>{activeT.procurement.transactionView} ({transactions.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-[#666] dark:text-[#aaa]">
          <button
            type="button"
            onClick={() => setIsVirtualized(!isVirtualized)}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
              isVirtualized
                ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                : 'bg-white dark:bg-[#1a1a1a] border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800'
            }`}
            title="Toggle 60 FPS Virtualized Grid"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isVirtualized ? 'Virtualized Grid (60 FPS)' : 'Virtualization Off'}</span>
          </button>
          <Button variant="secondary" onClick={() => { setAuditPoFilter(null); setIsAuditOpen(true); }}>
            <History className="w-3.5 h-3.5" />
            <span>Audit Trail</span>
          </Button>
          <Button variant="primary" onClick={() => onNavigate('purchase')}>
            <Plus className="w-3.5 h-3.5 mr-1" />
            {activeT.procurement.createPoBtn}
          </Button>
        </div>
      </div>

      {viewMode === 'list' && (
        isVirtualized ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={activeT.procurement.searchPlaceholder}
                className="w-full max-w-sm px-3.5 py-2 bg-white dark:bg-[#161616] border border-neutral-200 dark:border-neutral-800 rounded-lg text-xs"
              />
            </div>
            <VirtualizedTable<PurchaseOrder>
              data={filteredPos}
              columns={[
                { key: 'id', header: activeT.procurement.poNumber, width: '20%', render: (item) => <span className="font-mono font-semibold text-[#0070f3]">{item.id}</span> },
                { key: 'vendor', header: activeT.procurement.vendor, width: '25%', render: (item) => <span className="font-medium">{item.vendor}</span> },
                { key: 'date', header: activeT.procurement.date, width: '15%', render: (item) => <span className="text-neutral-500">{item.date}</span> },
                { key: 'total', header: activeT.procurement.amount, width: '20%', render: (item) => <span className="font-mono font-medium">Rp {item.total.toLocaleString(numLocale)}</span> },
                { key: 'status', header: activeT.procurement.status, width: '20%', render: (item) => <Badge color={item.color as any}>{item.status}</Badge> }
              ]}
              onRowClick={(item) => setActiveModal({ type: 'detail', data: item })}
            />
          </div>
        ) : (
        <TableWrapper 
          title={activeT.procurement.tableTitle} 
          placeholder={activeT.procurement.searchPlaceholder}
          searchValue={search}
          onSearchChange={(v: string) => { setSearch(v); setPage(1); }}
          onExport={handleExport}
          isExporting={isExporting}
          currentPage={page}
          totalPages={totalPages || 1}
          onPageChange={setPage}
        >
          <thead className="sticky top-0 z-10">
            <tr>
              <Th sortable onSort={() => handleSort('id')}>{activeT.procurement.poNumber}</Th>
              <Th sortable onSort={() => handleSort('vendor')}>{activeT.procurement.vendor}</Th>
              <Th sortable onSort={() => handleSort('date')}>{activeT.procurement.date}</Th>
              <Th sortable onSort={() => handleSort('total')}>{activeT.procurement.amount}</Th>
              <Th sortable onSort={() => handleSort('status')}>{activeT.procurement.status}</Th>
              <Th>3-Way Match</Th>
              <Th align="right">{activeT.procurement.actions}</Th>
            </tr>
          </thead>
          <tbody>
            {paginatedPos.length > 0 ? (
              paginatedPos.map((po, idx) => (
                <Tr key={po.id} index={idx}>
                  <Td><span className="font-mono text-xs text-[#666] dark:text-[#a1a1aa] font-semibold">{po.id}</span></Td>
                  <Td>
                    <div className="font-medium tracking-tight text-neutral-900 dark:text-neutral-100">{po.vendor}</div>
                    <div className="text-[11px] text-[#666] dark:text-[#a1a1aa] mt-0.5 flex items-center gap-1.5">
                      <span>{po.desc}</span>
                      <span className="text-[9px] font-mono px-1 py-0.2 bg-neutral-100 dark:bg-neutral-800 rounded">
                        {po.department || 'IT Infrastructure'}
                      </span>
                    </div>
                  </Td>
                  <Td><span className="tabular-nums text-xs">{po.date}</span></Td>
                  <Td><span className="tabular-nums font-mono font-medium text-xs">Rp {po.total.toLocaleString(numLocale)}</span></Td>
                  <Td><Badge color={po.color}>{getStatusBadgeText(po.status)}</Badge></Td>
                  <Td>
                    {po.threeWayMatchStatus === 'MATCHED' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="w-3 h-3" /> Matched
                      </span>
                    ) : po.threeWayMatchStatus === 'DISCREPANCY' ? (
                      <button
                        type="button"
                        onClick={() => setThreeWayPo(po)}
                        className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800 cursor-pointer hover:bg-amber-100 transition-colors"
                        title="Click to view GRN discrepancy details"
                      >
                        <AlertTriangle className="w-3 h-3" /> Discrepancy
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setThreeWayPo(po)}
                        className="inline-flex items-center gap-1 text-[10px] font-medium text-neutral-500 hover:text-[#0070f3] dark:text-neutral-400 dark:hover:text-[#3291ff] cursor-pointer"
                      >
                        <PackageCheck className="w-3 h-3" /> Inspect GRN
                      </button>
                    )}
                  </Td>
                  <Td align="right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setThreeWayPo(po)}
                        className="p-1.5 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                        title={lang === 'en' ? 'Inspect 3-Way Matching & GRN' : 'Periksa 3-Way Match & GRN'}
                      >
                        <PackageCheck className="w-3.5 h-3.5" />
                      </button>
                      {po.status === 'Disetujui' && (
                        <button
                          type="button"
                          onClick={() => setSelectedPoForPayment(po)}
                          className="bg-[#0070f3] hover:bg-[#0060df] text-white text-xs font-medium px-2.5 py-1.5 rounded-md shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                          title={lang === 'en' ? "Pay instantly via Payment Gateway" : "Bayar langsung via Payment Gateway"}
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>{activeT.procurement.payGatewayBtn}</span>
                        </button>
                      )}
                      {po.status === 'Selesai' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-1 rounded border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 className="w-3 h-3" /> {activeT.procurement.paidStatus}
                        </span>
                      )}
                      {po.status === 'Pending Approval' ? (
                        <Button variant="secondary" onClick={() => setActiveModal({ type: 'review', data: po })}>
                          {activeT.procurement.reviewBtn}
                        </Button>
                      ) : (
                        <Button variant="secondary" onClick={() => setActiveModal({ type: 'detail', data: po })}>
                          {activeT.procurement.detailBtn}
                        </Button>
                      )}
                    </div>
                  </Td>
                </Tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-[#666] dark:text-[#a1a1aa] text-sm">
                  {lang === 'en' ? `No Purchase Orders match search "${search}".` : `Tidak ada Purchase Order yang cocok dengan pencarian "${search}".`}
                </td>
              </tr>
            )}
          </tbody>
        </TableWrapper>
        )
      )}

      {viewMode === 'kanban' && (
        <div className="flex flex-1 gap-6 overflow-x-auto pb-4">
          {kanbanColumns.map(col => (
            <div 
              key={col.status} 
              className="flex-shrink-0 w-80 bg-[#eaeaea]/50 dark:bg-[#111] rounded-xl flex flex-col max-h-full border border-[#eaeaea] dark:border-[#333]"
              onDragOver={onDragOver}
              onDrop={(e) => onDrop(e, col.status, col.color)}
            >
              <div className="px-4 py-3 border-b border-[#eaeaea] dark:border-[#333] flex items-center justify-between bg-[#fafafa] dark:bg-[#0a0a0a] rounded-t-xl shrink-0">
                <span className="font-semibold text-sm tracking-tight text-[#171717] dark:text-[#ededed]">{col.title}</span>
                <Badge color={col.color}>{pos.filter(po => po.status === col.status).length}</Badge>
              </div>
              <div className="p-3 flex-1 overflow-y-auto space-y-3">
                <AnimatePresence>
                  {pos.filter(po => po.status === col.status).map(po => (
                    <motion.div
                      key={po.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      draggable
                      onDragStart={(e: any) => onDragStart(e, po.id)}
                      className="bg-white dark:bg-[#1a1a1a] p-4 rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.04),0_0_0_1px_rgba(0,0,0,0.08)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.2),0_0_0_1px_rgba(255,255,255,0.1)] cursor-grab active:cursor-grabbing hover:shadow-[0_4px_12px_rgba(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.08)] transition-shadow"
                      onClick={() => setActiveModal({ type: po.status === 'Pending Approval' ? 'review' : 'detail', data: po })}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-mono text-xs font-medium text-[#666] dark:text-[#a1a1aa]">{po.id}</span>
                        {po.status === 'Selesai' && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-semibold">
                            {activeT.procurement.paidStatus.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="font-medium text-sm text-[#171717] dark:text-[#ededed] leading-tight mb-1">{po.vendor}</div>
                      <div className="text-xs text-[#666] dark:text-[#a1a1aa] mb-3">{po.desc}</div>
                      
                      {po.status === 'Disetujui' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPoForPayment(po);
                          }}
                          className="w-full my-2 bg-[#0070f3] hover:bg-[#0060df] text-white text-xs font-medium py-1.5 px-2.5 rounded-md flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>{activeT.procurement.openGatewayBtn}</span>
                        </button>
                      )}

                      <div className="flex justify-between items-end mt-3 pt-3 border-t border-[#eaeaea] dark:border-[#333]">
                        <span className="text-xs text-[#999]">{po.date}</span>
                        <span className="font-medium text-sm text-[#171717] dark:text-[#ededed] tabular-nums">
                          Rp {(po.total / 1000000).toFixed(1)}M
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {pos.filter(po => po.status === col.status).length === 0 && (
                  <div className="py-6 px-4 text-center border-2 border-dashed border-[#eaeaea] dark:border-[#333] rounded-lg">
                    <span className="text-xs text-[#999]">{lang === 'en' ? 'Drop cards here' : 'Tarik kartu ke sini'}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {viewMode === 'transactions' && (
        <div className="space-y-6 flex-1">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <p className="text-[#666] dark:text-[#a1a1aa] text-xs font-medium uppercase tracking-wider">
                {activeT.procurement.totalPaidFunds}
              </p>
              <h3 className="text-2xl font-bold tracking-tight mt-1 text-[#171717] dark:text-[#ededed] font-mono">
                Rp {transactions.reduce((acc, t) => acc + (t.totalPaid || 0), 0).toLocaleString(numLocale)}
              </h3>
              <p className="text-xs text-[#10b981] dark:text-[#34d399] mt-1.5 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> {lang === 'en' ? `${transactions.length} Transactions Verified` : `${transactions.length} Transaksi Berhasil Diverifikasi`}
              </p>
            </Card>
            <Card>
              <p className="text-[#666] dark:text-[#a1a1aa] text-xs font-medium uppercase tracking-wider">
                {activeT.procurement.paymentChannels}
              </p>
              <h3 className="text-lg font-bold tracking-tight mt-1 text-[#171717] dark:text-[#ededed]">
                VA, Corporate Card, RTGS, QRIS
              </h3>
              <p className="text-xs text-[#666] dark:text-[#aaa] mt-1.5">Auto-reconciliation settlement 24/7</p>
            </Card>
            <Card>
              <p className="text-[#666] dark:text-[#a1a1aa] text-xs font-medium uppercase tracking-wider">
                {activeT.procurement.gatewayStatus}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">ONLINE & ENCRYPTED</span>
              </div>
              <p className="text-xs text-[#666] dark:text-[#aaa] mt-1.5">256-bit SSL Protected Handshake</p>
            </Card>
          </div>

          <TableWrapper 
            title={activeT.procurement.auditTableTitle} 
            placeholder={lang === 'en' ? "Search transaction ID, PO, or vendor..." : "Cari transaksi ID, PO, atau vendor..."}
            searchValue=""
            onSearchChange={() => {}}
            currentPage={1}
            totalPages={1}
            onPageChange={() => {}}
          >
            <thead className="sticky top-0 z-10">
              <tr>
                <Th>{activeT.procurement.settlementTime}</Th>
                <Th>{activeT.procurement.receiptCol}</Th>
                <Th>{lang === 'en' ? 'PO # & Vendor' : 'No. PO & Vendor'}</Th>
                <Th>{activeT.procurement.paymentChannels}</Th>
                <Th>{lang === 'en' ? 'Total Settled' : 'Total Bayar'}</Th>
                <Th>{activeT.procurement.status}</Th>
                <Th align="right">{activeT.procurement.actions}</Th>
              </tr>
            </thead>
            <tbody>
              {transactions.length > 0 ? (
                transactions.map((tx, idx) => (
                  <Tr key={tx.id} index={idx}>
                    <Td>
                      <span className="text-xs text-[#666] dark:text-[#a1a1aa]">
                        {new Date(tx.timestamp).toLocaleString(numLocale, { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                    </Td>
                    <Td>
                      <span className="font-mono text-xs font-semibold text-[#171717] dark:text-[#ededed] bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">
                        {tx.receiptNumber}
                      </span>
                      <div className="font-mono text-[10px] text-[#888] mt-0.5">{tx.id}</div>
                    </Td>
                    <Td>
                      <div className="font-medium text-xs text-[#171717] dark:text-[#ededed]">{tx.vendor}</div>
                      <div className="font-mono text-[10px] text-[#0070f3] dark:text-[#3291ff]">{tx.poId}</div>
                    </Td>
                    <Td>
                      <span className="text-xs font-medium text-[#444] dark:text-[#ccc]">
                        {tx.methodLabel}
                      </span>
                    </Td>
                    <Td>
                      <span className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">
                        Rp {tx.totalPaid.toLocaleString(numLocale)}
                      </span>
                      {tx.taxAmount > 0 && (
                        <div className="text-[10px] text-[#888]">PPN/VAT: Rp {tx.taxAmount.toLocaleString(numLocale)}</div>
                      )}
                    </Td>
                    <Td>
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="w-3 h-3" /> {tx.status}
                      </span>
                    </Td>
                    <Td align="right">
                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="text-xs text-[#0070f3] dark:text-[#3291ff] hover:underline flex items-center gap-1 font-medium cursor-pointer ml-auto"
                      >
                        <Printer className="w-3.5 h-3.5" /> {activeT.common.print}
                      </button>
                    </Td>
                  </Tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-[#888] text-xs">
                    {activeT.procurement.noTransactions}
                  </td>
                </tr>
              )}
            </tbody>
          </TableWrapper>
        </div>
      )}

      <Modal 
        isOpen={activeModal !== null} 
        onClose={() => setActiveModal(null)} 
        title={activeModal?.type === 'review' ? activeT.procurement.reviewModalTitle : activeT.procurement.detailModalTitle}
      >
        {activeModal && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-[#666] dark:text-[#a1a1aa] mb-1">{activeT.procurement.poNumber}</p>
                <p className="font-mono text-[#171717] dark:text-[#ededed]">{activeModal.data.id}</p>
              </div>
              <div>
                <p className="text-[#666] dark:text-[#a1a1aa] mb-1">{activeT.procurement.date}</p>
                <p className="font-medium text-[#171717] dark:text-[#ededed]">{activeModal.data.date}</p>
              </div>
              <div className="col-span-2">
                <p className="text-[#666] dark:text-[#a1a1aa] mb-1">{activeT.procurement.vendor}</p>
                <p className="font-medium text-[#171717] dark:text-[#ededed]">{activeModal.data.vendor}</p>
                <p className="text-xs text-[#666] dark:text-[#a1a1aa] mt-0.5">{activeModal.data.desc}</p>
              </div>
              <div className="col-span-2 p-4 bg-[#fafafa] dark:bg-[#1a1a1a] rounded-lg shadow-inner dark:shadow-none dark:border dark:border-[#333]">
                <p className="text-[#666] dark:text-[#a1a1aa] mb-1 text-xs uppercase tracking-wider">{activeT.procurement.amount}</p>
                <p className="text-2xl font-semibold tracking-tight text-[#171717] dark:text-[#ededed]">
                  Rp {Number(activeModal.data.total).toLocaleString(numLocale)}
                </p>
              </div>

              {/* Department Pre-Approval Budget Ceilings */}
              {(() => {
                const bCheck = checkDepartmentBudgetLimit(activeModal.data.department || 'IT Infrastructure', activeModal.data.total);
                return (
                  <div className={`col-span-2 p-3.5 rounded-lg border text-xs flex items-center justify-between gap-3 ${
                    bCheck.isExceeded
                      ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                      : bCheck.isNearCap
                      ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
                      : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                  }`}>
                    <div>
                      <div className="font-semibold flex items-center gap-1.5">
                        {bCheck.isExceeded ? <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" /> : <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                        <span>
                          {bCheck.isExceeded
                            ? (lang === 'en' ? 'Budget Cap Exceeded Alert' : 'Peringatan Plafon Anggaran Terlampaui')
                            : (lang === 'en' ? 'Budget Verification Verified' : 'Verifikasi Anggaran Lolos')}
                        </span>
                      </div>
                      <p className="text-[11px] opacity-85 mt-0.5">
                        {bCheck.departmentBudget?.name}: Rp {(bCheck.availableBefore / 1000000).toLocaleString(numLocale)} Jt {lang === 'en' ? 'remaining' : 'tersisa'} &bull; {bCheck.projectedPercentage}% {lang === 'en' ? 'projected cap' : 'proyeksi plafon'}
                      </p>
                    </div>
                    <span className="font-mono font-bold text-xs shrink-0">
                      {bCheck.projectedPercentage}%
                    </span>
                  </div>
                );
              })()}

              {activeModal.data.status === 'Selesai' && (
                <div className="col-span-2 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    {activeT.procurement.paidViaGatewayBanner}
                  </span>
                  <span className="font-mono font-semibold">PAID / SETTLED</span>
                </div>
              )}

              {/* Gemini AI Risk & Anomaly Assessment */}
              <div className="col-span-2">
                <PoRiskCard po={activeModal.data} lang={lang} />
              </div>
            </div>

            <div className="flex gap-2.5 justify-end pt-4 border-t border-[#eaeaea] dark:border-[#333] flex-wrap">
              <button
                type="button"
                onClick={() => {
                  const target = activeModal.data;
                  setActiveModal(null);
                  setThreeWayPo(target);
                }}
                className="bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              >
                <PackageCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>3-Way Match (GRN)</span>
              </button>

              {activeModal.type === 'review' && (
                <>
                  <Button variant="secondary" onClick={() => handleReject(activeModal.data.id)}>
                    {activeT.procurement.rejectBtn}
                  </Button>
                  <Button variant="primary" onClick={() => handleApprove(activeModal.data.id)}>
                    {activeT.procurement.approveBtn}
                  </Button>
                </>
              )}
              {activeModal.data.status === 'Disetujui' && (
                <button
                  type="button"
                  onClick={() => {
                    const target = activeModal.data;
                    setActiveModal(null);
                    setSelectedPoForPayment(target);
                  }}
                  className="bg-[#0070f3] hover:bg-[#0060df] text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>{activeT.procurement.openGatewayBtn}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setPoForPrint(activeModal.data);
                }}
                className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              >
                <Printer className="w-3.5 h-3.5 text-neutral-500" />
                <span>{lang === 'en' ? 'Print Voucher' : 'Cetak Voucher'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuditPoFilter(activeModal.data.id);
                  setIsAuditOpen(true);
                }}
                className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              >
                <History className="w-3.5 h-3.5 text-neutral-500" />
                <span>Audit</span>
              </button>
              {activeModal.type !== 'review' && activeModal.data.status !== 'Disetujui' && (
                <Button variant="secondary" onClick={() => setActiveModal(null)}>
                  {activeT.common.close}
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* 3-Way Match Modal & Goods Receipt Inspector */}
      <ThreeWayMatchModal
        isOpen={threeWayPo !== null}
        onClose={() => setThreeWayPo(null)}
        po={threeWayPo}
        onSaveGrn={handleSaveGrn}
        lang={lang}
      />

      {selectedPoForPayment !== null && (
        <Suspense fallback={null}>
          <PaymentGatewayModal
            isOpen={selectedPoForPayment !== null}
            onClose={() => setSelectedPoForPayment(null)}
            po={selectedPoForPayment}
            onPaymentSuccess={handlePaymentSuccess}
            lang={lang}
            t={activeT}
          />
        </Suspense>
      )}

      {/* Audit Trail Drawer Modal */}
      <AuditTrailDrawer
        isOpen={isAuditOpen}
        onClose={() => setIsAuditOpen(false)}
        entityFilter={auditPoFilter}
        lang={lang}
      />

      {/* Official Tax Invoice & Printable Voucher Letterhead */}
      <PrintableVoucher
        po={poForPrint}
        onClose={() => setPoForPrint(null)}
        lang={lang}
      />
    </section>
  );
}
export default ProcurementView;
