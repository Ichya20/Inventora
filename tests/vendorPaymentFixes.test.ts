import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { validateCardLabel } from '../src/lib/paymentMethodValidation';
import { isCachedOrder } from '../src/lib/procurementCache';
import { readStoredArray, saveStoredData } from '../src/lib/storageUtils';
import { validatePurchaseOrderCreate } from '../src/lib/purchaseOrderValidation';
import { canPerformPoAction, isRole } from '../src/lib/authorization';
import { businessDate } from '../src/lib/businessDates';
import { paymentInfoFromTransaction } from '../src/lib/procurement';
import { ApiError } from '../src/lib/apiError';

function tree(file: string) { return ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX); }
function expression(file: string, name: string) {
  const source = tree(file); let result: ts.Node | undefined;
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === name) result = node.initializer;
    ts.forEachChild(node, visit);
  };
  visit(source); assert.ok(result, name); return result.getText(source);
}
function evaluate(context: vm.Context, code: string) {
  vm.runInContext(ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, context);
}

function payment(overrides: Record<string, unknown> = {}) {
  const callbacks: (() => unknown)[] = [];
  const context = vm.createContext({
    processing: { current: false }, timers: { current: [] }, lang: 'en', selectedMethod: 'credit_card', selectedBank: 'bca',
    cardLast4: '9812', cardHolder: 'Test Entity', cardExpiry: '11/26', treasuryAccount: 'Test Account', transferNotes: '',
    po: { id: 'PO-TEST', vendor: 'Test Vendor' }, baseTotal: 100, taxAmount: 0, withholdingTaxAmount: 0, grandTotal: 100,
    validateCardLabel: (input: any, _today: unknown, lang: 'en' | 'id') => validateCardLabel(input, '2026-11-18', lang),
    setPaymentError(value: unknown) { context.error = value; }, setIsProcessing(value: boolean) { context.busy = value; }, setProcessStep() {},
    setCompletedTx(tx: unknown) { context.completed = tx; },
    getVANumber: () => 'VA-TEST',
    setTimeout(callback: () => unknown) { callbacks.push(callback); return callbacks.length; },
    async onPaymentSuccess(tx: unknown) { context.saved = tx; },
    ...overrides,
  });
  evaluate(context, `globalThis.record = (${expression('src/components/PaymentGatewayModal.tsx', 'handleProcessPayment')});`);
  return { context, callbacks, async finish() { for (const callback of callbacks) await callback(); } };
}

test('vendor card simulation rejects invalid labels before starting or writing any payment', () => {
  for (const overrides of [{ cardLast4: '' }, { cardLast4: '4111111111111111' }, { cardHolder: '   ' }, { cardExpiry: '99/99' }, { cardExpiry: '10/26' }]) {
    const action = payment(overrides);
    action.context.record();
    assert.equal(action.callbacks.length, 0);
    assert.equal(action.context.saved, undefined);
    assert.equal(action.context.processing.current, false);
    assert.match(action.context.error, /four card digits|cardholder|expiry|expired/);
  }
});

