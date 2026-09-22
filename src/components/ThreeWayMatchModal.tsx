import React, { useState } from 'react';
import { PackageCheck, AlertTriangle, CheckCircle2, FileText, Truck, ShieldCheck, ArrowRight, X } from 'lucide-react';
import { PurchaseOrder, GoodsReceiptNote, GoodsReceiptItem, ThreeWayMatchStatus } from '../types';
import { Modal, Button, Badge } from './UI';

interface ThreeWayMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  po: PurchaseOrder | null;
  onSaveGrn: (poId: string, grn: GoodsReceiptNote, newMatchStatus: ThreeWayMatchStatus) => void;
  lang?: 'en' | 'id';
}

export function ThreeWayMatchModal({
  isOpen,
  onClose,
  po,
  onSaveGrn,
  lang = 'en'
}: ThreeWayMatchModalProps) {
  if (!po) return null;

  // Initialize receipt items based on PO line items, or fallback default
  const defaultItems = (po.items && po.items.length > 0)
    ? po.items.map(it => ({
        sku: it.sku || 'SKU-GEN',
        name: it.name,
        orderedQty: it.qty,
        receivedQty: it.qty,
        condition: 'GOOD' as const,
        notes: ''
      }))
    : [
        {
          sku: 'SKU-EXP-01',
          name: po.desc || 'Standard Hardware Equipment Requisition',
          orderedQty: 10,
          receivedQty: 10,
          condition: 'GOOD' as const,
          notes: ''
        }
      ];

  const existingGrn = po.grn;
  const [suratJalan, setSuratJalan] = useState(existingGrn?.suratJalanNumber || `SJ-${po.id.replace('PO-', '')}-WH1`);
  const [receivedBy, setReceivedBy] = useState(existingGrn?.receivedBy || 'Budi Santoso (Warehouse Lead)');
  const [inspectorNotes, setInspectorNotes] = useState(existingGrn?.inspectorNotes || 'All serial numbers inspected and verified at Dock 4.');
  const [items, setItems] = useState<GoodsReceiptItem[]>(existingGrn?.items || defaultItems);

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

  // Compute 3-way matching status
  const hasDiscrepancy = items.some(it => it.receivedQty !== it.orderedQty || it.condition === 'DAMAGED' || it.condition === 'SHORTAGE');
  const matchStatus: ThreeWayMatchStatus = hasDiscrepancy ? 'DISCREPANCY' : 'MATCHED';

  const handleConfirmGrn = () => {
    const grnRecord: GoodsReceiptNote = {
      id: existingGrn?.id || `GRN-${Date.now().toString().slice(-6)}`,
      grnNumber: existingGrn?.grnNumber || `GRN-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      poId: po.id,
      receivedDate: new Date().toISOString().split('T')[0],
      receivedBy,
      suratJalanNumber: suratJalan,
      items,
      status: matchStatus === 'MATCHED' ? 'MATCHED' : 'DISCREPANCY',
      inspectorNotes
    };

    onSaveGrn(po.id, grnRecord, matchStatus);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={lang === 'en' ? 'Three-Way Matching & Goods Receipt (GRN)' : 'Pencocokan 3 Arah & Penerimaan Barang (GRN)'}
    >
      <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">
        {/* Header Summary Banner */}
        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-semibold text-neutral-900 dark:text-neutral-100 text-sm">{po.id}</span>
              <span className="text-xs text-neutral-500">• {po.vendor}</span>
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
              {lang === 'en'
                ? 'Verify physical delivery against purchase order and commercial invoice.'
                : 'Verifikasi kesesuaian fisik pengiriman barang dengan PO dan faktur tagihan.'}
            </p>
          </div>

          <div className="shrink-0">
            {hasDiscrepancy ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                <AlertTriangle className="w-3.5 h-3.5" />
                {lang === 'en' ? 'Discrepancy Detected' : 'Ada Selisih Fisik'}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="w-3.5 h-3.5" />
                {lang === 'en' ? '100% 3-Way Match' : 'Cocok 3 Arah (Matched)'}
              </span>
            )}
          </div>
        </div>

        {/* Input Details Grid */}
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
            />
          </div>
        </div>

        {/* Line Items Verification Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              {lang === 'en' ? 'Physical Inspection Line Items' : 'Daftar Pemeriksaan Fisik Barang'}
            </h4>
            <span className="text-[11px] text-neutral-400">
              {items.length} {lang === 'en' ? 'Items' : 'Barang'}
            </span>
          </div>

          <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-neutral-100 dark:bg-neutral-800/60 text-neutral-600 dark:text-neutral-400 font-medium border-b border-neutral-200 dark:border-neutral-800">
                <tr>
                  <th className="py-2.5 px-3">{lang === 'en' ? 'Item / SKU' : 'Nama Barang / SKU'}</th>
                  <th className="py-2.5 px-3 text-center">{lang === 'en' ? 'PO Qty' : 'Jumlah PO'}</th>
                  <th className="py-2.5 px-3 text-center">{lang === 'en' ? 'Received Qty' : 'Jumlah Diterima'}</th>
                  <th className="py-2.5 px-3 text-center">{lang === 'en' ? 'Condition' : 'Kondisi'}</th>
                  <th className="py-2.5 px-3 text-right">{lang === 'en' ? 'Match State' : 'Status'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 bg-white dark:bg-neutral-900/30">
                {items.map((it, idx) => {
                  const isShortage = it.receivedQty < it.orderedQty;
                  const isDamaged = it.condition === 'DAMAGED';
                  const isMatched = !isShortage && !isDamaged;

                  return (
                    <tr key={idx} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-neutral-900 dark:text-neutral-100">{it.name}</div>
                        <div className="font-mono text-[10px] text-neutral-400">{it.sku}</div>
                      </td>
                      <td className="py-2.5 px-3 text-center font-semibold text-neutral-800 dark:text-neutral-200">
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
                              ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300'
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
                          <option value="GOOD">{lang === 'en' ? 'Good' : 'Baik'}</option>
                          <option value="EXCELLENT">{lang === 'en' ? 'Excellent' : 'Sempurna'}</option>
                          <option value="DAMAGED">{lang === 'en' ? 'Damaged' : 'Rusak'}</option>
                          <option value="SHORTAGE">{lang === 'en' ? 'Shortage' : 'Kurang'}</option>
                        </select>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {isMatched ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" /> OK
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400 text-[11px]">
                            <AlertTriangle className="w-3.5 h-3.5" /> {isShortage ? `-${it.orderedQty - it.receivedQty}` : 'Defect'}
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

        {/* Three-Way Matching Audit Box */}
        <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/40 text-xs space-y-2">
          <div className="font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
            <PackageCheck className="w-4 h-4 text-[#0070f3]" />
            {lang === 'en' ? '3-Way Match Verification Matrix' : 'Matriks Validasi 3-Way Match'}
          </div>
          <div className="grid grid-cols-3 gap-2 text-[11px] pt-1 border-t border-neutral-200 dark:border-neutral-800">
            <div className="p-2 rounded bg-white dark:bg-neutral-800 border border-neutral-200/60 dark:border-neutral-700">
              <span className="text-neutral-400 block">1. PO Agreement</span>
              <span className="font-mono font-medium text-neutral-800 dark:text-neutral-200">{po.id}</span>
              <span className="text-emerald-600 block font-semibold text-[10px] mt-0.5">VERIFIED</span>
            </div>
            <div className="p-2 rounded bg-white dark:bg-neutral-800 border border-neutral-200/60 dark:border-neutral-700">
              <span className="text-neutral-400 block">2. Goods Receipt (GRN)</span>
              <span className="font-mono font-medium text-neutral-800 dark:text-neutral-200">{suratJalan || 'SJ-PENDING'}</span>
              <span className={`block font-semibold text-[10px] mt-0.5 ${hasDiscrepancy ? 'text-amber-500' : 'text-emerald-600'}`}>
                {hasDiscrepancy ? 'DISCREPANCY' : 'MATCHED'}
              </span>
            </div>
            <div className="p-2 rounded bg-white dark:bg-neutral-800 border border-neutral-200/60 dark:border-neutral-700">
              <span className="text-neutral-400 block">3. Vendor Invoice</span>
              <span className="font-mono font-medium text-neutral-800 dark:text-neutral-200">Rp {Number(po.total).toLocaleString('id-ID')}</span>
              <span className="text-emerald-600 block font-semibold text-[10px] mt-0.5">POSTED</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 justify-end pt-3 border-t border-neutral-200 dark:border-neutral-800">
          <Button variant="secondary" onClick={onClose}>
            {lang === 'en' ? 'Cancel' : 'Batal'}
          </Button>
          <Button variant="primary" onClick={handleConfirmGrn}>
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
            {lang === 'en' ? 'Confirm & Record GRN' : 'Konfirmasi & Terbitkan GRN'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
