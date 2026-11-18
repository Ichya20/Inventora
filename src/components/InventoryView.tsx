import { stockHealth, isInventoryList } from '../lib/inventory';
import { commerceStorageKey, inventoryStorageKey, readCommerce, deployCommerceStock } from '../lib/commerce';
import React, { useEffect, useMemo, useState } from 'react';
import { Card, Badge, Button, TableWrapper, Th, Td, Tr } from './UI';
import { RestockForecastCard } from './RestockForecastCard';
import { ToastFunction, RestockDraft } from '../types';
import { translations, Language, Translations } from '../i18n';
import { useDebounce } from '../lib/useDebounce';
import { exportToCsv, exportTextFile } from '../lib/exportUtils';
import { saveStoredData } from '../lib/storageUtils';

export function InventoryView({
  onToast,
  onNavigate,
  onRestock,
  t,
  lang = 'en',
  isDemo = false
}: {
  onToast: ToastFunction;
  onNavigate?: (menu: string) => void;
  onRestock?: (draft: RestockDraft) => void;
  t?: Translations;
  lang?: Language;
  isDemo?: boolean;
}) {
  const activeT = t || translations[lang] || translations.en;
  const numLocale = lang === 'en' ? 'en-US' : 'id-ID';

  const [isGenerating, setIsGenerating] = useState(false);
  const [forecastOpen, setForecastOpen] = useState(false);
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

  const [inventoryState, setInventoryState] = useState(() => {
    try {
      const items = readCommerce(defaultItems, isDemo).inventory;
      if (!isInventoryList(items)) throw new Error('Invalid inventory');
      return { items, error: false };
    } catch { return { items: [] as typeof defaultItems, error: true }; }
  });
  const storedItems = inventoryState.items;

  const items = useMemo(() => storedItems.map(item => ({ ...item, ...stockHealth(item, lang) })), [storedItems, lang]);
  useEffect(() => {
    if (inventoryState.error) return;
    try {
      if (localStorage.getItem(inventoryStorageKey(isDemo)) === null && localStorage.getItem(commerceStorageKey(isDemo)) === null) saveStoredData(inventoryStorageKey(isDemo), storedItems, true);
    } catch { onToast(lang === 'en' ? 'Inventory is not saved. Browser storage is unavailable.' : 'Inventori belum tersimpan. Penyimpanan browser tidak tersedia.', 'error'); }
  }, []);

  useEffect(() => {
    const refresh = () => {
      try { setInventoryState({ items: readCommerce(defaultItems, isDemo).inventory, error: false }); }
      catch { setInventoryState({ items: [], error: true }); }
    };
    window.addEventListener('storage', refresh);
    window.addEventListener('inventora:data-changed', refresh);
    return () => { window.removeEventListener('storage', refresh); window.removeEventListener('inventora:data-changed', refresh); };
  }, [isDemo]);

  const [page, setPage] = useState(1);
  const itemsPerPage = 5;
  const [sortConfig, setSortConfig] = useState<{ key: keyof typeof items[0], direction: 'asc' | 'desc' } | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const debouncedSearch = useDebounce(search, 180);

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
      const headers = ['SKU ID', 'Item Name', 'Stock Count', 'Condition', 'Minimum Stock', 'Audit Status'];
      const rows = items.map(item => [
        item.id,
        item.name,
        item.stock,
        item.status,
        stockHealth(item).stockMin,
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

  const handleDeploy = async (id: string) => {
    try {
      const updated = await deployCommerceStock(id, storedItems, isDemo);
      setInventoryState({ items: updated, error: false });
      onToast(lang === 'en' ? `1 unit of ${id} dispatched and saved` : `Pengeluaran 1 unit ${id} berhasil disimpan`, 'success', {
        title: lang === 'en' ? 'Stock saved' : 'Stok tersimpan',
        actionLabel: lang === 'en' ? 'Open procurement' : 'Buka pengadaan', onAction: () => onNavigate?.('po'),
      });
    } catch (error) {
      onToast(lang === 'en' ? 'Stock was not changed. Check browser storage and available stock.' : 'Stok tidak berubah. Periksa penyimpanan browser dan ketersediaan stok.', 'error');
    }
  };

  return (
    <section className="p-4 md:p-8 flex-1 flex flex-col gap-6 overflow-y-auto">
      <p className="text-xs text-neutral-500">{lang === 'en' ? 'Browser inventory · shared with POS' : 'Stok browser · terhubung dengan POS'}</p>
      {inventoryState.error && <div role="alert" className="text-sm border border-red-200 dark:border-red-900 rounded-lg p-4 space-y-2 text-red-700 dark:text-red-400">
        <p>{lang === 'en' ? 'Saved inventory cannot be read. The original data is retained; restore a valid backup before changing stock.' : 'Inventori tersimpan tidak dapat dibaca. Data asli tetap disimpan; pulihkan cadangan yang valid sebelum mengubah stok.'}</p>
        <button type="button" className="underline cursor-pointer" onClick={() => {
          try { exportTextFile('inventora-inventory-recovery.txt', localStorage.getItem(commerceStorageKey(isDemo)) ?? localStorage.getItem(inventoryStorageKey(isDemo)) ?? '', 'text/plain'); }
          catch { onToast(lang === 'en' ? 'Saved inventory could not be downloaded.' : 'Data inventori belum dapat diunduh.', 'error'); }
        }}>{lang === 'en' ? 'Download saved data' : 'Unduh data tersimpan'}</button>
      </div>}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 shrink-0">
        <Card>
          <p className="text-sm text-[var(--ws-muted)]">{activeT.inventory.totalUnits}</p>
          <h3 className="text-2xl font-semibold tracking-tight mt-1 tabular-nums">{inventoryState.error ? '—' : items.reduce((sum, item) => sum + item.stock, 0).toLocaleString(numLocale)}</h3>
        </Card>
        <Card>
          <p className="text-sm text-[var(--ws-muted)]">{lang === 'en' ? 'Products' : 'Jenis barang'}</p>
          <h3 className="text-2xl font-semibold tracking-tight mt-1 tabular-nums">{inventoryState.error ? '—' : items.length}</h3>
        </Card>
        <Card>
          <p className="text-sm text-[var(--ws-muted)]">{lang === 'en' ? 'Needs review' : 'Perlu ditinjau'}</p>
          <h3 className="text-2xl font-semibold tracking-tight mt-1 tabular-nums">{inventoryState.error ? '—' : items.filter(item => item.needsReview).length} <span className="text-sm font-normal text-[var(--ws-muted)]">SKU</span></h3>
        </Card>
      </div>

      {!inventoryState.error && items.length > 0 && <details onToggle={event => setForecastOpen(event.currentTarget.open)} className="rounded-lg border border-[var(--ws-border)] shrink-0">
        <summary className="px-4 py-3 cursor-pointer text-sm font-medium">{lang === 'en' ? 'Restock forecast' : 'Perkiraan restock'}</summary>
        {forecastOpen && <div className="p-4 pt-0"><RestockForecastCard inventory={items} onGeneratePo={(forecast) => {
          if (onRestock) onRestock(forecast);
          else onToast(lang === 'en' ? 'Open New PO to create a restock order.' : 'Buka PO Baru untuk membuat pesanan restock.', 'info');
        }} lang={lang} /></div>}
      </details>}

      <TableWrapper
        title={activeT.inventory.tableTitle}
        action={<Button variant="secondary" onClick={handleGenerateReport} isLoading={isGenerating} disabled={inventoryState.error}>{lang === 'en' ? 'Stock report' : 'Laporan stok'}</Button>}
        placeholder={activeT.inventory.searchPlaceholder}
        searchValue={search}
        onSearchChange={(v: string) => { setSearch(v); setPage(1); }}
        onExport={inventoryState.error ? undefined : handleExport}
        isExporting={isExporting}
        currentPage={page}
        totalPages={totalPages || 1}
        onPageChange={setPage}
      >
        <thead className="sticky top-0 z-10">
          <tr>
            <Th sortable sortDirection={sortConfig?.key === 'id' ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : undefined} onSort={() => handleSort('id')}>{activeT.inventory.skuCol}</Th>
            <Th sortable sortDirection={sortConfig?.key === 'name' ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : undefined} onSort={() => handleSort('name')}>{activeT.inventory.deviceNameCol}</Th>
            <Th sortable sortDirection={sortConfig?.key === 'stock' ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : undefined} onSort={() => handleSort('stock')}>{activeT.inventory.stockCol}</Th>
            <Th sortable sortDirection={sortConfig?.key === 'status' ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : undefined} onSort={() => handleSort('status')}>{activeT.inventory.conditionCol}</Th>
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
                <Td><span className="tabular-nums">{item.stock} {lang === 'en' ? 'units' : 'unit'}</span></Td>
                <Td><Badge color={item.color}>{item.status}</Badge></Td>
                <Td align="right">
                  <Button variant="secondary" onClick={() => handleDeploy(item.id)} disabled={!Number.isSafeInteger(item.stock) || item.stock <= 0}>
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

