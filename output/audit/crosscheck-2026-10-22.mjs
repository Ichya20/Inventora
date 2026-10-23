// Local audit only: extracts current callbacks and uses an isolated Firestore emulator.
// No production credentials, browser automation, email, or paid AI requests are used.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import ts from 'typescript';
import { initializeApp, deleteApp } from 'firebase/app';
import { connectFirestoreEmulator, doc, getDoc, getFirestore, setDoc, terminate, updateDoc } from 'firebase/firestore';

const results = [];
const source = file => ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function findNode(file, predicate) {
  const root = source(file);
  let found;
  function visit(node) {
    if (found) return;
    if (predicate(node, root)) found = node;
    else ts.forEachChild(node, visit);
  }
  visit(root);
  assert.ok(found, 'Audit target missing: ' + file);
  return found;
}
function callback(file, name) {
  const node = findNode(file, node => (ts.isFunctionDeclaration(node) || ts.isVariableDeclaration(node)) && node.name?.getText() === name);
  return ts.isFunctionDeclaration(node) ? node.getText().replace(/^export\s+/, '') : node.initializer.getText();
}
function compile(expression, context) {
  const js = ts.transpileModule('globalThis.__target = (' + expression + ');', { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
  vm.runInContext(js, context);
  return context.__target;
}
function persistenceEffect(file, key) {
  return findNode(file, node => ts.isCallExpression(node) && node.expression.getText() === 'useEffect' && node.arguments[0]?.getText().includes(key)).arguments[0].getText();
}

// Execute the actual server registration with mocked dependencies; do not bind a port.
const routes = new Map();
let upstreamCalls = 0;
const fakeApp = {
  use() {}, get() {}, listen() {},
  post(route, ...handlers) { routes.set(route, handlers); },
};
const express = Object.assign(() => fakeApp, { json() {}, urlencoded() {}, static() {} });
const dependencies = {
  express, path, vite: {}, compression: () => () => {}, 'dotenv/config': {},
  './src/lib/invoiceValidation': {},
  '@google/genai': { GoogleGenAI: class {
    models = { generateContent: async () => { upstreamCalls++; return { text: 'Mock AI response' }; } };
  } },
};
const serverContext = vm.createContext({
  exports: {}, require: name => { assert.ok(name in dependencies, 'Unexpected server dependency: ' + name); return dependencies[name]; },
  process: { env: { NODE_ENV: 'production', GEMINI_API_KEY: 'audit-placeholder' }, cwd: () => process.cwd() },
  console: { log() {}, warn() {} }, setInterval() {}, setTimeout, clearTimeout,
});
vm.runInContext(ts.transpileModule(fs.readFileSync('server.ts', 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
}).outputText, serverContext);
async function invoke(route, body) {
  const handlers = routes.get(route);
  assert.equal(handlers.length, 2);
  const req = { body, headers: {}, ip: '127.0.0.1', socket: { remoteAddress: '127.0.0.1' } };
  const response = { statusCode: 200, setHeader() {}, status(code) { this.statusCode = code; return this; }, json(data) { this.data = data; return this; } };
  let allowed = false;
  handlers[0](req, response, () => { allowed = true; });
  if (allowed) await handlers[1](req, response);
  return response;
}
const anonymousResponse = await invoke('/api/copilot', { message: 'PO summary', context: {} });
assert.equal(anonymousResponse.statusCode, 200);
assert.equal(upstreamCalls, 1);
results.push({ id: 'AI_AUTH', confirmed: true, anonymousStatus: anonymousResponse.statusCode, mockedPaidServiceCalls: upstreamCalls });
delete serverContext.process.env.GEMINI_API_KEY;
const noData = { activePosCount: 0, pendingApprovalsCount: 0, recordedPoValue: 0, totalHeadcount: 0, infrastructureUnits: 0 };
const fallback = await invoke('/api/copilot', { message: 'PO summary', context: noData });
assert.match(fallback.data.reply, /45 POs/);
results.push({ id: 'AI_FALLBACK', confirmed: true, input: noData, returnedStatus: fallback.statusCode, returnedText: fallback.data.reply });

// Execute the actual handlers and persistence effects with local writes failing.
const original = [{ id: 'AUDIT-SKU', stock: 1, status: 'Optimal', color: 'green' }];
const invoices = [{ id: 'AUDIT-INV', status: 'Pending', color: 'orange', isOverdue: false }];
const stored = new Map([
  ['inventora_inventory_v1', JSON.stringify(original)],
  ['inventora_finance_invoices_v1', JSON.stringify(invoices)],
]);
const toasts = [];
const uiContext = vm.createContext({
  lang: 'id', items: structuredClone(original), invoices: structuredClone(invoices),
  localStorage: { getItem: key => stored.get(key) ?? null, setItem() { throw new Error('QuotaExceededError'); } },
  console: { warn() {} }, onToast: (...args) => toasts.push(args), onNavigate() {}, setActiveModal() {},
});
uiContext.setItems = updater => { uiContext.items = updater(uiContext.items); };
uiContext.setInvoices = updater => { uiContext.invoices = updater(uiContext.invoices); };
uiContext.saveStoredData = compile(callback('src/lib/storageUtils.ts', 'saveStoredData'), uiContext);
compile(callback('src/components/InventoryView.tsx', 'handleDeploy'), uiContext)('AUDIT-SKU');
compile(persistenceEffect('src/components/InventoryView.tsx', 'inventora_inventory_v1'), uiContext)();
assert.equal(uiContext.items[0].stock, 0);
assert.equal(JSON.parse(stored.get('inventora_inventory_v1'))[0].stock, 1);
assert.equal(toasts.at(-1)[1], 'success');
results.push({ id: 'INVENTORY_SAVE', confirmed: true, displayedStock: uiContext.items[0].stock, reloadedStock: JSON.parse(stored.get('inventora_inventory_v1'))[0].stock, toast: toasts.at(-1).slice(0, 2) });
assert.equal(uiContext.items[0].status, 'Optimal');
assert.equal(uiContext.items[0].color, 'green');
results.push({ id: 'INVENTORY_STATUS', confirmed: true, stock: uiContext.items[0].stock, label: uiContext.items[0].status, color: uiContext.items[0].color });
compile(callback('src/components/FinanceView.tsx', 'handleMarkAsPaid'), uiContext)('AUDIT-INV');
compile(persistenceEffect('src/components/FinanceView.tsx', 'inventora_finance_invoices_v1'), uiContext)();
assert.equal(uiContext.invoices[0].status, 'Lunas');
assert.equal(JSON.parse(stored.get('inventora_finance_invoices_v1'))[0].status, 'Pending');
results.push({ id: 'FINANCE_SAVE', confirmed: true, displayedStatus: uiContext.invoices[0].status, reloadedStatus: 'Pending', toast: toasts.at(-1).slice(0, 2) });
compile(callback('src/components/FinanceView.tsx', 'handleSendWarning'), uiContext)('AUDIT-INV', 'Audit Client');
assert.match(toasts.at(-1)[0], /telah dikirim/);
results.push({ id: 'EMAIL_NOOP', confirmed: true, toast: toasts.at(-1)[0], note: 'Actual callback completes with only setActiveModal and onToast supplied; no mail request or queue exists.' });

const notification = { id: 'audit-payment', type: 'payment', message: 'PO-AUDIT: Rp 111.000.000', metadata: { poId: 'PO-AUDIT', amount: 111000000 } };
const notificationState = findNode('src/App.tsx', node => ts.isVariableDeclaration(node) && ts.isArrayBindingPattern(node.name) && node.name.elements[0]?.name?.getText() === 'notifications');
const notificationContext = vm.createContext({ currentRole: 'HR Manager', user: { uid: 'different-user' }, localStorage: { getItem: key => key === 'inventora_notifications' ? JSON.stringify([notification]) : null } });
const loadedNotifications = compile(notificationState.initializer.arguments[0].getText(), notificationContext)();
assert.equal(loadedNotifications[0].metadata.amount, 111000000);
results.push({ id: 'NOTIFICATION_SCOPE', confirmed: true, currentRole: 'HR Manager', inheritedPaymentAmount: loadedNotifications[0].metadata.amount });

const receiptContext = vm.createContext({});
const initialReceipt = compile(callback('src/components/ThreeWayMatchModal.tsx', 'getInitialItems'), receiptContext)({ id: 'PO-NO-ITEMS', desc: 'Missing order details' }, 'id');
assert.equal(initialReceipt[0].orderedQty, 10);
assert.equal(initialReceipt[0].receivedQty, 10);
results.push({ id: 'GRN_SYNTHETIC_ITEMS', confirmed: true, originalItemsPresent: false, generatedItem: initialReceipt[0] });

// Verify missing validation using current rules in a separate local emulator database.
assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8096', 'Use the dedicated audit emulator only.');
const clients = ['Warehouse Manager', 'Finance Manager'].map((role, i) => {
  const app = initializeApp({ projectId: 'demo-inventora', apiKey: 'audit-demo-key' }, 'audit-crosscheck-' + i);
  const db = getFirestore(app);
  connectFirestoreEmulator(db, '127.0.0.1', 8096, { mockUserToken: { sub: 'audit-' + i, role } });
  return { app, db };
});
const [warehouse, finance] = clients.map(client => client.db);
try {
  const id = 'PO-AUDIT-' + Date.now();
  const base = { id, vendor: 'Audit', total: 111000000, subtotal: 100000000, discountAmount: 0, taxAmount: 11000000, withholdingTaxAmount: 0, status: 'Pending Approval', color: 'orange', items: [{ sku: 'AUDIT-SKU', qty: 10, price: 10000000 }] };
  await setDoc(doc(warehouse, 'purchaseOrders', id), base);
  await updateDoc(doc(finance, 'purchaseOrders', id), { status: 'Disetujui', color: 'green' });
  await updateDoc(doc(warehouse, 'purchaseOrders', id), { status: 'Barang Diterima', color: 'green', threeWayMatchStatus: 'MATCHED', grn: { poId: id, status: 'MATCHED', items: [{ sku: 'AUDIT-SKU', orderedQty: 10, receivedQty: 0, condition: 'SHORTAGE' }] } });
  await updateDoc(doc(finance, 'purchaseOrders', id), { status: 'Selesai', color: 'blue', paymentInfo: { amount: base.total, txId: 'AUDIT-TX', receiptNo: 'AUDIT-RECEIPT' } });
  assert.equal((await getDoc(doc(finance, 'purchaseOrders', id))).data().status, 'Selesai');
  results.push({ id: 'RULES_GRN_MISMATCH', confirmed: true, orderedQty: 10, receivedQty: 0, condition: 'SHORTAGE', acceptedMatchLabel: 'MATCHED', finalStatus: 'Selesai' });
  const malformedId = id + '-malformed';
  await setDoc(doc(warehouse, 'purchaseOrders', malformedId), { ...base, id: malformedId, items: 'invalid string' });
  assert.equal((await getDoc(doc(warehouse, 'purchaseOrders', malformedId))).data().items, 'invalid string');
  assert.throws(() => compile(callback('src/components/ThreeWayMatchModal.tsx', 'getInitialItems'), receiptContext)({ id: malformedId, items: 'invalid string' }), /map is not a function/);
  results.push({ id: 'RULES_ITEMS_SHAPE', confirmed: true, acceptedItemsType: 'string', receiptError: 'source.map is not a function' });
} finally {
  await Promise.all(clients.map(async client => { await terminate(client.db); await deleteApp(client.app); }));
}
const report = { checkedAt: new Date().toISOString(), scope: 'Current source callbacks and isolated Firestore emulator; no production or live browser checks', results };
fs.writeFileSync('output/audit/crosscheck-2026-10-22.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
