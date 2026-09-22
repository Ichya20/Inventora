import React from 'react';
import { Printer, X, Building2, CheckCircle2, ShieldCheck } from 'lucide-react';
import { PurchaseOrder } from '../types';

interface PrintableVoucherProps {
  po: PurchaseOrder | null;
  onClose: () => void;
  lang?: 'en' | 'id';
}

export function PrintableVoucher({ po, onClose, lang = 'en' }: PrintableVoucherProps) {
  if (!po) return null;

  const handlePrint = () => {
    window.print();
  };

  const amount = typeof po.total === 'number' 
    ? po.total 
    : (parseInt(String(po.total).replace(/[^0-9]/g, ''), 10) || 0);
  const tax = Math.round(amount * 0.11);
  const grandTotal = amount + tax;

  const formatIdr = (num: number) => {
    return 'Rp ' + num.toLocaleString('id-ID');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-3xl bg-white dark:bg-[#111] rounded-2xl shadow-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800 my-8">
        {/* Action Header - Hidden during print */}
        <div className="no-print p-4 bg-neutral-50 dark:bg-[#181818] border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-[#0070f3]" />
            <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
              {lang === 'en' ? 'Official PO Voucher & Tax Summary' : 'Voucher PO Resmi & Faktur Pajak'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-[#0070f3] hover:bg-[#0060df] text-white text-xs font-medium rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{lang === 'en' ? 'Print / Export PDF' : 'Cetak / Ekspor PDF'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Letterhead & Body */}
        <div className="printable-card p-8 sm:p-12 text-neutral-900 dark:text-neutral-100 bg-white dark:bg-[#111]">
          {/* Letterhead */}
          <div className="flex justify-between items-start border-b-2 border-neutral-900 pb-6 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-[#0070f3] text-white flex items-center justify-center font-bold text-sm">
                  INV
                </div>
                <h1 className="text-lg font-bold tracking-tight text-neutral-900">
                  PT INVENTORA NUSANTARA KORPORASI
                </h1>
              </div>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Menara Sudirman Floor 28, Jl. Jend. Sudirman Kav. 60, Jakarta Selatan 12190<br />
                NPWP: 01.234.567.8-012.000 • Email: procurement@inventora.com • Phone: +62 21 5088 9000
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-[#0070f3] tracking-wide">
                PURCHASE ORDER VOUCHER
              </div>
              <div className="text-xs font-mono font-semibold text-neutral-800 mt-0.5">
                NO: {po.id}
              </div>
              <div className="text-[11px] text-neutral-500 mt-1">
                Date: {po.date || new Date().toLocaleDateString('id-ID')}
              </div>
            </div>
          </div>

          {/* Vendor & Status Header */}
          <div className="grid grid-cols-2 gap-6 mb-8 text-xs">
            <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/50">
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block mb-1">
                Vendor / Supplier
              </span>
              <div className="font-semibold text-neutral-900 text-sm">{po.vendor}</div>
              <div className="text-neutral-600 mt-1">
                Official Registered Supplier Partner<br />
                Term: Net 30 Days • Corporate Settlement
              </div>
            </div>
            <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/50">
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block mb-1">
                Voucher Status
              </span>
              <div className="font-semibold text-emerald-600 text-sm flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>{po.status === 'Disetujui' ? 'VERIFIED & APPROVED' : po.status.toUpperCase()}</span>
              </div>
              <div className="text-neutral-600 mt-1">
                Category: Enterprise Operational Procurement<br />
                Approval Auth: Super Admin (Board Verified)
              </div>
            </div>
          </div>

          {/* Itemized Table */}
          <table className="w-full text-xs border-collapse mb-6">
            <thead>
              <tr className="border-b-2 border-neutral-800 text-left font-semibold text-neutral-700">
                <th className="py-2.5 px-3">No</th>
                <th className="py-2.5 px-3">Item Description</th>
                <th className="py-2.5 px-3 text-center">Qty</th>
                <th className="py-2.5 px-3 text-right">Unit Price</th>
                <th className="py-2.5 px-3 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              <tr>
                <td className="py-3 px-3 font-mono">1</td>
                <td className="py-3 px-3">
                  <div className="font-medium text-neutral-900">Procurement Items for {po.id}</div>
                  <div className="text-[11px] text-neutral-500">Scheduled Delivery to Central Warehouse #1</div>
                </td>
                <td className="py-3 px-3 text-center font-mono">1 Lot</td>
                <td className="py-3 px-3 text-right font-mono">{formatIdr(amount)}</td>
                <td className="py-3 px-3 text-right font-mono font-medium">{formatIdr(amount)}</td>
              </tr>
            </tbody>
          </table>

          {/* Calculation Breakdown */}
          <div className="flex justify-end mb-10">
            <div className="w-64 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-neutral-200 text-neutral-600">
                <span>Subtotal (DPP):</span>
                <span className="font-mono font-medium text-neutral-900">{formatIdr(amount)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-200 text-neutral-600">
                <span>PPN (11% Tax):</span>
                <span className="font-mono font-medium text-neutral-900">{formatIdr(tax)}</span>
              </div>
              <div className="flex justify-between py-2 border-t-2 border-neutral-900 text-sm font-bold text-neutral-900">
                <span>Grand Total:</span>
                <span className="font-mono text-[#0070f3]">{formatIdr(grandTotal)}</span>
              </div>
            </div>
          </div>

          {/* Formal Sign-off Signatures */}
          <div className="grid grid-cols-2 gap-12 pt-8 border-t border-neutral-200 text-center text-xs">
            <div>
              <div className="text-neutral-500 mb-16">Prepared & Verified By:</div>
              <div className="font-bold border-t border-neutral-400 pt-1.5 text-neutral-900">
                Budi Santoso
              </div>
              <div className="text-[10px] text-neutral-500">Lead Procurement Officer</div>
            </div>
            <div>
              <div className="text-neutral-500 mb-16">Authorized & Approved By:</div>
              <div className="font-bold border-t border-neutral-400 pt-1.5 text-neutral-900">
                Ichya Ulumiddin
              </div>
              <div className="text-[10px] text-neutral-500">Financial Director / Super Admin</div>
            </div>
          </div>

          {/* Footer note */}
          <div className="mt-12 text-center text-[10px] text-neutral-400 border-t border-neutral-100 pt-4">
            This document is computer-generated and electronically authenticated by Inventora Enterprise ERP System.
          </div>
        </div>
      </div>
    </div>
  );
}
