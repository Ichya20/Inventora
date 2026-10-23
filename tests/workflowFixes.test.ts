import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PrintableVoucher } from '../src/components/PrintableVoucher';
import { validatePurchaseOrderCreate } from '../src/lib/purchaseOrderValidation';
import { canAccessMenu, canPerformPoAction } from '../src/lib/authorization';
import { businessDate } from '../src/lib/businessDates';
import { ApiError } from '../src/lib/apiError';
import { readStoredArray, saveStoredData } from '../src/lib/storageUtils';
import { isInventoryList } from '../src/lib/inventory';
import { jsPDF } from 'jspdf';
import { downloadPurchaseOrderPdf } from '../src/lib/pdfGenerator';

// Run the actual callbacks so input wiring and post-save state are covered too.
const purchase = 'src/components/PurchaseUnitView.tsx';
const inventory = 'src/components/InventoryView.tsx';
function find(file: string, predicate: (node: ts.Node) => boolean): any {
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let found: ts.Node;
  function visit(node: ts.Node) { if (found) return; if (predicate(node)) found = node; else ts.forEachChild(node, visit); }
  visit(source);
  assert.ok(found, `Missing source callback in ${file}`);
  return found;
}
const initializer = (file: string, name: string) => find(file, node => ts.isVariableDeclaration(node) && node.name.getText() === name).initializer;
function evaluate(expression: string, context: vm.Context): any {
  vm.runInContext(ts.transpileModule(`globalThis.target = (${expression});`, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText, context);
  return context.target;
}
const callback = (file: string, name: string, context: vm.Context) => evaluate(initializer(file, name).getText(), context);
function memoryStorage(entries: Record<string, string> = {}, failRead = false) {
  const data = { ...entries };
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem(key: string) { if (failRead) throw new Error('Storage unavailable'); return data[key] ?? null; },
    setItem(key: string, value: string) { data[key] = value; },
  } });
  return data;
}
const item = { id: 'item-1', sku: 'SKU-TEST', name: 'Server', qty: 2, unitPrice: 500, total: 1000 };
function form(options: { demo?: boolean; post?: (po: any) => Promise<any>; notes?: string } = {}) {
  const posts: any[] = [], toasts: any[] = [];
  const context = vm.createContext({
    role: 'Warehouse Manager', vendor: 'dell', deliveryDate: '2026-10-27', grandTotal: 1110, discountPercent: 0,
    items: [{ ...item }], submitting: { current: false }, pendingPo: { current: null }, awaitingConfirmation: false,
    setIsSubmitting() {}, setAwaitingConfirmation(value: boolean) { context.awaitingConfirmation = value; },
    department: 'IT Infrastructure', setCreatedPoNumber() {}, notes: options.notes ?? '', crypto: globalThis.crypto,
    businessDate, canPerformPoAction, validatePurchaseOrderCreate, ApiError,
    subtotal: 1000, discountAmount: 0, vatAmount: 110, pphAmount: 0, lang: 'id', isDemo: options.demo ?? false,
    storageKey: 'audit-po-cache', navigator: { onLine: true },
    authenticatedPost: async (_url: string, po: any) => { posts.push(po); return options.post ? options.post(po) : po; },
    readStoredArray, saveStoredData, window: { dispatchEvent() {} }, CustomEvent: class {},
    onToast: (...args: any[]) => toasts.push(args), onNotify: null, onNavigate() {},
    setStep(step: string) { context.step = step; }, step: 'form', setImportedTaxAmount() {},
  });
  context.setItems = (update: any) => {
    context.items = typeof update === 'function' ? update(context.items) : update;
    context.subtotal = context.items.reduce((sum: number, row: any) => sum + Number(row.qty) * Number(row.unitPrice), 0);
    context.vatAmount = Math.round(context.subtotal * 0.11);
    context.grandTotal = context.subtotal + context.vatAmount;
  };
  return { context, posts, toasts, edit: callback(purchase, 'handleItemChange', context), submit: () => callback(purchase, 'handleSubmit', context)({ preventDefault() {} }) };
}

