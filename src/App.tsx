import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { CheckCircle2, AlertCircle, Info, XCircle, LayoutDashboard, Settings as SettingsIcon, LogOut, Moon, Sun, Download, ChevronLeft, ChevronRight, ArrowUpDown, Menu, X, Command, Activity, BarChart3, Database, FileText, FileSearch, ArrowRight, UserCircle, ShoppingCart, Users, Search, Sparkles, ExternalLink, Copy, Check, ShieldAlert, CreditCard, Receipt, Printer, Lock, Building2, QrCode, BadgeCheck, Globe, Languages } from 'lucide-react';
import { ToastType, ToastItem, Role, PurchaseOrder, PaymentTransaction, AppNotification } from './types';
import { translations, Language, Translations } from './i18n';
import { NotificationCenter } from './components/NotificationCenter';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ViewSkeleton } from './components/ViewSkeleton';
import { useDebounce } from './lib/useDebounce';

// Lazy-loaded views for code splitting and instant initial page load
const ProcurementView = lazy(() => import('./components/ProcurementView').then(m => ({ default: m.ProcurementView })));
const FinanceView = lazy(() => import('./components/FinanceView').then(m => ({ default: m.FinanceView })));
const HRView = lazy(() => import('./components/HRView').then(m => ({ default: m.HRView })));
const PurchaseUnitView = lazy(() => import('./components/PurchaseUnitView').then(m => ({ default: m.PurchaseUnitView })));
const AnalyticsView = lazy(() => import('./components/AnalyticsView').then(m => ({ default: m.AnalyticsView })));

const Card = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-white dark:bg-[#111] p-6 rounded-xl shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_1px_2px_rgba(0,0,0,0.2)] hover:shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_8px_16px_rgba(0,0,0,0.04)] dark:hover:shadow-[0_0_0_1px_rgba(255,255,255,0.12),0_8px_16px_rgba(0,0,0,0.4)] transition-shadow duration-300">
    {children}
  </div>
);

const Badge = ({ children, color = "blue" }: { children: React.ReactNode, color?: "blue" | "green" | "orange" | "gray" | "red" }) => {
  const colorMap = {
    blue: "bg-[#0070f3] dark:bg-[#3291ff]",
    green: "bg-[#10b981] dark:bg-[#34d399]",
    orange: "bg-[#f5a623] dark:bg-[#f5a623]",
    red: "bg-[#e00] dark:bg-[#f87171]",
    gray: "bg-[#999] dark:bg-[#888]"
  };
  return (
    <span className="shadow-[0_0_0_1px_rgba(0,0,0,0.08)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.1)] bg-white dark:bg-[#1a1a1a] px-2.5 py-0.5 rounded-full text-xs font-medium text-[#666] dark:text-[#a1a1aa] flex items-center gap-1.5 w-fit">
      <div className={`w-1.5 h-1.5 rounded-full ${colorMap[color]}`}></div>
      {children}
    </span>
  );
};

const Button = ({ children, variant = "primary", onClick, type = "button", disabled = false, isLoading = false }: { children: React.ReactNode, variant?: "primary" | "secondary", onClick?: () => void, type?: "button" | "submit", disabled?: boolean, isLoading?: boolean }) => {
  const content = isLoading ? (
    <div className="flex items-center gap-2">
      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      {children}
    </div>
  ) : children;

  if (variant === "primary") {
    return (
      <button type={type} onClick={onClick} disabled={disabled || isLoading} className="bg-[#171717] dark:bg-[#ededed] text-white dark:text-[#171717] font-medium px-4 py-2 rounded-md text-sm hover:bg-[#383838] dark:hover:bg-[#ccc] transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.12)] disabled:opacity-80 disabled:cursor-not-allowed flex items-center justify-center min-h-[36px]">
        {content}
      </button>
    );
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled || isLoading} className="bg-white dark:bg-[#111] text-[#171717] dark:text-[#ededed] font-medium shadow-[0_0_0_1px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.14)] hover:shadow-[0_0_0_1px_rgba(0,0,0,0.2),0_2px_4px_rgba(0,0,0,0.04)] dark:hover:shadow-[0_0_0_1px_rgba(255,255,255,0.2)] hover:bg-[#fafafa] dark:hover:bg-[#1a1a1a] px-3 py-1.5 rounded-md transition-shadow text-sm disabled:opacity-80 disabled:cursor-not-allowed flex items-center justify-center min-h-[32px]">
      {content}
    </button>
  );
};

