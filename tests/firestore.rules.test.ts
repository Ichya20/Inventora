import { before, after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase/app';
import { connectFirestoreEmulator, doc, getDoc, getFirestore, setDoc, terminate, updateDoc } from 'firebase/firestore';

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
const pending = { id: poId, vendor: 'Test Vendor', desc: 'Server', date: '2026-10-20', deliveryDate: '2026-10-27', total: 111000000, subtotal: 100000000, discountAmount: 0, taxAmount: 11000000, withholdingTaxAmount: 0, status: 'Pending Approval', color: 'orange', threeWayMatchStatus: 'PENDING_RECEIPT' };
const matched = { status: 'Barang Diterima', color: 'green', threeWayMatchStatus: 'MATCHED', grn: { poId, status: 'MATCHED' } };
const settled = { status: 'Selesai', color: 'blue', paymentInfo: { amount: 111000000, txId: 'TX-TEST', receiptNo: 'REC-TEST', paidAt: '2026-10-20', method: 'Simulation' } };
const denied = (action: Promise<unknown>) => assert.rejects(action, (error: any) => error.code === 'permission-denied');

before(async () => {
  const health = await fetch('http://' + host + ':' + port, { signal: AbortSignal.timeout(3000) });
  assert.ok(health.ok, 'Start the Firestore emulator before running npm run test:rules');
});
beforeEach(async () => { await setDoc(ref(owner), pending); });
after(async () => {
  await Promise.all(clients.map(async client => { await terminate(client.db); await deleteApp(client.app); }));
});

test('anonymous and unassigned module roles cannot read or write purchase orders', async () => {
  await denied(getDoc(ref(anonymous)));
  await denied(setDoc(ref(anonymous), pending));
  await denied(getDoc(ref(hr)));
  await denied(setDoc(doc(warehouse, 'unrecognized', 'document'), { status: 'open' }));
});

test('warehouse may create a valid PO but cannot approve it or submit pre-paid orders', async () => {
  const newId = 'PO-NEW-' + Date.now();
  await setDoc(doc(warehouse, 'purchaseOrders', newId), { ...pending, id: newId });
  await denied(updateDoc(ref(warehouse), { status: 'Disetujui', color: 'green' }));
  await denied(setDoc(doc(warehouse, 'purchaseOrders', newId + '-paid'), { ...pending, id: newId + '-paid', ...settled }));
  await denied(setDoc(doc(warehouse, 'purchaseOrders', newId + '-bad-total'), { ...pending, id: newId + '-bad-total', total: 123210000 }));
});

test('finance approval preserves financial fields and even administrators cannot skip workflow steps', async () => {
  await denied(updateDoc(ref(admin), settled));
  await denied(updateDoc(ref(finance), { status: 'Disetujui', color: 'green', total: 1 }));
  await updateDoc(ref(finance), { status: 'Disetujui', color: 'green' });
  assert.equal((await getDoc(ref(finance))).data()?.status, 'Disetujui');
  await denied(updateDoc(ref(finance), settled));
});

test('only warehouse can confirm receipts and the match status must agree with the GRN', async () => {
  await updateDoc(ref(finance), { status: 'Disetujui', color: 'green' });
  await denied(updateDoc(ref(finance), matched));
  await denied(updateDoc(ref(warehouse), { ...matched, grn: { poId, status: 'DISCREPANCY' } }));
  await updateDoc(ref(warehouse), matched);
  assert.equal((await getDoc(ref(warehouse))).data()?.status, 'Barang Diterima');
});

test('payment requires finance, exact total and canonical receipt fields; settled POs cannot reopen', async () => {
  await updateDoc(ref(finance), { status: 'Disetujui', color: 'green' });
  await updateDoc(ref(warehouse), matched);
  await denied(updateDoc(ref(warehouse), settled));
  await denied(updateDoc(ref(finance), { ...settled, paymentInfo: { ...settled.paymentInfo, amount: 123210000 } }));
  await denied(updateDoc(ref(finance), { ...settled, paymentInfo: { totalPaid: 111000000, receiptNumber: 'OLD', txId: 'TX-OLD' } }));
  await updateDoc(ref(finance), settled);
  assert.equal((await getDoc(ref(finance))).data()?.paymentInfo.receiptNo, 'REC-TEST');
  await denied(updateDoc(ref(admin), { status: 'Barang Diterima' }));
  await denied(updateDoc(ref(finance), { ...settled, paymentInfo: { ...settled.paymentInfo, txId: 'TX-DUPLICATE' } }));
});
