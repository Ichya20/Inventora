import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePurchaseOrderCreate } from '../src/lib/purchaseOrderValidation';
import { dispatchInventory, stockHealth } from '../src/lib/inventory';
import { markLocalInvoicePaid, reminderDraft } from '../src/lib/localFinance';

const po = { id: 'PO-NEW-1', vendor: 'Vendor', desc: 'Server', date: '2026-10-22', deliveryDate: '2026-10-27', subtotal: 1000, total: 1110, taxAmount: 110, status: 'Pending Approval', items: [{ name: 'Server', qty: 2, unitPrice: 500, subtotal: 1000 }] };

function storage(initial: Record<string, string>, failWrite = false, failRead = false) {
  const data = { ...initial };
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem(key: string) { if (failRead) throw Error('Storage unavailable'); return data[key] ?? null; },
    setItem(key: string, value: string) { if (failWrite) throw Error('Quota exceeded'); data[key] = value; },
  } });
  return data;
}

test('PO validation canonicalizes form data and strips fields that are server-owned', () => {
  const created = validatePurchaseOrderCreate({ ...po, color: 'green', threeWayMatchStatus: 'MATCHED', unknownField: true });
  assert.equal(created.color, 'orange');
  assert.equal(created.threeWayMatchStatus, 'PENDING_RECEIPT');
  assert.equal(created.items?.[0].sku, 'SKU-1');
  assert.equal(created.lineItems?.[0].totalPrice, 1000);
  assert.equal('unknownField' in created, false);
  assert.doesNotThrow(() => validatePurchaseOrderCreate(created));
});

test('PO creation rejects malformed lines, conflicting lists and inconsistent financial totals', () => {
  for (const items of ['broken', {}, [], [null], [{ ...po.items[0], qty: 0 }], [{ ...po.items[0], qty: 1.5 }], [{ ...po.items[0], name: 42 }], [{ ...po.items[0], unitPrice: -1 }], [{ ...po.items[0], subtotal: 1 }], Array(201).fill(po.items[0])]) {
    assert.throws(() => validatePurchaseOrderCreate({ ...po, items }));
  }
  assert.throws(() => validatePurchaseOrderCreate({ ...po, items: [ { ...po.items[0], id: 'same' }, { ...po.items[0], id: 'same' } ], subtotal: 2000, total: 2110 }));
  for (const change of [{ total: 2000 }, { subtotal: 2000 }, { taxAmount: Infinity }, { total: NaN }, { discountAmount: 1001 }, { withholdingTaxAmount: -1 }, { subtotal: 1e30 }, { lineItems: 'broken' }, { lineItems: [{ ...po.items[0], name: 42 }] }, { lineItems: [{ ...po.items[0], qty: 3 }] }]) {
    assert.throws(() => validatePurchaseOrderCreate({ ...po, ...change }));
  }
});

test('PO creation rejects invalid workflow states, dates and IDs', () => {
  for (const change of [{ status: 'Disetujui' }, { paymentInfo: {} }, { grn: {} }, { receiptVerification: { version: 1 } }, { id: '../bad' }, { date: '22 Oct 2026' }, { deliveryDate: '2026-02-30' }, { vendor: '' }]) {
    assert.throws(() => validatePurchaseOrderCreate({ ...po, ...change }));
  }
});

const stock = [{ id: 'SKU-1', stock: 1, stockMin: 10 }];
const invoice = { id: 'INV-1', client: 'PT Contoh', date: '2026-10-22', total: 1250000, status: 'Overdue', color: 'red', isOverdue: true };

test('stock and paid status remain unchanged when storage writes or reads fail', () => {
  const warn = console.warn;
  console.warn = () => {};
  try {
    const data = storage({ stock: JSON.stringify(stock), invoices: JSON.stringify([invoice]) }, true);
    assert.throws(() => dispatchInventory('stock', stock, 'SKU-1'), /Quota/);
    assert.throws(() => markLocalInvoicePaid('invoices', [invoice], invoice.id), /Quota/);
    assert.deepEqual(JSON.parse(data.stock), stock);
    assert.deepEqual(JSON.parse(data.invoices), [invoice]);
    storage({}, false, true);
    assert.throws(() => dispatchInventory('stock', stock, 'SKU-1'), /unavailable/);
    assert.throws(() => markLocalInvoicePaid('invoices', [invoice], invoice.id), /unavailable/);
  } finally { console.warn = warn; }
});

test('malformed storage is retained rather than overwritten with fallback records', () => {
  for (const raw of ['{broken', '{}', 'null']) {
    const data = storage({ stock: raw, invoices: raw });
    assert.throws(() => dispatchInventory('stock', stock, 'SKU-1'));
    assert.throws(() => markLocalInvoicePaid('invoices', [invoice], invoice.id));
    assert.equal(data.stock, raw);
    assert.equal(data.invoices, raw);
  }
});

test('repeated actions read committed storage and cannot consume empty stock or pay an invoice twice', () => {
  const data = storage({ stock: JSON.stringify(stock), invoices: JSON.stringify([invoice]) });
  const updated = dispatchInventory('stock', stock, 'SKU-1');
  assert.equal(updated[0].stock, 0);
  assert.equal(stockHealth(updated[0], 'id').status, 'Habis');
  assert.throws(() => dispatchInventory('stock', stock, 'SKU-1'));
  assert.equal(JSON.parse(data.stock)[0].stock, 0);
  assert.equal(markLocalInvoicePaid('invoices', [invoice], invoice.id)[0].isOverdue, false);
  assert.throws(() => markLocalInvoicePaid('invoices', [invoice], invoice.id), /Lunas/);
  assert.equal(JSON.parse(data.invoices)[0].status, 'Lunas');
  assert.equal(stock[0].stock, 1);
  assert.equal(invoice.status, 'Overdue');
});

test('stock status and dashboard attention follow current quantity and the configured minimum', () => {
  for (const [count, status, color, needsReview] of [[0, 'Out of stock', 'red', true], [10, 'Critical', 'red', true], [11, 'Monitoring', 'orange', true], [20, 'Monitoring', 'orange', true], [21, 'Optimal', 'green', false]] as const) {
    assert.deepEqual(stockHealth({ stock: count }), { status, color, needsReview, stockMin: 10 });
  }
  assert.equal(stockHealth({ stock: 7, stockMin: 3 }).needsReview, false);
  assert.equal(stockHealth({ stock: 3, stockMin: 3 }).color, 'red');
  assert.equal(stockHealth({ stock: NaN }).needsReview, true);
  assert.equal(stockHealth({ stock: -1 }).color, 'red');
});

test('reminder produces an unsent email draft with the selected invoice and recipient', () => {
  const draft = reminderDraft(invoice, 'billing@example.com', 'id');
  assert.equal(draft.filename, 'reminder-INV-1.eml');
  assert.match(draft.content, /^To: billing@example.com\r\n/);
  assert.match(draft.content, /X-Unsent: 1\r\n/);
  const body = Buffer.from(draft.content.split('\r\n\r\n')[1].replaceAll('\r\n', ''), 'base64').toString('utf8');
  assert.match(body, /INV-1/);
  assert.match(body, /PT Contoh/);
  assert.match(body, /1\.250\.000/);
  assert.match(body, /2026-10-22/);
  assert.match(reminderDraft(invoice).content, /^To:\r\n/);
  assert.throws(() => reminderDraft(invoice, 'billing@example.com\r\nBcc: another@example.com'));
  assert.throws(() => reminderDraft({ ...invoice, status: 'Lunas' }));
  assert.throws(() => reminderDraft({ ...invoice, total: NaN }));
});
