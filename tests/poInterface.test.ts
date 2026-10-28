import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { validatedReceiptPatch } from '../src/lib/goodsReceipt';
import type { PurchaseOrder } from '../src/types';

const order: PurchaseOrder = {
  id: 'PO-UI-CHECK', vendor: 'Vendor uji', desc: 'Pengadaan server', date: '2026-10-28', total: 200000,
  color: 'green', status: 'Disetujui', items: [{ id: '1', sku: 'SKU-A', name: 'Server uji', qty: 2, unitPrice: 100000, subtotal: 200000 }],
};

function receiptAction(save: (...args: unknown[]) => Promise<void>) {
  const source = ts.createSourceFile('ThreeWayMatchModal.tsx', fs.readFileSync('src/components/ThreeWayMatchModal.tsx', 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let callback: ts.Expression | undefined;
  function visit(node: ts.Node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === 'handleConfirmGrn') callback = node.initializer;
    ts.forEachChild(node, visit);
  }
  visit(source); assert.ok(callback);
  const context = vm.createContext({
    canEdit: true, saving: { current: false }, po: order, matchStatus: 'MATCHED',
    receivedBy: '  Petugas uji  ', suratJalan: ' SJ-1 ', inspectorNotes: '',
    items: [{ sku: 'SKU-A', name: 'Server uji', orderedQty: 2, receivedQty: 2, condition: 'GOOD' }],
    crypto: { randomUUID: () => 'test-unique-id' }, businessDate: () => '2026-10-28', validatedReceiptPatch,
    onSaveGrn: save, onClose() { context.closed = true; },
    setIsSaving(value: boolean) { context.busy = value; }, setSaveError(value: string | null) { context.error = value; },
  });
  vm.runInContext(ts.transpileModule(`globalThis.submit = (${callback.getText(source)});`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);
  return { context, submit: () => context.submit({ preventDefault() {} }) as Promise<void> };
}

test('goods receipt stays open on save failure and blocks duplicate submission while pending', async () => {
  let calls = 0;
  let reject!: (reason: Error) => void;
  const pending = new Promise<void>((_, fail) => { reject = fail; });
  const action = receiptAction(async () => { calls++; return pending; });
  const saving = action.submit();
  await action.submit(); assert.equal(calls, 1); assert.equal(action.context.busy, true);
  reject(new Error('Storage unavailable'));
  await saving;
  assert.equal(action.context.closed, undefined); assert.equal(action.context.busy, false);
  assert.match(action.context.error, /Storage unavailable/);
  assert.equal(action.context.saving.current, false);
});

test('goods receipt validates unrounded quantities and required receiver before saving', async () => {
  let calls = 0;
  const action = receiptAction(async () => { calls++; });
  action.context.items[0].receivedQty = 1.5;
  await action.submit(); assert.equal(calls, 0); assert.match(action.context.error, /tidak sesuai/);
  action.context.items[0].receivedQty = 2;
  action.context.receivedBy = '  ';
  await action.submit(); assert.equal(calls, 0); assert.match(action.context.error, /Petugas penerima/);
  action.context.receivedBy = ' Petugas uji ';
  await action.submit(); assert.equal(calls, 1); assert.equal(action.context.closed, true);
});

test('requested PO opens its actual record after loading and reports unavailable records', () => {
  const source = ts.createSourceFile('ProcurementView.tsx', fs.readFileSync('src/components/ProcurementView.tsx', 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let effect: ts.Node | undefined;
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && node.expression.getText(source) === 'useEffect' && node.arguments[0]?.getText(source).includes('if (!initialPoId) return')) effect = node.arguments[0];
    ts.forEachChild(node, visit);
  };
  visit(source); assert.ok(effect);
  const context = vm.createContext({ initialPoId: order.id, ordersLoading: true, ordersError: false, pos: [], lang: 'id',
    setActiveModal(value: unknown) { context.modal = value; }, onToast(...value: unknown[]) { context.toast = value; }, onInitialPoHandled() { context.handled = true; },
  });
  vm.runInContext(ts.transpileModule(`globalThis.openRequested = (${effect.getText(source)});`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);
  context.openRequested(); assert.equal(context.modal, undefined); assert.equal(context.handled, undefined);
  context.pos = [order]; context.openRequested();
  assert.equal(context.modal.data.id, order.id); assert.equal(context.handled, true);
  context.modal = null; context.initialPoId = 'MISSING'; context.handled = false; context.openRequested();
  assert.equal(context.modal, null); assert.equal(context.handled, false);
  context.ordersLoading = false; context.openRequested();
  assert.equal(context.modal, null); assert.equal(context.toast[1], 'error');
});
