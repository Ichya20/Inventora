import React, { useState, useEffect, useMemo, useRef, lazy, Suspense } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { CreditCard, CheckCircle2, Printer, History, Layers, FileText, PackageCheck, AlertTriangle, Plus } from 'lucide-react';
import { Card, Badge, Button, TableWrapper, Th, Td, Tr, Modal } from './UI';
import { Role, ToastType, PaymentTransaction, AppNotification, PurchaseOrder, GoodsReceiptNote, ThreeWayMatchStatus } from '../types';
import { translations, Language, Translations } from '../i18n';
import { useDebounce } from '../lib/useDebounce';
import { readStoredArray, commitStoredArray, saveStoredData, createInventoraBackup } from '../lib/storageUtils';
import { exportToCsv, exportToJson } from '../lib/exportUtils';
import { AuditTrailDrawer } from './AuditTrailDrawer';
import { PrintableVoucher } from './PrintableVoucher';
import { VirtualizedTable, Column } from './VirtualizedTable';
import { PoRiskCard } from './PoRiskCard';
import { ThreeWayMatchModal } from './ThreeWayMatchModal';
import { validatedReceiptPatch } from '../lib/goodsReceipt';
import { checkDepartmentBudgetLimit } from './DepartmentBudgetCard';
import { downloadReceiptPdf } from '../lib/pdfGenerator';

import { assertPoTransition, normalizePurchaseOrder, paymentInfoFromTransaction, paymentTotals, poStorageKey } from '../lib/procurement';
import { persistPoTransition } from '../lib/purchaseOrderStore';
import { businessDate } from '../lib/businessDates';
import { isCachedOrder } from '../lib/procurementCache';
import { canPerformPoAction } from '../lib/authorization';
import { PurchaseOrderItems } from './PurchaseOrderItems';
import { poStatusLabel, poStatusTone } from '../lib/dashboard';
import { ChangeHighlight } from './MotionFeedback';
import { ViewSkeleton } from './ViewSkeleton';
import { workspaceMotion } from '../lib/motion';
import { collection, onSnapshot } from 'firebase/firestore';

const PaymentGatewayModal = lazy(() => import('./PaymentGatewayModal').then(m => ({ default: m.PaymentGatewayModal })));

function isCachedTransaction(value: unknown): value is PaymentTransaction {
  const tx = value as PaymentTransaction;
  return !!tx && typeof tx === 'object' && !Array.isArray(tx)
    && ['id', 'poId', 'vendor', 'methodLabel', 'accountReference', 'receiptNumber', 'timestamp'].every(key => typeof tx[key] === 'string')
    && !!tx.id && !!tx.poId && Number.isFinite(Date.parse(tx.timestamp))
    && [tx.amount, tx.taxAmount, tx.totalPaid, tx.withholdingTaxAmount ?? 0].every(amount => Number.isFinite(amount) && amount >= 0 && amount <= Number.MAX_SAFE_INTEGER)
    && ['bank_transfer', 'virtual_account', 'credit_card', 'qris'].includes(tx.method)
    && ['SUCCESS', 'PENDING', 'FAILED'].includes(tx.status)
    && (tx.notes === undefined || typeof tx.notes === 'string');
}

function readProcurementCache<T>(key: string, fallback: T[], validItem: (item: unknown) => boolean): { data: T[]; error: boolean } {
  try { return { data: readStoredArray(key, fallback, validItem), error: false }; }
  catch { return { data: [], error: true }; }
}

