import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { translations } from '../src/i18n';
import { readStoredArray, commitStoredArray, saveStoredData } from '../src/lib/storageUtils';
import { normalizePurchaseOrder, assertPoTransition, paymentTotals, paymentInfoFromTransaction, poStorageKey } from '../src/lib/procurement';
import { validatedReceiptPatch } from '../src/lib/goodsReceipt';
import { canPerformPoAction } from '../src/lib/authorization';
import { businessDate } from '../src/lib/businessDates';
import { isCachedOrder } from '../src/lib/procurementCache';
import type { PaymentTransaction, PurchaseOrder } from '../src/types';

const source = ts.createSourceFile('ProcurementView.tsx', fs.readFileSync('src/components/ProcurementView.tsx', 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function named(name: string) {
  let result: ts.Node | undefined;
  const visit = (node: ts.Node) => {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) result = node;
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === name) result = node.initializer;
    ts.forEachChild(node, visit);
  };
  visit(source); assert.ok(result, name);
  return result.getText(source).replace(/^export\s+/, '');
}
function evaluate(context: vm.Context, name: string, code = named(name)) {
  vm.runInContext(ts.transpileModule(`globalThis.${name} = (${code});`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
  }).outputText, context);
}
const order: PurchaseOrder = { id: 'PO-RECOVERY', vendor: 'Recovery vendor', desc: 'Order', date: '2026-11-18',
  total: 100, status: 'Pending Approval', color: 'orange',
  items: [{ id: '1', sku: 'SKU-1', name: 'Product', qty: 1, unitPrice: 100, subtotal: 100 }] };
const transaction: PaymentTransaction = { id: 'TX-1', poId: order.id, vendor: order.vendor, amount: 100,
  taxAmount: 0, totalPaid: 100, method: 'bank_transfer', methodLabel: 'Test transfer', accountReference: 'Test',
  status: 'SUCCESS', timestamp: '2026-11-18T02:00:00Z', receiptNumber: 'REC-1' };

function harness(isDemo = true) {
  const memory = new Map<string, string>();
  const writes: string[] = [];
  let failWrites = false;
  Object.assign(globalThis, { localStorage: {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => { if (failWrites) throw new Error('Storage full'); writes.push(key); memory.set(key, value); },
  } });
  const context = vm.createContext({
    isDemo, ownerId: 'owner', storageKey: poStorageKey(isDemo, 'owner'),
    transactionStorageKey: isDemo ? 'inventora_po_transactions' : 'inventora_po_transactions:owner',
    pos: [structuredClone(order)], defaultPOs: [structuredClone(order)], defaultTransactions: [],
    lang: 'en', numLocale: 'en-US', role: 'Super Admin', isOnline: true, saving: { current: false },
    readStoredArray, commitStoredArray, saveStoredData, normalizePurchaseOrder, assertPoTransition, isCachedOrder,
    paymentTotals, paymentInfoFromTransaction, validatedReceiptPatch, businessDate,
    setTransitionBusy(value: boolean) { context.busy = value; },
    setPos(value: PurchaseOrder[]) { context.pos = value; },
    setPoCacheError(value: boolean) { context.poCacheError = value; },
    setTransactionCacheError(value: boolean) { context.transactionCacheError = value; },
    setTransactions(value: PaymentTransaction[]) { context.transactions = value; },
    setOrdersLoading(value: boolean) { context.ordersLoading = value; }, setOrdersError(value: boolean) { context.ordersError = value; },
    messages: [] as { message: string; type: string }[],
    onToast(message: string, type: string) { context.messages.push({ message, type }); },
    persistCalls: 0, async persistPoTransition() { context.persistCalls++; }, onNotify() {},
  });
  for (const name of ['isCachedTransaction', 'readProcurementCache', 'refreshLocalCache', 'handlePoCreated', 'saveTransition', 'handlePaymentSuccess']) evaluate(context, name);
  return { context, memory, writes, failWrites: () => { failWrites = true; } };
}

