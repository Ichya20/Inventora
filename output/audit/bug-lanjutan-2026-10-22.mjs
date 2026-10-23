// Audit callbacks with memory storage and API mocks; no cloud or browser access.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import ts from 'typescript';
import { validatePurchaseOrderCreate } from '../../src/lib/purchaseOrderValidation.ts';
import { canPerformPoAction } from '../../src/lib/authorization.ts';
import { businessDate } from '../../src/lib/businessDates.ts';
import { loadStoredData, saveStoredData } from '../../src/lib/storageUtils.ts';

const observations = [];
function find(file, predicate) {
  const root = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let result;
  const visit = node => { if (result) return; if (predicate(node)) result = node; else ts.forEachChild(node, visit); };
  visit(root);
  assert.ok(result, 'Missing audit target in ' + file);
  return result;
}
const variable = (file, name) => find(file, node => ts.isVariableDeclaration(node) && node.name.getText() === name).initializer;
function compile(expression, context) {
  const code = ts.transpileModule('globalThis.target = (' + expression + ');', { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
  vm.runInContext(code, context);
  return context.target;
}
const purchase = 'src/components/PurchaseUnitView.tsx';
const inventory = 'src/components/InventoryView.tsx';
const baseItem = { id: 'item-1', sku: 'AUDIT-SKU', name: 'Audit item', qty: 2, unitPrice: 500, total: 1000 };
const poFrom = item => ({ id: 'AUDIT-PO', vendor: 'Audit vendor', desc: 'Audit', date: '2026-10-22', deliveryDate: '2026-10-27', status: 'Pending Approval', subtotal: item.total, total: item.total, items: [{ ...item, subtotal: item.total }] });

for (const [field, value] of [['qty', '3'], ['unitPrice', '600']]) {
  const context = vm.createContext({ setImportedTaxAmount() {}, items: [{ ...baseItem }] });
  context.setItems = update => { context.items = update(context.items); };
  compile(variable(purchase, 'handleItemChange').getText(), context)('item-1', field, value);
  const item = context.items[0];
  assert.equal(typeof item[field], 'string');
  assert.throws(() => validatePurchaseOrderCreate(poFrom(item)), /Jumlah, harga, atau subtotal/);
  observations.push({ id: 'NUMERIC_INPUT_STRING', field, value, storedType: typeof item[field], rejectedByValidator: true });
}

let stored = new Map();
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
  getItem: key => stored.get(key) ?? null,
  setItem: (key, value) => stored.set(key, value),
} });
function submitContext(notes = '') {
  const posts = [], toasts = [];
  const context = vm.createContext({
    role: 'Warehouse Manager', vendor: 'dell', deliveryDate: '2026-10-27', grandTotal: 1110, discountPercent: 0,
    items: [{ ...baseItem }], submitting: { current: false }, setIsSubmitting() {}, department: 'IT Infrastructure',
    setCreatedPoNumber() {}, notes, crypto: globalThis.crypto, businessDate, canPerformPoAction, validatePurchaseOrderCreate,
    subtotal: 1000, discountAmount: 0, vatAmount: 110, pphAmount: 0, lang: 'id', isDemo: false, storageKey: 'audit-po-cache',
    navigator: { onLine: true }, authenticatedPost: async (_url, body) => { posts.push(body); return body; },
    loadStoredData, saveStoredData, window: { dispatchEvent() {} }, CustomEvent: class {},
    onToast: (...args) => toasts.push(args), onNotify: null, onNavigate() {},
    setTimeout: callback => { callback(); return 0; }, setStep: step => { context.step = step; }, step: 'form',
  });
  return { context, posts, toasts, submit: compile(variable(purchase, 'handleSubmit').getText(), context) };
}

stored = new Map([['audit-po-cache', '{}']]);
const duplicate = submitContext();
await duplicate.submit({ preventDefault() {} });
await duplicate.submit({ preventDefault() {} });
assert.equal(duplicate.posts.length, 2);
assert.notEqual(duplicate.posts[0].id, duplicate.posts[1].id);
assert.equal(duplicate.context.step, 'form');
assert.ok(duplicate.toasts.every(toast => toast[1] === 'error'));
observations.push({ id: 'POST_COMMIT_CACHE_FAILURE', mockedServerCreates: 2, distinctIds: true, uiReportsFailure: true, step: duplicate.context.step });

stored = new Map();
const notes = submitContext('Instruksi utama\nKirim ke gedung B lantai 2');
await notes.submit({ preventDefault() {} });
assert.equal(notes.context.step, 'success');
assert.equal(notes.posts[0].desc, 'Instruksi utama');
assert.equal(JSON.stringify(notes.posts[0]).includes('Kirim ke gedung B lantai 2'), false);
observations.push({ id: 'MULTILINE_NOTES_LOST', descriptionSaved: notes.posts[0].desc, secondLineSaved: false });

stored = new Map([['inventora_inventory_v1', '{}']]);
const invalidInventory = loadStoredData('inventora_inventory_v1', []);
const inventoryContext = vm.createContext({ storedItems: invalidInventory, stockHealth() {}, lang: 'id' });
assert.throws(() => compile(variable(inventory, 'items').arguments[0].getText(), inventoryContext)(), /map is not a function/);
observations.push({ id: 'INVALID_CACHE_CRASH', validJsonWrongShape: '{}', failure: 'storedItems.map is not a function' });

const restockAttribute = find(inventory, node => ts.isJsxAttribute(node) && node.name.getText() === 'onGeneratePo');
const navigation = [], restockToasts = [];
compile(restockAttribute.initializer.expression.getText(), vm.createContext({
  onNavigate: menu => navigation.push(menu), onToast: message => restockToasts.push(message), lang: 'id',
}))({ name: 'UPS 3kVA', skuId: 'UPS-3KVA-RT', recommendedOrderQty: 17 });
const initialItems = compile(variable(purchase, '[items, setItems]').arguments[0].getText(), vm.createContext({}));
assert.deepEqual(navigation, ['purchase']);
assert.equal(initialItems[0].sku, 'NV-H100-TC');
assert.equal(initialItems[0].qty, 2);
observations.push({ id: 'RESTOCK_DRAFT_NOT_PASSED', selectedSku: 'UPS-3KVA-RT', selectedQty: 17, formInitialSku: initialItems[0].sku, formInitialQty: initialItems[0].qty, navigation });

const toastContext = vm.createContext({ language: 'id', playNotificationChime() {} });
toastContext.setToasts = update => { toastContext.toasts = update([]); };
const showToast = compile(variable('src/App.tsx', 'showToast').getText(), toastContext);
for (const message of ['Stok tidak berubah. Periksa penyimpanan browser dan ketersediaan stok.', 'Nominal pembayaran tidak valid.']) {
  showToast(message, 'error');
  assert.equal(toastContext.toasts[0].type, 'error');
  assert.ok(['Stok Berkurang', 'Pembayaran Lunas'].includes(toastContext.toasts[0].title));
  observations.push({ id: 'ERROR_TOAST_SUCCESS_TITLE', message, type: toastContext.toasts[0].type, title: toastContext.toasts[0].title });
}

const result = { date: '2026-10-22', scope: 'local source callbacks, memory storage, mocked API; no production data', issues: 6, observations };
fs.writeFileSync('output/audit/bug-lanjutan-2026-10-22.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