test('typing quantity and price produces a numeric, consistent PO payload', async () => {
  const f = form();
  f.edit('item-1', 'qty', '3');
  f.edit('item-1', 'unitPrice', '600');
  await f.submit();
  assert.equal(f.context.step, 'success');
  assert.equal(f.posts[0].items[0].qty, 3);
  assert.equal(f.posts[0].items[0].unitPrice, 600);
  assert.equal(f.posts[0].items[0].subtotal, 1800);
  assert.equal(f.posts[0].total, 1998);
});

test('empty, negative or fractional quantities and empty prices cannot create a PO', async () => {
  for (const [field, value] of [['qty', ''], ['qty', '0'], ['qty', '-1'], ['qty', '1.5'], ['unitPrice', ''], ['unitPrice', '-1']]) {
    const f = form();
    f.edit('item-1', field, value);
    await f.submit();
    assert.equal(f.posts.length, 0);
    assert.equal(f.context.step, 'form');
  }
});

test('confirmed live creates succeed regardless of corrupt or unavailable browser cache', async () => {
  for (const failRead of [false, true]) {
    const data = memoryStorage({ 'audit-po-cache': '{}' }, failRead);
    const f = form();
    await f.submit();
    assert.equal(f.posts.length, 1);
    assert.equal(f.context.step, 'success');
    assert.equal(data['audit-po-cache'], '{}');
    assert.equal(f.toasts.some(toast => toast[1] === 'error'), false);
  }
});

test('an unconfirmed create retries the identical payload and ID, then unlocks on confirmation', async () => {
  let attempt = 0;
  const f = form({ post: async po => { if (++attempt === 1) throw new TypeError('Connection dropped after commit'); return po; } });
  await f.submit();
  assert.equal(f.context.step, 'form');
  assert.equal(f.context.awaitingConfirmation, true);
  await f.submit();
  assert.equal(f.context.step, 'success');
  assert.equal(f.context.awaitingConfirmation, false);
  assert.deepEqual(f.posts[1], f.posts[0]);
});

test('definite validation failures release the draft for correction', async () => {
  const f = form({ post: async () => { throw new ApiError('Invalid data', undefined, 422); } });
  await f.submit();
  assert.equal(f.context.pendingPo.current, null);
  assert.equal(f.context.awaitingConfirmation, false);
});

test('demo creates preserve damaged cache and only report success after a durable write', async () => {
  const data = memoryStorage({ 'audit-po-cache': '{}' });
  const failed = form({ demo: true });
  await failed.submit();
  assert.equal(failed.context.step, 'form');
  assert.equal(data['audit-po-cache'], '{}');
  assert.equal(failed.posts.length, 0);
  memoryStorage();
  const saved = form({ demo: true });
  await saved.submit();
  assert.equal(saved.context.step, 'success');
  assert.equal(readStoredArray('audit-po-cache', []).length, 1);
});

test('multiline instructions survive the form, canonical validation and printable voucher', async () => {
  const notes = 'Instruksi utama\nKirim ke gedung B lantai 2';
  const f = form({ notes });
  await f.submit();
  const po = f.posts[0];
  assert.equal(po.notes, notes);
  assert.equal(validatePurchaseOrderCreate(po).notes, notes);
  const markup = renderToStaticMarkup(React.createElement(PrintableVoucher, { po, onClose() {} }));
  assert.ok(markup.includes(notes));
  assert.match(markup, /Grand Total:<\/span>.*?Rp 1\.110/s);
  assert.throws(() => validatePurchaseOrderCreate({ ...po, notes: {} }));
  assert.throws(() => validatePurchaseOrderCreate({ ...po, notes: 'x'.repeat(10001) }));
});

test('long procurement notes reach the final PDF page without dropping the last instruction', async () => {
  const f = form({ notes: ['START-NOTE', ...Array(90).fill('Kirim barang ke gudang B setelah inspeksi.'), 'END-NOTE'].join('\n') });
  await f.submit();
  const api = jsPDF.API as typeof jsPDF.API & { save?: (this: jsPDF) => jsPDF };
  const originalSave = api.save;
  let saved: jsPDF | undefined;
  api.save = function () { saved = this; return this; };
  try {
    downloadPurchaseOrderPdf(f.posts[0], 'id');
    assert.ok(saved);
    assert.ok(saved.getNumberOfPages() > 1);
    const output = saved.output();
    assert.match(output, /START-NOTE/);
    assert.match(output, /END-NOTE/);
    assert.match(output, /Budget Approver/);
  } finally { if (originalSave) api.save = originalSave; else delete api.save; }
});

