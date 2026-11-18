import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { validateParsedInvoice } from '../src/lib/invoiceValidation';
import { validatePurchaseOrderCreate } from '../src/lib/purchaseOrderValidation';
import { receiptOrderItems, receiptMatchStatus, validatedReceiptPatch } from '../src/lib/goodsReceipt';
import type { GoodsReceiptNote, PurchaseOrder } from '../src/types';

function tree(path: string) {
  return ts.createSourceFile(path, fs.readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}
function named(file: ts.SourceFile, name: string) {
  let found: ts.Node | undefined;
  const visit = (node: ts.Node) => {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) found = node;
    if (ts.isVariableDeclaration(node) && node.name.getText(file) === name) found = node.initializer;
    ts.forEachChild(node, visit);
  };
  visit(file); assert.ok(found, name);
  return found.getText(file);
}
function evaluate(context: vm.Context, name: string, code: string) {
  vm.runInContext(ts.transpileModule(`globalThis.${name} = (${code});`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText, context);
}
const invoice = (vendor = 'Vendor A') => validateParsedInvoice({ vendor, items: [
  { name: 'Enterprise Server A', qty: 2, unitPrice: 100, subtotal: 200 },
  { name: 'Enterprise Server B', qty: 2, unitPrice: 200, subtotal: 400 },
], subtotal: 600, taxAmount: 0, grandTotal: 600 });

test('invoice import creates distinct SKUs for products with matching name prefixes', () => {
  const file = tree('src/components/PurchaseUnitView.tsx');
  const context = vm.createContext({
    setVendor() {}, setItems(value: unknown) { context.items = value; },
    setApplyVat() {}, setImportedTaxAmount() {}, setApplyPph() {}, setDiscountPercent() {}, setNotes() {},
  });
  evaluate(context, 'apply', named(file, 'handleApplyAiInvoice'));
  context.apply(invoice());
  assert.equal(new Set(context.items.map((item: any) => item.sku)).size, 2);
  const po = validatePurchaseOrderCreate({ id: 'PO-IMPORT', vendor: 'Vendor A', desc: 'Imported order',
    date: '2026-11-18', deliveryDate: '2026-11-19', status: 'Pending Approval',
    items: context.items.map((item: any) => ({ ...item, subtotal: item.total })), subtotal: 600, total: 600 });
  assert.deepEqual(po.items!.map(item => item.name), ['Enterprise Server A', 'Enterprise Server B']);
});

test('legacy repeated SKUs keep their line names when reopening and correcting a GRN', () => {
  const po = { id: 'PO-LEGACY', vendor: 'Vendor A', desc: 'Order', date: '2026-11-18',
    total: 600, status: 'Disetujui', color: 'green', items: invoice().items.map((item, index) => ({
      ...item, id: `line-${index}`, sku: 'ENTERPRISE SER',
    })) } as PurchaseOrder;
  const items = receiptOrderItems(po).map(item => ({ ...item, receivedQty: 1 }));
  const grn: GoodsReceiptNote = { id: 'GRN-1', grnNumber: 'GRN-1', poId: po.id,
    receivedBy: 'Warehouse operator', receivedDate: '2026-11-18', suratJalanNumber: 'SJ-1',
    items, status: receiptMatchStatus(items), inspectorNotes: '' };
  const saved = { ...po, ...validatedReceiptPatch(po, grn, 'Warehouse Manager') } as PurchaseOrder;
  const context = vm.createContext({ receiptOrderItems });
  evaluate(context, 'reopen', named(tree('src/components/ThreeWayMatchModal.tsx'), 'inspectionItems'));
  const reopened = context.reopen(saved);
  assert.deepEqual(Array.from(reopened, (item: any) => item.name), ['Enterprise Server A', 'Enterprise Server B']);
  const corrected = reopened.map((item: any) => ({ ...item, receivedQty: item.orderedQty }));
  const patch = validatedReceiptPatch(saved, { ...saved.grn!, items: corrected, status: 'MATCHED' }, 'Warehouse Manager');
  assert.equal(patch.status, 'Barang Diterima');
  assert.deepEqual(patch.grn!.items.map(item => item.name), ['Enterprise Server A', 'Enterprise Server B']);
});

test('invoice quantities match the PO positive safe-integer contract', () => {
  for (const qty of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    const data = invoice();
    data.items[0] = { ...data.items[0], qty, unitPrice: 1, subtotal: qty };
    assert.throws(() => validateParsedInvoice(data), /jumlah atau harga/);
  }
  const data = invoice();
  data.items[0].unitPrice = Number.MAX_SAFE_INTEGER + 1;
  assert.throws(() => validateParsedInvoice(data), /jumlah atau harga/);
  assert.equal(validateParsedInvoice(invoice()).items[0].qty, 2);
});

function parser() {
  const file = tree('src/components/SmartInvoiceParserModal.tsx');
  const requests: { signal: AbortSignal; resolve: (value: unknown) => void; reject: (error: Error) => void }[] = [];
  const context = vm.createContext({
    rawText: 'Quote A', parsed: null, requestVersion: { current: 0 }, requestAbort: { current: null }, open: { current: true },
    isOpen: true, AbortController, validateParsedInvoice,
    setRawText(value: string) { context.rawText = value; }, setParsed(value: unknown) { context.parsed = value; },
    setError(value: unknown) { context.error = value; }, setIsLoading(value: boolean) { context.loading = value; },
    onApply(value: unknown) { context.applied = value; }, onClose() { context.closed = true; },
    authenticatedPost(_url: string, _body: unknown, options: { signal: AbortSignal }) {
      // Intentionally ignore cancellation so response/version guards are also exercised.
      return new Promise((resolve, reject) => requests.push({ signal: options.signal, resolve, reject }));
    },
  });
  for (const name of ['invalidateExtraction', 'handleClose', 'handleTextChange', 'handleParse', 'handleConfirmApply']) {
    evaluate(context, name, named(file, name));
  }
  let effect: ts.Expression | undefined;
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && node.expression.getText(file) === 'useEffect') effect = node.arguments[0];
    ts.forEachChild(node, visit);
  };
  visit(file); assert.ok(effect);
  evaluate(context, 'effect', effect.getText(file));
  return { context, requests };
}

