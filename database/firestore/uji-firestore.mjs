// Khusus emulator lokal terpisah; tidak memakai konfigurasi cloud.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { initializeApp, deleteApp } from 'firebase/app';
import {
  connectFirestoreEmulator, getFirestore, terminate,
  collection, doc, getDoc, getDocs, query, where,
  runTransaction, updateDoc, setDoc, deleteDoc,
} from 'firebase/firestore';
import {
  pendingDocuments, finalDocuments, receiptPatch, paymentPatch,
} from './contoh-data.mjs';

const projectId = 'demo-inventora-tubes';
const host = '127.0.0.1';
const port = 8085;
const endpoint = `http://${host}:${port}`;
const health = await fetch(endpoint, {
  signal: AbortSignal.timeout(3000),
});
assert.ok(health.ok, 'Emulator tugas harus aktif pada port 8085.');

const clients = [];
function client(role) {
  const app = initializeApp({
    projectId, apiKey: 'demo-api-key',
  }, `tugas-${role.replaceAll(' ', '-')}`);
  const db = getFirestore(app);
  connectFirestoreEmulator(db, host, port,
    role === 'anonymous' ? {} : {
      mockUserToken: { sub: `demo-${role}`, role },
    });
  clients.push({ app, db });
  return db;
}

const results = [];
async function check(name, action) {
  await action();
  results.push({ name, passed: true });
}
const denied = action => assert.rejects(action,
  error => error.code === 'permission-denied');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

try {
  const warehouse = client('Warehouse Manager');
  const finance = client('Finance Manager');
  const hr = client('HR Manager');
  const anonymous = client('anonymous');
  const target = (db, i) => doc(db, 'purchaseOrders',
    pendingDocuments[i].id);

  await check('Lima ID unik dan rumus nominal sesuai', async () => {
    assert.equal(new Set(pendingDocuments.map(p => p.id)).size, 5);
    for (const po of pendingDocuments) {
      assert.equal(po.subtotal,
        po.items.reduce((sum, it) => sum + it.qty * it.unitPrice, 0));
      assert.equal(po.total, po.subtotal - po.discountAmount
        + po.taxAmount - po.withholdingTaxAmount);
      assert.ok(Number.isSafeInteger(po.total));
    }
  });

  // Koleksi terbentuk saat dokumen pertama disimpan.
  await check('Gudang membuat lima dokumen lewat transaksi', async () => {
    for (const po of pendingDocuments) {
      await runTransaction(warehouse, async tx => {
        const ref = doc(warehouse, 'purchaseOrders', po.id);
        assert.equal((await tx.get(ref)).exists(), false,
          'Dokumen contoh sudah ada; gunakan emulator baru.');
        tx.set(ref, po);
      });
    }
  });

  await check('Keuangan menyetujui PO 2 sampai 4', async () => {
    for (const i of [1, 2, 3]) {
      await updateDoc(target(finance, i), {
        status: 'Disetujui', color: 'green',
      });
    }
  });
  await check('Keuangan menolak PO 5', async () => {
    await updateDoc(target(finance, 4), {
      status: 'Ditolak', color: 'red',
    });
  });
  await check('Gudang mencatat penerimaan PO 3 dan 4', async () => {
    for (const i of [2, 3]) {
      await updateDoc(target(warehouse, i),
        receiptPatch(pendingDocuments[i]));
    }
  });
  await check('Keuangan mencatat pembayaran simulasi PO 4', async () => {
    await updateDoc(target(finance, 3),
      paymentPatch(pendingDocuments[3]));
  });
  await check('Kelima dokumen sama dengan data akhir contoh', async () => {
    const snapshot = await getDocs(collection(finance, 'purchaseOrders'));
    assert.equal(snapshot.size, 5);
    for (const po of finalDocuments) {
      assert.deepEqual(snapshot.docs.find(d => d.id === po.id)?.data(), po);
    }
  });
  await check('Filter status mengembalikan satu PO selesai', async () => {
    const q = query(collection(finance, 'purchaseOrders'),
      where('status', '==', 'Selesai'));
    assert.equal((await getDocs(q)).size, 1);
  });
  await check('Baca tanpa autentikasi ditolak', async () => {
    await denied(getDoc(target(anonymous, 0)));
  });
  await check('Baca PO oleh HR Manager ditolak', async () => {
    await denied(getDoc(target(hr, 0)));
  });
  await check('Gudang tidak boleh menyetujui PO', async () => {
    await denied(updateDoc(target(warehouse, 0), {
      status: 'Disetujui', color: 'green',
    }));
  });
  await check('Total baru yang tidak cocok ditolak', async () => {
    const po = { ...pendingDocuments[0], id: 'PO-INVALID-TOTAL', total: 1 };
    await denied(setDoc(doc(warehouse, 'purchaseOrders', po.id), po));
  });
  await check('Pembayaran sebelum penerimaan ditolak', async () => {
    await denied(updateDoc(target(finance, 1),
      paymentPatch(pendingDocuments[1])));
  });
  await check('Nominal pembayaran tidak cocok ditolak', async () => {
    const patch = paymentPatch(pendingDocuments[2]);
    patch.paymentInfo.amount = 1;
    await denied(updateDoc(target(finance, 2), patch));
  });
  await check('Pembayaran kedua pada PO selesai ditolak', async () => {
    await denied(updateDoc(target(finance, 3),
      paymentPatch(pendingDocuments[3])));
  });
  await check('Penghapusan PO ditolak', async () => {
    await denied(deleteDoc(target(warehouse, 0)));
  });
  await check('Koleksi activities belum diizinkan rules', async () => {
    await denied(setDoc(doc(warehouse, 'activities', 'DEMO01'), {
      time: '2026-10-21', user: 'Demo', action: 'Contoh',
      icon: 'FileText', color: 'blue',
    }));
  });
  await check('Uji negatif tidak mengubah lima dokumen', async () => {
    const snap = await getDocs(collection(finance, 'purchaseOrders'));
    assert.equal(snap.size, 5);
    for (const po of finalDocuments) {
      assert.deepEqual(snap.docs.find(d => d.id === po.id)?.data(), po);
    }
  });

  const rules = await readFile(new URL('../../firestore.rules', import.meta.url));
  const source = await readFile(new URL('./contoh-data.mjs', import.meta.url));
  const report = {
    date: '2026-10-21', projectId, emulator: `${host}:${port}`,
    collection: 'purchaseOrders', documentCount: 5,
    checks: results, passed: results.length,
    sha256_rules: sha(rules), sha256_data: sha(source),
    totalPo: finalDocuments.reduce((n, po) => n + po.total, 0),
    totalPaid: finalDocuments.reduce((n, po) => n + (po.paymentInfo?.amount || 0), 0),
  };
  await writeFile(new URL('./hasil-uji.json', import.meta.url),
    JSON.stringify(report, null, 2) + '\n');
  await writeFile(new URL('./contoh-dokumen.json', import.meta.url),
    JSON.stringify({ collection: 'purchaseOrders', documents: finalDocuments }, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
} finally {
  for (const { app, db } of clients) {
    await terminate(db);
    await deleteApp(app);
  }
}