test('vendor card input keeps only last four digits and payment/outbound PO reference remains masked', async () => {
  const file = tree('src/components/PaymentGatewayModal.tsx');
  let onChange: ts.Expression | undefined;
  let cvvInput = false;
  function visit(node: ts.Node) {
    if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(file) === 'input') {
      for (const prop of node.attributes.properties) {
        if (ts.isJsxAttribute(prop) && prop.name.getText(file) === 'value') {
          const value = prop.initializer?.getText(file);
          if (value?.includes('Cvv')) cvvInput = true;
          if (value === '{cardLast4}') {
            const attribute = node.attributes.properties.find(p => ts.isJsxAttribute(p) && p.name.getText(file) === 'onChange') as ts.JsxAttribute;
            onChange = (attribute.initializer as ts.JsxExpression).expression;
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(file); assert.ok(onChange); assert.equal(cvvInput, false);
  const input = vm.createContext({ setCardLast4(value: string) { input.last4 = value; } });
  evaluate(input, `globalThis.change = (${onChange.getText(file)});`);
  const testPan = '4111111111111111';
  input.change({ target: { value: testPan } });
  assert.equal(input.last4, '1111');
  const action = payment({ cardLast4: input.last4 });
  action.context.record(); await action.finish();
  assert.equal(action.context.saved.accountReference, '•••• 1111');
  const outbound = paymentInfoFromTransaction(action.context.saved);
  assert.equal(outbound.reference, '•••• 1111');
  assert.equal(outbound.accountOrCard, '•••• 1111');
  assert.ok(!JSON.stringify({ tx: action.context.saved, outbound }).includes(testPan));
});

test('vendor simulation retains supported non-card methods and reports durable save failure', async () => {
  for (const selectedMethod of ['virtual_account', 'bank_transfer', 'qris']) {
    const action = payment({ selectedMethod }); action.context.record(); await action.finish();
    assert.equal(action.context.saved.status, 'SUCCESS');
    assert.equal(action.context.completed.method, selectedMethod);
  }
  const failed = payment({ onPaymentSuccess: async () => { throw new Error('Storage full'); } });
  failed.context.record(); await failed.finish();
  assert.match(failed.context.error, /Storage full/);
  assert.equal(failed.context.completed, undefined);
  assert.equal(failed.context.processing.current, false);
});

test('demo PO creation refuses invalid rows without overwriting old cache or reporting success', async () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const memory = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => memory.set(key, value),
  } });
  try {
    for (const raw of ['[{}]', '[null]', '[{"id":"legacy-with-missing-fields"}]']) {
      memory.set('audit-po', raw);
      const context = vm.createContext({
        role: 'Warehouse Manager', vendor: 'Test Vendor', deliveryDate: '2026-11-25', items: [{ id: 'one', sku: 'SKU', name: 'Product', qty: 1, unitPrice: 100 }],
        grandTotal: 100, discountPercent: 0, submitting: { current: false }, pendingPo: { current: null }, department: 'IT Infrastructure', notes: '',
        subtotal: 100, discountAmount: 0, vatAmount: 0, pphAmount: 0, lang: 'en', isDemo: true, storageKey: 'audit-po',
        crypto, businessDate, canPerformPoAction, validatePurchaseOrderCreate, ApiError, readStoredArray, saveStoredData, isCachedOrder,
        setIsSubmitting() {}, setAwaitingConfirmation() {}, setCreatedPoNumber() {}, setStep(value: unknown) { context.step = value; },
        onToast(_message: string, type: string) { context.toast = type; }, onNotify: null,
        window: { dispatchEvent() {} }, CustomEvent: class {},
      });
      evaluate(context, `globalThis.create = (${expression('src/components/PurchaseUnitView.tsx', 'handleSubmit')});`);
      await context.create({ preventDefault() {} });
      assert.equal(memory.get('audit-po'), raw);
      assert.equal(context.step, undefined);
      assert.equal(context.toast, 'error');
    }
    assert.ok(isCachedOrder({ id: 'PO-LEGACY', vendor: 'Legacy', desc: 'Order', date: '22 Aug 2026', status: 'Selesai', color: 'blue', total: 100,
      paymentInfo: { totalPaid: 100, receiptNumber: 'LEGACY-RECEIPT' } }));
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});

function receiptSession(auth: any, hooks: { fetch?: () => unknown; ready?: () => Promise<void> } = {}) {
  let requests = 0;
  const api = vm.createContext({
    require: () => ({ auth: { get currentUser() { return auth.currentUser; }, authStateReady: hooks.ready ?? (async () => {}) } }),
    sessionStorage: { getItem: () => null }, AbortSignal, ApiError,
    fetch: async () => { requests++; hooks.fetch?.(); return { ok: true, json: async () => ({ saved: true }) }; },
  });
  const apiSource = fs.readFileSync('src/lib/apiClient.ts', 'utf8').replace(/^import .*;\r?$/gm, '').replace(/\bexport /g, '');
  evaluate(api, apiSource + '\nglobalThis.post = authenticatedPost;');
  const store = vm.createContext({ require: () => ({ auth, db: {} }), isRole, authenticatedPost: api.post });
  const storeSource = fs.readFileSync('src/lib/purchaseOrderStore.ts', 'utf8').replace(/^import .*;\r?$/gm, '').replace(/\bexport /g, '');
  evaluate(store, storeSource + '\nglobalThis.save = persistPoTransition;');
  return { api, store, requests: () => requests };
}

test('receipt action cannot adopt another account after claims resolve or before its API token is obtained', async () => {
  let release!: (value: unknown) => void;
  const claims = new Promise(resolve => { release = resolve; });
  const auth = { currentUser: { uid: 'A', getIdTokenResult: () => claims, getIdToken: async () => 'token-A' } as any };
  const action = receiptSession(auth);
  const pending = action.store.save('PO-TEST', { grn: {} }, 'receipt', undefined, 'A');
  await new Promise(setImmediate);
  auth.currentUser = { uid: 'B', getIdToken: async () => 'token-B' };
  release({ claims: { role: 'Warehouse Manager' } });
  await assert.rejects(pending, /Sesi pengguna/);
  assert.equal(action.requests(), 0);

  let ready!: () => void;
  const waiting = new Promise<void>(resolve => { ready = resolve; });
  const boundary = receiptSession(auth, { ready: () => waiting });
  const apiPending = boundary.api.post('/api/purchase-orders/PO-TEST/receipt', {}, { expectedUid: 'A' });
  ready();
  await assert.rejects(apiPending, /Sesi pengguna/);
  assert.equal(boundary.requests(), 0);
});

test('receipt keeps the original account binding for normal saves and rejects stale caller identity immediately', async () => {
  const auth = { currentUser: { uid: 'A', getIdTokenResult: async () => ({ claims: { role: 'Warehouse Manager' } }), getIdToken: async () => 'token-A' } };
  const action = receiptSession(auth);
  await action.store.save('PO-TEST', { grn: {} }, 'receipt', undefined, 'A');
  assert.equal(action.requests(), 1);
  await assert.rejects(action.store.save('PO-TEST', { grn: {} }, 'receipt', undefined, 'B'), /Sesi pengguna/);
  assert.equal(action.requests(), 1);
});