const TableWrapper = ({ title, placeholder, action, searchValue, onSearchChange, onExport, isExporting, currentPage, totalPages, onPageChange, children }: any) => (
  <div className="flex-1 bg-white dark:bg-[#111] rounded-xl shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08)] flex flex-col min-h-0">
    <div className="px-6 py-4 shadow-[0_1px_0_0_rgba(0,0,0,0.08)] dark:shadow-[0_1px_0_0_rgba(255,255,255,0.08)] flex flex-wrap gap-4 items-center justify-between bg-white dark:bg-[#111] rounded-t-xl z-10 shrink-0">
      <h2 className="font-medium tracking-tight text-[#171717] dark:text-[#ededed]">{title}</h2>
      <div className="flex gap-2 items-center w-full sm:w-auto">
        <input 
          type="text" 
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder} 
          className="bg-white dark:bg-[#1a1a1a] shadow-[0_0_0_1px_rgba(0,0,0,0.08)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.1)] hover:shadow-[0_0_0_1px_rgba(0,0,0,0.12)] dark:hover:shadow-[0_0_0_1px_rgba(255,255,255,0.15)] focus:shadow-[0_0_0_1px_#0070f3,0_0_0_3px_rgba(0,112,243,0.24)] dark:focus:shadow-[0_0_0_1px_#0070f3,0_0_0_3px_rgba(0,112,243,0.4)] outline-none text-sm px-3 py-1.5 rounded-md w-full sm:w-64 transition-shadow placeholder-[#999] dark:placeholder-[#666] text-[#171717] dark:text-[#ededed]" 
        />
        {onExport && (
          <Button variant="secondary" onClick={onExport} isLoading={isExporting}>
            <Download className="w-4 h-4 mr-2" /> Export
          </Button>
        )}
        {action}
      </div>
    </div>
    <div className="flex-1 overflow-auto">
      <table className="w-full text-left border-collapse min-w-[800px]">
        {children}
      </table>
    </div>
    {(currentPage && totalPages) && (
      <div className="px-6 py-3 shadow-[0_-1px_0_0_rgba(0,0,0,0.08)] dark:shadow-[0_-1px_0_0_rgba(255,255,255,0.08)] bg-[#fafafa] dark:bg-[#111] flex items-center justify-between rounded-b-xl shrink-0">
        <span className="text-sm text-[#666] dark:text-[#a1a1aa]">
          Showing page <span className="font-medium text-[#171717] dark:text-[#ededed]">{currentPage}</span> of <span className="font-medium text-[#171717] dark:text-[#ededed]">{totalPages}</span>
        </span>
        <div className="flex gap-2">
          <Button variant="secondary" disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="secondary" disabled={currentPage === totalPages} onClick={() => onPageChange(currentPage + 1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    )}
  </div>
);

const Th = ({ children, align = "left", sortable, onSort }: { children: React.ReactNode, align?: "left" | "right", sortable?: boolean, onSort?: () => void }) => (
  <th 
    onClick={sortable ? onSort : undefined}
    className={`px-6 py-3 text-xs font-medium text-[#666] dark:text-[#a1a1aa] shadow-[0_1px_0_0_rgba(0,0,0,0.08)] dark:shadow-[0_1px_0_0_rgba(255,255,255,0.08)] bg-[#fafafa] dark:bg-[#0a0a0a] tracking-tight ${align === 'right' ? 'text-right' : ''} ${sortable ? 'cursor-pointer hover:bg-[#f0f0f0] dark:hover:bg-[#1a1a1a] transition-colors select-none' : ''}`}
  >
    <div className={`flex items-center gap-1.5 ${align === 'right' ? 'justify-end' : ''}`}>
      {children}
      {sortable && <ArrowUpDown className="w-3 h-3 opacity-50" />}
    </div>
  </th>
);

const Td = ({ children, align = "left" }: { children: React.ReactNode, align?: "left" | "right" }) => (
  <td className={`px-6 py-4 text-sm text-[#171717] dark:text-[#ededed] shadow-[0_1px_0_0_rgba(0,0,0,0.04)] dark:shadow-[0_1px_0_0_rgba(255,255,255,0.04)] ${align === 'right' ? 'text-right' : ''}`}>
    {children}
  </td>
);

const Tr = ({ children, index = 0 }: { children: React.ReactNode, index?: number, key?: any }) => (
  <motion.tr
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
    className="hover:bg-[#fafafa] dark:hover:bg-[#161616] transition-colors group"
  >
    {children}
  </motion.tr>
);

const Modal = ({ isOpen, onClose, title, children }: any) => {
  if (!isOpen) return null;
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 dark:bg-black/40 backdrop-blur-sm p-4">
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }} className="bg-white dark:bg-[#111] rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
          <div className="px-6 py-4 border-b border-[#eaeaea] dark:border-white/10 flex justify-between items-center bg-[#fafafa] dark:bg-[#0a0a0a]">
            <h3 className="font-semibold tracking-tight text-[#171717] dark:text-[#ededed]">{title}</h3>
            <button onClick={onClose} className="text-[#999] hover:text-[#171717] dark:hover:text-[#ededed] transition-colors">
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
          <div className="p-6 overflow-y-auto">
            {children}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

