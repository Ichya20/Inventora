import React, { useState, useEffect } from 'react';
import { 
  PackageCheck, AlertTriangle, CheckCircle2, FileText, Truck, ShieldCheck, 
  ArrowRight, X, Sparkles, RefreshCw, Check, ArrowDown
} from 'lucide-react';
import { PurchaseOrder, GoodsReceiptNote, GoodsReceiptItem, ThreeWayMatchStatus } from '../types';
import { Modal, Button, Badge } from './UI';

interface ThreeWayMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  po: PurchaseOrder | null;
  onSaveGrn: (poId: string, grn: GoodsReceiptNote, newMatchStatus: ThreeWayMatchStatus) => void;
  lang?: 'en' | 'id';
}

// Helper to extract line items safely from either lineItems or items or fallback
function getInitialItems(targetPo: PurchaseOrder | null, lang: 'en' | 'id' = 'en'): GoodsReceiptItem[] {
  if (!targetPo) return [];

  if (targetPo.grn?.items && targetPo.grn.items.length > 0) {
    return targetPo.grn.items.map(it => ({ ...it }));
  }

  const source = (targetPo.lineItems && targetPo.lineItems.length > 0)
    ? targetPo.lineItems
    : (targetPo.items && targetPo.items.length > 0)
    ? targetPo.items
    : null;

  if (source && source.length > 0) {
    return source.map((it: any, idx: number) => {
      const qty = Number(it.qty || it.quantity || 1);
      return {
        sku: it.sku || `SKU-${idx + 1}`,
        name: it.name || it.desc || targetPo.desc || `Item #${idx + 1}`,
        orderedQty: qty,
        receivedQty: qty,
        condition: 'GOOD' as const,
        notes: ''
      };
    });
  }

  return [
    {
      sku: 'SKU-GEN-01',
      name: targetPo.desc || (lang === 'en' ? 'General Hardware Requisition' : 'Pengadaan Perangkat Keras Umum'),
      orderedQty: 10,
      receivedQty: 10,
      condition: 'GOOD' as const,
      notes: ''
    }
  ];
}