interface ProcurementViewProps {
  initialPoId?: string | null;
  onInitialPoHandled?: () => void;
  role: Role;
  isDemo: boolean;
  ownerId: string;
  onNavigate: (menu: string) => void;
  onToast: (msg: string, type?: ToastType, options?: { title?: string; actionLabel?: string; onAction?: () => void; duration?: number }) => void;
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
  onQueueOffline, role, isDemo, ownerId, initialPoId, onInitialPoHandled
}: ProcurementViewProps) {
  const storageKey = poStorageKey(isDemo, ownerId);
  const transactionStorageKey = isDemo ? 'inventora_po_transactions' : 'inventora_po_transactions:' + ownerId;
  const reduced = useReducedMotion();
  const saving = useRef(false);
  const [transitionBusy, setTransitionBusy] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(!isDemo);
  const [ordersError, setOrdersError] = useState(false);
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

  const defaultTransactions: PaymentTransaction[] = !isDemo ? [] : [
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
  const [initialTransactions] = useState(() => readProcurementCache(transactionStorageKey, defaultTransactions, isCachedTransaction));
  const [transactions, setTransactions] = useState<PaymentTransaction[]>(initialTransactions.data);
  const [transactionCacheError, setTransactionCacheError] = useState(initialTransactions.error);

  const defaultPOs: PurchaseOrder[] = [
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
  const [initialOrders] = useState(() => readProcurementCache(storageKey, isDemo ? defaultPOs : [], isCachedOrder));
  const [pos, setPos] = useState<PurchaseOrder[]>(() => initialOrders.data.map(normalizePurchaseOrder));
  const [poCacheError, setPoCacheError] = useState(initialOrders.error);

  const refreshLocalCache = () => {
    const orders = readProcurementCache(storageKey, isDemo ? defaultPOs : [], isCachedOrder);
    setPoCacheError(orders.error);
    if (isDemo && !orders.error) setPos(orders.data.map(normalizePurchaseOrder));
    const history = readProcurementCache(transactionStorageKey, defaultTransactions, isCachedTransaction);
    setTransactionCacheError(history.error);
    if (!history.error) setTransactions(history.data);
  };

  const handleRecoveryBackup = () => {
    try { exportToJson(`inventora-recovery-${businessDate()}.json`, createInventoraBackup()); }
    catch { onToast(lang === 'en' ? 'The backup could not be downloaded. Browser storage is unavailable.' : 'Cadangan tidak dapat diunduh. Penyimpanan browser tidak tersedia.', 'error'); }
  };

  // Synchronize immediately if a new PO is issued in another view or modal
  useEffect(() => {
    const handlePoCreated = () => {
      if (!isDemo) return;
      const refreshed = readProcurementCache(storageKey, defaultPOs, isCachedOrder);
      setPoCacheError(refreshed.error);
      if (!refreshed.error) setPos(refreshed.data.map(normalizePurchaseOrder));
    };
    window.addEventListener('inventora_po_created', handlePoCreated);
    window.addEventListener('storage', refreshLocalCache);
    return () => {
      window.removeEventListener('inventora_po_created', handlePoCreated);
      window.removeEventListener('storage', refreshLocalCache);
    };
  }, [isDemo, storageKey, transactionStorageKey]);

  useEffect(() => {
    if (isDemo) return;
    let cancelled = false;
    let unsubscribe = () => {};
    import('../firebase').then(({ db }) => {
      if (cancelled) return;
      unsubscribe = onSnapshot(collection(db, 'purchaseOrders'), { includeMetadataChanges: true }, snapshot => {
        // Keep the last confirmed status visible while a local write is pending.
        if (snapshot.metadata.hasPendingWrites) return;
        const confirmed = snapshot.docs.map(doc => normalizePurchaseOrder({ ...doc.data(), id: doc.id } as PurchaseOrder));
        setPos(confirmed);
        try {
          // A failed optional cache must never hide confirmed Firestore records or erase damaged bytes.
          readStoredArray(storageKey, [], isCachedOrder);
          saveStoredData(storageKey, confirmed, true);
          setPoCacheError(false);
        } catch { setPoCacheError(true); }
        setOrdersLoading(snapshot.metadata.fromCache); setOrdersError(false);
      }, error => { setOrdersLoading(false); setOrdersError(true); onToast('Database tidak dapat diakses: ' + error.message, 'error'); });
    }).catch(error => { setOrdersLoading(false); setOrdersError(true); onToast(String(error), 'error'); });
    return () => { cancelled = true; unsubscribe(); };
  }, [isDemo, ownerId]);

  const saveTransition = async (id: string, patch: Partial<PurchaseOrder>, source: 'approval' | 'receipt' | 'payment') => {
    if (saving.current) throw new Error('Masih ada perubahan yang sedang disimpan.');
    const validatedPatch = (target: PurchaseOrder | undefined) => {
      if (!target) throw new Error('PO tidak ditemukan.');
      assertPoTransition(target, patch.status!, role, source);
      if (source === 'payment' && patch.paymentInfo?.amount !== paymentTotals(target).totalPaid) throw new Error('Nominal pembayaran tidak sesuai PO terbaru.');
      if (source !== 'receipt') return patch;
      const validated = validatedReceiptPatch(target, patch.grn!, role);
      if (patch.status !== validated.status || patch.threeWayMatchStatus !== validated.threeWayMatchStatus) throw new Error('Status GRN tidak sesuai rincian penerimaan.');
      return validated;
    };
    saving.current = true;
    setTransitionBusy(true);
    try {
      if (!isDemo) {
        if (!isOnline) throw new Error('Tindakan ini memerlukan koneksi ke server.');
        await persistPoTransition(id, validatedPatch(pos.find(item => item.id === id)), source, undefined, ownerId);
      } else {
        const updated = commitStoredArray(storageKey, defaultPOs, current => {
          if (!current.every(isCachedOrder)) throw new Error('Data PO lokal tidak valid. Data asli tetap disimpan untuk pemulihan.');
          const latest = current.map(normalizePurchaseOrder);
          const change = validatedPatch(latest.find(item => item.id === id));
          return latest.map(item => item.id === id ? { ...item, ...change } : item);
        });
        setPos(updated);
        setPoCacheError(false);
      }
    } catch (error) {
      if (isDemo) setPoCacheError(readProcurementCache(storageKey, defaultPOs, isCachedOrder).error);
      throw error;
    } finally { saving.current = false; setTransitionBusy(false); }
  };

  const updateStatus = async (id: string, status: string, color: string) => {
    try {
      const target = pos.find(item => item.id === id);
      if (!target) throw new Error('PO tidak ditemukan.');
      assertPoTransition(target, status, role, 'approval');
      if (!isDemo && !isOnline) {
        if (!onQueueOffline) throw new Error('Antrean offline tidak tersedia.');
        onQueueOffline({
          type: status === 'Disetujui' ? 'APPROVE_PO' : 'REJECT_PO',
          entityId: id, payload: { status }, description: 'PO ' + id + ': ' + status,
        });
        onToast(lang === 'en' ? 'Queued. Status will change after server confirmation.' : 'Masuk antrean. Status berubah setelah dikonfirmasi server.', 'warning');
      } else {
        await saveTransition(id, { status, color }, 'approval');
        onToast('PO ' + id + ': ' + status, 'success');
      }
      setActiveModal(null);
    } catch (error) { onToast(String(error), 'error'); }
  };

  const handleSaveGrn = async (poId: string, grn: GoodsReceiptNote, matchStatus: ThreeWayMatchStatus) => {
    try {
      if (!['MATCHED', 'DISCREPANCY'].includes(matchStatus) || grn.poId !== poId || grn.status !== matchStatus) throw new Error('Data penerimaan tidak valid.');
      const status = matchStatus === 'MATCHED' ? 'Barang Diterima' : 'Selisih Penerimaan';
      await saveTransition(poId, { status, color: matchStatus === 'MATCHED' ? 'green' : 'orange', grn, threeWayMatchStatus: matchStatus }, 'receipt');
      setThreeWayPo(null);
      onToast('GRN ' + grn.grnNumber + ': ' + status, matchStatus === 'MATCHED' ? 'success' : 'warning');
      onNotify?.({ title: 'Goods Receipt Note', message: poId + ': ' + status, type: 'status_change', metadata: { poId, grnNumber: grn.grnNumber, matchStatus } });
    } catch (error) { onToast(String(error), 'error'); throw error; }
  };

  const handlePaymentSuccess = async (tx: PaymentTransaction) => {
    try {
      if (!isCachedTransaction(tx)) throw new Error('Data transaksi tidak valid.');
      const target = pos.find(item => item.id === tx.poId);
      if (!target || tx.totalPaid !== paymentTotals(target).totalPaid || tx.status !== 'SUCCESS') throw new Error('Nominal atau status transaksi tidak sesuai PO.');
      const history = readProcurementCache(transactionStorageKey, defaultTransactions, isCachedTransaction);
      setTransactionCacheError(history.error);
      if (isDemo && history.error) throw new Error('Riwayat transaksi lokal tidak dapat dibaca. Unduh cadangan dan pulihkan data sebelum mencatat pembayaran.');
      await saveTransition(tx.poId, { status: 'Selesai', color: 'blue', paymentInfo: paymentInfoFromTransaction(tx) }, 'payment');
      let historySaved = false;
      try {
        const updated = commitStoredArray(transactionStorageKey, defaultTransactions, current => {
          if (!current.every(isCachedTransaction)) throw new Error('Riwayat transaksi lokal tidak valid.');
          return [tx, ...current.filter(item => item.id !== tx.id)];
        });
        setTransactions(updated);
        setTransactionCacheError(false);
        historySaved = true;
      } catch { setTransactionCacheError(true); }
      onToast(historySaved
        ? (lang === 'en' ? 'Simulated payment recorded for ' + tx.poId : 'Simulasi pembayaran dicatat untuk ' + tx.poId)
        : (lang === 'en' ? 'The PO payment was recorded, but browser transaction history could not be updated. The payment reference remains on the PO.' : 'Pembayaran PO sudah tercatat, tetapi riwayat browser gagal diperbarui. Referensi pembayaran tetap tersimpan pada PO.'),
        historySaved ? 'success' : 'warning');
      onNotify?.({ title: 'Simulasi pembayaran PO', message: tx.poId + ': Rp ' + tx.totalPaid.toLocaleString(numLocale), type: 'payment',
        metadata: { poId: tx.poId, amount: tx.totalPaid, vendor: tx.vendor, txId: tx.id, receiptNumber: tx.receiptNumber, method: tx.methodLabel } });
    } catch (error) { onToast(String(error), 'error'); throw error; }
  };
  const [activeModal, setActiveModal] = useState<{ type: 'review' | 'detail', data: PurchaseOrder } | null>(null);
  useEffect(() => {
    setActiveModal(current => {
      if (!current) return null;
      const latest = pos.find(order => order.id === current.data.id);
      return latest ? { ...current, data: latest } : null;
    });
  }, [pos]);
  useEffect(() => {
    if (!initialPoId) return;
    const target = pos.find(order => order.id === initialPoId);
    if (!target && ordersLoading) return;
    if (target && !ordersError) {
      setActiveModal({ type: 'detail', data: target });
    } else {
      onToast(ordersError
        ? (lang === 'en' ? 'The order could not be loaded. Check your connection and retry.' : 'PO belum dapat dimuat. Periksa koneksi lalu coba kembali.')
        : (lang === 'en' ? `Order ${initialPoId} is no longer available.` : `PO ${initialPoId} tidak lagi tersedia.`), 'error');
    }
    onInitialPoHandled?.();
  }, [initialPoId, ordersLoading, ordersError, pos, onInitialPoHandled]);
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

  const [txSearch, setTxSearch] = useState('');
  const [txPage, setTxPage] = useState(1);
  const txItemsPerPage = 5;
  const debouncedTxSearch = useDebounce(txSearch, 180);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx =>
      (tx.id || '').toLowerCase().includes(debouncedTxSearch.toLowerCase()) ||
      (tx.poId || '').toLowerCase().includes(debouncedTxSearch.toLowerCase()) ||
      (tx.vendor || '').toLowerCase().includes(debouncedTxSearch.toLowerCase()) ||
      (tx.receiptNumber || '').toLowerCase().includes(debouncedTxSearch.toLowerCase()) ||
      (tx.methodLabel || '').toLowerCase().includes(debouncedTxSearch.toLowerCase())
    );
  }, [transactions, debouncedTxSearch]);

  const txTotalPages = Math.max(1, Math.ceil(filteredTransactions.length / txItemsPerPage));
  const paginatedTransactions = useMemo(() => {
    return filteredTransactions.slice((txPage - 1) * txItemsPerPage, txPage * txItemsPerPage);
  }, [filteredTransactions, txPage, txItemsPerPage]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const headers = ['PO Number', 'Vendor', 'Description', 'Notes', 'Date', 'Total (IDR)', 'Status', 'Department', '3-Way Match Status', 'Payment Receipt'];
      const rows = filteredPos.map(po => [
        po.id,
        po.vendor || '',
        po.desc || '',
        po.notes || '',
        po.date,
        po.total,
        po.status,
        po.department || 'IT Infrastructure',
        po.threeWayMatchStatus || 'PENDING_RECEIPT',
        po.paymentInfo?.receiptNo || '-'
      ]);
      exportToCsv(`inventora-procurement-batch-${businessDate()}.csv`, headers, rows);

      onToast(lang === 'en' ? "Batch procurement records downloaded as CSV" : "Data batch pengadaan berhasil diunduh sebagai CSV", "success");
    } catch (e: any) {
      onToast(`Export failed: ${e.message}`, "error");
    } finally {
      setTimeout(() => setIsExporting(false), 500);
    }
  };

  const handleApprove = (id: string) => { void updateStatus(id, 'Disetujui', 'green'); };
  const handleReject = (id: string) => { void updateStatus(id, 'Ditolak', 'red'); };
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
    { title: activeT.procurement.goodsReceived, status: 'Barang Diterima', color: 'green' as const },
    { title: activeT.procurement.completed, status: 'Selesai', color: 'blue' as const },
    { title: `${activeT.procurement.rejected} / ${activeT.procurement.grnDiscrepancy}`, status: 'Ditolak', color: 'red' as const },
  ];

  const getStatusBadgeText = (st: string) => {
    if (st === 'Disetujui') return activeT.procurement.approved;
    if (st === 'Barang Diterima') return activeT.procurement.goodsReceived;
    if (st === 'Selisih Penerimaan') return activeT.procurement.grnDiscrepancy;
    if (st === 'Selesai') return activeT.procurement.completed;
    if (st === 'Ditolak') return activeT.procurement.rejected;
    return activeT.procurement.pendingApproval;
  };

  if (ordersLoading && !pos.length && !ordersError && !poCacheError && !transactionCacheError) return <section className="procurement-workspace p-4 md:p-8 flex-1 overflow-y-auto"><ViewSkeleton title={lang === 'en' ? 'Purchase orders' : 'Purchase order'} lang={lang} /></section>;

  return (
    <section className="procurement-workspace p-4 md:p-8 flex-1 flex flex-col gap-6 overflow-y-auto">
      {(poCacheError || transactionCacheError) && <div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
        <p>{lang === 'en'
          ? `${poCacheError ? 'The purchase order cache' : 'The transaction history'} could not be read or saved. Original browser data has been preserved.`
          : `${poCacheError ? 'Cache purchase order' : 'Riwayat transaksi'} tidak dapat dibaca atau disimpan. Data asli browser tetap dipertahankan.`}</p>
        <p className="mt-1 text-xs">{isDemo
          ? (lang === 'en' ? 'Recover local data before continuing demo changes.' : 'Pulihkan data lokal sebelum melanjutkan perubahan demo.')
          : (lang === 'en' ? 'Confirmed server orders remain available. Browser history may be incomplete.' : 'PO yang terkonfirmasi di server tetap dapat digunakan. Riwayat browser mungkin belum lengkap.')}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={handleRecoveryBackup}>{lang === 'en' ? 'Download recovery backup' : 'Unduh cadangan pemulihan'}</Button>
          <Button variant="secondary" onClick={refreshLocalCache}>{lang === 'en' ? 'Retry local data' : 'Coba baca data lokal'}</Button>
        </div>
      </div>}
      {initialPoId && ordersLoading && <p role="status" className="text-sm text-[var(--ws-muted)]">{lang === 'en' ? 'Loading the selected order…' : 'Memuat pesanan yang dipilih…'}</p>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
        <Card>
          <p className="text-[#666] dark:text-[#a1a1aa] text-sm font-medium tracking-tight">
            {lang === 'en' ? 'Active Purchase Orders' : 'Total PO Aktif'}
          </p>
          <h3 className="text-3xl font-semibold tracking-tighter mt-1 text-[#171717] dark:text-[#ededed] tabular-nums">{pos.filter(po => !['Selesai', 'Ditolak'].includes(po.status)).length}</h3>
          <p className="text-[#666] dark:text-[#a1a1aa] text-xs mt-2">
            <span className="text-[#0070f3] dark:text-[#3291ff] font-medium">{pos.filter(po => po.status === 'Pending Approval').length} PO</span> {lang === 'en' ? 'In Progress' : 'Dalam Proses'}
          </p>
        </Card>
        <Card>
          <p className="text-[#666] dark:text-[#a1a1aa] text-sm font-medium tracking-tight">
            {lang === 'en' ? 'Committed Value (This Month)' : 'Nilai Pengadaan (Bulan Ini)'}
          </p>
          <h3 className="text-3xl font-semibold tracking-tighter mt-1 text-[#171717] dark:text-[#ededed] tabular-nums">
            Rp {pos.filter(po => po.status !== 'Ditolak' && po.date.startsWith(businessDate().slice(0, 7))).reduce((sum, po) => sum + po.total, 0).toLocaleString(numLocale)}
          </h3>
          <p className="text-[#666] dark:text-[#a1a1aa] text-xs mt-2">{activeT.procurement.awaitingReview}</p>
        </Card>
        <Card>
          <p className="text-[#666] dark:text-[#a1a1aa] text-sm font-medium tracking-tight">
            {activeT.procurement.activeVendors}
          </p>
          <h3 className="text-3xl font-semibold tracking-tighter mt-1 text-[#171717] dark:text-[#ededed] tabular-nums">{new Set(pos.map(po => po.vendor)).size}</h3>
          <p className="text-[#666] dark:text-[#a1a1aa] text-xs mt-2">
            <span className="text-[#10b981] dark:text-[#34d399] font-medium">
              {lang === 'en' ? 'From recorded POs' : 'Dari PO tercatat'}
            </span>
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
            aria-pressed={isVirtualized}
            title={lang === 'en' ? 'Toggle compact table' : 'Ganti tabel ringkas'}
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isVirtualized ? (lang === 'en' ? 'Compact table' : 'Tabel ringkas') : (lang === 'en' ? 'Standard table' : 'Tabel standar')}</span>
          </button>
          <Button variant="secondary" onClick={() => { setAuditPoFilter(null); setIsAuditOpen(true); }}>
            <History className="w-3.5 h-3.5" />
            <span>{lang === 'en' ? 'Activity' : 'Aktivitas'}</span>
          </Button>
          <Button variant="primary" disabled={!canPerformPoAction(role, 'create')} onClick={() => onNavigate('purchase')}>
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
                aria-label={activeT.procurement.searchPlaceholder}
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
                { key: 'status', header: activeT.procurement.status, width: '20%', render: (item) => <ChangeHighlight value={item.status}><Badge color={item.color as any}>{item.status}</Badge></ChangeHighlight> }
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
              <Th sortable sortDirection={sortConfig?.key === 'id' ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : undefined} onSort={() => handleSort('id')}>{activeT.procurement.poNumber}</Th>
              <Th sortable sortDirection={sortConfig?.key === 'vendor' ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : undefined} onSort={() => handleSort('vendor')}>{activeT.procurement.vendor}</Th>
              <Th sortable sortDirection={sortConfig?.key === 'date' ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : undefined} onSort={() => handleSort('date')}>{activeT.procurement.date}</Th>
              <Th sortable sortDirection={sortConfig?.key === 'total' ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : undefined} onSort={() => handleSort('total')}>{activeT.procurement.amount}</Th>
              <Th sortable sortDirection={sortConfig?.key === 'status' ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : undefined} onSort={() => handleSort('status')}>{activeT.procurement.status}</Th>
              <Th>{lang === 'en' ? 'Receipt' : 'Penerimaan'}</Th>
              <Th align="right">{activeT.procurement.actions}</Th>
            </tr>
          </thead>
          <tbody>
            {paginatedPos.length > 0 ? (
              paginatedPos.map((po, idx) => (
                <Tr key={po.id} index={idx}>
                  <Td><span className="text-xs text-[#666] dark:text-[#a1a1aa] font-medium">{po.id}</span></Td>
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
                  <Td><ChangeHighlight value={po.status}><Badge color={po.color as any}>{getStatusBadgeText(po.status)}</Badge></ChangeHighlight></Td>
                  <Td>
                    {po.threeWayMatchStatus === 'MATCHED' ? (
                      <button
                        type="button"
                        onClick={() => setThreeWayPo(po)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer"
                        title={po.grn ? `${po.grn.grnNumber} (${po.grn.suratJalanNumber})` : '100% 3-Way Match Verified'}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{po.grn?.grnNumber ? po.grn.grnNumber : 'Matched (GRN)'}</span>
                      </button>
                    ) : po.threeWayMatchStatus === 'DISCREPANCY' ? (
                      <button
                        type="button"
                        onClick={() => setThreeWayPo(po)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-800 cursor-pointer hover:bg-amber-100 transition-colors"
                        title="Click to view GRN discrepancy details"
                      >
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        <span>{po.grn?.grnNumber ? `${po.grn.grnNumber} (Selisih)` : 'Discrepancy'}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setThreeWayPo(po)}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-neutral-600 hover:text-[#0070f3] dark:text-neutral-400 dark:hover:text-[#3291ff] bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded border border-neutral-200 dark:border-neutral-700 transition-colors cursor-pointer"
                        title={lang === 'en' ? 'Inspect and record GRN' : 'Periksa dan catat penerimaan GRN'}
                      >
                        <PackageCheck className="w-3.5 h-3.5 text-blue-500" />
                        <span>{lang === 'en' ? 'Inspect' : 'Periksa'}</span>
                      </button>
                    )}
                  </Td>
                  <Td align="right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setThreeWayPo(po)}
                        className="p-1.5 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                        aria-label={lang === 'en' ? `Inspect receipt ${po.id}` : `Periksa penerimaan ${po.id}`} title={lang === 'en' ? 'Inspect receipt' : 'Periksa penerimaan'}
                      >
                        <PackageCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      </button>
                      {canPerformPoAction(role, 'pay') && po.status === 'Barang Diterima' && po.threeWayMatchStatus === 'MATCHED' && (isDemo || po.receiptVerification?.version === 1) && !po.paymentInfo && (
                        <button
                          type="button"
                          onClick={() => setSelectedPoForPayment(po)}
                          className="bg-[#0070f3] hover:bg-[#0060df] text-white text-xs font-semibold px-2.5 py-1.5 rounded-md shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
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
                      {po.status === 'Pending Approval' && canPerformPoAction(role, 'approve') ? (
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
          {kanbanColumns.map(col => {
            const columnPos = pos.filter(po =>
              col.status === 'Ditolak'
                ? (po.status === 'Ditolak' || po.status === 'Selisih Penerimaan')
                : po.status === col.status
            );
            return (
            <div
              key={col.status}
              className="flex-shrink-0 w-80 bg-[#eaeaea]/50 dark:bg-[#111] rounded-xl flex flex-col max-h-full border border-[#eaeaea] dark:border-[#333]"
              onDragOver={onDragOver}
              onDrop={(e) => onDrop(e, col.status, col.color)}
            >
              <div className="px-4 py-3 border-b border-[#eaeaea] dark:border-[#333] flex items-center justify-between bg-[#fafafa] dark:bg-[#0a0a0a] rounded-t-xl shrink-0">
                <span className="font-semibold text-sm tracking-tight text-[#171717] dark:text-[#ededed]">{col.title}</span>
                <Badge color={col.color}>{columnPos.length}</Badge>
              </div>
              <div className="p-3 flex-1 overflow-y-auto space-y-3">
                <AnimatePresence initial={false}>
                  {columnPos.map(po => (
                    <motion.div
                      key={po.id}
                      initial={reduced ? false : { opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, transition: { duration: reduced ? 0 : workspaceMotion.exit } }}
                      transition={{ duration: reduced ? 0 : workspaceMotion.feedback, ease: workspaceMotion.ease }}
                      draggable
                      onDragStart={(e: any) => onDragStart(e, po.id)}
                      className="bg-white dark:bg-[#1a1a1a] p-4 rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.04),0_0_0_1px_rgba(0,0,0,0.08)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.2),0_0_0_1px_rgba(255,255,255,0.1)] cursor-grab active:cursor-grabbing hover:shadow-[0_4px_12px_rgba(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.08)] transition-shadow"
                      onClick={() => setActiveModal({ type: po.status === 'Pending Approval' ? 'review' : 'detail', data: po })}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-mono text-xs font-medium text-[#666] dark:text-[#a1a1aa]">{po.id}</span>
                        {po.status === 'Selesai' ? (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-semibold">
                            {activeT.procurement.paidStatus.toUpperCase()}
                          </span>
                        ) : po.status === 'Barang Diterima' ? (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-semibold">
                            GRN RECEIVED
                          </span>
                        ) : null}
                      </div>
                      <div className="font-medium text-sm text-[#171717] dark:text-[#ededed] leading-tight mb-1">{po.vendor}</div>
                      <div className="text-xs text-[#666] dark:text-[#a1a1aa] mb-2">{po.desc}</div>

                      {po.threeWayMatchStatus === 'MATCHED' && (
                        <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mb-2">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{po.grn?.grnNumber ? `${po.grn.grnNumber} (Matched)` : '3-Way Match Matched'}</span>
                        </div>
                      )}
                      {po.threeWayMatchStatus === 'DISCREPANCY' && (
                        <div className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-semibold mb-2">
                          <AlertTriangle className="w-3 h-3" />
                          <span>{po.grn?.grnNumber ? `${po.grn.grnNumber} (Selisih)` : 'Selisih Penerimaan'}</span>
                        </div>
                      )}

                      {canPerformPoAction(role, 'pay') && po.status === 'Barang Diterima' && po.threeWayMatchStatus === 'MATCHED' && (isDemo || po.receiptVerification?.version === 1) && !po.paymentInfo && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPoForPayment(po);
                          }}
                          className="w-full my-2 bg-[#0070f3] hover:bg-[#0060df] text-white text-xs font-semibold py-1.5 px-2.5 rounded-md flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
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
                {columnPos.length === 0 && (
                  <div className="py-6 px-4 text-center border-2 border-dashed border-[#eaeaea] dark:border-[#333] rounded-lg">
                    <span className="text-xs text-[#999]">{lang === 'en' ? 'Drop cards here' : 'Tarik kartu ke sini'}</span>
                  </div>
                )}
              </div>
            </div>
            );
          })}
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
            searchValue={txSearch}
            onSearchChange={(v) => { setTxSearch(v); setTxPage(1); }}
            currentPage={txPage}
            totalPages={txTotalPages}
            onPageChange={setTxPage}
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
              {paginatedTransactions.length > 0 ? (
                paginatedTransactions.map((tx, idx) => (
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
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            downloadReceiptPdf({
                              id: tx.poId,
                              client: tx.vendor,
                              date: new Date(tx.timestamp).toISOString().split('T')[0],
                              total: tx.totalPaid,
                              desc: `Settlement for PO ${tx.poId} via ${tx.methodLabel}`,
                              paymentMethod: tx.methodLabel,
                              receiptNumber: tx.receiptNumber
                            }, lang);
                            onToast(
                              lang === 'en' ? `Receipt ${tx.receiptNumber}.pdf downloaded` : `Kwitansi ${tx.receiptNumber}.pdf berhasil diunduh`,
                              'success'
                            );
                          }}
                          className="px-2 py-1 text-xs text-[#0070f3] dark:text-[#3291ff] hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded border border-blue-200 dark:border-blue-900/60 flex items-center gap-1 font-semibold cursor-pointer transition-colors"
                          title={lang === 'en' ? 'Download PDF receipt' : 'Unduh kwitansi PDF'}
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>{lang === 'en' ? 'Receipt' : 'Kwitansi'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const target = pos.find(p => p.id === tx.poId);
                            if (target) {
                              setViewMode('list');
                              setActiveModal({ type: 'detail', data: target });
                            }
                          }}
                          className="p-1 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                          title={lang === 'en' ? 'View linked PO details' : 'Lihat detail PO terkait'}
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                      </div>
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

      <Modal isOpen={activeModal !== null} onClose={() => setActiveModal(null)} size="xl" closeDisabled={transitionBusy}
        title={activeModal?.type === 'review' ? (lang === 'en' ? 'Review purchase order' : 'Tinjau purchase order') : (lang === 'en' ? 'Purchase order details' : 'Detail purchase order')}
        footer={activeModal && <div className="po-review-footer">
          <Button variant="secondary" disabled={transitionBusy} onClick={() => setActiveModal(null)}>{activeT.common.close}</Button>
          {activeModal.data.status === 'Pending Approval' && canPerformPoAction(role, 'approve') && <>
            <Button variant="secondary" disabled={transitionBusy} onClick={() => handleReject(activeModal.data.id)}>{activeT.procurement.rejectBtn}</Button>
            <Button isLoading={transitionBusy} onClick={() => handleApprove(activeModal.data.id)}>{activeT.procurement.approveBtn}</Button>
          </>}
          {canPerformPoAction(role, 'pay') && activeModal.data.status === 'Barang Diterima' && activeModal.data.threeWayMatchStatus === 'MATCHED' && (isDemo || activeModal.data.receiptVerification?.version === 1) && !activeModal.data.paymentInfo &&
            <Button onClick={() => { const target = activeModal.data; setActiveModal(null); setSelectedPoForPayment(target); }}>
              <CreditCard size={16}/>{lang === 'en' ? 'Simulate payment' : 'Simulasi pembayaran'}
            </Button>}
        </div>}>
        {activeModal && <div className="po-review">
          <div className="po-review-identity"><div><p className="po-review-id">{activeModal.data.id}</p><h4>{activeModal.data.vendor}</h4></div>
            <ChangeHighlight value={activeModal.data.status}><span className={`order-status status-${poStatusTone(activeModal.data.status)}`}>{poStatusLabel(activeModal.data.status, lang)}</span></ChangeHighlight>
          </div>
          <dl className="po-review-metadata">
            <div><dt>{lang === 'en' ? 'Order date' : 'Tanggal pesanan'}</dt><dd>{activeModal.data.date}</dd></div>
            <div><dt>{lang === 'en' ? 'Expected delivery' : 'Target kirim'}</dt><dd>{activeModal.data.deliveryDate || '—'}</dd></div>
            <div><dt>{lang === 'en' ? 'Department' : 'Departemen'}</dt><dd>{activeModal.data.department || '—'}</dd></div>
          </dl>
          <PurchaseOrderItems order={activeModal.data} lang={lang}/>
          <div className="po-review-actions">
            <Button variant="secondary" disabled={transitionBusy} onClick={() => { const target=activeModal.data; setActiveModal(null); setThreeWayPo(target); }}>
              <PackageCheck size={15}/>{lang === 'en' ? 'Goods receipt' : 'Penerimaan barang'}
            </Button>
            <Button variant="secondary" disabled={transitionBusy} onClick={() => { const target=activeModal.data; setActiveModal(null); setPoForPrint(target); }}><Printer size={15}/>{lang === 'en' ? 'Print PO' : 'Cetak PO'}</Button>
            <Button variant="secondary" disabled={transitionBusy} onClick={() => { setAuditPoFilter(activeModal.data.id); setActiveModal(null); setIsAuditOpen(true); }}><History size={15}/>{lang === 'en' ? 'Activity' : 'Aktivitas'}</Button>
          </div>
          {(activeModal.data.notes || activeModal.data.desc) && <details className="po-extra"><summary>{lang === 'en' ? 'Order notes' : 'Catatan pesanan'}</summary>
            <p className="po-review-notes">{activeModal.data.notes || activeModal.data.desc}</p>
          </details>}
          {activeModal.data.grn && <details className="po-extra"><summary>{lang === 'en' ? 'Receipt details' : 'Rincian penerimaan'} · {activeModal.data.grn.grnNumber}</summary>
            <dl className="po-review-metadata">
              <div><dt>{lang === 'en' ? 'Delivery note' : 'Surat jalan'}</dt><dd>{activeModal.data.grn.suratJalanNumber}</dd></div>
              <div><dt>{lang === 'en' ? 'Receiver' : 'Penerima'}</dt><dd>{activeModal.data.grn.receivedBy}</dd></div>
              <div><dt>{lang === 'en' ? 'Result' : 'Hasil'}</dt><dd>{activeModal.data.grn.status === 'MATCHED' ? (lang === 'en' ? 'Matched' : 'Sesuai') : (lang === 'en' ? 'Discrepancy' : 'Ada selisih')}</dd></div>
            </dl><p className="po-review-notes">{activeModal.data.grn.inspectorNotes}</p>
          </details>}
          {activeModal.data.status === 'Selesai' && <p className="po-review-muted">{lang === 'en' ? 'Simulated payment recorded. No bank transfer was made.' : 'Pembayaran simulasi tercatat. Tidak ada transfer dana bank.'}</p>}
          <details className="po-extra"><summary>{lang === 'en' ? 'Budget and risk' : 'Anggaran dan risiko'}</summary>
            <p className="po-review-muted">{lang === 'en' ? 'Sample department budget utilization' : 'Pemakaian anggaran departemen contoh'}: {checkDepartmentBudgetLimit(activeModal.data.department || 'IT Infrastructure', activeModal.data.total).projectedPercentage}%</p>
            <PoRiskCard po={activeModal.data} lang={lang}/>
          </details>
        </div>}
      </Modal>

      {/* 3-Way Match Modal & Goods Receipt Inspector */}
      {threeWayPo && (
        <ThreeWayMatchModal
          isOpen={threeWayPo !== null}
          onClose={() => setThreeWayPo(null)}
          po={threeWayPo}
          onSaveGrn={handleSaveGrn}
          canEdit={canPerformPoAction(role, 'receive') && (['Disetujui', 'Selisih Penerimaan'].includes(threeWayPo.status) || (threeWayPo.status === 'Barang Diterima' && !threeWayPo.receiptVerification && !threeWayPo.paymentInfo))}
          lang={lang}
        />
      )}

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
      {poForPrint && (
        <PrintableVoucher
          po={poForPrint}
          onClose={() => setPoForPrint(null)}
          lang={lang}
        />
      )}
    </section>
  );
}
export default ProcurementView;
