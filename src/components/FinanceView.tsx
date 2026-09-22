import React, { useState } from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { Card, Badge, Button, TableWrapper, Th, Td, Tr, Modal } from './UI';
import { ToastType } from '../types';
import { translations, Language, Translations } from '../i18n';

interface FinanceViewProps {
  onToast: (msg: string, type?: ToastType) => void;
  t?: Translations;
  lang?: Language;
}

export function FinanceView({ onToast, t, lang = 'en' }: FinanceViewProps) {
  const activeT = t || translations[lang] || translations.en;
  const numLocale = lang === 'en' ? 'en-US' : 'id-ID';

  const [search, setSearch] = useState('');
  const [invoices, setInvoices] = useState([
    { id: 'INV-OUT-889', client: 'Bank Mandiri (Persero)', desc: lang === 'en' ? 'Enterprise Client' : 'Klien Enterprise', date: '30 Aug 2026', total: 1450000000, status: 'Lunas', color: 'green' as const, isOverdue: false },
    { id: 'INV-OUT-890', client: 'PT Telkom Indonesia', desc: lang === 'en' ? 'Enterprise Client' : 'Klien Enterprise', date: '21 Aug 2026', total: 890000000, status: 'Overdue', color: 'red' as const, isOverdue: true },
    { id: 'INV-OUT-891', client: 'Astra International', desc: lang === 'en' ? 'Enterprise Client' : 'Klien Enterprise', date: '15 Aug 2026', total: 2100000000, status: 'Lunas', color: 'green' as const, isOverdue: false },
    { id: 'INV-OUT-892', client: 'BCA Group', desc: lang === 'en' ? 'Financial Sector' : 'Sektor Finansial', date: '10 Aug 2026', total: 600000000, status: 'Pending', color: 'orange' as const, isOverdue: false },
    { id: 'INV-OUT-893', client: 'Gojek Tokopedia', desc: lang === 'en' ? 'Tech Startup' : 'Startup Teknologi', date: '05 Aug 2026', total: 1100000000, status: 'Overdue', color: 'red' as const, isOverdue: true },
  ]);

  const [activeModal, setActiveModal] = useState<{ type: 'receipt' | 'warning', data: any } | null>(null);

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
    setTimeout(() => {
      setIsExporting(false);
      onToast(lang === 'en' ? "Data exported as PDF successfully" : "Data berhasil diekspor sebagai PDF", "success");
    }, 1200);
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
                  {inv.status === 'Lunas' ? (
                    <Button variant="secondary" onClick={() => setActiveModal({ type: 'receipt', data: inv })}>
                      {activeT.finance.receiptBtn}
                    </Button>
                  ) : (
                    <Button variant="secondary" onClick={() => setActiveModal({ type: 'warning', data: inv })}>
                      {activeT.finance.sendWarningBtn}
                    </Button>
                  )}
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
        title={activeModal?.type === 'receipt' ? (lang === 'en' ? 'Invoice Receipt' : 'Bukti Pembayaran Tagihan') : (lang === 'en' ? 'Send Payment Warning' : 'Kirim Peringatan Pembayaran')}
      >
        {activeModal && activeModal.type === 'receipt' && (
          <div className="space-y-6">
            <div className="flex justify-between items-start pb-6 border-b border-[#eaeaea] dark:border-[#333]">
              <div>
                <h4 className="text-xl font-semibold tracking-tight text-[#171717] dark:text-[#ededed]">INVENTORA CORP</h4>
                <p className="text-sm text-[#666] dark:text-[#a1a1aa]">{lang === 'en' ? 'Official Payment Receipt' : 'Tanda Terima Pembayaran Resmi'}</p>
              </div>
              <div className="text-right">
                <Badge color="green">{lang === 'en' ? 'Paid in Full' : 'Lunas Penuh'}</Badge>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-[#666] dark:text-[#a1a1aa] mb-1">{activeT.finance.invNumberCol}</p>
                <p className="font-mono text-[#171717] dark:text-[#ededed]">{activeModal.data.id}</p>
              </div>
              <div>
                <p className="text-[#666] dark:text-[#a1a1aa] mb-1">{lang === 'en' ? 'Payment Date' : 'Tanggal Bayar'}</p>
                <p className="font-medium text-[#171717] dark:text-[#ededed]">{activeModal.data.date}</p>
              </div>
              <div className="col-span-2">
                <p className="text-[#666] dark:text-[#a1a1aa] mb-1">{lang === 'en' ? 'Billed To' : 'Ditagihkan Kepada'}</p>
                <p className="font-medium text-[#171717] dark:text-[#ededed]">{activeModal.data.client}</p>
              </div>
            </div>

            <div className="p-4 bg-[#fafafa] dark:bg-[#1a1a1a] rounded-lg shadow-inner dark:shadow-none dark:border dark:border-[#333] flex justify-between items-center">
              <span className="text-[#666] dark:text-[#a1a1aa] font-medium">{lang === 'en' ? 'Total Settled' : 'Total Terbayar'}</span>
              <span className="text-xl font-semibold tracking-tight text-[#171717] dark:text-[#ededed] tabular-nums">
                Rp {activeModal.data.total.toLocaleString(numLocale)}
              </span>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-[#eaeaea] dark:border-[#333]">
              <Button variant="secondary" onClick={() => {
                onToast(lang === 'en' ? 'Receipt downloading as PDF...' : 'Tanda terima sedang diunduh format PDF...');
                setActiveModal(null);
              }}>
                {lang === 'en' ? 'Download PDF' : 'Unduh PDF'}
              </Button>
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

            <div className="flex gap-3 justify-end pt-4 border-t border-[#eaeaea] dark:border-[#333]">
              <Button variant="secondary" onClick={() => setActiveModal(null)}>
                {activeT.common.cancel}
              </Button>
              <Button variant="primary" onClick={() => handleSendWarning(activeModal.data.id, activeModal.data.client)}>
                {lang === 'en' ? 'Dispatch Warning' : 'Kirim Peringatan'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
}
export default FinanceView;