export function ThreeWayMatchModal({
  isOpen,
  onClose,
  po,
  onSaveGrn,
  lang = 'en'
}: ThreeWayMatchModalProps) {
  const [suratJalan, setSuratJalan] = useState<string>('');
  const [receivedBy, setReceivedBy] = useState<string>('');
  const [inspectorNotes, setInspectorNotes] = useState<string>('');
  const [items, setItems] = useState<GoodsReceiptItem[]>([]);

  // Synchronize state whenever modal is opened or the target PO changes
  useEffect(() => {
    if (isOpen && po) {
      setSuratJalan(po.grn?.suratJalanNumber || `SJ-${po.id.replace('PO-', '')}-WH1`);
      setReceivedBy(po.grn?.receivedBy || 'Budi Santoso (Warehouse Lead)');
      setInspectorNotes(
        po.grn?.inspectorNotes || 
        (lang === 'en' 
          ? 'Physical inspection and serial number scan completed at Dock 4.' 
          : 'Pemeriksaan fisik dan pemindaian nomor seri selesai di Dock 4.')
      );
      setItems(getInitialItems(po, lang));
    }
  }, [isOpen, po, lang]);

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !po) return null;

  const handleQtyChange = (index: number, val: number) => {
    setItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], receivedQty: Math.max(0, val) };
      return updated;
    });
  };

  const handleConditionChange = (index: number, condition: GoodsReceiptItem['condition']) => {
    setItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], condition };
      return updated;
    });
  };

  // Quick action: Match 100%
  const handleMatchAll = () => {
    setItems(prev => prev.map(it => ({
      ...it,
      receivedQty: it.orderedQty,
      condition: 'GOOD'
    })));
  };

  // Quick action: Simulate shortage for testing workflow
  const handleSimulateDiscrepancy = () => {
    setItems(prev => prev.map((it, idx) => {
      if (idx === 0) {
        return {
          ...it,
          receivedQty: Math.max(0, it.orderedQty - 1),
          condition: 'SHORTAGE'
        };
      }
      return it;
    }));
  };

  // Compute 3-way matching status
  const hasDiscrepancy = items.some(it => 
    it.receivedQty !== it.orderedQty || 
    it.condition === 'DAMAGED' || 
    it.condition === 'SHORTAGE'
  );
  const matchStatus: ThreeWayMatchStatus = hasDiscrepancy ? 'DISCREPANCY' : 'MATCHED';

  // Planned target PO status
  const targetPoStatus = matchStatus === 'MATCHED'
    ? (lang === 'en' ? 'Goods Received (Ready for Payment)' : 'Barang Diterima (Siap Bayar)')
    : (lang === 'en' ? 'GRN Discrepancy' : 'Selisih Penerimaan');

  const handleConfirmGrn = () => {
    const existingGrn = po.grn;
    const grnRecord: GoodsReceiptNote = {
      id: existingGrn?.id || `GRN-${Date.now().toString().slice(-6)}`,
      grnNumber: existingGrn?.grnNumber || `GRN-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      poId: po.id,
      receivedDate: new Date().toISOString().split('T')[0],
      receivedBy: receivedBy.trim() || 'Warehouse Officer',
      suratJalanNumber: suratJalan.trim() || `SJ-${po.id.replace('PO-', '')}-WH1`,
      items,
      status: matchStatus === 'MATCHED' ? 'MATCHED' : 'DISCREPANCY',
      inspectorNotes
    };

    onSaveGrn(po.id, grnRecord, matchStatus);
    onClose();
  };

  const numLocale = lang === 'en' ? 'en-US' : 'id-ID';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={lang === 'en' ? 'Three-Way Matching & Goods Receipt (GRN)' : 'Pencocokan 3 Arah & Penerimaan Barang (GRN)'}
    >
      <div className="space-y-4 max-h-[78vh] overflow-y-auto pr-1">
        {/* Workflow Lifecycle Stepper */}
        <div className="bg-neutral-100/80 dark:bg-neutral-900/90 rounded-xl p-3 border border-neutral-200 dark:border-neutral-800">
          <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-2 flex items-center justify-between">
            <span>{lang === 'en' ? 'Enterprise Procurement 3-Way Match Workflow' : 'Alur Kerja 3-Way Match Pengadaan'}</span>
            <span className="font-mono text-neutral-400">PO: {po.id}</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
            {/* Step 1: PO */}
            <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60">
              <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-bold text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>1. {lang === 'en' ? 'Purchase Order' : 'Purchase Order'}</span>
              </div>
              <div className="font-semibold text-neutral-900 dark:text-neutral-100 text-xs mt-1 truncate">
                {po.vendor}
              </div>
              <div className="text-[10px] text-neutral-500 font-mono">
                Rp {Number(po.total).toLocaleString(numLocale)}
              </div>
            </div>

            {/* Step 2: GRN (Active Step) */}
            <div className={`p-2.5 rounded-lg border relative ${
              hasDiscrepancy 
                ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700' 
                : 'bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700 ring-2 ring-blue-500/20'
            }`}>
              <div className="flex items-center gap-1.5 font-bold text-[11px] text-blue-700 dark:text-blue-400">
                <Truck className="w-3.5 h-3.5" />
                <span>2. {lang === 'en' ? 'Physical GRN' : 'Penerimaan GRN'}</span>
              </div>
              <div className="font-mono text-xs font-semibold text-neutral-900 dark:text-neutral-100 mt-1 truncate">
                {suratJalan || 'SJ-PENDING'}
              </div>
              <div className={`text-[10px] font-bold ${hasDiscrepancy ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400'}`}>
                {hasDiscrepancy 
                  ? (lang === 'en' ? 'Discrepancy' : 'Ada Selisih') 
                  : (lang === 'en' ? 'Active Inspection' : 'Inspeksi Fisik')}
              </div>
            </div>

            {/* Step 3: Payment Clearance */}
            <div className="p-2.5 rounded-lg bg-white dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-700/60 opacity-90">
              <div className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-400 font-semibold text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5 text-neutral-400" />
                <span>3. {lang === 'en' ? 'Payment Release' : 'Pelunasan Faktur'}</span>
              </div>
              <div className="text-xs text-neutral-500 mt-1">
                {matchStatus === 'MATCHED'
                  ? (lang === 'en' ? 'Unlocks Payment' : 'Siap Dibayar via Gateway')
                  : (lang === 'en' ? 'Requires Reconciliation' : 'Perlu Rekonsiliasi')}
              </div>
            </div>
          </div>
        </div>

        {/* Status Callout Banner */}
        <div className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          hasDiscrepancy
            ? 'bg-amber-500/10 border-amber-500/20 text-amber-900 dark:text-amber-300'
            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-900 dark:text-emerald-300'
        }`}>
          <div className="flex items-start gap-2.5">
            {hasDiscrepancy ? (
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            ) : (
              <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="font-semibold text-xs flex items-center gap-2">
                <span>{hasDiscrepancy ? (lang === 'en' ? 'Physical Discrepancy Detected' : 'Terdeteksi Selisih Fisik Penerimaan') : (lang === 'en' ? '100% 3-Way Match Verified' : 'Kesesuaian 3 Arah Sempurna (100% Match)')}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/70 dark:bg-black/30 border border-current">
                  {matchStatus}
                </span>
              </div>
              <p className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-1">
                {lang === 'en'
                  ? hasDiscrepancy
                    ? `Recording this GRN will immediately update PO status to "${targetPoStatus}" for vendor audit reconciliation.`
                    : `Recording this GRN will advance PO status from "${po.status}" to "${targetPoStatus}" and enable one-click Payment Gateway settlement.`
                  : hasDiscrepancy
                    ? `Menerbitkan GRN ini akan memperbarui status PO menjadi "${targetPoStatus}" untuk rekonsiliasi audit vendor.`
                    : `Menerbitkan GRN ini akan mengubah status PO dari "${po.status}" menjadi "${targetPoStatus}" dan membuka pelunasan Payment Gateway.`
                }
              </p>
            </div>
          </div>

          <div className="flex sm:flex-col gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleMatchAll}
              className="text-[11px] font-medium px-2.5 py-1 rounded bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 transition-colors cursor-pointer"
            >
              {lang === 'en' ? 'Match All (100%)' : 'Cocokkan Semua (100%)'}
            </button>
            <button
              type="button"
              onClick={handleSimulateDiscrepancy}
              className="text-[11px] font-medium px-2.5 py-1 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 transition-colors cursor-pointer"
            >
              {lang === 'en' ? 'Simulate Shortage' : 'Simulasi Selisih'}
            </button>
          </div>
        </div>

        {/* Delivery Details Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              {lang === 'en' ? 'Delivery Note / Surat Jalan No.' : 'Nomor Surat Jalan'}
            </label>
            <input
              type="text"
              value={suratJalan}
              onChange={(e) => setSuratJalan(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-[#0070f3]"
              placeholder="e.g. SJ-2026-9921"
            />
          </div>

          <div>
            <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              {lang === 'en' ? 'Receiving Inspector / Officer' : 'Petugas Penerima Gudang'}
            </label>
            <input
              type="text"
              value={receivedBy}
              onChange={(e) => setReceivedBy(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-xs focus:outline-none focus:ring-1 focus:ring-[#0070f3]"
              placeholder="e.g. Budi Santoso"
            />
          </div>
        </div>

        {/* Physical Line Items Inspection Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              {lang === 'en' ? 'Physical Inspection Line Items' : 'Daftar Pemeriksaan Fisik Barang'}
            </h4>
            <span className="text-[11px] text-neutral-400 font-mono">
              {items.length} {lang === 'en' ? 'items itemized' : 'barang terdaftar'}
            </span>
          </div>

          <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-xs text-left">
              <thead className="bg-neutral-100 dark:bg-neutral-800/60 text-neutral-600 dark:text-neutral-400 font-medium border-b border-neutral-200 dark:border-neutral-800">
                <tr>
                  <th className="py-2.5 px-3">{lang === 'en' ? 'Item / SKU' : 'Nama Barang / SKU'}</th>
                  <th className="py-2.5 px-3 text-center">{lang === 'en' ? 'PO Qty' : 'Jumlah PO'}</th>
                  <th className="py-2.5 px-3 text-center">{lang === 'en' ? 'Received Qty' : 'Jumlah Diterima'}</th>
                  <th className="py-2.5 px-3 text-center">{lang === 'en' ? 'Condition' : 'Kondisi Fisik'}</th>
                  <th className="py-2.5 px-3 text-right">{lang === 'en' ? 'Verification' : 'Status'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 bg-white dark:bg-neutral-900/40">
                {items.map((it, idx) => {
                  const isShortage = it.receivedQty < it.orderedQty;
                  const isOver = it.receivedQty > it.orderedQty;
                  const isDamaged = it.condition === 'DAMAGED';
                  const isMatched = !isShortage && !isOver && !isDamaged;

                  return (
                    <tr key={idx} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-neutral-900 dark:text-neutral-100 text-xs">{it.name}</div>
                        <div className="font-mono text-[10px] text-neutral-400">{it.sku}</div>
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-neutral-800 dark:text-neutral-200 font-mono">
                        {it.orderedQty}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="number"
                          min="0"
                          value={it.receivedQty}
                          onChange={(e) => handleQtyChange(idx, parseInt(e.target.value) || 0)}
                          className={`w-16 px-2 py-1 text-center font-bold font-mono rounded border text-xs ${
                            isShortage
                              ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300'
                              : isOver
                              ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300'
                              : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100'
                          }`}
                        />
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <select
                          value={it.condition}
                          onChange={(e) => handleConditionChange(idx, e.target.value as any)}
                          className="px-2 py-1 rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs"
                        >
                          <option value="GOOD">{lang === 'en' ? 'Good (Baik)' : 'Baik'}</option>
                          <option value="EXCELLENT">{lang === 'en' ? 'Excellent (Sempurna)' : 'Sempurna'}</option>
                          <option value="DAMAGED">{lang === 'en' ? 'Damaged (Rusak)' : 'Rusak'}</option>
                          <option value="SHORTAGE">{lang === 'en' ? 'Shortage (Kurang)' : 'Kurang'}</option>
                        </select>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {isMatched ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400 text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" /> OK
                          </span>
                        ) : isShortage ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400 text-[11px]">
                            <AlertTriangle className="w-3.5 h-3.5" /> -{it.orderedQty - it.receivedQty}
                          </span>
                        ) : isDamaged ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-rose-600 dark:text-rose-400 text-[11px]">
                            <AlertTriangle className="w-3.5 h-3.5" /> Defect
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400 text-[11px]">
                            +{it.receivedQty - it.orderedQty}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Inspector Remarks */}
        <div>
          <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            {lang === 'en' ? 'Inspection Notes / Dock Receiving Log' : 'Catatan Pemeriksaan Gudang'}
          </label>
          <textarea
            value={inspectorNotes}
            onChange={(e) => setInspectorNotes(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-xs focus:outline-none focus:ring-1 focus:ring-[#0070f3]"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-neutral-200 dark:border-neutral-800">
          <div className="text-xs text-neutral-500">
            {lang === 'en' ? 'Target Status: ' : 'Status Baru: '}
            <span className={`font-semibold ${hasDiscrepancy ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {targetPoStatus}
            </span>
          </div>

          <div className="flex gap-2 w-full sm:w-auto justify-end">
            <Button variant="secondary" onClick={onClose}>
              {lang === 'en' ? 'Cancel' : 'Batal'}
            </Button>
            <Button 
              variant="primary" 
              onClick={handleConfirmGrn}
              className={hasDiscrepancy ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              {hasDiscrepancy 
                ? (lang === 'en' ? 'Record GRN with Discrepancy' : 'Catat GRN dengan Selisih')
                : (lang === 'en' ? 'Confirm & Record GRN' : 'Konfirmasi & Terbitkan GRN')
              }
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
