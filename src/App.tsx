import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';
import { CheckCircle2, AlertCircle, Info, XCircle, LayoutDashboard, Settings as SettingsIcon, LogOut, Moon, Sun, Download, ChevronLeft, ChevronRight, ArrowUpDown, Menu, X, Command, Activity, BarChart3, Database, FileText, FileSearch, ArrowRight, UserCircle, ShoppingCart, Users, Search } from 'lucide-react';

export type ToastType = 'success' | 'warning' | 'info' | 'error';
export type ToastItem = { id: number, msg: string, type: ToastType };
export type Role = 'Super Admin' | 'Warehouse Manager' | 'Finance Manager' | 'HR Manager';

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

function InventoryView({ onToast }: { onToast: (msg: string, type?: ToastType) => void }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [search, setSearch] = useState('');
  const [items, setItems] = useState([
    { id: 'NV-H100-TC', name: 'NVIDIA H100 Tensor Core GPU', desc: 'AI Engineering Infra', stock: 142, status: 'Safe Range', color: 'blue' as const },
    { id: 'RS-W1-PRO', name: 'Rack Server Web Infrastructure', desc: 'Server Infra', stock: 58, status: 'Optimal', color: 'green' as const },
    { id: 'NV-4090-FE', name: 'NVIDIA RTX 4090 Founders Edition', desc: 'Workstation Graphics', stock: 12, status: 'Monitoring', color: 'orange' as const },
    { id: 'SW-10GBE-L3', name: '10GbE Network L3 Managed Switch', desc: 'Networking', stock: 86, status: 'Optimal', color: 'green' as const },
    { id: 'AP-WIFI-6E', name: 'Enterprise WiFi 6E Access Point', desc: 'Networking', stock: 24, status: 'Optimal', color: 'green' as const },
    { id: 'STR-NVME-8TB', name: '8TB NVMe Enterprise Storage', desc: 'Storage Infra', stock: 8, status: 'Critical', color: 'red' as const },
    { id: 'UPS-3KVA-RT', name: '3kVA Rackmount UPS', desc: 'Power Infra', stock: 45, status: 'Safe Range', color: 'blue' as const },
    { id: 'FW-NGFW-10G', name: 'Next-Gen Firewall 10Gbps', desc: 'Security', stock: 15, status: 'Monitoring', color: 'orange' as const },
    { id: 'LB-L4-PRO', name: 'Hardware Load Balancer L4/L7', desc: 'Networking', stock: 22, status: 'Optimal', color: 'green' as const },
    { id: 'MON-32-4K', name: '32" 4K Professional Monitor', desc: 'Workstation', stock: 110, status: 'Safe Range', color: 'blue' as const },
    { id: 'KBM-WL-PRO', name: 'Wireless Pro Keyboard & Mouse', desc: 'Workstation', stock: 340, status: 'Safe Range', color: 'blue' as const },
    { id: 'DS-24B-NAS', name: '24-Bay Enterprise NAS', desc: 'Storage Infra', stock: 5, status: 'Critical', color: 'red' as const }
  ]);

  const [page, setPage] = useState(1);
  const itemsPerPage = 5;
  const [sortConfig, setSortConfig] = useState<{ key: keyof typeof items[0], direction: 'asc' | 'desc' } | null>(null);
  const [isExporting, setIsExporting] = useState(false);

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

  const sortedItems = [...items].sort((a, b) => {
    if (!sortConfig) return 0;
    if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
    if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const filteredItems = sortedItems.filter(item => 
    item.name.toLowerCase().includes(search.toLowerCase()) || 
    item.id.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = filteredItems.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      onToast("Data exported as CSV", "success");
    }, 1500);
  };

  const handleGenerateReport = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      onToast("Inventory report generated successfully");
    }, 1200);
  };

  const handleDeploy = (id: string) => {
    setItems(currentItems => currentItems.map(item => {
      if (item.id === id && item.stock > 0) {
        return { ...item, stock: item.stock - 1 };
      }
      return item;
    }));
    onToast(`1 unit of ${id} deployed successfully`);
  };

  return (
    <section className="p-4 md:p-8 flex-1 flex flex-col gap-6 overflow-y-auto">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
        <Card>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[#666] dark:text-[#a1a1aa] text-sm font-medium tracking-tight">Total Unit Infrastruktur</p>
              <h3 className="text-3xl font-semibold tracking-tighter mt-1 text-[#171717] dark:text-[#ededed] tabular-nums">{items.reduce((acc, item) => acc + item.stock, 1104).toLocaleString()}</h3>
              <p className="text-[#666] dark:text-[#a1a1aa] text-xs mt-2"><span className="text-[#0070f3] dark:text-[#3291ff] font-medium">+12.5%</span> dari bulan lalu</p>
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
          <p className="text-[#666] dark:text-[#a1a1aa] text-sm font-medium tracking-tight">Valuasi Aset Terintegrasi</p>
          <h3 className="text-3xl font-semibold tracking-tighter mt-1 text-[#171717] dark:text-[#ededed] tabular-nums">Rp 21.03M</h3>
          <p className="text-[#666] dark:text-[#a1a1aa] text-xs mt-2">Estimasi Kurs: Rp 15,000/Unit</p>
        </Card>
        <Card>
          <p className="text-[#666] dark:text-[#a1a1aa] text-sm font-medium tracking-tight">Permintaan Outbound Aktif</p>
          <h3 className="text-3xl font-semibold tracking-tighter mt-1 text-[#171717] dark:text-[#ededed] tabular-nums">24</h3>
          <p className="text-[#666] dark:text-[#a1a1aa] text-xs mt-2"><span className="text-[#f5a623] font-medium">8 Diproses</span> hari ini</p>
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
            <h4 className="font-medium tracking-tight text-[#171717] dark:text-[#ededed]">Status Ketersediaan: Optimal</h4>
            <p className="text-sm text-[#666] dark:text-[#a1a1aa]">Seluruh unit infrastruktur kritis berada di atas ambang batas minimum keamanan.</p>
          </div>
        </div>
        <Button variant="primary" onClick={handleGenerateReport} isLoading={isGenerating}>Generate Report</Button>
      </div>

      <TableWrapper 
        title="Distribusi Hardware Komputasi" 
        placeholder="Cari SKU atau Nama..."
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
            <Th sortable onSort={() => handleSort('id')}>SKU</Th>
            <Th sortable onSort={() => handleSort('name')}>Nama Perangkat</Th>
            <Th sortable onSort={() => handleSort('stock')}>Stok Saat Ini</Th>
            <Th sortable onSort={() => handleSort('status')}>Kondisi</Th>
            <Th align="right">Aksi Cepat</Th>
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
                    Deploy 1 Unit
                  </Button>
                </Td>
              </Tr>
            ))
          ) : (
            <tr>
              <td colSpan={5} className="px-6 py-12 text-center text-[#666] dark:text-[#a1a1aa] text-sm">
                Tidak ada data yang cocok dengan pencarian "{search}".
              </td>
            </tr>
          )}
        </tbody>
      </TableWrapper>
    </section>
  );
}