const Toaster = ({ toasts }: { toasts: ToastItem[] }) => {
  return (
    <div className="fixed bottom-0 right-0 p-4 md:p-6 z-[100] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            layout
            className="pointer-events-auto bg-white dark:bg-[#1a1a1a] px-4 py-3 rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.1),0_0_0_1px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.3),0_0_0_1px_rgba(255,255,255,0.1)] text-sm font-medium text-[#171717] dark:text-[#ededed] flex items-center gap-3 min-w-[280px]"
          >
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-[#10b981] shrink-0" />}
            {toast.type === 'warning' && <AlertCircle className="w-5 h-5 text-[#f5a623] shrink-0" />}
            {toast.type === 'error' && <XCircle className="w-5 h-5 text-[#e00] shrink-0" />}
            {toast.type === 'info' && <Info className="w-5 h-5 text-[#0070f3] shrink-0" />}
            <span className="flex-1">{toast.msg}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

function InventoryView({ 
  onToast, 
  t, 
  lang = 'en' 
}: { 
  onToast: (msg: string, type?: ToastType) => void;
  t?: Translations;
  lang?: Language;
}) {
  const activeT = t || translations[lang] || translations.en;
  const numLocale = lang === 'en' ? 'en-US' : 'id-ID';

  const [isGenerating, setIsGenerating] = useState(false);
  const [search, setSearch] = useState('');
  const [items, setItems] = useState([
    { id: 'NV-H100-TC', name: 'NVIDIA H100 Tensor Core GPU', desc: lang === 'en' ? 'AI Engineering Infra' : 'Infrastruktur AI Engineering', stock: 142, status: lang === 'en' ? 'Safe Range' : 'Aman', color: 'blue' as const },
    { id: 'RS-W1-PRO', name: 'Rack Server Web Infrastructure', desc: lang === 'en' ? 'Server Infra' : 'Infrastruktur Server', stock: 58, status: lang === 'en' ? 'Optimal' : 'Optimal', color: 'green' as const },
    { id: 'NV-4090-FE', name: 'NVIDIA RTX 4090 Founders Edition', desc: lang === 'en' ? 'Workstation Graphics' : 'Grafis Workstation', stock: 12, status: lang === 'en' ? 'Monitoring' : 'Pemantauan', color: 'orange' as const },
    { id: 'SW-10GBE-L3', name: '10GbE Network L3 Managed Switch', desc: lang === 'en' ? 'Networking' : 'Jaringan', stock: 86, status: lang === 'en' ? 'Optimal' : 'Optimal', color: 'green' as const },
    { id: 'AP-WIFI-6E', name: 'Enterprise WiFi 6E Access Point', desc: lang === 'en' ? 'Networking' : 'Jaringan', stock: 24, status: lang === 'en' ? 'Optimal' : 'Optimal', color: 'green' as const },
    { id: 'STR-NVME-8TB', name: '8TB NVMe Enterprise Storage', desc: lang === 'en' ? 'Storage Infra' : 'Infrastruktur Penyimpanan', stock: 8, status: lang === 'en' ? 'Critical' : 'Kritis', color: 'red' as const },
    { id: 'UPS-3KVA-RT', name: '3kVA Rackmount UPS', desc: lang === 'en' ? 'Power Infra' : 'Infrastruktur Daya', stock: 45, status: lang === 'en' ? 'Safe Range' : 'Aman', color: 'blue' as const },
    { id: 'FW-NGFW-10G', name: 'Next-Gen Firewall 10Gbps', desc: lang === 'en' ? 'Security' : 'Keamanan', stock: 15, status: lang === 'en' ? 'Monitoring' : 'Pemantauan', color: 'orange' as const },
    { id: 'LB-L4-PRO', name: 'Hardware Load Balancer L4/L7', desc: lang === 'en' ? 'Networking' : 'Jaringan', stock: 22, status: lang === 'en' ? 'Optimal' : 'Optimal', color: 'green' as const },
    { id: 'MON-32-4K', name: '32" 4K Professional Monitor', desc: 'Workstation', stock: 110, status: lang === 'en' ? 'Safe Range' : 'Aman', color: 'blue' as const },
    { id: 'KBM-WL-PRO', name: 'Wireless Pro Keyboard & Mouse', desc: 'Workstation', stock: 340, status: lang === 'en' ? 'Safe Range' : 'Aman', color: 'blue' as const },
    { id: 'DS-24B-NAS', name: '24-Bay Enterprise NAS', desc: lang === 'en' ? 'Storage Infra' : 'Infrastruktur Penyimpanan', stock: 5, status: lang === 'en' ? 'Critical' : 'Kritis', color: 'red' as const }
  ]);

  const [page, setPage] = useState(1);
  const itemsPerPage = 5;
  const [sortConfig, setSortConfig] = useState<{ key: keyof typeof items[0], direction: 'asc' | 'desc' } | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const debouncedSearch = useDebounce(search, 180);

  const chartData = [
    { name: 'Jan', stock: 900 },
    { name: 'Feb', stock: 950 },
    { name: 'Mar', stock: 1020 },
    { name: 'Apr', stock: 1000 },
    { name: 'May', stock: 1080 },
    { name: 'Jun', stock: 1104 }
  ];

  const handleSort = (key: keyof typeof items[0]) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      if (!sortConfig) return 0;
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [items, sortConfig]);

  const filteredItems = useMemo(() => {
    return sortedItems.filter(item => 
      item.name.toLowerCase().includes(debouncedSearch.toLowerCase()) || 
      item.id.toLowerCase().includes(debouncedSearch.toLowerCase())
    );
  }, [sortedItems, debouncedSearch]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / itemsPerPage));
  const paginatedItems = useMemo(() => {
    return filteredItems.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  }, [filteredItems, page, itemsPerPage]);

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      onToast(lang === 'en' ? "Data exported as CSV" : "Data diekspor sebagai CSV", "success");
    }, 1500);
  };

  const handleGenerateReport = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      onToast(activeT.inventory.reportSuccess, "success");
    }, 1200);
  };

  const handleDeploy = (id: string) => {
    setItems(currentItems => currentItems.map(item => {
      if (item.id === id && item.stock > 0) {
        return { ...item, stock: item.stock - 1 };
      }
      return item;
    }));
    onToast(lang === 'en' ? `1 unit of ${id} deployed successfully` : `1 unit ${id} berhasil dideploy`, "success");
  };

  return (
    <section className="p-4 md:p-8 flex-1 flex flex-col gap-6 overflow-y-auto">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
        <Card>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[#666] dark:text-[#a1a1aa] text-sm font-medium tracking-tight">{activeT.inventory.totalUnits}</p>
              <h3 className="text-3xl font-semibold tracking-tighter mt-1 text-[#171717] dark:text-[#ededed] tabular-nums">
                {items.reduce((acc, item) => acc + item.stock, 1104).toLocaleString(numLocale)}
              </h3>
              <p className="text-[#666] dark:text-[#a1a1aa] text-xs mt-2">
                <span className="text-[#0070f3] dark:text-[#3291ff] font-medium">+12.5%</span> {activeT.inventory.fromLastMonth}
              </p>
            </div>
            <div className="w-24 h-16">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorStock" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0070f3" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#0070f3" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="stock" stroke="#0070f3" fillOpacity={1} fill="url(#colorStock)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>
        <Card>
          <p className="text-[#666] dark:text-[#a1a1aa] text-sm font-medium tracking-tight">{activeT.inventory.assetValuation}</p>
          <h3 className="text-3xl font-semibold tracking-tighter mt-1 text-[#171717] dark:text-[#ededed] tabular-nums">
            {lang === 'en' ? '$1.4M / Rp 21.03B' : 'Rp 21,03 Miliar'}
          </h3>
          <p className="text-[#666] dark:text-[#a1a1aa] text-xs mt-2">{activeT.inventory.valuationHint}</p>
        </Card>
        <Card>
          <p className="text-[#666] dark:text-[#a1a1aa] text-sm font-medium tracking-tight">{activeT.inventory.outboundRequests}</p>
          <h3 className="text-3xl font-semibold tracking-tighter mt-1 text-[#171717] dark:text-[#ededed] tabular-nums">24</h3>
          <p className="text-[#666] dark:text-[#a1a1aa] text-xs mt-2">
            <span className="text-[#f5a623] font-medium">8</span> {activeT.inventory.processedToday}
          </p>
        </Card>
      </div>

      <div className="bg-[#fafafa] dark:bg-[#111] px-6 py-4 rounded-xl shadow-[0_0_0_1px_rgba(0,0,0,0.08)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08)] flex flex-wrap gap-4 items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="p-2 shadow-[0_0_0_1px_rgba(0,0,0,0.08)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.1)] bg-white dark:bg-[#1a1a1a] rounded-full">
            <svg className="w-5 h-5 text-[#0070f3] dark:text-[#3291ff]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <div>
            <h4 className="font-medium tracking-tight text-[#171717] dark:text-[#ededed]">{activeT.inventory.statusOptimal}</h4>
            <p className="text-sm text-[#666] dark:text-[#a1a1aa]">{activeT.inventory.statusOptimalDesc}</p>
          </div>
        </div>
        <Button variant="primary" onClick={handleGenerateReport} isLoading={isGenerating}>
          {activeT.inventory.generateReport}
        </Button>
      </div>

      <TableWrapper 
        title={activeT.inventory.tableTitle} 
        placeholder={activeT.inventory.searchPlaceholder}
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
            <Th sortable onSort={() => handleSort('id')}>{activeT.inventory.skuCol}</Th>
            <Th sortable onSort={() => handleSort('name')}>{activeT.inventory.deviceNameCol}</Th>
            <Th sortable onSort={() => handleSort('stock')}>{activeT.inventory.stockCol}</Th>
            <Th sortable onSort={() => handleSort('status')}>{activeT.inventory.conditionCol}</Th>
            <Th align="right">{activeT.inventory.quickActionCol}</Th>
          </tr>
        </thead>
        <tbody>
          {paginatedItems.length > 0 ? (
            paginatedItems.map((item, idx) => (
              <Tr key={item.id} index={idx}>
                <Td><span className="font-mono text-xs text-[#666] dark:text-[#a1a1aa]">{item.id}</span></Td>
                <Td>
                  <div className="font-medium tracking-tight">{item.name}</div>
                  <div className="text-xs text-[#666] dark:text-[#a1a1aa] mt-0.5">{item.desc}</div>
                </Td>
                <Td><span className="tabular-nums">{item.stock} Units</span></Td>
                <Td><Badge color={item.color}>{item.status}</Badge></Td>
                <Td align="right">
                  <Button variant="secondary" onClick={() => handleDeploy(item.id)} disabled={item.stock === 0}>
                    {activeT.inventory.deployBtn}
                  </Button>
                </Td>
              </Tr>
            ))
          ) : (
            <tr>
              <td colSpan={5} className="px-6 py-12 text-center text-[#666] dark:text-[#a1a1aa] text-sm">
                {activeT.inventory.noItems}
              </td>
            </tr>
          )}
        </tbody>
      </TableWrapper>
    </section>
  );
}

