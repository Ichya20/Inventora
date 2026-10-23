import { before, after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase/app';
import { connectFirestoreEmulator, doc, getDoc, getFirestore, setDoc, terminate, updateDoc } from 'firebase/firestore';
import { persistGoodsReceipt, persistPurchaseOrder } from '../server/firebaseAdmin';
import { getApps, deleteApp as deleteAdminApp } from 'firebase-admin/app';
import type { GoodsReceiptNote } from '../src/types';

// Run only against the local emulator. These credentials cannot access a live project.
const projectId = 'demo-inventora';
const [host, port] = (process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080').split(':');
if (!['127.0.0.1', 'localhost', '::1'].includes(host)) throw new Error('Rules tests require a loopback emulator.');
const clients = ['owner', 'anonymous', 'Super Admin', 'Warehouse Manager', 'Finance Manager', 'HR Manager'].map((role, index) => {
  const app = initializeApp({ projectId, apiKey: 'demo-api-key' }, 'rules-test-' + index);
  const db = getFirestore(app);
  connectFirestoreEmulator(db, host, Number(port), role === 'anonymous' ? {} : {
    mockUserToken: role === 'owner' ? 'owner' : { sub: 'test-user-' + index, role },
  });
  return { app, db };
});
const [owner, anonymous, admin, warehouse, finance, hr] = clients.map(client => client.db);
const poId = 'PO-RULE-1';
const ref = (db: typeof owner) => doc(db, 'purchaseOrders', poId);
const pending = { id: poId, vendor: 'Test Vendor', desc: 'Server', date: '2026-10-20', deliveryDate: '2026-10-27', total: 111000000, subtotal: 100000000, discountAmount: 0, taxAmount: 11000000, withholdingTaxAmount: 0, status: 'Pending Approval', color: 'orange', threeWayMatchStatus: 'PENDING_RECEIPT', items: [{ id: 'line-1', sku: 'SERVER-1', name: 'Server', qty: 10, unitPrice: 10000000, subtotal: 100000000 }] };
const grn: GoodsReceiptNote = { id: 'GRN-1', grnNumber: 'GRN-1', poId, receivedDate: '2026-10-22', receivedBy: 'Warehouse Officer', suratJalanNumber: 'SJ-1', status: 'MATCHED', items: [{ sku: 'SERVER-1', name: 'Server', orderedQty: 10, receivedQty: 10, condition: 'GOOD' }] };
const matched = { status: 'Barang Diterima', color: 'green', threeWayMatchStatus: 'MATCHED', grn };
const settled = { status: 'Selesai', color: 'blue', paymentInfo: { amount: 111000000, txId: 'TX-TEST', receiptNo: 'REC-TEST', paidAt: '2026-10-20', method: 'Simulation' } };
const denied = (action: Promise<unknown>) => assert.rejects(action, (error: any) => error.code === 'permission-denied');

before(async () => {
  process.env.FIREBASE_PROJECT_ID = projectId;
  process.env.FIRESTORE_EMULATOR_HOST = host + ':' + port;
  const health = await fetch('http://' + host + ':' + port, { signal: AbortSignal.timeout(3000) });
  assert.ok(health.ok, 'Start the Firestore emulator before running npm run test:rules');
});
beforeEach(async () => { await setDoc(ref(owner), pending); });
after(async () => {
  await Promise.all(clients.map(async client => { await terminate(client.db); await deleteApp(client.app); }));
  await Promise.all(getApps().map(app => deleteAdminApp(app)));
});

test('anonymous and unassigned module roles cannot read or write purchase orders', async () => {
  await denied(getDoc(ref(anonymous)));
  await denied(setDoc(ref(anonymous), pending));
  await denied(getDoc(ref(hr)));
  await denied(setDoc(doc(warehouse, 'unrecognized', 'document'), { status: 'open' }));
});

test('clients cannot create POs directly or bypass server validation', async () => {
  const newId = 'PO-NEW-' + Date.now();
  await denied(setDoc(doc(warehouse, 'purchaseOrders', newId), { ...pending, id: newId }));
  await denied(setDoc(doc(admin, 'purchaseOrders', newId), { ...pending, id: newId }));
  await denied(setDoc(doc(warehouse, 'purchaseOrders', newId + '-bad-items'), { ...pending, id: newId + '-bad-items', items: 'broken' }));
  await denied(updateDoc(ref(warehouse), { status: 'Disetujui', color: 'green' }));
  await denied(setDoc(doc(warehouse, 'purchaseOrders', newId + '-paid'), { ...pending, id: newId + '-paid', ...settled }));
  await denied(setDoc(doc(warehouse, 'purchaseOrders', newId + '-bad-total'), { ...pending, id: newId + '-bad-total', total: 123210000 }));
  await denied(setDoc(doc(warehouse, 'purchaseOrders', newId + '-verified'), { ...pending, id: newId + '-verified', receiptVerification: { version: 1 } }));
});

test('trusted PO service validates every item and atomically rejects duplicate IDs', async () => {
  const id = 'PO-SERVER-' + Date.now();
  await assert.rejects(persistPurchaseOrder({ ...pending, id, items: 'broken' }), (error: any) => error.status === 422);
  assert.equal((await getDoc(doc(warehouse, 'purchaseOrders', id))).exists(), false);
  const saved = await persistPurchaseOrder({ ...pending, id });
  assert.equal(saved.items?.[0].qty, 10);
  assert.deepEqual((await getDoc(doc(warehouse, 'purchaseOrders', id))).data(), saved);
  await assert.rejects(persistPurchaseOrder({ ...pending, id }), (error: any) => error.status === 409);
  assert.deepEqual((await getDoc(doc(warehouse, 'purchaseOrders', id))).data(), saved);
});

test('retrying a confirmed create returns the same PO only for the same actor and payload', async () => {
  const id = 'PO-RETRY-' + Date.now();
  const input = { ...pending, id, notes: 'Instruksi utama\nKirim ke gedung B lantai 2' };
  const actor = { uid: 'warehouse-retry' };
  const created = await persistPurchaseOrder(input, actor);
  assert.equal(created.notes, input.notes);
  assert.equal((await persistPurchaseOrder(input, actor)).id, id);
  await assert.rejects(persistPurchaseOrder(input, { uid: 'someone-else' }), (error: any) => error.status === 409);
  await assert.rejects(persistPurchaseOrder({ ...input, notes: 'Changed request' }, actor), (error: any) => error.status === 409);
  await updateDoc(doc(finance, 'purchaseOrders', id), { status: 'Disetujui', color: 'green' });
  assert.equal((await persistPurchaseOrder(input, actor)).status, 'Disetujui');
  assert.equal((await getDoc(doc(warehouse, 'purchaseOrders', id))).data()?.status, 'Disetujui');
});

test('finance approval preserves financial fields and even administrators cannot skip workflow steps', async () => {
  await denied(updateDoc(ref(admin), settled));
  await denied(updateDoc(ref(finance), { status: 'Disetujui', color: 'green', total: 1 }));
  await updateDoc(ref(finance), { status: 'Disetujui', color: 'green' });
  assert.equal((await getDoc(ref(finance))).data()?.status, 'Disetujui');
  await denied(updateDoc(ref(finance), settled));
});

test('all direct receipt writes are denied, including a forged MATCHED label and verification marker', async () => {
  await updateDoc(ref(finance), { status: 'Disetujui', color: 'green' });
  await denied(updateDoc(ref(finance), matched));
  await denied(updateDoc(ref(warehouse), { ...matched, grn: { poId, status: 'DISCREPANCY' } }));
  await denied(updateDoc(ref(warehouse), matched));
  await denied(updateDoc(ref(admin), { ...matched, receiptVerification: { version: 1, verifiedBy: 'forged', verifiedAt: 'now' } }));
  await denied(updateDoc(ref(warehouse), { ...matched, grn: { ...grn, items: [{ ...grn.items[0], receivedQty: 0, condition: 'SHORTAGE' }] } }));
  assert.equal((await getDoc(ref(warehouse))).data()?.status, 'Disetujui');
  await persistGoodsReceipt(poId, grn, { uid: 'warehouse-server', role: 'Warehouse Manager' });
  assert.equal((await getDoc(ref(warehouse))).data()?.status, 'Barang Diterima');
});

test('trusted receipt service rejects false matches and stores shortages without enabling payment', async () => {
  await updateDoc(ref(finance), { status: 'Disetujui', color: 'green' });
  const shortage = { ...grn, items: [{ ...grn.items[0], receivedQty: 0, condition: 'SHORTAGE' as const }] };
  await assert.rejects(persistGoodsReceipt(poId, shortage, { uid: 'warehouse-server', role: 'Warehouse Manager' }), /Status pencocokan/);
  assert.equal((await getDoc(ref(warehouse))).data()?.status, 'Disetujui');
  await persistGoodsReceipt(poId, { ...shortage, status: 'DISCREPANCY' }, { uid: 'warehouse-server', role: 'Warehouse Manager' });
  assert.equal((await getDoc(ref(warehouse))).data()?.status, 'Selisih Penerimaan');
  await denied(updateDoc(ref(finance), settled));
  await persistGoodsReceipt(poId, grn, { uid: 'warehouse-server', role: 'Warehouse Manager' });
  assert.equal((await getDoc(ref(warehouse))).data()?.receiptVerification.verifiedBy, 'warehouse-server');
});

test('legacy matched labels cannot authorize payment until the server revalidates the receipt', async () => {
  await setDoc(ref(owner), { ...pending, ...matched });
  await denied(updateDoc(ref(finance), settled));
  await persistGoodsReceipt(poId, grn, { uid: 'warehouse-server', role: 'Warehouse Manager' });
  await updateDoc(ref(finance), settled);
});

test('payment requires finance, exact total and canonical receipt fields; settled POs cannot reopen', async () => {
  await updateDoc(ref(finance), { status: 'Disetujui', color: 'green' });
  await persistGoodsReceipt(poId, grn, { uid: 'warehouse-server', role: 'Warehouse Manager' });
  await denied(updateDoc(ref(warehouse), settled));
  await denied(updateDoc(ref(finance), { ...settled, paymentInfo: { ...settled.paymentInfo, amount: 123210000 } }));
  await denied(updateDoc(ref(finance), { ...settled, paymentInfo: { totalPaid: 111000000, receiptNumber: 'OLD', txId: 'TX-OLD' } }));
  await updateDoc(ref(finance), settled);
  assert.equal((await getDoc(ref(finance))).data()?.paymentInfo.receiptNo, 'REC-TEST');
  await denied(updateDoc(ref(admin), { status: 'Barang Diterima' }));
  await denied(updateDoc(ref(finance), { ...settled, paymentInfo: { ...settled.paymentInfo, txId: 'TX-DUPLICATE' } }));
});
