import React, { useEffect, useMemo, useState } from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { Download, Check, Sparkles } from 'lucide-react';
import { Card, Badge, Button, TableWrapper, Th, Td, Tr } from './UI';
import { RestockForecastCard } from './RestockForecastCard';
import { ToastFunction } from '../types';
import { translations, Language, Translations } from '../i18n';
import { useDebounce } from '../lib/useDebounce';
import { exportToCsv } from '../lib/exportUtils';
import { loadStoredData, saveStoredData } from '../lib/storageUtils';

export function InventoryView({ 
  onToast, 
  onNavigate,
  t, 
  lang = 'en' 
}: { 
  onToast: ToastFunction;
  onNavigate?: (menu: string) => void;
  t?: Translations;
  lang?: Language;
}) {
  const activeT = t || translations[lang] || translations.en;
  const numLocale = lang === 'en' ? 'en-US' : 'id-ID';

  const [isGenerating, setIsGenerating] = useState(false);
  const [search, setSearch] = useState('');
  
  const defaultItems = [
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
  ];

  const [items, setItems] = useState(() => {
    return loadStoredData('inventora_inventory_v1', defaultItems);
  });

  useEffect(() => {
    saveStoredData('inventora_inventory_v1', items);
  }, [items]);

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
    try {
      const headers = ['SKU ID', 'Item Name', 'Category / Description', 'Stock Count', 'Health Status'];
      const rows = filteredItems.map(item => [
        item.id,
        item.name,
        item.desc,
        item.stock,
        item.status
      ]);
      exportToCsv(`inventora-inventory-stock-${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
      onToast(
        lang === 'en' ? "Inventory data exported as CSV" : "Data inventaris berhasil diekspor sebagai CSV", 
        "success",
        { title: lang === 'en' ? 'CSV Export Completed' : 'Ekspor CSV Berhasil' }
      );
    } catch (e) {
      onToast("Export failed", "error");
    } finally {
      setTimeout(() => setIsExporting(false), 500);
    }
  };

  const handleGenerateReport = () => {
    setIsGenerating(true);
    try {
      const headers = ['SKU ID', 'Item Name', 'Stock Count', 'Condition', 'Estimated Reorder Threshold', 'Audit Status'];
      const rows = items.map(item => [
        item.id,
        item.name,
        item.stock,
        item.status,
        item.stock < 15 ? 'CRITICAL - REORDER IMMEDIATELY' : item.stock < 30 ? 'MONITOR BUFFER' : 'HEALTHY BUFFER',
        'LOCAL_SIMULATION'
      ]);
      exportToCsv(`inventora-inventory-audit-report-${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
      onToast(
        activeT.inventory.reportSuccess, 
        "success",
        { title: lang === 'en' ? 'Audit Report Generated' : 'Laporan Audit Siap' }
      );
    } catch (e) {
      onToast("Audit generation failed", "error");
    } finally {
      setTimeout(() => setIsGenerating(false), 500);
    }
  };

  const handleDeploy = (id: string) => {
    setItems(currentItems => currentItems.map(item => {
      if (item.id === id && item.stock > 0) {
        return { ...item, stock: item.stock - 1 };
      }
      return item;
    }));
    onToast(
      lang === 'en' ? `1 unit of ${id} dispatched from warehouse` : `1 unit ${id} berhasil dideploy dari gudang`, 
      "success",
      {
        title: lang === 'en' ? 'Stock Dispatched' : 'Stok Berkurang',
        actionLabel: lang === 'en' ? 'Audit Trail' : 'Buka Audit',
        onAction: () => onNavigate('po')
      }
    );
  };

  return (
    <section className="p-4 md:p-8 flex-1 flex flex-col gap-6 overflow-y-auto">
      <p className="text-xs text-neutral-500">{lang === 'en' ? 'Local inventory simulation. The small trend chart is an example, not recorded stock history.' : 'Simulasi inventori lokal. Grafik tren kecil adalah contoh, bukan riwayat stok tercatat.'}</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
        <Card>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[#666] dark:text-[#a1a1aa] text-sm font-medium tracking-tight">{activeT.inventory.totalUnits}</p>
              <h3 className="text-3xl font-semibold tracking-tighter mt-1 text-[#171717] dark:text-[#ededed] tabular-nums">
                {items.reduce((acc, item) => acc + item.stock, 0).toLocaleString(numLocale)}
              </h3>
              <p className="text-[#666] dark:text-[#a1a1aa] text-xs mt-2">
                {lang === 'en' ? 'Calculated from the current local inventory' : 'Dihitung dari inventori lokal saat ini'}
              </p>
            </div>
            <div aria-label={lang === 'en' ? 'Example stock trend' : 'Contoh tren stok'} className="w-24 h-16">
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
          <p className="text-[#666] dark:text-[#a1a1aa] text-sm font-medium tracking-tight">{activeT.inventory.assetValuation} ({lang === 'en' ? 'example' : 'contoh'})</p>
          <h3 className="text-3xl font-semibold tracking-tighter mt-1 text-[#171717] dark:text-[#ededed] tabular-nums">
            {lang === 'en' ? '$1.4M / Rp 21.03B' : 'Rp 21,03 Miliar'}
          </h3>
          <p className="text-[#666] dark:text-[#a1a1aa] text-xs mt-2">{activeT.inventory.valuationHint}</p>
        </Card>
        <Card>
          <p className="text-[#666] dark:text-[#a1a1aa] text-sm font-medium tracking-tight">{activeT.inventory.outboundRequests} ({lang === 'en' ? 'example' : 'contoh'})</p>
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
            <h4 className="font-medium tracking-tight text-[#171717] dark:text-[#ededed]">{lang === 'en' ? 'Local stock overview' : 'Ringkasan stok lokal'}</h4>
            <p className="text-sm text-[#666] dark:text-[#a1a1aa]">{items.filter(item => item.color === 'red' || item.color === 'orange').length} {lang === 'en' ? 'SKUs flagged for review in the inventory directory.' : 'SKU ditandai untuk ditinjau dalam direktori inventori.'}</p>
          </div>
        </div>
        <Button variant="primary" onClick={handleGenerateReport} isLoading={isGenerating}>
          {activeT.inventory.generateReport}
        </Button>
      </div>

      {/* Gemini AI Predictive Restock & Demand Forecaster */}
      <RestockForecastCard
        inventory={items}
        onGeneratePo={(forecast) => {
          if (onNavigate) {
            onNavigate('purchase');
            onToast(lang === 'en' ? `Drafting restock PO for ${forecast.name}` : `Menyiapkan PO restok untuk ${forecast.name}`, 'info');
          }
        }}
        lang={lang}
      />

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

