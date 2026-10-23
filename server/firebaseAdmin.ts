import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import type { GoodsReceiptNote, PurchaseOrder, Role } from '../src/types';
import { validatedReceiptPatch } from '../src/lib/goodsReceipt';
import { validatePurchaseOrderCreate } from '../src/lib/purchaseOrderValidation';
import { createHash } from 'node:crypto';

function adminApp() {
  return getApps().find(app => app.name === 'inventora-server') || initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || firebaseConfig.projectId, credential: applicationDefault(),
  }, 'inventora-server');
}

export async function verifyFirebaseToken(token: string) {
  return getAuth(adminApp()).verifyIdToken(token);
}

export async function persistPurchaseOrder(input: unknown, actor?: { uid: string }) {
  let po: PurchaseOrder;
  try { po = validatePurchaseOrderCreate(input); }
  catch (error) { throw Object.assign(error, { status: 422 }); }
  const db = getFirestore(adminApp());
  const digest = createHash('sha256').update(JSON.stringify(po)).digest('hex');
  return db.runTransaction(async transaction => {
    const ref = db.collection('purchaseOrders').doc(po.id);
    const snapshot = await transaction.get(ref);
    if (snapshot.exists) {
      const { creationRequest, ...existing } = snapshot.data()!;
      if (actor && creationRequest?.uid === actor.uid && creationRequest.digest === digest) return existing as PurchaseOrder;
      throw Object.assign(new Error('Nomor PO sudah digunakan untuk pesanan lain.'), { status: 409 });
    }
    transaction.create(ref, { ...po, ...(actor ? { creationRequest: { uid: actor.uid, digest } } : {}) });
    return po;
  });
}

export async function persistGoodsReceipt(poId: string, receipt: GoodsReceiptNote, actor: { uid: string; role: Role }) {
  const db = getFirestore(adminApp());
  return db.runTransaction(async transaction => {
    const ref = db.collection('purchaseOrders').doc(poId);
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) throw Object.assign(new Error('PO tidak ditemukan.'), { status: 404 });
    const current = { ...snapshot.data(), id: snapshot.id } as PurchaseOrder;
    let patch: Partial<PurchaseOrder>;
    try { patch = validatedReceiptPatch(current, receipt, actor.role); }
    catch (error) { throw Object.assign(error, { status: 422 }); }
    transaction.update(ref, { ...patch, receiptVerification: { version: 1, verifiedBy: actor.uid, verifiedAt: new Date().toISOString() } });
    return { status: patch.status, threeWayMatchStatus: patch.threeWayMatchStatus };
  });
}
