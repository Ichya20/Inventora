import assert from 'node:assert/strict';
import { createServer } from 'vite';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => null, setItem() {} } });
const vite = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false, watch: null }, optimizeDeps: { noDiscovery: true, include: [] }, appType: 'custom' });
try {
  const { ThreeWayMatchModal } = await vite.ssrLoadModule('/src/components/ThreeWayMatchModal.tsx');
  const { PurchaseOrderItems } = await vite.ssrLoadModule('/src/components/PurchaseOrderItems.tsx');
  const { PurchaseUnitView } = await vite.ssrLoadModule('/src/components/PurchaseUnitView.tsx');
  const order = { id: 'PO-CHECK', vendor: 'Vendor uji', date: '2026-10-28', status: 'Disetujui', color: 'green', total: 250000,
    items: [{ id: '1', sku: 'SKU-LONG', name: 'Rack Server Web Infrastructure dengan nama barang lengkap', qty: 2, unitPrice: 125000, subtotal: 250000 }] };
  const html = renderToStaticMarkup(React.createElement(ThreeWayMatchModal, { isOpen: true, po: order, lang: 'id', onClose() {}, onSaveGrn: async () => {} }));
  assert.match(html, /ui-dialog-xl/); assert.match(html, /Rack Server Web Infrastructure dengan nama barang lengkap/);
  assert.match(html, /aria-label="Jumlah diterima:/);
  assert.match(html, /required=""[^>]*maxLength="500"[^>]*autoComplete="name"/);
  assert.match(html, /Lengkapi surat jalan dan nama penerima/);
  const submit = html.match(/<button[^>]*type="submit"[^>]*>/)?.[0]; assert.ok(submit); assert.doesNotMatch(submit, /disabled/);
  assert.ok(html.indexOf('Barang yang diterima') < html.indexOf('Nomor surat jalan'));
  assert.doesNotMatch(html, /Simulate Shortage|Enterprise Procurement/);
  const readOnly = renderToStaticMarkup(React.createElement(ThreeWayMatchModal, { isOpen: true, po: order, canEdit: false, lang: 'en', onClose() {}, onSaveGrn: async () => {} }));
  assert.match(readOnly, /read-only/); assert.doesNotMatch(readOnly, /type="submit"/);
  const details = renderToStaticMarkup(React.createElement(PurchaseOrderItems, { order, lang: 'id' }));
  for (const label of ['SKU-LONG', 'Rack Server Web Infrastructure', '125.000', '250.000']) assert.ok(details.includes(label), label);
  const legacy = renderToStaticMarkup(React.createElement(PurchaseOrderItems, { order: { ...order, items: undefined, lineItems: [{ desc: 'Legacy product', quantity: 3 }] }, lang: 'en' }));
  assert.match(legacy, /Legacy product/); assert.doesNotMatch(legacy, /125,000/);
  for (const lineItems of ['bad-data', [null, { name: { invalid: true } }]]) {
    const invalid = renderToStaticMarkup(React.createElement(PurchaseOrderItems, { order: { ...order, items: undefined, lineItems }, lang: 'id' }));
    assert.match(invalid, /role="alert"/);
  }
  const form = renderToStaticMarkup(React.createElement(PurchaseUnitView, { role: 'Warehouse Manager', isDemo: true, ownerId: 'test', lang: 'id', onNavigate() {} }));
  assert.match(form, /po-form-line/); assert.match(form, /<textarea[^>]*required/); assert.match(form, /step="1"/);
  console.log(JSON.stringify({ wideReceipt: 'pass', productVisibility: 'pass', requiredFieldFeedback: 'pass', readOnlyReceipt: 'pass', savedPriceDetails: 'pass', responsiveOrderForm: 'pass', method: 'React server rendering; browser interaction not exercised' }));
} finally { await vite.close(); }
