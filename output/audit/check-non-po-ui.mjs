import assert from 'node:assert/strict';
import { createServer } from 'vite';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const saved = {
  inventora_inventory_v1: JSON.stringify([{ id: 'SKU-UI', name: 'Produk uji', stock: 3 }]),
  inventora_finance_invoices_v1: JSON.stringify([
    { id: 'INV-A', client: 'Klien uji', desc: '', date: '2026-10-28', total: 1200, status: 'Lunas', color: 'green', isOverdue: false },
    { id: 'INV-B', client: 'Klien lain', desc: '', date: '2026-10-01', total: 800, status: 'Overdue', color: 'red', isOverdue: true },
  ]),
};
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem(key) { return saved[key] ?? null; } } });
const vite = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false, watch: null }, optimizeDeps: { noDiscovery: true, include: [] }, appType: 'custom' });
try {
  for (const lang of ['id', 'en']) {
    const props = { lang, onToast() {} };
    const { InventoryView } = await vite.ssrLoadModule('/src/components/InventoryView.tsx');
    const inventory = renderToStaticMarkup(React.createElement(InventoryView, props));
    assert.match(inventory, /Produk uji/);
    assert.doesNotMatch(inventory, /21,03|21.03|1\.4M/);
    assert.match(inventory, /<details/);
    const { FinanceView } = await vite.ssrLoadModule('/src/components/FinanceView.tsx');
    const finance = renderToStaticMarkup(React.createElement(FinanceView, props));
    assert.match(finance, /Klien uji/);
    assert.match(finance, lang === 'id' ? /Rp 1\.200/ : /Rp 1,200/);
    assert.match(finance, /Rp 800/);
    const { BillingSubscriptionView } = await vite.ssrLoadModule('/src/components/BillingSubscriptionView.tsx');
    const billing = renderToStaticMarkup(React.createElement(BillingSubscriptionView, props));
    assert.match(billing, /<details/);
    assert.match(billing, /Enterprise/);
    assert.doesNotMatch(billing, /Autonomous Treasury/);
    const { AnalyticsView } = await vite.ssrLoadModule('/src/components/AnalyticsView.tsx');
    const analytics = renderToStaticMarkup(React.createElement(AnalyticsView, props));
    assert.match(analytics, lang === 'id' ? /Data contoh/ : /Example data/);
    assert.match(analytics, /aria-label=/);
    const { HRView } = await vite.ssrLoadModule('/src/components/HRView.tsx');
    const hr = renderToStaticMarkup(React.createElement(HRView, props));
    assert.match(hr, lang === 'id' ? /tanpa transfer dana/ : /no funds transferred/);
  }
  console.log(JSON.stringify({ languages: 2, inventory: 'pass', financeRecordedTotals: 'pass', billing: 'pass', analytics: 'pass', hr: 'pass' }));
} finally { await vite.close(); }