test('malformed PO and transaction cache renders recovery controls without writing fallback records', () => {
  for (const raw of ['{}', '[null]', '[{"id":"partial"}', 'null']) {
    const { context, memory, writes } = harness();
    memory.set(context.storageKey, raw); memory.set(context.transactionStorageKey, raw);
    const container = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
    Object.assign(context, {
      React, translations, poStorageKey, canPerformPoAction,
      useState: (initial: unknown) => [typeof initial === 'function' ? (initial as () => unknown)() : initial, () => {}],
      useRef: (current: unknown) => ({ current }), useEffect() {}, useMemo: (calculate: () => unknown) => calculate(),
      useReducedMotion: () => true, useDebounce: (value: unknown) => value,
      Card: container, Button: ({ children }: any) => <button>{children}</button>,
      TableWrapper: ({ children }: any) => <table>{children}</table>,
      Th: ({ children }: any) => <th>{children}</th>,
      Td: ({ children }: any) => <td>{children}</td>, Tr: ({ children }: any) => <tr>{children}</tr>,
      Modal: () => null, AuditTrailDrawer: () => null, ViewSkeleton: () => <p>Loading</p>,
    });
    for (const name of ['CreditCard', 'CheckCircle2', 'Printer', 'History', 'Layers', 'FileText', 'PackageCheck', 'AlertTriangle', 'Plus']) context[name] = () => null;
    evaluate(context, 'view', named('ProcurementView'));
    const html = renderToStaticMarkup(context.view({ role: 'Super Admin', isDemo: true, ownerId: 'owner', onToast() {}, onNavigate() {} }));
    assert.match(html, /Original browser data has been preserved/);
    assert.match(html, /Download recovery backup/);
    assert.equal(memory.get(context.storageKey), raw);
    assert.equal(memory.get(context.transactionStorageKey), raw);
    assert.equal(writes.length, 0);
  }
});

test('PO-created and storage refresh events preserve a newly damaged cache and the last usable view', () => {
  const { context, memory, writes } = harness();
  memory.set(context.storageKey, '[null]');
  memory.set(context.transactionStorageKey, '{}');
  context.handlePoCreated();
  context.refreshLocalCache();
  assert.equal(context.poCacheError, true); assert.equal(context.transactionCacheError, true);
  assert.equal(context.pos[0].id, order.id);
  assert.equal(memory.get(context.storageKey), '[null]');
  assert.equal(memory.get(context.transactionStorageKey), '{}');
  assert.equal(writes.length, 0);
});

test('demo transitions reject externally corrupted cache and revalidate latest workflow before committing', async () => {
  const { context, memory, writes } = harness();
  memory.set(context.storageKey, '{}');
  await assert.rejects(context.saveTransition(order.id, { status: 'Disetujui', color: 'green' }, 'approval'));
  assert.equal(memory.get(context.storageKey), '{}');
  assert.equal(context.poCacheError, true); assert.equal(writes.length, 0);
  const newer = { ...order, status: 'Ditolak', color: 'red' };
  memory.set(context.storageKey, JSON.stringify([newer]));
  await assert.rejects(context.saveTransition(order.id, { status: 'Disetujui', color: 'green' }, 'approval'), /Perubahan status/);
  assert.equal(JSON.parse(memory.get(context.storageKey)!)[0].status, 'Ditolak');
  assert.equal(writes.length, 0);
});

test('demo transitions merge into latest storage and acknowledge only durable writes', async () => {
  const { context, memory, failWrites } = harness();
  const other = { ...order, id: 'PO-ANOTHER', notes: 'Created in another tab' };
  memory.set(context.storageKey, JSON.stringify([order, other]));
  await context.saveTransition(order.id, { status: 'Disetujui', color: 'green' }, 'approval');
  assert.equal(context.pos.length, 2);
  assert.equal(context.pos[0].status, 'Disetujui');
  assert.equal(context.pos[1].notes, other.notes);
  context.pos[0].status = 'Pending Approval';
  memory.set(context.storageKey, JSON.stringify([order]));
  failWrites();
  await assert.rejects(context.saveTransition(order.id, { status: 'Disetujui', color: 'green' }, 'approval'), /Storage full/);
  assert.equal(JSON.parse(memory.get(context.storageKey)!)[0].status, 'Pending Approval');
});

