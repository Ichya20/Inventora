import React, { useState, useEffect } from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { Printer, FileText, CheckCircle2, ShieldCheck, Building2, Download } from 'lucide-react';
import { Card, Badge, Button, TableWrapper, Th, Td, Tr, Modal } from './UI';
import { ToastType } from '../types';
import { translations, Language, Translations } from '../i18n';
import { exportToCsv } from '../lib/exportUtils';
import { loadStoredData, saveStoredData } from '../lib/storageUtils';
import { downloadInvoicePdf, downloadReceiptPdf } from '../lib/pdfGenerator';

interface FinanceViewProps {
  onToast: (msg: string, type?: ToastType) => void;
  t?: Translations;
  lang?: Language;
}

export function FinanceView({ onToast, t, lang = 'en' }: FinanceViewProps) {
  const activeT = t || translations[lang] || translations.en;
  const numLocale = lang === 'en' ? 'en-US' : 'id-ID';

  const [search, setSearch] = useState('');
  const defaultInvoices = [
    { id: 'INV-OUT-889', client: 'Bank Mandiri (Persero)', desc: lang === 'en' ? 'Enterprise Client' : 'Klien Enterprise', date: '30 Aug 2026', total: 1450000000, status: 'Lunas', color: 'green' as const, isOverdue: false },
    { id: 'INV-OUT-890', client: 'PT Telkom Indonesia', desc: lang === 'en' ? 'Enterprise Client' : 'Klien Enterprise', date: '21 Aug 2026', total: 890000000, status: 'Overdue', color: 'red' as const, isOverdue: true },
    { id: 'INV-OUT-891', client: 'Astra International', desc: lang === 'en' ? 'Enterprise Client' : 'Klien Enterprise', date: '15 Aug 2026', total: 2100000000, status: 'Lunas', color: 'green' as const, isOverdue: false },
    { id: 'INV-OUT-892', client: 'BCA Group', desc: lang === 'en' ? 'Financial Sector' : 'Sektor Finansial', date: '10 Aug 2026', total: 600000000, status: 'Pending', color: 'orange' as const, isOverdue: false },
    { id: 'INV-OUT-893', client: 'Gojek Tokopedia', desc: lang === 'en' ? 'Tech Startup' : 'Startup Teknologi', date: '05 Aug 2026', total: 1100000000, status: 'Overdue', color: 'red' as const, isOverdue: true },
  ];

  const [invoices, setInvoices] = useState(() => {
    return loadStoredData('inventora_finance_invoices_v1', defaultInvoices);
  });

  useEffect(() => {
    saveStoredData('inventora_finance_invoices_v1', invoices);
  }, [invoices]);

  const [activeModal, setActiveModal] = useState<{ type: 'receipt' | 'warning' | 'invoice', data: any } | null>(null);

  const [page, setPage] = useState(1);
  const itemsPerPage = 3;
  const [sortConfig, setSortConfig] = useState<{ key: keyof typeof invoices[0], direction: 'asc' | 'desc' } | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const chartData = [
    { name: 'Week 1', rev: 400 },
    { name: 'Week 2', rev: 300 },
    { name: 'Week 3', rev: 500 },
    { name: 'Week 4', rev: 800 },
  ];

  const handleSort = (key: keyof typeof invoices[0]) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedInvoices = [...invoices].sort((a, b) => {
    if (!sortConfig) return 0;
    if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
    if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const filteredInvoices = sortedInvoices.filter(inv => 
    inv.client.toLowerCase().includes(search.toLowerCase()) || 
    inv.id.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
  const paginatedInvoices = filteredInvoices.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const handleExport = () => {
    setIsExporting(true);
    try {
      const headers = ['Invoice ID', 'Client / Organization', 'Sector / Category', 'Due / Issue Date', 'Total Amount (IDR)', 'Payment Status', 'Overdue Flag'];
      const rows = filteredInvoices.map(inv => [
        inv.id,
        inv.client,
        inv.desc,
        inv.date,
        inv.total,
        inv.status,
        inv.isOverdue ? 'YES' : 'NO'
      ]);
      exportToCsv(`inventora-accounts-receivable-${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
      onToast(lang === 'en' ? "Invoices exported as CSV successfully" : "Daftar tagihan berhasil diekspor sebagai CSV", "success");
    } catch (e) {
      onToast("Export failed", "error");
    } finally {
      setTimeout(() => setIsExporting(false), 500);
    }
  };

  const handleSendWarning = (id: string, clientName: string) => {
    setActiveModal(null);
    onToast(
      lang === 'en' 
        ? `Automated warning email dispatched to ${clientName} for invoice ${id}` 
        : `Email peringatan otomatis telah dikirim ke ${clientName} untuk faktur ${id}`,
      "info"
    );
  };

  const handleMarkAsPaid = (id: string) => {
    setInvoices(current => current.map(inv => inv.id === id ? {
      ...inv,
      status: 'Lunas',
      color: 'green' as const,
      isOverdue: false
    } : inv));
    setActiveModal(null);
    onToast(
      lang === 'en' 
        ? `Invoice ${id} marked as Paid (Lunas). Official receipt is now available.` 
        : `Faktur ${id} berhasil ditandai Lunas. Kuitansi resmi sekarang tersedia.`,
      'success'
    );
  };

  const getStatusText = (status: string) => {
    if (status === 'Lunas') return activeT.finance.paidBadge;
    if (status === 'Overdue') return activeT.finance.overdueBadge;
    if (status === 'Pending') return activeT.finance.pendingBadge;
    return status;
  };

  return (
    <section className="p-4 md:p-8 flex-1 flex flex-col gap-6 overflow-y-auto">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
        <Card>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[#666] dark:text-[#a1a1aa] text-sm font-medium tracking-tight">
                {activeT.finance.totalRevenueMonth}
              </p>
              <h3 className="text-3xl font-semibold tracking-tighter mt-1 text-[#171717] dark:text-[#ededed] tabular-nums">
                {lang === 'en' ? 'Rp 12.8B' : 'Rp 12,8 M'}
              </h3>
              <p className="text-[#666] dark:text-[#a1a1aa] text-xs mt-2">
                <span className="text-[#10b981] dark:text-[#34d399] font-medium">+18%</span> {activeT.finance.targetOverachieved}
              </p>
            </div>
            <div className="w-24 h-16">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="rev" stroke="#10b981" fillOpacity={1} fill="url(#colorRev)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>
        <Card>
          <p className="text-[#666] dark:text-[#a1a1aa] text-sm font-medium tracking-tight">
            {activeT.finance.outstandingInvoices}
          </p>
          <h3 className="text-3xl font-semibold tracking-tighter mt-1 text-[#171717] dark:text-[#ededed] tabular-nums">
            {lang === 'en' ? 'Rp 3.1B' : 'Rp 3,1 M'}
          </h3>
          <p className="text-[#666] dark:text-[#a1a1aa] text-xs mt-2">
            <span className="text-[#e00] dark:text-[#ff3333] font-medium">4 Invoices</span> {activeT.finance.overdueInvoices}
          </p>
        </Card>
        <Card>
          <p className="text-[#666] dark:text-[#a1a1aa] text-sm font-medium tracking-tight">
            {activeT.finance.cashEquivalents}
          </p>
          <h3 className="text-3xl font-semibold tracking-tighter mt-1 text-[#171717] dark:text-[#ededed] tabular-nums">
            {lang === 'en' ? 'Rp 45.2B' : 'Rp 45,2 M'}
          </h3>
          <p className="text-[#666] dark:text-[#a1a1aa] text-xs mt-2">{activeT.finance.liquiditySafe}</p>
        </Card>
      </div>

      <TableWrapper 
        title={activeT.finance.tableTitle} 
        placeholder={activeT.finance.searchPlaceholder}
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
            <Th sortable onSort={() => handleSort('id')}>{activeT.finance.invNumberCol}</Th>
            <Th sortable onSort={() => handleSort('client')}>{activeT.finance.clientCol}</Th>
            <Th sortable onSort={() => handleSort('date')}>{activeT.finance.dueDateCol}</Th>
            <Th sortable onSort={() => handleSort('total')}>{activeT.finance.amountCol}</Th>
            <Th sortable onSort={() => handleSort('status')}>{activeT.finance.statusCol}</Th>
            <Th align="right">{activeT.finance.actionCol}</Th>
          </tr>
        </thead>
        <tbody>
          {paginatedInvoices.length > 0 ? (
            paginatedInvoices.map((inv, idx) => (
              <Tr key={inv.id} index={idx}>
                <Td><span className="font-mono text-xs text-[#666] dark:text-[#a1a1aa]">{inv.id}</span></Td>
                <Td>
                  <div className="font-medium tracking-tight">{inv.client}</div>
                  <div className="text-xs text-[#666] dark:text-[#a1a1aa] mt-0.5">{inv.desc}</div>
                </Td>
                <Td><span className={`tabular-nums ${inv.isOverdue ? 'text-[#e00] dark:text-[#ff3333] font-medium' : ''}`}>{inv.date}</span></Td>
                <Td><span className="tabular-nums font-medium">Rp {inv.total.toLocaleString(numLocale)}</span></Td>
                <Td><Badge color={inv.color}>{getStatusText(inv.status)}</Badge></Td>
                <Td align="right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        downloadInvoicePdf(inv, lang);
                        onToast(lang === 'en' ? `Downloaded ${inv.id}.pdf` : `Berhasil mengunduh ${inv.id}.pdf`, 'success');
                      }}
                      className="p-1.5 text-neutral-500 hover:text-[#0070f3] dark:hover:text-[#3291ff] rounded border border-neutral-200 dark:border-neutral-800 hover:border-blue-300 dark:hover:border-blue-700 bg-white dark:bg-[#1a1a1a] transition-all cursor-pointer"
                      title={lang === 'en' ? `Direct Download ${inv.id}.pdf` : `Unduh Langsung ${inv.id}.pdf`}
                    >
                      <Download className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveModal({ type: 'invoice', data: inv })}
                      className="px-2 py-1 text-xs text-neutral-600 dark:text-neutral-400 hover:text-[#0070f3] dark:hover:text-[#3291ff] rounded border border-neutral-200 dark:border-neutral-800 hover:border-blue-300 dark:hover:border-blue-700 bg-white dark:bg-[#1a1a1a] transition-all flex items-center gap-1 cursor-pointer"
                      title={lang === 'en' ? 'View & Print Invoice (PDF)' : 'Lihat & Cetak Faktur (PDF)'}
                    >
                      <FileText className="w-3 h-3 text-[#0070f3]" />
                      <span>{lang === 'en' ? 'Invoice' : 'Faktur'}</span>
                    </button>
                    {inv.status === 'Lunas' ? (
                      <Button variant="secondary" onClick={() => setActiveModal({ type: 'receipt', data: inv })}>
                        <Printer className="w-3.5 h-3.5 mr-1 text-emerald-600 dark:text-emerald-400" />
                        {activeT.finance.receiptBtn}
                      </Button>
                    ) : (
                      <div className="flex items-center gap-1">
                        <Button variant="secondary" onClick={() => setActiveModal({ type: 'warning', data: inv })}>
                          {activeT.finance.sendWarningBtn}
                        </Button>
                        <button
                          type="button"
                          onClick={() => handleMarkAsPaid(inv.id)}
                          className="px-2 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 rounded border border-emerald-300 dark:border-emerald-800 transition-colors cursor-pointer flex items-center gap-1"
                          title={lang === 'en' ? 'Record payment & mark invoice Paid' : 'Catat pembayaran & tandai Lunas'}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{lang === 'en' ? 'Paid' : 'Lunas'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </Td>
              </Tr>
            ))
          ) : (
            <tr>
              <td colSpan={6} className="px-6 py-12 text-center text-[#666] dark:text-[#a1a1aa] text-sm">
                {activeT.finance.noInvoices}
              </td>
            </tr>
          )}
        </tbody>
      </TableWrapper>

      <Modal 
        isOpen={activeModal !== null} 
        onClose={() => setActiveModal(null)} 
        title={
          activeModal?.type === 'receipt' 
            ? (lang === 'en' ? 'Official Receipt Voucher' : 'Bukti Pembayaran Tagihan') 
            : activeModal?.type === 'invoice'
            ? (lang === 'en' ? 'Commercial Invoice & Tax Assessment' : 'Faktur Penagihan & Rincian Pajak')
            : (lang === 'en' ? 'Send Payment Warning' : 'Kirim Peringatan Pembayaran')
        }
      >
        {activeModal && activeModal.type === 'receipt' && (
          <div className="space-y-6 printable-card">
            <div className="flex justify-between items-start pb-6 border-b border-[#eaeaea] dark:border-[#333]">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded-lg bg-[#0070f3] text-white flex items-center justify-center font-bold text-xs">
                    INV
                  </div>
                  <h4 className="text-lg font-bold tracking-tight text-[#171717] dark:text-[#ededed]">PT INVENTORA NUSANTARA</h4>
                </div>
                <p className="text-xs text-[#666] dark:text-[#a1a1aa]">{lang === 'en' ? 'Official Payment Receipt & Tax Voucher' : 'Bukti Pembayaran Resmi & Faktur Pelunasan'}</p>
              </div>
              <div className="text-right">
                <Badge color="green">{lang === 'en' ? 'Paid in Full' : 'Lunas Penuh'}</Badge>
                <div className="mt-1 text-[11px] text-[#666] dark:text-[#aaa] font-mono">
                  {lang === 'en' ? 'Stamp Duty: PAID' : 'Bea Meterai: LUNAS'}
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-xs sm:text-sm">
              <div className="p-3 rounded-lg bg-neutral-50 dark:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-800">
                <p className="text-[#666] dark:text-[#a1a1aa] mb-1 font-medium">{activeT.finance.invNumberCol}</p>
                <p className="font-mono font-semibold text-[#171717] dark:text-[#ededed]">{activeModal.data.id}</p>
              </div>
              <div className="p-3 rounded-lg bg-neutral-50 dark:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-800">
                <p className="text-[#666] dark:text-[#a1a1aa] mb-1 font-medium">{lang === 'en' ? 'Payment Settlement Date' : 'Tanggal Pelunasan'}</p>
                <p className="font-medium text-[#171717] dark:text-[#ededed]">{activeModal.data.date}</p>
              </div>
              <div className="col-span-2 p-3 rounded-lg bg-neutral-50 dark:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-800">
                <p className="text-[#666] dark:text-[#a1a1aa] mb-1 font-medium">{lang === 'en' ? 'Billed Entity' : 'Entitas Pembayar'}</p>
                <p className="font-semibold text-base text-[#171717] dark:text-[#ededed]">{activeModal.data.client}</p>
                <p className="text-xs text-[#666] dark:text-[#aaa] mt-0.5">{activeModal.data.desc}</p>
              </div>
            </div>

            <div className="p-4 bg-[#fafafa] dark:bg-[#181818] rounded-xl border border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
              <div>
                <span className="text-[#666] dark:text-[#a1a1aa] text-xs uppercase tracking-wider block font-semibold">
                  {lang === 'en' ? 'Total Settled Amount' : 'Total Dana Diterima'}
                </span>
                <span className="text-xs text-neutral-500">
                  {lang === 'en' ? 'Includes PPN 11% & WHT Cleared' : 'Termasuk PPN 11% & Bukti Potong PPh'}
                </span>
              </div>
              <span className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums">
                Rp {activeModal.data.total.toLocaleString(numLocale)}
              </span>
            </div>

            <div className="text-[11px] text-neutral-500 dark:text-neutral-400 border-t border-dashed border-neutral-200 dark:border-neutral-800 pt-3 flex justify-between items-center">
              <span>Ref: TRX-REC-{activeModal.data.id}</span>
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {lang === 'en' ? 'Verified Banking Clearing' : 'Kliring Perbankan Terverifikasi'}
              </span>
            </div>

            <div className="flex gap-2.5 justify-end pt-4 border-t border-[#eaeaea] dark:border-[#333] no-print">
              <Button variant="secondary" onClick={() => setActiveModal(null)}>
                {lang === 'en' ? 'Back' : 'Kembali'}
              </Button>
              <Button variant="secondary" onClick={() => {
                const item = activeModal.data;
                const headers = ['Voucher Reference', 'Billed To Client', 'Payment Date', 'Total Settled (IDR)', 'Status', 'Corporate Entity'];
                const rows = [[
                  item.id,
                  item.client,
                  item.date,
                  item.total,
                  item.status,
                  'PT INVENTORA TEKNOLOGI NUSANTARA'
                ]];
                exportToCsv(`receipt-voucher-${item.id}.csv`, headers, rows);
                onToast(lang === 'en' ? `Payment receipt for ${item.id} downloaded` : `Tanda terima ${item.id} berhasil diunduh`, 'success');
              }}>
                {lang === 'en' ? 'Export CSV' : 'Ekspor CSV'}
              </Button>
              <Button variant="secondary" onClick={() => window.print()}>
                <Printer className="w-3.5 h-3.5 mr-1.5" />
                {lang === 'en' ? 'Print' : 'Cetak'}
              </Button>
              <Button variant="primary" onClick={() => {
                downloadReceiptPdf(activeModal.data, lang);
                onToast(lang === 'en' ? `Downloaded receipt-${activeModal.data.id}.pdf` : `Berhasil mengunduh tanda terima-${activeModal.data.id}.pdf`, 'success');
              }}>
                <Download className="w-3.5 h-3.5 mr-1.5" />
                {lang === 'en' ? 'Download PDF' : 'Unduh PDF'}
              </Button>
            </div>
          </div>
        )}

        {activeModal && activeModal.type === 'invoice' && (
          <div className="space-y-6 printable-card">
            {/* Invoice Letterhead */}
            <div className="flex justify-between items-start pb-5 border-b-2 border-neutral-800 dark:border-neutral-200">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-[#0070f3] text-white flex items-center justify-center font-bold text-sm">
                    INV
                  </div>
                  <div>
                    <h4 className="text-lg font-bold tracking-tight text-[#171717] dark:text-[#ededed]">PT INVENTORA TEKNOLOGI NUSANTARA</h4>
                    <p className="text-xs text-neutral-500">NPWP: 01.345.678.9-012.000 | Treasury & Corporate Billing</p>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="px-2.5 py-1 text-xs font-semibold rounded bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                  {lang === 'en' ? 'TAX INVOICE' : 'FAKTUR PAJAK & TAGIHAN'}
                </span>
                <p className="font-mono font-bold text-sm text-neutral-900 dark:text-neutral-100 mt-1">
                  {activeModal.data.id}
                </p>
              </div>
            </div>

            {/* Bill To & Invoice Info */}
            <div className="grid grid-cols-2 gap-4 text-xs sm:text-sm">
              <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-[#181818] border border-neutral-200 dark:border-neutral-800">
                <p className="text-xs text-neutral-500 uppercase tracking-wider font-semibold mb-1">
                  {lang === 'en' ? 'Billed Client' : 'Penerima Tagihan'}
                </p>
                <p className="font-bold text-neutral-900 dark:text-neutral-100 text-base">{activeModal.data.client}</p>
                <p className="text-xs text-neutral-500 mt-0.5">{activeModal.data.desc}</p>
                <p className="text-xs text-neutral-500 mt-1">Payment Term: Net 30 Days</p>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-[#181818] border border-neutral-200 dark:border-neutral-800 space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs text-neutral-500">{lang === 'en' ? 'Due Date' : 'Jatuh Tempo'}:</span>
                  <span className={`font-semibold ${activeModal.data.isOverdue ? 'text-red-600 dark:text-red-400' : 'text-neutral-900 dark:text-neutral-100'}`}>
                    {activeModal.data.date}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-neutral-500">{lang === 'en' ? 'Status' : 'Status'}:</span>
                  <Badge color={activeModal.data.color}>{getStatusText(activeModal.data.status)}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-neutral-500">{lang === 'en' ? 'Currency' : 'Mata Uang'}:</span>
                  <span className="font-mono font-medium">IDR (Rp)</span>
                </div>
              </div>
            </div>

            {/* Itemized Calculation */}
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-neutral-100 dark:bg-[#202020] text-neutral-700 dark:text-neutral-300 border-b border-neutral-200 dark:border-neutral-800">
                  <tr>
                    <th className="px-3.5 py-2 text-left">{lang === 'en' ? 'Description' : 'Deskripsi Layanan'}</th>
                    <th className="px-3.5 py-2 text-right">{lang === 'en' ? 'Subtotal' : 'Subtotal'}</th>
                    <th className="px-3.5 py-2 text-right">{lang === 'en' ? 'PPN (11%)' : 'PPN (11%)'}</th>
                    <th className="px-3.5 py-2 text-right">{lang === 'en' ? 'Total (IDR)' : 'Total (IDR)'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                  <tr>
                    <td className="px-3.5 py-3">
                      <p className="font-medium text-neutral-900 dark:text-neutral-100">Enterprise Cloud & Infrastructure Services</p>
                      <p className="text-[11px] text-neutral-500">Service Period: Current Billing Cycle</p>
                    </td>
                    <td className="px-3.5 py-3 text-right tabular-nums">
                      Rp {Math.round(activeModal.data.total / 1.11).toLocaleString(numLocale)}
                    </td>
                    <td className="px-3.5 py-3 text-right tabular-nums">
                      Rp {Math.round(activeModal.data.total - (activeModal.data.total / 1.11)).toLocaleString(numLocale)}
                    </td>
                    <td className="px-3.5 py-3 text-right font-bold text-neutral-900 dark:text-neutral-100 tabular-nums">
                      Rp {activeModal.data.total.toLocaleString(numLocale)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Payment Wire Instructions */}
            <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 text-xs">
              <p className="font-semibold text-blue-900 dark:text-blue-300 mb-1 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                {lang === 'en' ? 'Corporate Remittance Instructions' : 'Instruksi Transfer Bank Perusahaan'}
              </p>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-neutral-600 dark:text-neutral-300 mt-2">
                <div>
                  <span className="text-neutral-500 block">Bank BCA (Virtual Account):</span>
                  <span className="font-mono font-bold text-neutral-900 dark:text-neutral-100">82739-{activeModal.data.id.replace(/[^0-9]/g, '')}</span>
                </div>
                <div>
                  <span className="text-neutral-500 block">Bank Mandiri (Giro Corporate):</span>
                  <span className="font-mono font-bold text-neutral-900 dark:text-neutral-100">122-00-9831920-1</span>
                </div>
              </div>
            </div>

            {/* Actions - Hidden during print */}
            <div className="flex gap-2.5 justify-end pt-4 border-t border-[#eaeaea] dark:border-[#333] no-print flex-wrap">
              <Button variant="secondary" onClick={() => setActiveModal(null)}>
                {activeT.common.cancel}
              </Button>
              <Button variant="secondary" onClick={() => window.print()}>
                <Printer className="w-3.5 h-3.5 mr-1.5" />
                {lang === 'en' ? 'Print' : 'Cetak'}
              </Button>
              <Button variant="secondary" onClick={() => {
                downloadInvoicePdf(activeModal.data, lang);
                onToast(lang === 'en' ? `Downloaded invoice-${activeModal.data.id}.pdf` : `Berhasil mengunduh faktur-${activeModal.data.id}.pdf`, 'success');
              }}>
                <Download className="w-3.5 h-3.5 mr-1.5" />
                {lang === 'en' ? 'Download PDF' : 'Unduh PDF'}
              </Button>
              {activeModal.data.status !== 'Lunas' && (
                <Button variant="primary" onClick={() => handleMarkAsPaid(activeModal.data.id)}>
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                  {lang === 'en' ? 'Mark as Paid' : 'Tandai Lunas'}
                </Button>
              )}
            </div>
          </div>
        )}

        {activeModal && activeModal.type === 'warning' && (
          <div className="space-y-4">
            <div className="p-4 bg-[#fff0f0] dark:bg-[#331111] rounded-lg border border-[#ffcccc] dark:border-[#662222]">
              <h4 className="text-[#e00] dark:text-[#ff5555] font-medium flex items-center gap-2">
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                {lang === 'en' ? 'Overdue Invoice Alert' : 'Peringatan Tagihan Jatuh Tempo'}
              </h4>
              <p className="text-sm text-[#d00] dark:text-[#ff8888] mt-1">
                {lang === 'en' 
                  ? `Invoice ${activeModal.data.id} is overdue since ${activeModal.data.date}.`
                  : `Faktur ${activeModal.data.id} telah melewati jatuh tempo sejak ${activeModal.data.date}.`}
              </p>
            </div>
            
            <div className="text-sm text-[#171717] dark:text-[#ededed]">
              <p>
                {lang === 'en'
                  ? `You are about to send an automated payment reminder to ${activeModal.data.client}.`
                  : `Anda akan mengirimkan pengingat pembayaran otomatis ke ${activeModal.data.client}.`}
              </p>
              <p className="mt-2 text-[#666] dark:text-[#a1a1aa]">
                {lang === 'en'
                  ? "This will dispatch an email to the client's registered billing address and log the warning in the CRM."
                  : "Ini akan mengirimkan email ke alamat penagihan terdaftar klien dan mencatat peringatan di CRM."}
              </p>
            </div>

            <div className="flex gap-2.5 justify-end pt-4 border-t border-[#eaeaea] dark:border-[#333] flex-wrap">
              <Button variant="secondary" onClick={() => setActiveModal(null)}>
                {activeT.common.cancel}
              </Button>
              <Button variant="secondary" onClick={() => handleSendWarning(activeModal.data.id, activeModal.data.client)}>
                {lang === 'en' ? 'Dispatch Warning' : 'Kirim Peringatan'}
              </Button>
              <Button variant="primary" onClick={() => handleMarkAsPaid(activeModal.data.id)}>
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                {lang === 'en' ? 'Mark as Paid' : 'Tandai Lunas'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
}
export default FinanceView;
