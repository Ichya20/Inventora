import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { validatePurchaseOrderCreate } from '../../src/lib/purchaseOrderValidation';
import { readStoredArray, saveStoredData, commitStoredArray } from '../../src/lib/storageUtils';
import { canPerformPoAction } from '../../src/lib/authorization';
import { businessDate } from '../../src/lib/businessDates';
import { paymentTotals, paymentInfoFromTransaction } from '../../src/lib/procurement';

const findings: unknown[] = [];
function source(file: string) { return ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX); }
function named(file: string, name: string) {
  const tree = source(file); let result: ts.Node | undefined;
  function visit(node: ts.Node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(tree) === name) result = node.initializer;
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) result = node;
    ts.forEachChild(node, visit);
  }
  visit(tree); assert.ok(result, name); return result.getText(tree);
}
function evaluate(context: vm.Context, name: string, file: string) {
  vm.runInContext(ts.transpileModule(`globalThis.${name} = (${named(file, name)});`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);
}
const memory = new Map<string, string>();
Object.assign(globalThis, { localStorage: {
  getItem(key: string) { return memory.get(key) ?? null; }, setItem(key: string, value: string) { memory.set(key, value); },
} });

const procurementFile = 'src/components/ProcurementView.tsx';
const order = { id: 'PO-AUDIT-SECOND', vendor: 'Audit Vendor', desc: 'Audit item', date: '2026-11-18', deliveryDate: '2026-11-25',
  subtotal: 100, total: 100, status: 'Barang Diterima', color: 'green', threeWayMatchStatus: 'MATCHED',
  items: [{ id: 'line-1', sku: 'SKU-1', name: 'Audit Item', qty: 1, unitPrice: 100, subtotal: 100 }] };

for (const cardNumber of ['', '4111111111111111']) {
  memory.clear(); const callbacks: (() => unknown)[] = [];
  let captured: any;
  const payment = vm.createContext({
    processing: { current: false }, timers: { current: [] }, setPaymentError() {}, setIsProcessing() {}, setProcessStep() {}, setCompletedTx() {},
    setTimeout(callback: () => unknown) { callbacks.push(callback); return callbacks.length; },
    selectedMethod: 'credit_card', selectedBank: 'bca', lang: 'en', cardNumber, cardExpiry: '99/99', cardCvv: '', cardHolder: '   ',
    po: order, baseTotal: 100, taxAmount: 0, withholdingTaxAmount: 0, grandTotal: 100, transferNotes: '',
    async onPaymentSuccess(tx: unknown) { captured = tx; },
  });
  evaluate(payment, 'handleProcessPayment', 'src/components/PaymentGatewayModal.tsx');
  payment.handleProcessPayment();
  for (const callback of callbacks) await callback();
  assert.equal(captured.status, 'SUCCESS'); assert.equal(captured.accountReference, cardNumber);
  const history = vm.createContext({
    pos: [order], transactionStorageKey: 'audit-tx', defaultTransactions: [], isDemo: true, lang: 'en', numLocale: 'en-US',
    paymentTotals, paymentInfoFromTransaction, readStoredArray, commitStoredArray, saveStoredData,
    setTransactionCacheError() {}, setTransactions() {}, onToast() {}, onNotify: null,
    async saveTransition(_id: string, patch: unknown) { history.patch = patch; },
  });
  for (const name of ['isCachedTransaction', 'readProcurementCache', 'handlePaymentSuccess']) evaluate(history, name, procurementFile);
  await history.handlePaymentSuccess(captured);
  assert.equal(JSON.parse(memory.get('audit-tx')!)[0].accountReference, cardNumber);
  assert.equal(history.patch.paymentInfo.reference, cardNumber);
}
findings.push({ id: 'GATEWAY-CARD-VALIDATION', severity: 'P3',
  source: ['src/components/PaymentGatewayModal.tsx:105', 'src/components/PaymentGatewayModal.tsx:366', 'src/components/PaymentGatewayModal.tsx:633'],
  trigger: 'Choose Corporate Credit Card in the simulated vendor-payment modal, empty card number/CVV/holder, expiry 99/99, then record.',
  observed: 'The actual handler creates SUCCESS and the actual procurement handler accepts and saves the transaction.',
  impact: 'The simulated payment marks a PO complete using invalid payment details; unlike the subscription label form, this form has no validation.',
  limitation: 'Simulated payment only; no banking/payment provider was contacted.' });
findings.push({ id: 'GATEWAY-RAW-CARD-STORAGE', severity: 'P2',
  source: ['src/components/PaymentGatewayModal.tsx:131', 'src/components/ProcurementView.tsx:352', 'src/lib/procurement.ts:55'],
  trigger: 'Type a full card number into the editable vendor-payment simulation form and record.',
  observed: 'Synthetic test PAN 4111111111111111 is kept unchanged in local transaction accountReference and PO paymentInfo.reference/accountOrCard.',
  impact: 'Full user-entered card numbers can be retained in localStorage and in the PO payment patch instead of a last-four-digit label.',
  limitation: 'Synthetic input and local/mocked transition only. Actual Firebase write was not performed; the outbound patch is verified.' });

memory.clear(); memory.set('audit-po', '[{}]');
const create = vm.createContext({
  submitting: { current: false }, pendingPo: { current: null }, role: 'Super Admin', vendor: 'Audit Vendor', deliveryDate: '2026-11-25',
  grandTotal: 100, discountPercent: 0, items: [{ id: 'one', sku: 'SKU-1', name: 'Item', qty: 1, unitPrice: 100 }], department: 'IT Infrastructure',
  subtotal: 100, discountAmount: 0, vatAmount: 0, pphAmount: 0, notes: '', canPerformPoAction, validatePurchaseOrderCreate, businessDate,
  crypto: { randomUUID: () => '12345678-1234-1234-1234-123456789012' },
  setIsSubmitting() {}, setCreatedPoNumber() {}, setAwaitingConfirmation() {}, setStep(value: string) { create.step = value; },
  isDemo: true, storageKey: 'audit-po', readStoredArray, saveStoredData,
  window: { dispatchEvent() {} }, CustomEvent: class {}, lang: 'en', onNotify: null,
  onToast(_message: string, type: string) { create.toast = type; },
});
evaluate(create, 'handleSubmit', 'src/components/PurchaseUnitView.tsx');
await create.handleSubmit({ preventDefault() {} });
assert.equal(create.step, 'success'); assert.equal(create.toast, 'success');
const validator = vm.createContext({ readStoredArray });
evaluate(validator, 'isCachedOrder', procurementFile);
const records = JSON.parse(memory.get('audit-po')!);
assert.equal(records.length, 2); assert.equal(validator.isCachedOrder(records[0]), true); assert.equal(validator.isCachedOrder(records[1]), false);
assert.throws(() => readStoredArray('audit-po', [], validator.isCachedOrder));
findings.push({ id: 'PO-CREATE-SHAPE-CACHE', severity: 'P2 conditional',
  source: ['src/components/PurchaseUnitView.tsx:262', 'src/components/ProcurementView.tsx:32'],
  trigger: 'Existing demo PO cache is a JSON array containing an invalid row such as [{}], then create a valid new PO.',
  observed: 'Create reports success and writes the new valid PO together with the invalid row. Procurement then rejects the whole array as a corrupt cache.',
  impact: 'A successful new PO cannot be opened through the order list until the old invalid row is recovered manually.',
  limitation: 'Requires preexisting malformed cache. No normal form input producing the old invalid row was established.' });

// A pending receipt operation must not silently adopt the next signed-in account.
let releaseClaims!: (value: unknown) => void;
const pendingClaims = new Promise(resolve => { releaseClaims = resolve; });
const auth = { currentUser: { uid: 'account-A', getIdTokenResult: () => pendingClaims } as any };
let postedBy = '';
const storeContext = vm.createContext({
  require: () => ({ auth, db: {} }), isRole: () => true,
  authenticatedPost: async () => { postedBy = auth.currentUser.uid; },
});
const storeTree = source('src/lib/purchaseOrderStore.ts');
const storeFn = storeTree.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'persistPoTransition')!;
const code = storeFn.getText(storeTree).replace(/^export\s+/, '');
vm.runInContext(ts.transpileModule(code + '\nglobalThis.persist = persistPoTransition;', {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText, storeContext);
const operation = storeContext.persist(order.id, { grn: {} }, 'receipt');
await new Promise(setImmediate);
auth.currentUser = { uid: 'account-B' };
releaseClaims({ claims: { role: 'Warehouse Manager' } });
await operation;
assert.equal(postedBy, 'account-B');
findings.push({ id: 'RECEIPT-SESSION-SWITCH', severity: 'P2 candidate with mocked session transition',
  source: ['src/lib/purchaseOrderStore.ts:13', 'src/lib/purchaseOrderStore.ts:16', 'src/lib/apiClient.ts:7'],
  trigger: 'Start saving a receipt as A, switch to another staff account B while A getIdTokenResult is pending, then let A claims finish.',
  observed: 'persistPoTransition calls authenticatedPost without rechecking captured A; authenticatedPost captures current B. The outbound receipt request is attributed to B.',
  impact: 'A pending action from the previous account may execute under the next account when that account has receipt permission.',
  limitation: 'Mocked auth timing; browser/Firebase account-switch lifecycle is not verified. Server still verifies B token and permissions, so this is not an authorization bypass.' });

fs.mkdirSync('output/bug-audit', { recursive: true });
fs.writeFileSync('output/bug-audit/second-po.json', JSON.stringify({ scope: 'Actual source callbacks executed with local storage and async mocks, no browser/cloud/credentials.', findings }, null, 2));
console.log(JSON.stringify({ verifiedLocalCases: findings.length, report: 'output/bug-audit/second-po.json' }));