test('a confirmed live snapshot remains visible while damaged optional cache bytes are preserved', () => {
  const { context, memory, writes } = harness(false);
  memory.set(context.storageKey, '{}');
  let snapshotCallback: ts.Expression | undefined;
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && node.expression.getText(source) === 'onSnapshot') snapshotCallback = node.arguments[2];
    ts.forEachChild(node, visit);
  };
  visit(source); assert.ok(snapshotCallback);
  evaluate(context, 'snapshot', snapshotCallback.getText(source));
  context.snapshot({ metadata: { hasPendingWrites: false, fromCache: false }, docs: [{ id: order.id, data: () => order }] });
  assert.equal(context.pos[0].id, order.id);
  assert.equal(context.ordersLoading, false); assert.equal(context.ordersError, false); assert.equal(context.poCacheError, true);
  assert.equal(memory.get(context.storageKey), '{}'); assert.equal(writes.length, 0);
});

test('damaged demo transaction history blocks payment before changing its PO', async () => {
  const { context, memory, writes } = harness();
  context.pos = [{ ...order, status: 'Barang Diterima', threeWayMatchStatus: 'MATCHED' }];
  memory.set(context.storageKey, JSON.stringify(context.pos));
  memory.set(context.transactionStorageKey, '[null]');
  await assert.rejects(context.handlePaymentSuccess(transaction), /Riwayat transaksi lokal/);
  assert.equal(JSON.parse(memory.get(context.storageKey)!)[0].status, 'Barang Diterima');
  assert.equal(memory.get(context.transactionStorageKey), '[null]');
  assert.equal(writes.length, 0);
  assert.equal(context.messages.at(-1).type, 'error');
});

test('confirmed live payment does not fail or overwrite damaged local transaction history', async () => {
  const { context, memory } = harness(false);
  context.pos = [{ ...order, status: 'Barang Diterima', threeWayMatchStatus: 'MATCHED' }];
  memory.set(context.transactionStorageKey, '{}');
  await context.handlePaymentSuccess(transaction);
  assert.equal(context.persistCalls, 1);
  assert.equal(memory.get(context.transactionStorageKey), '{}');
  assert.equal(context.transactionCacheError, true);
  assert.equal(context.messages.at(-1).type, 'warning');
  assert.match(context.messages.at(-1).message, /PO payment was recorded/);
});

test('transaction history write failure reports partial local history and preserves confirmed payment', async () => {
  const { context, memory, failWrites } = harness(false);
  memory.set(context.transactionStorageKey, '[]');
  context.pos = [{ ...order, status: 'Barang Diterima', threeWayMatchStatus: 'MATCHED' }];
  failWrites();
  await context.handlePaymentSuccess(transaction);
  assert.equal(context.persistCalls, 1);
  assert.equal(memory.get(context.transactionStorageKey), '[]');
  assert.equal(context.messages.at(-1).type, 'warning');
});

test('procurement CSV hands raw cells to the shared spreadsheet-safe exporter', async () => {
  const { context } = harness();
  const captured: unknown[] = [];
  Object.assign(context, { filteredPos: [{ ...order, notes: '=1+1', vendor: 'Vendor "A", Ltd' }],
    exportToCsv(...args: unknown[]) { captured.push(args); }, setIsExporting() {}, setTimeout: (fn: () => void) => fn() });
  evaluate(context, 'handleExport');
  await context.handleExport();
  const [_filename, _headers, rows] = captured[0] as [string, string[], (string | number)[][]];
  assert.equal(rows[0][1], 'Vendor "A", Ltd');
  assert.equal(rows[0][3], '=1+1');
  assert.equal(typeof rows[0][5], 'number');
  assert.equal(context.messages.at(-1).type, 'success');
});
