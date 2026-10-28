import assert from 'node:assert/strict';
import { createServer } from 'vite';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

let saved = JSON.stringify([{ id: 'SKU-UI', name: 'Barang uji POS', stock: 3 }]);
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
  getItem(key) { return key === 'inventora_inventory_v1' ? saved : null; },
} });
const vite = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false, watch: null }, optimizeDeps: { noDiscovery: true, include: [] }, appType: 'custom' });
try {
  const { PosView } = await vite.ssrLoadModule('/src/components/PosView.tsx');
  const props = { role: 'Warehouse Manager', actorId: 'test', actorName: 'Kasir uji', lang: 'id', onToast() {} };
  const html = renderToStaticMarkup(React.createElement(PosView, props));
  assert.match(html, /Barang uji POS/);
  assert.match(html, /belum disinkronkan ke Firestore/);
  assert.match(html, /Selesaikan penjualan/);
  const denied = renderToStaticMarkup(React.createElement(PosView, { ...props, role: 'HR Manager' }));
  assert.match(denied, /tidak memiliki akses POS/);
  assert.doesNotMatch(denied, /Barang uji POS/);
  saved = '{broken';
  const damaged = renderToStaticMarkup(React.createElement(PosView, props));
  assert.match(damaged, /role="alert"/);
  assert.doesNotMatch(damaged, /Barang uji POS/);
  assert.equal(saved, '{broken');
  console.log(JSON.stringify({ catalogue: 'pass', localScopeDisclosure: 'pass', hrDenied: 'pass', damagedInventoryPreserved: 'pass' }));
} finally { await vite.close(); }