test('editing invoice text cancels the old extraction and cannot overwrite a newer result or loading state', async () => {
  const { context, requests } = parser();
  const first = context.handleParse();
  await context.handleParse();
  assert.equal(requests.length, 1);
  context.handleTextChange('Quote B');
  assert.equal(requests[0].signal.aborted, true);
  assert.equal(context.loading, false);
  const second = context.handleParse();
  requests[0].resolve(invoice('Vendor A'));
  await first;
  assert.equal(context.parsed, null);
  assert.equal(context.loading, true);
  requests[1].resolve(invoice('Vendor B'));
  await second;
  assert.equal(context.parsed.vendor, 'Vendor B');
  assert.equal(context.loading, false);
  context.handleConfirmApply();
  assert.equal(context.applied.vendor, 'Vendor B');
  assert.equal(context.closed, true);
});

test('closing the invoice parser cancels extraction and discards its late result', async () => {
  const { context, requests } = parser();
  const pending = context.handleParse();
  context.handleClose();
  assert.equal(requests[0].signal.aborted, true);
  requests[0].resolve(invoice());
  await pending;
  context.handleConfirmApply();
  assert.equal(context.parsed, null);
  assert.equal(context.applied, undefined);
  assert.equal(context.loading, false);
});

test('external close and unmount invalidate extraction without presenting a stale error', async () => {
  for (const externalClose of [true, false]) {
    const { context, requests } = parser();
    const cleanup = context.effect();
    const pending = context.handleParse();
    if (externalClose) { context.isOpen = false; context.open.current = false; cleanup(); context.effect(); }
    else cleanup();
    assert.equal(requests[0].signal.aborted, true);
    requests[0].reject(new Error('Old request failed'));
    await pending;
    assert.equal(context.error, null);
    assert.equal(context.parsed, null);
  }
});