function inventoryState(raw?: string, failRead = false) {
  const data = memoryStorage(raw === undefined ? {} : { inventora_inventory_v1: raw }, failRead);
  const defaults = [{ id: 'SKU-1', name: 'Server', desc: '', stock: 2 }];
  const context = vm.createContext({ defaultItems: defaults, readStoredArray, isInventoryList });
  return { data, state: evaluate(initializer(inventory, '[inventoryState, setInventoryState]').arguments[0].getText(), context)() };
}

test('invalid inventory cache shows a recoverable state and preserves the original bytes', () => {
  for (const raw of ['{}', '{broken', 'null', '[null]', '[{"id":"SKU","name":"Server","stock":"2"}]', '[{"id":"SKU","name":"Server","stock":-1}]']) {
    const { data, state } = inventoryState(raw);
    assert.equal(state.error, true);
    assert.equal(state.items.length, 0);
    assert.equal(data.inventora_inventory_v1, raw);
  }
  assert.equal(inventoryState(undefined, true).state.error, true);
  assert.equal(inventoryState().state.items[0].stock, 2);
  assert.equal(inventoryState('[]').state.error, false);
});

test('duplicate SKUs in cached inventory are rejected before stock dispatch', () => {
  const duplicate = [{ id: 'SKU', name: 'Server', stock: 2 }, { id: 'SKU', name: 'Server', stock: 4 }];
  assert.equal(inventoryState(JSON.stringify(duplicate)).state.error, true);
});

test('restock action carries the selected SKU and quantity into a form with no guessed price or vendor', () => {
  const context = vm.createContext({ currentRole: 'Warehouse Manager', language: 'id', draftOwner: 'live:owner:Warehouse Manager', crypto: globalThis.crypto, canAccessMenu,
    handleMenuClick(menu: string) { context.menu = menu; }, setRestockDraft(value: any) { context.draft = value; }, showToast() {} });
  const createDraft = callback('src/App.tsx', 'handleRestockDraft', context);
  const attribute = find(inventory, node => ts.isJsxAttribute(node) && node.name.getText() === 'onGeneratePo');
  const restock = evaluate(attribute.initializer.expression.getText(), vm.createContext({ onRestock: createDraft }));
  restock({ skuId: 'UPS-3KVA-RT', name: 'UPS 3kVA', recommendedOrderQty: 17 });
  assert.equal(context.menu, 'purchase');
  const initial = vm.createContext({ initialDraft: context.draft.item });
  const rows = evaluate(initializer(purchase, '[items, setItems]').arguments[0].getText(), initial);
  assert.equal(rows[0].sku, 'UPS-3KVA-RT');
  assert.equal(rows[0].qty, 17);
  assert.equal(rows[0].unitPrice, '');
  assert.equal(evaluate(initializer(purchase, '[vendor, setVendor]').arguments[0].getText(), initial), '');
  context.draft = null;
  createDraft({ skuId: 'UPS', name: 'UPS', recommendedOrderQty: 0 });
  assert.equal(context.draft, null);
});

test('error, warning and informational toasts cannot be titled as successful transactions', () => {
  const context = vm.createContext({ language: 'id', playNotificationChime() {}, setToasts(update: any) { context.toasts = update([]); } });
  const toast = callback('src/App.tsx', 'showToast', context);
  for (const type of ['error', 'warning', 'info']) {
    for (const message of ['Stok tidak berubah.', 'Nominal pembayaran tidak valid.']) {
      toast(message, type);
      assert.ok(!['Stok Berkurang', 'Pembayaran Lunas'].includes(context.toasts[0].title));
    }
  }
  toast('Pembayaran tercatat.', 'success');
  assert.equal(context.toasts[0].title, 'Pembayaran Lunas');
});