function OverviewView({ onNavigate, t, lang }: { onNavigate: (menu: string) => void, t: Translations, lang: Language }) {
  const chartData = [
    { name: 'Jan', revenue: 4000 },
    { name: 'Feb', revenue: 3000 },
    { name: 'Mar', revenue: 5000 },
    { name: 'Apr', revenue: 8000 },
    { name: 'May', revenue: 11000 },
    { name: 'Jun', revenue: 12800 },
  ];

  const activities = [
    { id: 1, time: '10:42 AM', user: 'Admin', action: lang === 'en' ? 'approved PO-2026-1042' : 'menyetujui PO-2026-1042', icon: CheckCircle2, color: 'text-[#10b981]' },
    { id: 2, time: '09:15 AM', user: 'System', action: lang === 'en' ? 'flagged STR-NVME-8TB as low stock' : 'menandai STR-NVME-8TB stok kritis', icon: AlertCircle, color: 'text-[#e00]' },
    { id: 3, time: 'Yesterday', user: 'Finance', action: lang === 'en' ? 'generated invoice INV-OUT-893' : 'menerbitkan invoice INV-OUT-893', icon: FileText, color: 'text-[#0070f3]' },
    { id: 4, time: 'Yesterday', user: 'HR', action: lang === 'en' ? 'onboarded new employee EMP-10113' : 'menyelesaikan onboarding EMP-10113', icon: UserCircle, color: 'text-[#f5a623]' },
    { id: 5, time: 'Aug 24', user: 'System', action: lang === 'en' ? 'completed weekly payroll run' : 'menyelesaikan siklus payroll mingguan', icon: Activity, color: 'text-[#10b981]' },
  ];

  return (
    <section className="p-4 md:p-8 flex-1 flex flex-col gap-6 overflow-y-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 shrink-0">
        <Card>
          <div className="flex flex-col justify-between h-full">
            <div>
              <p className="text-[#666] dark:text-[#a1a1aa] text-sm font-medium tracking-tight">{t.overview.totalRevenue}</p>
              <h3 className="text-3xl font-semibold tracking-tighter mt-1 text-[#171717] dark:text-[#ededed] tabular-nums">
                {lang === 'en' ? '$850K / Rp 12.8M' : 'Rp 12,8 Miliar'}
              </h3>
              <p className="text-[#666] dark:text-[#a1a1aa] text-xs mt-2"><span className="text-[#10b981] dark:text-[#34d399] font-medium">+18%</span> {t.overview.vsLastMonth}</p>
            </div>
            <div className="w-full h-16 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorRevOverview" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="revenue" stroke="#10b981" fillOpacity={1} fill="url(#colorRevOverview)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>
        
        <Card>
          <p className="text-[#666] dark:text-[#a1a1aa] text-sm font-medium tracking-tight">{t.overview.activePos}</p>
          <h3 className="text-3xl font-semibold tracking-tighter mt-1 text-[#171717] dark:text-[#ededed] tabular-nums">45</h3>
          <p className="text-[#666] dark:text-[#a1a1aa] text-xs mt-2"><span className="text-[#0070f3] dark:text-[#3291ff] font-medium">12</span> {t.overview.pendingApprovals}</p>
          <div className="mt-6">
            <Button variant="secondary" onClick={() => onNavigate('po')}>{lang === 'en' ? 'Review POs' : 'Tinjau PO'}</Button>
          </div>
        </Card>

        <Card>
          <p className="text-[#666] dark:text-[#a1a1aa] text-sm font-medium tracking-tight">{t.overview.lowStockAlerts}</p>
          <h3 className="text-3xl font-semibold tracking-tighter mt-1 text-[#e00] dark:text-[#ff3333] tabular-nums">4</h3>
          <p className="text-[#666] dark:text-[#a1a1aa] text-xs mt-2">{t.overview.belowSafety}</p>
          <div className="mt-6">
            <Button variant="secondary" onClick={() => onNavigate('stok')}>{lang === 'en' ? 'Check Inventory' : 'Periksa Stok'}</Button>
          </div>
        </Card>

        <Card>
          <p className="text-[#666] dark:text-[#a1a1aa] text-sm font-medium tracking-tight">{t.overview.employeeHeadcount}</p>
          <h3 className="text-3xl font-semibold tracking-tighter mt-1 text-[#171717] dark:text-[#ededed] tabular-nums">342</h3>
          <p className="text-[#666] dark:text-[#a1a1aa] text-xs mt-2"><span className="text-[#10b981] dark:text-[#34d399] font-medium">+15</span> {t.overview.newThisMonth}</p>
          <div className="mt-6">
            <Button variant="secondary" onClick={() => onNavigate('sdm')}>{lang === 'en' ? 'Manage HR' : 'Kelola SDM'}</Button>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="bg-white dark:bg-[#111] rounded-xl shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08)] p-6">
            <h3 className="font-semibold tracking-tight text-[#171717] dark:text-[#ededed] mb-4">{t.overview.quickActions}</h3>
            <div className="flex flex-wrap gap-4">
              <Button variant="secondary" onClick={() => onNavigate('purchase')}>{t.overview.createPo}</Button>
              <Button variant="secondary" onClick={() => onNavigate('keuangan')}>{t.overview.generateInvoice}</Button>
              <Button variant="secondary" onClick={() => onNavigate('sdm')}>{t.overview.onboardEmployee}</Button>
              <Button variant="secondary" onClick={() => onNavigate('analytics')}>{t.overview.viewAnalytics}</Button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-[#111] rounded-xl shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08)] p-6 h-full">
            <h3 className="font-semibold tracking-tight text-[#171717] dark:text-[#ededed] mb-6">{t.overview.activityStream}</h3>
            <div className="space-y-6">
              {activities.map((act, index) => {
                const Icon = act.icon;
                return (
                  <div key={act.id} className="flex gap-4 relative">
                    {index !== activities.length - 1 && (
                      <div className="absolute top-6 left-2 bottom-[-1.5rem] w-px bg-[#eaeaea] dark:bg-[#333]"></div>
                    )}
                    <div className="relative z-10 w-4 h-4 mt-1 bg-white dark:bg-[#111] rounded-full flex items-center justify-center">
                      <Icon className={`w-4 h-4 ${act.color}`} />
                    </div>
                    <div>
                      <p className="text-sm text-[#171717] dark:text-[#ededed]"><span className="font-medium">{act.user}</span> {act.action}</p>
                      <p className="text-xs text-[#999] dark:text-[#666] mt-0.5">{act.time}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SettingsView({ 
  onToast, 
  lang, 
  onLanguageChange, 
  t 
}: { 
  onToast: (msg: string, type?: ToastType) => void;
  lang: Language;
  onLanguageChange: (newLang: Language) => void;
  t: Translations;
}) {
  const [activeTab, setActiveTab] = useState<'profile' | 'workspace' | 'language' | 'billing'>('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [selectedLang, setSelectedLang] = useState<Language>(lang);

  useEffect(() => {
    setSelectedLang(lang);
  }, [lang]);

  const handleSave = () => {
    setIsSaving(true);
    if (selectedLang !== lang) {
      onLanguageChange(selectedLang);
    }
    setTimeout(() => {
      setIsSaving(false);
      onToast(lang === 'en' ? "Settings updated successfully" : "Pengaturan berhasil diperbarui", "success");
    }, 600);
  };

  return (
    <section className="p-4 md:p-8 flex-1 flex flex-col gap-6 overflow-y-auto">
      <div className="max-w-4xl w-full mx-auto flex flex-col md:flex-row gap-8">
        <div className="w-full md:w-64 shrink-0 space-y-1">
          <div 
            onClick={() => setActiveTab('profile')} 
            className={`px-3 py-2 rounded-md text-sm font-medium cursor-pointer transition-colors ${activeTab === 'profile' ? 'bg-[#171717] text-white dark:bg-[#ededed] dark:text-[#171717]' : 'text-[#666] dark:text-[#a1a1aa] hover:bg-[#eaeaea] dark:hover:bg-[#333]'}`}
          >
            {t.settings.profileTab}
          </div>
          <div 
            onClick={() => setActiveTab('workspace')} 
            className={`px-3 py-2 rounded-md text-sm font-medium cursor-pointer transition-colors ${activeTab === 'workspace' ? 'bg-[#171717] text-white dark:bg-[#ededed] dark:text-[#171717]' : 'text-[#666] dark:text-[#a1a1aa] hover:bg-[#eaeaea] dark:hover:bg-[#333]'}`}
          >
            {t.settings.workspaceTab}
          </div>
          <div 
            onClick={() => setActiveTab('language')} 
            className={`px-3 py-2 rounded-md text-sm font-medium cursor-pointer transition-colors flex items-center justify-between ${activeTab === 'language' ? 'bg-[#171717] text-white dark:bg-[#ededed] dark:text-[#171717]' : 'text-[#666] dark:text-[#a1a1aa] hover:bg-[#eaeaea] dark:hover:bg-[#333]'}`}
          >
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              <span>{t.settings.languageTab}</span>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded uppercase font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400">
              {lang.toUpperCase()}
            </span>
          </div>
          <div 
            onClick={() => setActiveTab('billing')} 
            className={`px-3 py-2 rounded-md text-sm font-medium cursor-pointer transition-colors ${activeTab === 'billing' ? 'bg-[#171717] text-white dark:bg-[#ededed] dark:text-[#171717]' : 'text-[#666] dark:text-[#a1a1aa] hover:bg-[#eaeaea] dark:hover:bg-[#333]'}`}
          >
            {t.settings.billingTab}
          </div>
        </div>

        <div className="flex-1">
          <Card>
            <h2 className="text-xl font-semibold tracking-tight text-[#171717] dark:text-[#ededed] mb-6">
              {activeTab === 'profile' && t.settings.profileTitle}
              {activeTab === 'workspace' && t.settings.workspaceTitle}
              {activeTab === 'language' && t.settings.languageTitle}
              {activeTab === 'billing' && t.settings.billingTitle}
            </h2>

            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 rounded-full bg-[#f0f0f0] dark:bg-[#1a1a1a] flex items-center justify-center text-[#999] text-3xl font-semibold shadow-inner">
                    A
                  </div>
                  <div>
                    <Button variant="secondary">{t.settings.changeAvatar}</Button>
                    <p className="text-xs text-[#666] dark:text-[#a1a1aa] mt-2">{t.settings.avatarHint}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-[#171717] dark:text-[#ededed]">{t.settings.fullName}</label>
                    <input type="text" defaultValue="Admin User" className="w-full bg-white dark:bg-[#1a1a1a] shadow-[0_0_0_1px_rgba(0,0,0,0.08)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.1)] outline-none text-sm px-3 py-2 rounded-md focus:shadow-[0_0_0_1px_#0070f3,0_0_0_3px_rgba(0,112,243,0.24)] text-[#171717] dark:text-[#ededed]" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-[#171717] dark:text-[#ededed]">{t.settings.emailAddress}</label>
                    <input type="email" defaultValue="admin@inventora.com" className="w-full bg-white dark:bg-[#1a1a1a] shadow-[0_0_0_1px_rgba(0,0,0,0.08)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.1)] outline-none text-sm px-3 py-2 rounded-md focus:shadow-[0_0_0_1px_#0070f3,0_0_0_3px_rgba(0,112,243,0.24)] text-[#171717] dark:text-[#ededed]" />
                  </div>
                </div>
                <div className="pt-4 flex justify-end">
                  <Button variant="primary" onClick={handleSave} isLoading={isSaving}>{t.settings.saveChanges}</Button>
                </div>
              </div>
            )}

            {activeTab === 'workspace' && (
              <div className="space-y-6 text-[#171717] dark:text-[#ededed]">
                <p className="text-sm text-[#666] dark:text-[#a1a1aa]">Configure your workspace preferences and notification settings.</p>
                
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

                <div className="space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" defaultChecked className="w-4 h-4 rounded text-[#0070f3] focus:ring-[#0070f3]" />
                    <span className="text-sm">{t.settings.emailOnPo}</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" defaultChecked className="w-4 h-4 rounded text-[#0070f3] focus:ring-[#0070f3]" />
                    <span className="text-sm">{t.settings.weeklySummary}</span>
                  </label>
                </div>
                <div className="pt-4 flex justify-end">
                  <Button variant="primary" onClick={handleSave} isLoading={isSaving}>{t.settings.updatePreferences}</Button>
                </div>
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

            {activeTab === 'billing' && (
              <div className="space-y-6">
                <div className="p-4 bg-[#fafafa] dark:bg-[#1a1a1a] rounded-lg border border-[#eaeaea] dark:border-[#333]">
                  <h4 className="font-medium text-[#171717] dark:text-[#ededed]">{t.settings.activePlan}</h4>
                  <p className="text-sm text-[#666] dark:text-[#a1a1aa] mt-1">{t.settings.planDesc}</p>
                  <div className="mt-4">
                    <Badge color="green">Active</Badge>
                  </div>
                </div>
                <Button variant="secondary">{t.settings.manageStripe}</Button>
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
  onLanguageChange 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onNavigate: (menu: string) => void; 
  toggleDarkMode: () => void; 
  lang?: Language; 
  onLanguageChange?: (newLang: Language) => void; 
}) {
  const [search, setSearch] = useState('');
  
  useEffect(() => {
    if (isOpen) {
      setSearch('');
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; }
  }, [isOpen]);

  if (!isOpen) return null;

  const commands = [
    { id: 'overview', name: lang === 'en' ? 'Go to Command Center Overview' : 'Buka Command Center Overview', icon: LayoutDashboard, action: () => onNavigate('overview') },
    { id: 'analytics', name: lang === 'en' ? 'View Analytics & Reports' : 'Buka Analytics & Pelaporan', icon: BarChart3, action: () => onNavigate('analytics') },
    { id: 'stok', name: lang === 'en' ? 'Check Inventory Stock' : 'Periksa Stok Inventaris', icon: Database, action: () => onNavigate('stok') },
    { id: 'po', name: lang === 'en' ? 'Manage Procurement (PO & Payment Gateway)' : 'Kelola Pengadaan (PO & Gateway Pembayaran)', icon: ShoppingCart, action: () => onNavigate('po') },
    { id: 'finance', name: lang === 'en' ? 'Go to Finance & Invoices' : 'Buka Keuangan & Invoice', icon: FileText, action: () => onNavigate('keuangan') },
    { id: 'hr', name: lang === 'en' ? 'Manage HR & Payroll' : 'Kelola SDM & Payroll', icon: Users, action: () => onNavigate('sdm') },
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

  const filtered = commands.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] sm:pt-[20vh] px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="bg-white dark:bg-[#111] w-full max-w-lg rounded-xl shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_16px_64px_rgba(0,0,0,0.2)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_16px_64px_rgba(0,0,0,0.6)] overflow-hidden relative z-10"
      >
        <div className="flex items-center px-4 py-3 border-b border-[#eaeaea] dark:border-[#333]">
          <Search className="w-5 h-5 text-[#666] dark:text-[#a1a1aa] mr-3" />
          <input 
            autoFocus
            type="text" 
            placeholder={lang === 'en' ? "Type a command or search..." : "Ketik perintah atau cari menu..."} 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent outline-none text-[#171717] dark:text-[#ededed] placeholder-[#999] dark:placeholder-[#666]"
          />
          <div className="text-[10px] font-mono text-[#999] border border-[#eaeaea] dark:border-[#333] px-1.5 py-0.5 rounded">ESC</div>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {filtered.length > 0 ? (
            filtered.map((cmd) => {
              const Icon = cmd.icon;
              return (
                <div 
                  key={cmd.id}
                  onClick={() => { cmd.action(); onClose(); }}
                  className="flex items-center px-3 py-2.5 rounded-lg hover:bg-[#fafafa] dark:hover:bg-[#1a1a1a] cursor-pointer text-[#171717] dark:text-[#ededed] group"
                >
                  <Icon className="w-4 h-4 text-[#666] dark:text-[#a1a1aa] group-hover:text-[#171717] dark:group-hover:text-[#ededed] mr-3" />
                  <span className="text-sm font-medium">{cmd.name}</span>
                </div>
              );
            })
          ) : (
            <div className="py-8 text-center text-sm text-[#666] dark:text-[#a1a1aa]">
              {lang === 'en' ? `No results found for "${search}"` : `Tidak ada hasil untuk "${search}"`}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
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

  const t = translations[language];

  const handleLanguageChange = (newLang: Language) => {
    setLanguage(newLang);
    localStorage.setItem('inventora_language', newLang);
    showToast(newLang === 'en' ? 'Language switched to English' : 'Bahasa dialihkan ke Bahasa Indonesia', 'info');
  };

  const [currentRole, setCurrentRole] = useState<Role>(() => {
    const demo = sessionStorage.getItem('inventora_demo_user');
    if (demo) {
      try {
        const parsed = JSON.parse(demo);
        if (parsed.role) return parsed.role as Role;
      } catch {}
    }
    return 'Super Admin';
  });
  const [isCmdKOpen, setIsCmdKOpen] = useState(false);
  const [user, setUser] = useState<any>(() => {
    const demo = sessionStorage.getItem('inventora_demo_user');
    return demo ? JSON.parse(demo) : null;
  });

  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    const saved = localStorage.getItem('inventora_notifications');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return [
      {
        id: 'notif-gateway-init',
        title: 'Payment Gateway Pengadaan Aktif',
        message: 'Kanal Virtual Account, Corporate Card, RTGS, dan QRIS siap memproses settlement otomatis.',
        timestamp: new Date().toISOString(),
        read: false,
        type: 'system'
      },
      {
        id: 'notif-po-approved',
        title: 'PO Siap Dibayar',
        message: 'PO-2026-1041 (Cisco Systems Indonesia) telah disetujui. Silakan selesaikan pembayaran via Payment Gateway.',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        read: false,
        type: 'approval',
        metadata: {
          poId: 'PO-2026-1041',
          vendor: 'Cisco Systems Indonesia',
          amount: 850000000
        }
      }
    ];
  });

  const handleNewNotification = (notifData: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => {
    const newNotif: AppNotification = {
      ...notifData,
      id: 'notif-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      timestamp: new Date().toISOString(),
      read: false
    };
    setNotifications(prev => {
      const updated = [newNotif, ...prev];
      try { localStorage.setItem('inventora_notifications', JSON.stringify(updated)); } catch {}
      return updated;
    });
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      try { localStorage.setItem('inventora_notifications', JSON.stringify(updated)); } catch {}
      return updated;
    });
  };

  const handleClearAllNotifications = () => {
    setNotifications([]);
    try { localStorage.removeItem('inventora_notifications'); } catch {}
  };

  useEffect(() => {
    const demo = sessionStorage.getItem('inventora_demo_user');
    if (demo) {
      try {
        setUser(JSON.parse(demo));
        return;
      } catch {}
    }
    let unsub = () => {};
    import('./firebase').then(({ auth }) => {
      unsub = auth.onAuthStateChanged(u => {
        if (!u && !sessionStorage.getItem('inventora_demo_user')) navigate('/login');
        else if (u) setUser(u);
      });
    }).catch(err => {
      console.warn("Auth initialization error:", err);
    });
    return () => unsub();
  }, [navigate]);

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

  const showToast = (msg: string, type: ToastType = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const handleMenuClick = (menuName: string) => {
    setActiveMenu(menuName);
    setIsSidebarOpen(false); // Close mobile sidebar on navigation
  };

  const getMenuClass = (menuName: string) => {
    return activeMenu === menuName
      ? "bg-white dark:bg-[#1a1a1a] shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08)] text-[#171717] dark:text-[#ededed] font-medium px-3 py-2 rounded-md flex items-center gap-3 cursor-pointer"
      : "text-[#666] dark:text-[#a1a1aa] hover:text-[#171717] dark:hover:text-[#ededed] hover:bg-[#eaeaea] dark:hover:bg-[#333] px-3 py-2 rounded-md flex items-center gap-3 transition-colors cursor-pointer";
  };

  const getHeaderTitle = () => {
    switch(activeMenu) {
      case 'overview': return t.headers.overview;
      case 'analytics': return t.headers.analytics;
      case 'stok': return t.headers.inventory;
      case 'po': return t.headers.procurement;
      case 'keuangan': return t.headers.finance;
      case 'sdm': return t.headers.hr;
      case 'purchase': return t.headers.newPo;
      case 'settings': return t.headers.settings;
      default: return t.headers.inventory;
    }
  };

  const hasAccess = (menu: string) => {
    if (currentRole === 'Super Admin') return true;
    if (currentRole === 'Warehouse Manager') return ['overview', 'stok', 'po'].includes(menu);
    if (currentRole === 'Finance Manager') return ['overview', 'po', 'keuangan', 'analytics'].includes(menu);
    if (currentRole === 'HR Manager') return ['overview', 'sdm'].includes(menu);
    return false;
  };

  const handleLogout = async () => {
    sessionStorage.removeItem('inventora_demo_user');
    try {
      const { auth } = await import('./firebase');
      await auth.signOut();
    } catch {}
    navigate('/');
  };

  if (!user) return null;

  return (
    <div className="flex h-screen w-full bg-[#fafafa] dark:bg-[#000] text-[#171717] dark:text-[#ededed] font-sans overflow-hidden transition-colors duration-200">
      
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-30 w-64 bg-[#fafafa] dark:bg-[#111] flex flex-col shrink-0 
        shadow-[1px_0_0_0_rgba(0,0,0,0.08)] dark:shadow-[1px_0_0_0_rgba(255,255,255,0.08)]
        transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 flex items-center justify-between gap-2.5">
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
            className="md:hidden text-[#666] dark:text-[#a1a1aa]"
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        
        <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto">
          {hasAccess('overview') && (
            <div onClick={() => handleMenuClick('overview')} className={getMenuClass('overview')}>
              <LayoutDashboard className="w-4 h-4" />
              <span className="text-sm">{t.nav.overview}</span>
            </div>
          )}
          {hasAccess('analytics') && (
            <div onClick={() => handleMenuClick('analytics')} className={getMenuClass('analytics')}>
              <BarChart3 className="w-4 h-4" />
              <span className="text-sm">{t.nav.analytics}</span>
            </div>
          )}
          {hasAccess('stok') && (
            <div onClick={() => handleMenuClick('stok')} className={getMenuClass('stok')}>
              <Database className="w-4 h-4" />
              <span className="text-sm">{t.nav.inventory}</span>
            </div>
          )}
          {hasAccess('po') && (
            <div onClick={() => handleMenuClick('po')} className={getMenuClass('po')}>
              <ShoppingCart className="w-4 h-4" />
              <span className="text-sm">{t.nav.procurement}</span>
            </div>
          )}
          {hasAccess('keuangan') && (
            <div onClick={() => handleMenuClick('keuangan')} className={getMenuClass('keuangan')}>
              <FileText className="w-4 h-4" />
              <span className="text-sm">{t.nav.finance}</span>
            </div>
          )}
          {hasAccess('sdm') && (
            <div onClick={() => handleMenuClick('sdm')} className={getMenuClass('sdm')}>
              <Users className="w-4 h-4" />
              <span className="text-sm">{t.nav.hr}</span>
            </div>
          )}
          
          {hasAccess('settings') && (
            <div className="pt-4 mt-4 border-t border-[#eaeaea] dark:border-[#333]">
              <div onClick={() => handleMenuClick('settings')} className={getMenuClass('settings')}>
                <SettingsIcon className="w-4 h-4" />
                <span className="text-sm">{t.nav.settings}</span>
              </div>
            </div>
          )}
        </nav>
        
        <div className="p-6 text-[#666] dark:text-[#a1a1aa] text-xs space-y-4 shadow-[0_-1px_0_0_rgba(0,0,0,0.08)] dark:shadow-[0_-1px_0_0_rgba(255,255,255,0.08)]">
          <p>{t.nav.activeSession}:<br/><span className="text-[#171717] dark:text-[#ededed] font-medium text-sm truncate block" title={user?.email}>{user?.email || 'admin@inventora.com'}</span></p>
          <div className="flex gap-2">
            <button onClick={toggleDarkMode} className="flex-1 bg-white dark:bg-[#1a1a1a] text-[#171717] dark:text-[#ededed] font-medium shadow-[0_0_0_1px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.12)] hover:bg-[#fafafa] dark:hover:bg-[#333] px-3 py-2 rounded-md transition-colors flex items-center justify-center">
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


      <main className="flex-1 flex flex-col min-w-0 bg-[#fafafa] dark:bg-[#000]">
        <header className="h-14 shadow-[0_1px_0_0_rgba(0,0,0,0.08)] dark:shadow-[0_1px_0_0_rgba(255,255,255,0.08)] flex items-center justify-between px-4 md:px-8 bg-white dark:bg-[#111] shrink-0 z-10">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden text-[#171717] dark:text-[#ededed] p-1 -ml-1 rounded hover:bg-[#fafafa] dark:hover:bg-[#333]"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-base font-medium tracking-tight text-[#171717] dark:text-[#ededed] flex items-center gap-3">
              {getHeaderTitle()}
              <span className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded bg-[#fafafa] dark:bg-[#1a1a1a] border border-[#eaeaea] dark:border-[#333] text-xs text-[#999] font-mono cursor-pointer hover:border-[#ccc] dark:hover:border-[#555] transition-colors" onClick={() => setIsCmdKOpen(true)}>
                <Command className="w-3 h-3" /> K
              </span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
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
                title="Ganti bahasa ke Bahasa Indonesia"
              >
                ID
              </button>
            </div>

            <NotificationCenter
              notifications={notifications}
              onMarkAllAsRead={handleMarkAllAsRead}
              onClearAll={handleClearAllNotifications}
              onSelectNotification={(n) => {
                if (n.metadata?.poId) {
                  setActiveMenu('po');
                  showToast(language === 'en' ? `Opening PO ${n.metadata.poId}` : `Membuka PO ${n.metadata.poId}`, 'info');
                }
              }}
            />

            <div className="w-8 h-8 rounded-full shadow-[0_0_0_1px_rgba(0,0,0,0.08)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.12)] flex items-center justify-center text-[#171717] dark:text-[#ededed] text-xs font-semibold bg-[#fafafa] dark:bg-[#1a1a1a]">
              {user?.displayName ? user.displayName.slice(0, 2).toUpperCase() : 'AD'}
            </div>
          </div>
        </header>

        <Suspense fallback={<div className="p-6 md:p-8"><ViewSkeleton title={getHeaderTitle()} /></div>}>
          <ErrorBoundary fallbackTitle={getHeaderTitle()} onReset={() => setActiveMenu('overview')}>
            {activeMenu === 'overview' && <OverviewView onNavigate={setActiveMenu} t={t} lang={language} />}
            {activeMenu === 'analytics' && <AnalyticsView t={t} lang={language} />}
            {activeMenu === 'settings' && <SettingsView onToast={showToast} lang={language} onLanguageChange={handleLanguageChange} t={t} />}
            {activeMenu === 'stok' && <InventoryView onToast={showToast} t={t} lang={language} />}
            {activeMenu === 'po' && <ProcurementView onNavigate={setActiveMenu} onToast={showToast} onNotify={handleNewNotification} t={t} lang={language} />}
            {activeMenu === 'keuangan' && <FinanceView onToast={showToast} t={t} lang={language} />}
            {activeMenu === 'sdm' && <HRView onToast={showToast} t={t} lang={language} />}
            {activeMenu === 'purchase' && <PurchaseUnitView onNavigate={setActiveMenu} t={t} lang={language} />}
          </ErrorBoundary>
        </Suspense>

        <Toaster toasts={toasts} />
        <CommandPalette 
          isOpen={isCmdKOpen} 
          onClose={() => setIsCmdKOpen(false)} 
          onNavigate={handleMenuClick} 
          toggleDarkMode={toggleDarkMode}
          lang={language}
          onLanguageChange={handleLanguageChange}
        />
      </main>
    </div>
  );
}

function Home() {
  const navigate = useNavigate();
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('inventora_language');
    return (saved === 'en' || saved === 'id') ? saved : 'en';
  });

  const handleLangToggle = (newLang: Language) => {
    setLang(newLang);
    localStorage.setItem('inventora_language', newLang);
  };

  return (
    <div className="relative h-screen w-full bg-gradient-to-br from-[#fafafa] via-[#f4f6f9] to-[#eaedf2] flex flex-col items-center justify-center font-sans overflow-hidden">
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

      {/* Background Aesthetic Gradients */}
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

      <div className="relative z-10 flex flex-col items-center gap-8">
        <div className="flex items-center gap-3">
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="flex-shrink-0 flex items-center justify-center"
          >
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            >
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <motion.rect initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1, duration: 0.5 }} x="2" y="2" width="8" height="8" rx="1.5" fill="#171717" />
                <motion.rect initial={{ x: 10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2, duration: 0.5 }} x="14" y="2" width="8" height="8" rx="1.5" fill="#171717" fillOpacity="0.15" />
                <motion.rect initial={{ x: -10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3, duration: 0.5 }} x="2" y="14" width="8" height="8" rx="1.5" fill="#171717" fillOpacity="0.15" />
                <motion.rect initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4, duration: 0.5 }} x="14" y="14" width="8" height="8" rx="1.5" fill="#171717" />
              </svg>
            </motion.div>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="flex flex-col justify-center mt-0.5"
          >
            <span className="text-[32px] font-semibold tracking-tight text-[#171717] leading-none">Inventora</span>
          </motion.div>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
        >
          <button 
            onClick={() => navigate('/login')}
            className="bg-[#171717] text-white font-medium px-6 py-2.5 rounded-md text-sm hover:bg-[#383838] transition-all shadow-[0_1px_2px_rgba(0,0,0,0.12)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] active:scale-95 cursor-pointer"
          >
            {lang === 'en' ? 'Enter Workspace' : 'Buka Workspace'}
          </button>
        </motion.div>
      </div>
    </div>
  );
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
  const [errorMsg, setErrorMsg] = useState('');
  const [unauthorizedDomain, setUnauthorizedDomain] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleDemoLogin = (role: Role = 'Super Admin') => {
    sessionStorage.setItem('inventora_demo_user', JSON.stringify({ 
      email: `${role.toLowerCase().replace(/\s+/g, '.')}@inventora.com`, 
      displayName: `${role} (Preview)`,
      role
    }));
    navigate('/dashboard');
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMsg('');
    setUnauthorizedDomain(null);
    try {
      const { googleSignIn } = await import('./firebase');
      await googleSignIn();
      navigate('/dashboard');
    } catch (e: any) {
      if (e?.code === 'auth/unauthorized-domain' || e?.message?.includes('auth/unauthorized-domain')) {
        setUnauthorizedDomain(typeof window !== 'undefined' ? window.location.hostname : 'run.app');
      } else {
        setErrorMsg(e.message || (lang === 'en' ? 'Login failed' : 'Gagal masuk'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-gradient-to-br from-[#fafafa] via-[#f4f6f9] to-[#eaedf2] flex flex-col items-center justify-center font-sans px-4 py-8 overflow-hidden">
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

        <button 
          onClick={() => handleDemoLogin('Super Admin')}
          className="w-full bg-[#171717] text-white font-medium px-4 py-2 rounded-md text-sm hover:bg-[#383838] transition-all shadow-[0_1px_2px_rgba(0,0,0,0.12)] active:scale-[0.98] flex items-center justify-between h-10 cursor-pointer"
        >
          <span>{lang === 'en' ? 'Super Admin' : 'Super Admin'}</span>
          <span className="text-[11px] font-mono text-[#aaa]">({lang === 'en' ? 'All Modules' : 'Semua Modul'})</span>
        </button>
      </motion.div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
}