function ProcurementView({ onNavigate, onToast }: { onNavigate: (menu: string) => void, onToast: (msg: string, type?: ToastType) => void }) {
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [pos, setPos] = useState<any[]>([]);

  useEffect(() => {
    import('./firebase').then(({ db }) => {
      import('firebase/firestore').then(({ collection, onSnapshot, setDoc, doc }) => {
        const unsub = onSnapshot(collection(db, 'purchaseOrders'), (snap) => {
          if (snap.empty) {
            // Seed initial data
            const initialData = [
              { id: 'PO-2026-1042', vendor: 'NVIDIA Corp Indonesia', desc: 'Supplier Utama', date: '22 Ags 2026', total: 2100000000, status: 'Pending Approval', color: 'orange' },
              { id: 'PO-2026-1041', vendor: 'Cisco Systems Indonesia', desc: 'Networking Vendor', date: '18 Ags 2026', total: 850000000, status: 'Disetujui', color: 'green' },
              { id: 'PO-2026-1040', vendor: 'Dell EMC Indonesia', desc: 'Server Partner', date: '15 Ags 2026', total: 1200000000, status: 'Disetujui', color: 'green' },
              { id: 'PO-2026-1039', vendor: 'Lenovo Enterprise', desc: 'Hardware Vendor', date: '12 Ags 2026', total: 450000000, status: 'Selesai', color: 'blue' },
              { id: 'PO-2026-1038', vendor: 'APC by Schneider', desc: 'Power Infra', date: '10 Ags 2026', total: 320000000, status: 'Selesai', color: 'blue' },
              { id: 'PO-2026-1037', vendor: 'Fortinet Indonesia', desc: 'Security Vendor', date: '05 Ags 2026', total: 550000000, status: 'Ditolak', color: 'red' },
            ];
            initialData.forEach(item => setDoc(doc(db, 'purchaseOrders', item.id), item));
          } else {
            const loaded = snap.docs.map(d => ({ ...d.data(), id: d.id }));
            setPos(loaded);
          }
        });
        return () => unsub();
      });
    });
  }, []);

  const updateStatus = async (id: string, status: string, color: string) => {
    try {
      const { db } = await import('./firebase');
      const { updateDoc, doc } = await import('firebase/firestore');
      await updateDoc(doc(db, 'purchaseOrders', id), { status, color });
      onToast(`PO ${id} updated to ${status}`, 'success');
    } catch (e: any) {
      onToast(`Update failed: ${e.message}`, 'error');
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

  const sortedPos = [...pos].sort((a, b) => {
    if (!sortConfig) return 0;
    if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
    if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const filteredPos = sortedPos.filter(po => 
    po.vendor?.toLowerCase().includes(search.toLowerCase()) || 
    po.id?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filteredPos.length / itemsPerPage);
  const paginatedPos = filteredPos.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const handleExport = async () => {
    const { getAccessToken } = await import('./firebase');
    const token = await getAccessToken();
    if (!token) {
      onToast("Please sign in first to export to Google Sheets", "error");
      return;
    }
    setIsExporting(true);
    try {
      // Create spreadsheet
      const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ properties: { title: `Purchase Orders - ${new Date().toLocaleDateString()}` } })
      });
      const sheet = await res.json();
      
      // Append data
      const values = [
        ['No. PO', 'Vendor', 'Description', 'Date', 'Total', 'Status'],
        ...pos.map(po => [po.id, po.vendor, po.desc, po.date, po.total, po.status])
      ];

      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheet.spreadsheetId}/values/Sheet1!A1:append?valueInputOption=USER_ENTERED`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values })
      });

      onToast("Exported to Google Sheets successfully!", "success");
    } catch (e: any) {
      onToast(`Export failed: ${e.message}`, "error");
    } finally {
      setIsExporting(false);
    }
  };

  const handleApprove = (id: string) => {
    updateStatus(id, 'Disetujui', 'green');
    setActiveModal(null);
  };

  const handleReject = (id: string) => {
    updateStatus(id, 'Ditolak', 'red');
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
    { title: 'Pending Approval', status: 'Pending Approval', color: 'orange' as const },
    { title: 'Disetujui', status: 'Disetujui', color: 'green' as const },
    { title: 'Selesai', status: 'Selesai', color: 'blue' as const },
    { title: 'Ditolak', status: 'Ditolak', color: 'red' as const },
  ];

  return (
    <section className="p-4 md:p-8 flex-1 flex flex-col gap-6 overflow-y-auto">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
        <Card>
          <p className="text-[#666] dark:text-[#a1a1aa] text-sm font-medium tracking-tight">Total PO Aktif</p>
          <h3 className="text-3xl font-semibold tracking-tighter mt-1 text-[#171717] dark:text-[#ededed] tabular-nums">45</h3>
          <p className="text-[#666] dark:text-[#a1a1aa] text-xs mt-2"><span className="text-[#0070f3] dark:text-[#3291ff] font-medium">12 PO</span> Dalam Proses</p>
        </Card>
        <Card>
          <p className="text-[#666] dark:text-[#a1a1aa] text-sm font-medium tracking-tight">Nilai Pengadaan (Bulan Ini)</p>
          <h3 className="text-3xl font-semibold tracking-tighter mt-1 text-[#171717] dark:text-[#ededed] tabular-nums">Rp 4.25M</h3>
          <p className="text-[#666] dark:text-[#a1a1aa] text-xs mt-2">Menunggu Persetujuan Final</p>
        </Card>
        <Card>
          <p className="text-[#666] dark:text-[#a1a1aa] text-sm font-medium tracking-tight">Vendor Terdaftar</p>
          <h3 className="text-3xl font-semibold tracking-tighter mt-1 text-[#171717] dark:text-[#ededed] tabular-nums">128</h3>
          <p className="text-[#666] dark:text-[#a1a1aa] text-xs mt-2"><span className="text-[#10b981] dark:text-[#34d399] font-medium">+3 Vendor</span> Baru</p>
        </Card>
      </div>

      <div className="flex items-center justify-between shrink-0">
        <div className="flex bg-white dark:bg-[#1a1a1a] shadow-[0_0_0_1px_rgba(0,0,0,0.08)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.1)] rounded-md p-1">
          <button 
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${viewMode === 'list' ? 'bg-[#fafafa] dark:bg-[#333] text-[#171717] dark:text-[#ededed] shadow-[0_1px_2px_rgba(0,0,0,0.04)]' : 'text-[#666] dark:text-[#a1a1aa] hover:text-[#171717] dark:hover:text-[#ededed]'}`}
          >
            List View
          </button>
          <button 
            onClick={() => setViewMode('kanban')}
            className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${viewMode === 'kanban' ? 'bg-[#fafafa] dark:bg-[#333] text-[#171717] dark:text-[#ededed] shadow-[0_1px_2px_rgba(0,0,0,0.04)]' : 'text-[#666] dark:text-[#a1a1aa] hover:text-[#171717] dark:hover:text-[#ededed]'}`}
          >
            Kanban Board
          </button>
        </div>
      </div>

      {viewMode === 'list' ? (
        <TableWrapper 
          title="Daftar Purchase Order (PO)" 
          placeholder="Cari No PO atau Vendor..."
          searchValue={search}
          onSearchChange={(v: string) => { setSearch(v); setPage(1); }}
          onExport={handleExport}
          isExporting={isExporting}
          currentPage={page}
          totalPages={totalPages || 1}
          onPageChange={setPage}
          action={<Button onClick={() => onNavigate('purchase')} variant="primary">Buat PO (Beli Unit)</Button>}
        >
          <thead className="sticky top-0 z-10">
            <tr>
              <Th sortable onSort={() => handleSort('id')}>No. PO</Th>
              <Th sortable onSort={() => handleSort('vendor')}>Vendor</Th>
              <Th sortable onSort={() => handleSort('date')}>Tanggal Pengajuan</Th>
              <Th sortable onSort={() => handleSort('total')}>Total (Rp)</Th>
              <Th sortable onSort={() => handleSort('status')}>Status</Th>
              <Th align="right">Aksi</Th>
            </tr>
          </thead>
          <tbody>
            {paginatedPos.length > 0 ? (
              paginatedPos.map((po, idx) => (
                <Tr key={po.id} index={idx}>
                  <Td><span className="font-mono text-xs text-[#666] dark:text-[#a1a1aa]">{po.id}</span></Td>
                  <Td>
                    <div className="font-medium tracking-tight">{po.vendor}</div>
                    <div className="text-xs text-[#666] dark:text-[#a1a1aa] mt-0.5">{po.desc}</div>
                  </Td>
                  <Td><span className="tabular-nums">{po.date}</span></Td>
                  <Td><span className="tabular-nums font-medium">Rp {po.total.toLocaleString()}</span></Td>
                  <Td><Badge color={po.color}>{po.status}</Badge></Td>
                  <Td align="right">
                    {po.status === 'Pending Approval' ? (
                      <Button variant="secondary" onClick={() => setActiveModal({ type: 'review', data: po })}>Review</Button>
                    ) : (
                      <Button variant="secondary" onClick={() => setActiveModal({ type: 'detail', data: po })}>Detail</Button>
                    )}
                  </Td>
                </Tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-[#666] dark:text-[#a1a1aa] text-sm">
                  Tidak ada Purchase Order yang cocok dengan pencarian "{search}".
                </td>
              </tr>
            )}
          </tbody>
        </TableWrapper>
      ) : (
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
                      </div>
                      <div className="font-medium text-sm text-[#171717] dark:text-[#ededed] leading-tight mb-1">{po.vendor}</div>
                      <div className="text-xs text-[#666] dark:text-[#a1a1aa] mb-4">{po.desc}</div>
                      <div className="flex justify-between items-end mt-4 pt-3 border-t border-[#eaeaea] dark:border-[#333]">
                        <span className="text-xs text-[#999]">{po.date}</span>
                        <span className="font-medium text-sm text-[#171717] dark:text-[#ededed] tabular-nums">Rp {(po.total / 1000000).toFixed(1)}M</span>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {pos.filter(po => po.status === col.status).length === 0 && (
                  <div className="py-6 px-4 text-center border-2 border-dashed border-[#eaeaea] dark:border-[#333] rounded-lg">
                    <span className="text-xs text-[#999]">Drop cards here</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal 
        isOpen={activeModal !== null} 
        onClose={() => setActiveModal(null)} 
        title={activeModal?.type === 'review' ? 'Review Purchase Order' : 'Purchase Order Detail'}
      >
        {activeModal && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-[#666] dark:text-[#a1a1aa] mb-1">PO Number</p>
                <p className="font-mono text-[#171717] dark:text-[#ededed]">{activeModal.data.id}</p>
              </div>
              <div>
                <p className="text-[#666] dark:text-[#a1a1aa] mb-1">Date Submitted</p>
                <p className="font-medium text-[#171717] dark:text-[#ededed]">{activeModal.data.date}</p>
              </div>
              <div className="col-span-2">
                <p className="text-[#666] dark:text-[#a1a1aa] mb-1">Vendor</p>
                <p className="font-medium text-[#171717] dark:text-[#ededed]">{activeModal.data.vendor}</p>
                <p className="text-xs text-[#666] dark:text-[#a1a1aa] mt-0.5">{activeModal.data.desc}</p>
              </div>
              <div className="col-span-2 p-4 bg-[#fafafa] dark:bg-[#1a1a1a] rounded-lg shadow-inner dark:shadow-none dark:border dark:border-[#333]">
                <p className="text-[#666] dark:text-[#a1a1aa] mb-1 text-xs uppercase tracking-wider">Total Amount</p>
                <p className="text-2xl font-semibold tracking-tight text-[#171717] dark:text-[#ededed]">{activeModal.data.total}</p>
              </div>
            </div>

            {activeModal.type === 'review' && (
              <div className="flex gap-3 justify-end pt-4 border-t border-[#eaeaea] dark:border-[#333]">
                <Button variant="secondary" onClick={() => handleReject(activeModal.data.id)}>Reject</Button>
                <Button variant="primary" onClick={() => handleApprove(activeModal.data.id)}>Approve PO</Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </section>
  );
}

function FinanceView({ onToast }: { onToast: (msg: string, type?: ToastType) => void }) {
  const [search, setSearch] = useState('');
  const [invoices, setInvoices] = useState([
    { id: 'INV-OUT-889', client: 'Bank Mandiri (Persero)', desc: 'Enterprise Client', date: '30 Ags 2026', total: 1450000000, status: 'Lunas', color: 'green' as const, isOverdue: false },
    { id: 'INV-OUT-890', client: 'PT Telkom Indonesia', desc: 'Enterprise Client', date: '21 Ags 2026', total: 890000000, status: 'Overdue', color: 'red' as const, isOverdue: true },
    { id: 'INV-OUT-891', client: 'Astra International', desc: 'Enterprise Client', date: '15 Ags 2026', total: 2100000000, status: 'Lunas', color: 'green' as const, isOverdue: false },
    { id: 'INV-OUT-892', client: 'BCA Group', desc: 'Financial Sector', date: '10 Ags 2026', total: 600000000, status: 'Pending', color: 'orange' as const, isOverdue: false },
    { id: 'INV-OUT-893', client: 'Gojek Tokopedia', desc: 'Tech Startup', date: '05 Ags 2026', total: 1100000000, status: 'Overdue', color: 'red' as const, isOverdue: true },
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
      onToast("Data exported as PDF", "success");
    }, 1500);
  };

  const handleSendWarning = (id: string, clientName: string) => {
    setActiveModal(null);
    onToast(`Automated warning email sent to ${clientName} for invoice ${id}`, "info");
  };

  return (
    <section className="p-4 md:p-8 flex-1 flex flex-col gap-6 overflow-y-auto">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
        <Card>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[#666] dark:text-[#a1a1aa] text-sm font-medium tracking-tight">Total Pendapatan (Bulan Ini)</p>
              <h3 className="text-3xl font-semibold tracking-tighter mt-1 text-[#171717] dark:text-[#ededed] tabular-nums">Rp 12.8M</h3>
              <p className="text-[#666] dark:text-[#a1a1aa] text-xs mt-2"><span className="text-[#10b981] dark:text-[#34d399] font-medium">+18%</span> dari target bulanan</p>
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
          <p className="text-[#666] dark:text-[#a1a1aa] text-sm font-medium tracking-tight">Outstanding Invoice</p>
          <h3 className="text-3xl font-semibold tracking-tighter mt-1 text-[#171717] dark:text-[#ededed] tabular-nums">Rp 3.1M</h3>
          <p className="text-[#666] dark:text-[#a1a1aa] text-xs mt-2"><span className="text-[#e00] dark:text-[#ff3333] font-medium">4 Invoice</span> melewati jatuh tempo</p>
        </Card>
        <Card>
          <p className="text-[#666] dark:text-[#a1a1aa] text-sm font-medium tracking-tight">Kas & Setara Kas</p>
          <h3 className="text-3xl font-semibold tracking-tighter mt-1 text-[#171717] dark:text-[#ededed] tabular-nums">Rp 45.2M</h3>
          <p className="text-[#666] dark:text-[#a1a1aa] text-xs mt-2">Posisi Likuiditas Aman</p>
        </Card>
      </div>

      <TableWrapper 
        title="Buku Besar & Tagihan Aktif" 
        placeholder="Cari No Tagihan atau Klien..."
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
            <Th sortable onSort={() => handleSort('id')}>No. Invoice</Th>
            <Th sortable onSort={() => handleSort('client')}>Klien / Mitra</Th>
            <Th sortable onSort={() => handleSort('date')}>Jatuh Tempo</Th>
            <Th sortable onSort={() => handleSort('total')}>Nominal (Rp)</Th>
            <Th sortable onSort={() => handleSort('status')}>Status</Th>
            <Th align="right">Aksi</Th>
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
                <Td><span className="tabular-nums font-medium">Rp {inv.total.toLocaleString()}</span></Td>
                <Td><Badge color={inv.color}>{inv.status}</Badge></Td>
                <Td align="right">
                  {inv.status === 'Lunas' ? (
                    <Button variant="secondary" onClick={() => setActiveModal({ type: 'receipt', data: inv })}>Receipt</Button>
                  ) : (
                    <Button variant="secondary" onClick={() => setActiveModal({ type: 'warning', data: inv })}>Send Warning</Button>
                  )}
                </Td>
              </Tr>
            ))
          ) : (
            <tr>
              <td colSpan={6} className="px-6 py-12 text-center text-[#666] dark:text-[#a1a1aa] text-sm">
                Tidak ada tagihan yang cocok dengan pencarian "{search}".
              </td>
            </tr>
          )}
        </tbody>
      </TableWrapper>

      <Modal 
        isOpen={activeModal !== null} 
        onClose={() => setActiveModal(null)} 
        title={activeModal?.type === 'receipt' ? 'Invoice Receipt' : 'Send Payment Warning'}
      >
        {activeModal && activeModal.type === 'receipt' && (
          <div className="space-y-6">
            <div className="flex justify-between items-start pb-6 border-b border-[#eaeaea] dark:border-[#333]">
              <div>
                <h4 className="text-xl font-semibold tracking-tight text-[#171717] dark:text-[#ededed]">INVENTORA CORP</h4>
                <p className="text-sm text-[#666] dark:text-[#a1a1aa]">Official Payment Receipt</p>
              </div>
              <div className="text-right">
                <Badge color="green">Paid in Full</Badge>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-[#666] dark:text-[#a1a1aa] mb-1">Invoice Number</p>
                <p className="font-mono text-[#171717] dark:text-[#ededed]">{activeModal.data.id}</p>
              </div>
              <div>
                <p className="text-[#666] dark:text-[#a1a1aa] mb-1">Payment Date</p>
                <p className="font-medium text-[#171717] dark:text-[#ededed]">{activeModal.data.date}</p>
              </div>
              <div className="col-span-2">
                <p className="text-[#666] dark:text-[#a1a1aa] mb-1">Billed To</p>
                <p className="font-medium text-[#171717] dark:text-[#ededed]">{activeModal.data.client}</p>
              </div>
            </div>

            <div className="p-4 bg-[#fafafa] dark:bg-[#1a1a1a] rounded-lg shadow-inner dark:shadow-none dark:border dark:border-[#333] flex justify-between items-center">
              <span className="text-[#666] dark:text-[#a1a1aa] font-medium">Total Paid</span>
              <span className="text-xl font-semibold tracking-tight text-[#171717] dark:text-[#ededed]">{activeModal.data.total}</span>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-[#eaeaea] dark:border-[#333]">
              <Button variant="secondary" onClick={() => {
                onToast('Receipt downloading as PDF...');
                setActiveModal(null);
              }}>Download PDF</Button>
            </div>
          </div>
        )}

        {activeModal && activeModal.type === 'warning' && (
          <div className="space-y-4">
            <div className="p-4 bg-[#fff0f0] dark:bg-[#331111] rounded-lg border border-[#ffcccc] dark:border-[#662222]">
              <h4 className="text-[#e00] dark:text-[#ff5555] font-medium flex items-center gap-2">
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                Overdue Invoice Alert
              </h4>
              <p className="text-sm text-[#d00] dark:text-[#ff8888] mt-1">Invoice {activeModal.data.id} is overdue since {activeModal.data.date}.</p>
            </div>
            
            <div className="text-sm text-[#171717] dark:text-[#ededed]">
              <p>You are about to send an automated payment reminder to <strong>{activeModal.data.client}</strong>.</p>
              <p className="mt-2 text-[#666] dark:text-[#a1a1aa]">This will dispatch an email to the client's registered billing address and log the warning in the CRM.</p>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-[#eaeaea] dark:border-[#333]">
              <Button variant="secondary" onClick={() => setActiveModal(null)}>Cancel</Button>
              <Button variant="primary" onClick={() => handleSendWarning(activeModal.data.id, activeModal.data.client)}>Dispatch Warning</Button>
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
}

function HRView({ onToast }: { onToast: (msg: string, type?: ToastType) => void }) {
  const [search, setSearch] = useState('');
  const [employees, setEmployees] = useState([
    { id: 'EMP-10024', name: 'Budi Santoso', email: 'budi.s@inventora.com', dept: 'Engineering', role: 'Senior AI Engineer', status: 'Aktif', color: 'green' as const, joined: '12 Jan 2022' },
    { id: 'EMP-10088', name: 'Siti Rahmawati', email: 'siti.r@inventora.com', dept: 'Finance', role: 'Financial Controller', status: 'Cuti Tahunan', color: 'gray' as const, joined: '04 Mar 2023' },
    { id: 'EMP-10091', name: 'Andi Wijaya', email: 'andi.w@inventora.com', dept: 'Operations', role: 'Ops Manager', status: 'Aktif', color: 'green' as const, joined: '15 Aug 2021' },
    { id: 'EMP-10105', name: 'Rina Kusuma', email: 'rina.k@inventora.com', dept: 'HR', role: 'HR Specialist', status: 'Sakit', color: 'red' as const, joined: '10 Feb 2024' },
    { id: 'EMP-10112', name: 'Joko Anwar', email: 'joko.a@inventora.com', dept: 'Engineering', role: 'Backend Engineer', status: 'Aktif', color: 'green' as const, joined: '01 Nov 2023' },
  ]);

  const [activeProfile, setActiveProfile] = useState<any | null>(null);

  const [page, setPage] = useState(1);
  const itemsPerPage = 4;
  const [sortConfig, setSortConfig] = useState<{ key: keyof typeof employees[0], direction: 'asc' | 'desc' } | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleSort = (key: keyof typeof employees[0]) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedEmployees = [...employees].sort((a, b) => {
    if (!sortConfig) return 0;
    if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
    if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const filteredEmployees = sortedEmployees.filter(emp => 
    emp.name.toLowerCase().includes(search.toLowerCase()) || 
    emp.id.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
  const paginatedEmployees = filteredEmployees.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      onToast("Data exported as CSV", "success");
    }, 1500);
  };

  const handleOnboardToCalendar = async (emp: any) => {
    const { getAccessToken } = await import('./firebase');
    const token = await getAccessToken();
    if (!token) {
      onToast("Please sign in first to export to Google Calendar", "error");
      return;
    }
    try {
      const event = {
        summary: `Onboarding: ${emp.name}`,
        description: `Role: ${emp.role}\nDepartment: ${emp.dept}\nEmail: ${emp.email}`,
        start: {
          dateTime: new Date(Date.now() + 86400000).toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
          dateTime: new Date(Date.now() + 86400000 + 3600000).toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      };

      const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(event)
      });
      
      if (!res.ok) throw new Error('Failed to create calendar event');
      
      onToast(`Onboarding event for ${emp.name} created in Calendar`, "success");
    } catch (e: any) {
      onToast(`Calendar export failed: ${e.message}`, "error");
    }
  };

  return (
    <section className="p-4 md:p-8 flex-1 flex flex-col gap-6 overflow-y-auto">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
        <Card>
          <p className="text-[#666] dark:text-[#a1a1aa] text-sm font-medium tracking-tight">Total Pegawai Aktif</p>
          <h3 className="text-3xl font-semibold tracking-tighter mt-1 text-[#171717] dark:text-[#ededed] tabular-nums">342</h3>
          <p className="text-[#666] dark:text-[#a1a1aa] text-xs mt-2"><span className="text-[#0070f3] dark:text-[#3291ff] font-medium">+15 Rekrutmen</span> Bulan Ini</p>
        </Card>
        <Card>
          <p className="text-[#666] dark:text-[#a1a1aa] text-sm font-medium tracking-tight">Estimasi Payroll (Agustus)</p>
          <h3 className="text-3xl font-semibold tracking-tighter mt-1 text-[#171717] dark:text-[#ededed] tabular-nums">Rp 4.8M</h3>
          <p className="text-[#666] dark:text-[#a1a1aa] text-xs mt-2">Pencairan: 25 Ags 2026</p>
        </Card>
        <Card>
          <p className="text-[#666] dark:text-[#a1a1aa] text-sm font-medium tracking-tight">Cuti Pending</p>
          <h3 className="text-3xl font-semibold tracking-tighter mt-1 text-[#171717] dark:text-[#ededed] tabular-nums">8</h3>
          <p className="text-[#666] dark:text-[#a1a1aa] text-xs mt-2"><span className="text-[#f5a623] font-medium">Menunggu Persetujuan</span> Manajer</p>
        </Card>
      </div>

      <TableWrapper 
        title="Direktori SDM & Payroll" 
        placeholder="Cari Nama Pegawai atau ID..."
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
            <Th sortable onSort={() => handleSort('id')}>ID Pegawai</Th>
            <Th sortable onSort={() => handleSort('name')}>Nama Pegawai</Th>
            <Th sortable onSort={() => handleSort('dept')}>Departemen</Th>
            <Th sortable onSort={() => handleSort('role')}>Posisi</Th>
            <Th sortable onSort={() => handleSort('status')}>Status</Th>
            <Th align="right">Aksi</Th>
          </tr>
        </thead>
        <tbody>
          {paginatedEmployees.length > 0 ? (
            paginatedEmployees.map((emp, idx) => (
              <Tr key={emp.id} index={idx}>
                <Td><span className="font-mono text-xs text-[#666] dark:text-[#a1a1aa]">{emp.id}</span></Td>
                <Td>
                  <div className="font-medium tracking-tight">{emp.name}</div>
                  <div className="text-xs text-[#666] dark:text-[#a1a1aa] mt-0.5">{emp.email}</div>
                </Td>
                <Td>{emp.dept}</Td>
                <Td>{emp.role}</Td>
                <Td><Badge color={emp.color}>{emp.status}</Badge></Td>
                <Td align="right">
                  <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={() => handleOnboardToCalendar(emp)}>Schedule Onboard</Button>
                    <Button variant="secondary" onClick={() => setActiveProfile(emp)}>Profile</Button>
                  </div>
                </Td>
              </Tr>
            ))
          ) : (
            <tr>
              <td colSpan={6} className="px-6 py-12 text-center text-[#666] dark:text-[#a1a1aa] text-sm">
                Tidak ada pegawai yang cocok dengan pencarian "{search}".
              </td>
            </tr>
          )}
        </tbody>
      </TableWrapper>

      <Modal 
        isOpen={activeProfile !== null} 
        onClose={() => setActiveProfile(null)} 
        title="Employee Profile"
      >
        {activeProfile && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 pb-6 border-b border-[#eaeaea]">
              <div className="w-16 h-16 rounded-full bg-[#f0f0f0] text-[#999] flex items-center justify-center text-2xl font-semibold shadow-inner">
                {activeProfile.name.charAt(0)}
              </div>
              <div>
                <h4 className="text-xl font-semibold tracking-tight text-[#171717]">{activeProfile.name}</h4>
                <p className="text-sm text-[#666]">{activeProfile.role}</p>
                <div className="mt-1">
                  <Badge color={activeProfile.color}>{activeProfile.status}</Badge>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
              <div>
                <p className="text-[#666] mb-1">Employee ID</p>
                <p className="font-mono text-[#171717]">{activeProfile.id}</p>
              </div>
              <div>
                <p className="text-[#666] mb-1">Department</p>
                <p className="font-medium text-[#171717]">{activeProfile.dept}</p>
              </div>
              <div>
                <p className="text-[#666] mb-1">Work Email</p>
                <p className="font-medium text-[#171717]">{activeProfile.email}</p>
              </div>
              <div>
                <p className="text-[#666] mb-1">Date Joined</p>
                <p className="font-medium text-[#171717]">{activeProfile.joined}</p>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-[#eaeaea]">
              <Button variant="secondary" onClick={() => setActiveProfile(null)}>Close</Button>
              <Button variant="primary" onClick={() => {
                onToast(`Accessing payroll settings for ${activeProfile.name}...`);
                setActiveProfile(null);
              }}>Manage Payroll</Button>
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
}

function PurchaseUnitView({ onNavigate }: { onNavigate: (menu: string) => void }) {
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setStep('success');
    }, 1200);
  };

  if (step === 'success') {
    return (
      <section className="p-4 md:p-8 flex-1 flex flex-col items-center justify-center overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="bg-white dark:bg-[#111] p-8 rounded-xl shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_4px_16px_rgba(0,0,0,0.04)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08)] text-center max-w-sm w-full"
        >
          <div className="w-12 h-12 rounded-full bg-[#10b981]/10 flex items-center justify-center text-[#10b981] mx-auto mb-4">
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"></path></svg>
          </div>
          <h2 className="text-xl font-semibold tracking-tight text-[#171717] dark:text-[#ededed] mb-2">Order Confirmed</h2>
          <p className="text-sm text-[#666] dark:text-[#a1a1aa] mb-6">Purchase Order <span className="font-mono text-[#171717] dark:text-[#ededed] font-medium">PO-2026-1043</span> has been generated and sent for approval.</p>
          <Button onClick={() => onNavigate('po')} variant="secondary">Return to Procurement</Button>
        </motion.div>
      </section>
    );
  }

  return (
    <section className="p-4 md:p-8 flex-1 flex flex-col overflow-y-auto">
      <div className="flex items-center gap-4 mb-6 shrink-0">
        <button onClick={() => onNavigate('po')} className="text-[#666] dark:text-[#a1a1aa] hover:text-[#171717] dark:hover:text-[#ededed] transition-colors shadow-[0_0_0_1px_rgba(0,0,0,0.08)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.1)] bg-white dark:bg-[#1a1a1a] w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#fafafa] dark:hover:bg-[#333]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        </button>
        <h2 className="text-2xl font-semibold tracking-tight text-[#171717] dark:text-[#ededed]">Buat Purchase Order Baru</h2>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="bg-white dark:bg-[#111] rounded-xl shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08)] max-w-3xl flex-shrink-0"
      >
        <div className="px-6 py-4 shadow-[0_1px_0_0_rgba(0,0,0,0.08)] dark:shadow-[0_1px_0_0_rgba(255,255,255,0.08)] bg-[#fafafa] dark:bg-[#1a1a1a] rounded-t-xl">
          <h3 className="font-medium tracking-tight text-[#171717] dark:text-[#ededed]">Formulir Pengadaan</h3>
          <p className="text-xs text-[#666] dark:text-[#a1a1aa] mt-0.5">Masukkan detail unit yang akan dipesan melalui vendor terdaftar.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-[#171717] dark:text-[#ededed]">Vendor Supplier</label>
              <select required className="w-full bg-white dark:bg-[#1a1a1a] shadow-[0_0_0_1px_rgba(0,0,0,0.08)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.1)] hover:shadow-[0_0_0_1px_rgba(0,0,0,0.12)] focus:shadow-[0_0_0_1px_#0070f3,0_0_0_3px_rgba(0,112,243,0.24)] outline-none text-sm px-3 py-2 rounded-md transition-shadow text-[#171717] dark:text-[#ededed] appearance-none cursor-pointer">
                <option value="">Pilih Vendor...</option>
                <option value="nvidia">NVIDIA Corp Indonesia</option>
                <option value="cisco">Cisco Systems Indonesia</option>
                <option value="dell">Dell EMC Indonesia</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-[#171717] dark:text-[#ededed]">SKU / Nama Perangkat</label>
              <input required type="text" placeholder="e.g. NV-H100-TC" className="w-full bg-white dark:bg-[#1a1a1a] shadow-[0_0_0_1px_rgba(0,0,0,0.08)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.1)] hover:shadow-[0_0_0_1px_rgba(0,0,0,0.12)] focus:shadow-[0_0_0_1px_#0070f3,0_0_0_3px_rgba(0,112,243,0.24)] outline-none text-sm px-3 py-2 rounded-md transition-shadow placeholder-[#999] dark:placeholder-[#666] text-[#171717] dark:text-[#ededed]" />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-[#171717] dark:text-[#ededed]">Kuantitas (Unit)</label>
              <input required type="number" min="1" placeholder="10" className="w-full bg-white dark:bg-[#1a1a1a] shadow-[0_0_0_1px_rgba(0,0,0,0.08)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.1)] hover:shadow-[0_0_0_1px_rgba(0,0,0,0.12)] focus:shadow-[0_0_0_1px_#0070f3,0_0_0_3px_rgba(0,112,243,0.24)] outline-none text-sm px-3 py-2 rounded-md transition-shadow placeholder-[#999] dark:placeholder-[#666] text-[#171717] dark:text-[#ededed]" />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-[#171717] dark:text-[#ededed]">Total Estimasi Harga (Rp)</label>
              <input required type="text" placeholder="150,000,000" className="w-full bg-white dark:bg-[#1a1a1a] shadow-[0_0_0_1px_rgba(0,0,0,0.08)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.1)] hover:shadow-[0_0_0_1px_rgba(0,0,0,0.12)] focus:shadow-[0_0_0_1px_#0070f3,0_0_0_3px_rgba(0,112,243,0.24)] outline-none text-sm px-3 py-2 rounded-md transition-shadow placeholder-[#999] dark:placeholder-[#666] text-[#171717] dark:text-[#ededed]" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-[#171717] dark:text-[#ededed]">Catatan / Urgensi</label>
            <textarea rows={3} placeholder="Tambahkan catatan jika diperlukan..." className="w-full bg-white dark:bg-[#1a1a1a] shadow-[0_0_0_1px_rgba(0,0,0,0.08)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.1)] hover:shadow-[0_0_0_1px_rgba(0,0,0,0.12)] focus:shadow-[0_0_0_1px_#0070f3,0_0_0_3px_rgba(0,112,243,0.24)] outline-none text-sm px-3 py-2 rounded-md transition-shadow placeholder-[#999] dark:placeholder-[#666] text-[#171717] dark:text-[#ededed] resize-none"></textarea>
          </div>
          
          <div className="pt-2 flex items-center justify-end gap-3">
            <Button onClick={() => onNavigate('po')} variant="secondary">Batal</Button>
            <Button type="submit" disabled={isSubmitting} variant="primary">
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Memproses...
                </div>
              ) : "Submit Order"}
            </Button>
          </div>
        </form>
      </motion.div>
    </section>
  );
}

function OverviewView({ onNavigate }: { onNavigate: (menu: string) => void }) {
  const chartData = [
    { name: 'Jan', revenue: 4000 },
    { name: 'Feb', revenue: 3000 },
    { name: 'Mar', revenue: 5000 },
    { name: 'Apr', revenue: 8000 },
    { name: 'May', revenue: 11000 },
    { name: 'Jun', revenue: 12800 },
  ];

  const activities = [
    { id: 1, time: '10:42 AM', user: 'Admin', action: 'approved PO-2026-1042', icon: CheckCircle2, color: 'text-[#10b981]' },
    { id: 2, time: '09:15 AM', user: 'System', action: 'flagged STR-NVME-8TB as low stock', icon: AlertCircle, color: 'text-[#e00]' },
    { id: 3, time: 'Yesterday', user: 'Finance', action: 'generated invoice INV-OUT-893', icon: FileText, color: 'text-[#0070f3]' },
    { id: 4, time: 'Yesterday', user: 'HR', action: 'onboarded new employee EMP-10113', icon: UserCircle, color: 'text-[#f5a623]' },
    { id: 5, time: 'Aug 24', user: 'System', action: 'completed weekly payroll run', icon: Activity, color: 'text-[#10b981]' },
  ];

  return (
    <section className="p-4 md:p-8 flex-1 flex flex-col gap-6 overflow-y-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 shrink-0">
        <Card>
          <div className="flex flex-col justify-between h-full">
            <div>
              <p className="text-[#666] dark:text-[#a1a1aa] text-sm font-medium tracking-tight">Total Revenue</p>
              <h3 className="text-3xl font-semibold tracking-tighter mt-1 text-[#171717] dark:text-[#ededed] tabular-nums">Rp 12.8M</h3>
              <p className="text-[#666] dark:text-[#a1a1aa] text-xs mt-2"><span className="text-[#10b981] dark:text-[#34d399] font-medium">+18%</span> vs last month</p>
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
          <p className="text-[#666] dark:text-[#a1a1aa] text-sm font-medium tracking-tight">Active POs</p>
          <h3 className="text-3xl font-semibold tracking-tighter mt-1 text-[#171717] dark:text-[#ededed] tabular-nums">45</h3>
          <p className="text-[#666] dark:text-[#a1a1aa] text-xs mt-2"><span className="text-[#0070f3] dark:text-[#3291ff] font-medium">12 pending</span> approvals</p>
          <div className="mt-6">
            <Button variant="secondary" onClick={() => onNavigate('po')}>Review POs</Button>
          </div>
        </Card>

        <Card>
          <p className="text-[#666] dark:text-[#a1a1aa] text-sm font-medium tracking-tight">Low Stock Alerts</p>
          <h3 className="text-3xl font-semibold tracking-tighter mt-1 text-[#e00] dark:text-[#ff3333] tabular-nums">4</h3>
          <p className="text-[#666] dark:text-[#a1a1aa] text-xs mt-2">Items below safety threshold</p>
          <div className="mt-6">
            <Button variant="secondary" onClick={() => onNavigate('stok')}>Check Inventory</Button>
          </div>
        </Card>

        <Card>
          <p className="text-[#666] dark:text-[#a1a1aa] text-sm font-medium tracking-tight">Employee Headcount</p>
          <h3 className="text-3xl font-semibold tracking-tighter mt-1 text-[#171717] dark:text-[#ededed] tabular-nums">342</h3>
          <p className="text-[#666] dark:text-[#a1a1aa] text-xs mt-2"><span className="text-[#10b981] dark:text-[#34d399] font-medium">+15 new</span> this month</p>
          <div className="mt-6">
            <Button variant="secondary" onClick={() => onNavigate('sdm')}>Manage HR</Button>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="bg-white dark:bg-[#111] rounded-xl shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08)] p-6">
            <h3 className="font-semibold tracking-tight text-[#171717] dark:text-[#ededed] mb-4">Quick Actions</h3>
            <div className="flex flex-wrap gap-4">
              <Button variant="secondary" onClick={() => onNavigate('purchase')}>Create New PO</Button>
              <Button variant="secondary" onClick={() => onNavigate('keuangan')}>Generate Invoice</Button>
              <Button variant="secondary" onClick={() => onNavigate('sdm')}>Onboard Employee</Button>
              <Button variant="secondary" onClick={() => onNavigate('analytics')}>View Full Analytics</Button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-[#111] rounded-xl shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08)] p-6 h-full">
            <h3 className="font-semibold tracking-tight text-[#171717] dark:text-[#ededed] mb-6">Activity Stream</h3>
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

function SettingsView({ onToast }: { onToast: (msg: string, type?: ToastType) => void }) {
  const [activeTab, setActiveTab] = useState('profile');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      onToast("Settings updated successfully", "success");
    }, 800);
  };

  return (
    <section className="p-4 md:p-8 flex-1 flex flex-col gap-6 overflow-y-auto">
      <div className="max-w-4xl w-full mx-auto flex flex-col md:flex-row gap-8">
        <div className="w-full md:w-64 shrink-0 space-y-1">
          <div 
            onClick={() => setActiveTab('profile')} 
            className={`px-3 py-2 rounded-md text-sm font-medium cursor-pointer transition-colors ${activeTab === 'profile' ? 'bg-[#171717] text-white dark:bg-[#ededed] dark:text-[#171717]' : 'text-[#666] dark:text-[#a1a1aa] hover:bg-[#eaeaea] dark:hover:bg-[#333]'}`}
          >
            Profile & Account
          </div>
          <div 
            onClick={() => setActiveTab('workspace')} 
            className={`px-3 py-2 rounded-md text-sm font-medium cursor-pointer transition-colors ${activeTab === 'workspace' ? 'bg-[#171717] text-white dark:bg-[#ededed] dark:text-[#171717]' : 'text-[#666] dark:text-[#a1a1aa] hover:bg-[#eaeaea] dark:hover:bg-[#333]'}`}
          >
            Workspace Preferences
          </div>
          <div 
            onClick={() => setActiveTab('billing')} 
            className={`px-3 py-2 rounded-md text-sm font-medium cursor-pointer transition-colors ${activeTab === 'billing' ? 'bg-[#171717] text-white dark:bg-[#ededed] dark:text-[#171717]' : 'text-[#666] dark:text-[#a1a1aa] hover:bg-[#eaeaea] dark:hover:bg-[#333]'}`}
          >
            Billing & Plans
          </div>
        </div>

        <div className="flex-1">
          <Card>
            <h2 className="text-xl font-semibold tracking-tight text-[#171717] dark:text-[#ededed] mb-6">
              {activeTab === 'profile' && 'Profile Settings'}
              {activeTab === 'workspace' && 'Workspace Configuration'}
              {activeTab === 'billing' && 'Billing Overview'}
            </h2>

            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 rounded-full bg-[#f0f0f0] dark:bg-[#1a1a1a] flex items-center justify-center text-[#999] text-3xl font-semibold shadow-inner">
                    A
                  </div>
                  <div>
                    <Button variant="secondary">Change Avatar</Button>
                    <p className="text-xs text-[#666] dark:text-[#a1a1aa] mt-2">JPG, GIF or PNG. Max size of 800K</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-[#171717] dark:text-[#ededed]">Full Name</label>
                    <input type="text" defaultValue="Admin User" className="w-full bg-white dark:bg-[#1a1a1a] shadow-[0_0_0_1px_rgba(0,0,0,0.08)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.1)] outline-none text-sm px-3 py-2 rounded-md focus:shadow-[0_0_0_1px_#0070f3,0_0_0_3px_rgba(0,112,243,0.24)] text-[#171717] dark:text-[#ededed]" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-[#171717] dark:text-[#ededed]">Email Address</label>
                    <input type="email" defaultValue="admin@inventora.com" className="w-full bg-white dark:bg-[#1a1a1a] shadow-[0_0_0_1px_rgba(0,0,0,0.08)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.1)] outline-none text-sm px-3 py-2 rounded-md focus:shadow-[0_0_0_1px_#0070f3,0_0_0_3px_rgba(0,112,243,0.24)] text-[#171717] dark:text-[#ededed]" />
                  </div>
                </div>
                <div className="pt-4 flex justify-end">
                  <Button variant="primary" onClick={handleSave} isLoading={isSaving}>Save Changes</Button>
                </div>
              </div>
            )}

            {activeTab === 'workspace' && (
              <div className="space-y-6 text-[#171717] dark:text-[#ededed]">
                <p className="text-sm text-[#666] dark:text-[#a1a1aa]">Configure your workspace preferences and notification settings.</p>
                <div className="space-y-4">
                  <label className="flex items-center gap-3">
                    <input type="checkbox" defaultChecked className="w-4 h-4 rounded text-[#0070f3] focus:ring-[#0070f3]" />
                    <span className="text-sm">Email me when a new PO is created</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input type="checkbox" defaultChecked className="w-4 h-4 rounded text-[#0070f3] focus:ring-[#0070f3]" />
                    <span className="text-sm">Weekly inventory summary reports</span>
                  </label>
                </div>
                <div className="pt-4 flex justify-end">
                  <Button variant="primary" onClick={handleSave} isLoading={isSaving}>Update Preferences</Button>
                </div>
              </div>
            )}

            {activeTab === 'billing' && (
              <div className="space-y-6">
                <div className="p-4 bg-[#fafafa] dark:bg-[#1a1a1a] rounded-lg border border-[#eaeaea] dark:border-[#333]">
                  <h4 className="font-medium text-[#171717] dark:text-[#ededed]">Enterprise Plan</h4>
                  <p className="text-sm text-[#666] dark:text-[#a1a1aa] mt-1">Unlimited users, advanced analytics, and priority support.</p>
                  <div className="mt-4">
                    <Badge color="green">Active</Badge>
                  </div>
                </div>
                <Button variant="secondary">Manage Subscription via Stripe</Button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </section>
  );
}

function AnalyticsView() {
  const pieData = [
    { name: 'Engineering', value: 45 },
    { name: 'Marketing', value: 25 },
    { name: 'Operations', value: 20 },
    { name: 'HR', value: 10 },
  ];
  const COLORS = ['#0070f3', '#10b981', '#f5a623', '#888888'];

  const barData = [
    { name: 'NVIDIA', volume: 4000 },
    { name: 'Cisco', volume: 3000 },
    { name: 'Dell', volume: 2000 },
    { name: 'Lenovo', volume: 1500 },
  ];

  return (
    <section className="p-4 md:p-8 flex-1 flex flex-col gap-6 overflow-y-auto">
      <div className="flex items-center justify-between shrink-0 mb-2">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-[#171717] dark:text-[#ededed]">Analytics & Reporting</h2>
          <p className="text-sm text-[#666] dark:text-[#a1a1aa] mt-1">Multi-dimensional insights across your enterprise data.</p>
        </div>
        <Button variant="secondary"><Download className="w-4 h-4 mr-2" /> Export Report</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 shrink-0">
        <Card>
          <h3 className="font-semibold tracking-tight text-[#171717] dark:text-[#ededed] mb-6">Department Budget Allocation</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold tracking-tight text-[#171717] dark:text-[#ededed] mb-6">Top Vendors by Volume</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eaeaea" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} />
                <RechartsTooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                <Bar dataKey="volume" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold tracking-tight text-[#171717] dark:text-[#ededed] mb-6">Cash Flow Forecast</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={[
                { name: 'Q1', in: 4000, out: 2400 },
                { name: 'Q2', in: 3000, out: 1398 },
                { name: 'Q3', in: 2000, out: 9800 },
                { name: 'Q4', in: 2780, out: 3908 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eaeaea" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} />
                <RechartsTooltip />
                <Area type="monotone" dataKey="in" stackId="1" stroke="#0070f3" fill="#0070f3" fillOpacity={0.2} />
                <Area type="monotone" dataKey="out" stackId="1" stroke="#f5a623" fill="#f5a623" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </section>
  );
}

function CommandPalette({ isOpen, onClose, onNavigate, toggleDarkMode }: { isOpen: boolean, onClose: () => void, onNavigate: (menu: string) => void, toggleDarkMode: () => void }) {
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
    { id: 'overview', name: 'Go to Overview', icon: LayoutDashboard, action: () => onNavigate('overview') },
    { id: 'analytics', name: 'View Analytics', icon: BarChart3, action: () => onNavigate('analytics') },
    { id: 'stok', name: 'Check Inventory', icon: Database, action: () => onNavigate('stok') },
    { id: 'po', name: 'Manage Procurement (PO)', icon: ShoppingCart, action: () => onNavigate('po') },
    { id: 'finance', name: 'Go to Finance', icon: FileText, action: () => onNavigate('keuangan') },
    { id: 'hr', name: 'Manage HR', icon: Users, action: () => onNavigate('sdm') },
    { id: 'settings', name: 'Open Settings', icon: SettingsIcon, action: () => onNavigate('settings') },
    { id: 'theme', name: 'Toggle Dark Mode', icon: Moon, action: () => toggleDarkMode() },
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
            placeholder="Type a command or search..." 
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
              No results found for "{search}"
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
  const [currentRole, setCurrentRole] = useState<Role>('Super Admin');
  const [isCmdKOpen, setIsCmdKOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    let unsub = () => {};
    import('./firebase').then(({ auth }) => {
      unsub = auth.onAuthStateChanged(u => {
        if (!u) navigate('/login');
        else setUser(u);
      });
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
      case 'overview': return 'Command Center Overview';
      case 'analytics': return 'Analytics & Reporting';
      case 'stok': return 'Pusat Kendali Inventaris';
      case 'po': return 'Manajemen Pengadaan (PO)';
      case 'keuangan': return 'Keuangan & Invoice';
      case 'sdm': return 'Sumber Daya Manusia (SDM)';
      case 'purchase': return 'Buat Purchase Order Baru';
      case 'settings': return 'Workspace Settings';
      default: return 'Pusat Kendali Inventaris';
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
    const { auth } = await import('./firebase');
    await auth.signOut();
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
              <span className="text-sm">Overview</span>
            </div>
          )}
          {hasAccess('analytics') && (
            <div onClick={() => handleMenuClick('analytics')} className={getMenuClass('analytics')}>
              <BarChart3 className="w-4 h-4" />
              <span className="text-sm">Analytics</span>
            </div>
          )}
          {hasAccess('stok') && (
            <div onClick={() => handleMenuClick('stok')} className={getMenuClass('stok')}>
              <Database className="w-4 h-4" />
              <span className="text-sm">Manajemen Stok</span>
            </div>
          )}
          {hasAccess('po') && (
            <div onClick={() => handleMenuClick('po')} className={getMenuClass('po')}>
              <ShoppingCart className="w-4 h-4" />
              <span className="text-sm">Pengadaan (PO)</span>
            </div>
          )}
          {hasAccess('keuangan') && (
            <div onClick={() => handleMenuClick('keuangan')} className={getMenuClass('keuangan')}>
              <FileText className="w-4 h-4" />
              <span className="text-sm">Keuangan & Invoice</span>
            </div>
          )}
          {hasAccess('sdm') && (
            <div onClick={() => handleMenuClick('sdm')} className={getMenuClass('sdm')}>
              <Users className="w-4 h-4" />
              <span className="text-sm">SDM & Payroll</span>
            </div>
          )}
          
          {hasAccess('settings') && (
            <div className="pt-4 mt-4 border-t border-[#eaeaea] dark:border-[#333]">
              <div onClick={() => handleMenuClick('settings')} className={getMenuClass('settings')}>
                <SettingsIcon className="w-4 h-4" />
                <span className="text-sm">Settings</span>
              </div>
            </div>
          )}
        </nav>
        
        <div className="p-6 text-[#666] dark:text-[#a1a1aa] text-xs space-y-4 shadow-[0_-1px_0_0_rgba(0,0,0,0.08)] dark:shadow-[0_-1px_0_0_rgba(255,255,255,0.08)]">
          <p>Active Session:<br/><span className="text-[#171717] dark:text-[#ededed] font-medium text-sm truncate block" title={user?.email}>{user?.email || 'admin@inventora.com'}</span></p>
          <div className="flex gap-2">
            <button onClick={toggleDarkMode} className="flex-1 bg-white dark:bg-[#1a1a1a] text-[#171717] dark:text-[#ededed] font-medium shadow-[0_0_0_1px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.12)] hover:bg-[#fafafa] dark:hover:bg-[#333] px-3 py-2 rounded-md transition-colors flex items-center justify-center">
              <svg className="hidden dark:block w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
              <svg className="block dark:hidden w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>
            </button>
            <button onClick={handleLogout} className="flex-[4] bg-white dark:bg-[#1a1a1a] text-[#171717] dark:text-[#ededed] font-medium shadow-[0_0_0_1px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.12)] hover:bg-[#fafafa] dark:hover:bg-[#333] px-3 py-2 rounded-md transition-colors text-xs flex items-center justify-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
              Logout
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
          <div className="flex items-center gap-4">
            <select 
              value={currentRole} 
              onChange={(e) => {
                setCurrentRole(e.target.value as Role);
                setActiveMenu('overview');
                showToast(`Switched role to ${e.target.value}`, 'info');
              }}
              className="hidden sm:block text-sm bg-[#fafafa] dark:bg-[#1a1a1a] border border-[#eaeaea] dark:border-[#333] text-[#171717] dark:text-[#ededed] rounded-md px-2 py-1 outline-none focus:border-[#0070f3]"
            >
              <option value="Super Admin">Super Admin</option>
              <option value="Warehouse Manager">Warehouse Manager</option>
              <option value="Finance Manager">Finance Manager</option>
              <option value="HR Manager">HR Manager</option>
            </select>
            <div className="w-8 h-8 rounded-full shadow-[0_0_0_1px_rgba(0,0,0,0.08)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.12)] flex items-center justify-center text-[#171717] dark:text-[#ededed] text-xs font-semibold bg-[#fafafa] dark:bg-[#1a1a1a]">
              AD
            </div>
          </div>
        </header>

        {activeMenu === 'overview' && <OverviewView onNavigate={setActiveMenu} />}
        {activeMenu === 'analytics' && <AnalyticsView />}
        {activeMenu === 'settings' && <SettingsView onToast={showToast} />}
        {activeMenu === 'stok' && <InventoryView onToast={showToast} />}
        {activeMenu === 'po' && <ProcurementView onNavigate={setActiveMenu} onToast={showToast} />}
        {activeMenu === 'keuangan' && <FinanceView onToast={showToast} />}
        {activeMenu === 'sdm' && <HRView onToast={showToast} />}
        {activeMenu === 'purchase' && <PurchaseUnitView onNavigate={setActiveMenu} />}

        <Toaster toasts={toasts} />
        <CommandPalette isOpen={isCmdKOpen} onClose={() => setIsCmdKOpen(false)} onNavigate={handleMenuClick} toggleDarkMode={toggleDarkMode} />
      </main>
    </div>
  );
}

function Home() {
  const navigate = useNavigate();

  return (
    <div className="relative h-screen w-full bg-gradient-to-br from-[#fafafa] via-[#f4f6f9] to-[#eaedf2] flex flex-col items-center justify-center font-sans overflow-hidden">
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
            className="bg-[#171717] text-white font-medium px-6 py-2.5 rounded-md text-sm hover:bg-[#383838] transition-all shadow-[0_1px_2px_rgba(0,0,0,0.12)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] active:scale-95"
          >
            Enter Workspace
          </button>
        </motion.div>
      </div>
    </div>
  );
}

function Login() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const { auth, googleSignIn } = await import('./firebase');
      await googleSignIn();
      navigate('/dashboard');
    } catch (e: any) {
      setErrorMsg(e.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative h-screen w-full bg-gradient-to-br from-[#fafafa] via-[#f4f6f9] to-[#eaedf2] flex flex-col items-center justify-center font-sans px-4 overflow-hidden">
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
        <div className="text-center mb-8">
          <h1 className="text-lg font-medium tracking-tight text-[#171717]">Sign in to workspace</h1>
          <p className="text-sm text-[#666] mt-1">Authenticate to access the dashboard and integrations</p>
        </div>
        
        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-100">
            {errorMsg}
          </div>
        )}

        <button 
          onClick={handleGoogleLogin}
          disabled={isLoading} 
          className="w-full bg-white text-[#171717] border border-[#eaeaea] font-medium px-4 py-2 rounded-md text-sm hover:bg-[#fafafa] transition-all shadow-[0_1px_2px_rgba(0,0,0,0.04)] active:scale-[0.98] disabled:opacity-80 disabled:active:scale-100 flex items-center justify-center gap-2 h-10"
        >
          {isLoading ? (
            <svg className="animate-spin h-4 w-4 text-[#171717]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Sign in with Google
            </>
          )}
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
