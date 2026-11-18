import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CleanAiText } from '../../src/components/CleanAiText';
import { PurchaseOrderItems } from '../../src/components/PurchaseOrderItems';
import { validatePurchaseOrderCreate } from '../../src/lib/purchaseOrderValidation';
import { checkoutSale, COMMERCE_KEY, readCommerce } from '../../src/lib/commerce';
import { receiptHtml } from '../../src/lib/saleReceipt';

// Isolated probes: only in-memory storage, React server rendering and HTML strings.
// No browser, Firebase, real account, or external HTTP request is used here.
const out = 'output/security-audit';
mkdirSync(out, { recursive: true });
const probes = [
  ['script', '<script>globalThis.__inventoraXssProbe=1</script>'],
  ['image-event', '<img src=x onerror="globalThis.__inventoraXssProbe=1">'],
  ['svg-event', '<svg onload="globalThis.__inventoraXssProbe=1"></svg>'],
  ['closing-tag', '"></td></tr><x-inventora-probe onmouseover="globalThis.__inventoraXssProbe=1">probe</x-inventora-probe>'],
  ['encoded-tag', '&lt;img src=x onerror="globalThis.__inventoraXssProbe=1"&gt;'],
  ['apostrophe', "O'Reilly & Sons"],
] as const;
const records: { id: string; result: string; detail: string }[] = [];
const fixtures: { id: string; kind: string; html: string }[] = [];
let memory = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => { memory.set(key, value); },
} });

const baseline = {
  id: 'PO-SECURITY-LOCAL', vendor: 'Vendor Uji', desc: 'Pemeriksaan lokal',
  date: '2026-11-18', deliveryDate: '2026-11-25', status: 'Pending Approval',
  items: [{ id: 'line-1', sku: 'SKU-1', name: 'Barang Uji', qty: 2, unitPrice: 100000, subtotal: 200000 }],
  subtotal: 200000, total: 200000,
};

for (const [id, payload] of probes) {
  const po = validatePurchaseOrderCreate({ ...baseline, vendor: payload, notes: payload,
    items: [{ ...baseline.items[0], name: payload, sku: payload }] });
  assert.equal(po.vendor, payload);
  assert.equal(po.notes, payload);
  const rendered = [
    ['ai-output', renderToStaticMarkup(<CleanAiText text={`${payload}\n# ${payload}\n- ${payload}`} />)],
    ['po-items', renderToStaticMarkup(<PurchaseOrderItems order={po} lang="en" />)],
  ] as const;
  for (const [kind, html] of rendered) {
    assert.doesNotMatch(html, /<(?:script|img|svg|x-inventora-probe)\b/i);
    assert.ok(!payload.includes('<') || !html.includes(payload));
    fixtures.push({ id, kind, html });
    records.push({ id: `${id}:${kind}`, result: 'PASS', detail: 'Input rendered as escaped text; no injected element.' });
  }

  memory = new Map([['inventora_inventory_v1', JSON.stringify([{ id: payload, name: payload, stock: 5 }])]]);
  const sale = await checkoutSale({ requestId: `probe-${id}`, actorId: 'isolated-test', actorName: payload,
    role: 'Warehouse Manager', lines: [{ sku: payload, quantity: 2, unitPrice: 100000, discountPercent: 0 }],
    taxRate: 0, amountPaid: 200000 });
  const saved = readCommerce().sales[0];
  assert.equal(saved.actorName, payload);
  assert.equal(saved.items[0].name, payload);
  assert.equal(saved.items[0].sku, payload);
  assert.equal(saved.id, sale.id);
  for (const lang of ['en', 'id'] as const) {
    const html = receiptHtml(saved, lang);
    assert.doesNotMatch(html, /<(?:script|img|svg|x-inventora-probe)\b/i);
    assert.ok(!payload.includes('<') || !html.includes(payload));
    fixtures.push({ id, kind: `receipt-${lang}`, html });
    records.push({ id: `${id}:receipt-${lang}`, result: 'PASS', detail: 'Stored POS text escaped in generated receipt HTML.' });
  }
}

for (const field of ['quantity', 'unitPrice', 'discountPercent', 'total', 'amountPaid']) {
  const saved = JSON.parse(memory.get(COMMERCE_KEY)!);
  if (['quantity', 'unitPrice', 'discountPercent'].includes(field)) saved.sales[0].items[0][field] = probes[1][1];
  else saved.sales[0][field] = probes[1][1];
  const original = memory.get(COMMERCE_KEY)!;
  memory.set(COMMERCE_KEY, JSON.stringify(saved));
  assert.throws(() => readCommerce(), /tidak dapat dibaca/);
  memory.set(COMMERCE_KEY, original);
  records.push({ id: `numeric:${field}`, result: 'PASS', detail: 'HTML string in saved numeric field rejected before receipt view.' });
}

for (const value of [{ $ne: null }, { $gt: '' }, ['Vendor']]) {
  assert.throws(() => validatePurchaseOrderCreate({ ...baseline, vendor: value }), /Vendor/);
  records.push({ id: `vendor-type:${records.length}`, result: 'PASS', detail: 'Object/array rejected where vendor must be a string.' });
}
const sqlLike = "' OR 1=1 --";
assert.equal(validatePurchaseOrderCreate({ ...baseline, vendor: sqlLike }).vendor, sqlLike);
records.push({ id: 'sql-like-text', result: 'PASS', detail: 'SQL-like text stays a literal vendor string; not a login or SQL execution test.' });

writeFileSync(`${out}/xss-html-fixtures.json`, JSON.stringify(fixtures, null, 2));
const report = { scope: 'Local validators, in-memory POS roundtrip, React server rendering, generated HTML. No browser JavaScript execution or Firebase test.',
  checks: records.length, passed: records.length, records };
writeFileSync(`${out}/xss-probe.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ checks: report.checks, passed: report.passed, htmlFixtures: fixtures.length }));
