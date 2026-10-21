import { doc, runTransaction } from 'firebase/firestore';
import type { PurchaseOrder } from '../types';
import { isRole } from './authorization';
import { assertPoTransition, paymentTotals } from './procurement';
import type { QueuedMutation } from './useNetworkStatus';

export async function persistPoTransition(id: string, patch: Partial<PurchaseOrder>, source: 'approval' | 'receipt' | 'payment', mutationId?: string, ownerId?: string) {
  const { auth, db } = await import('../firebase');
  const user = auth.currentUser;
  if (!user || (ownerId && ownerId !== user.uid)) throw new Error('Sesi pengguna telah berubah. Masuk kembali untuk menyinkronkan.');
  const { claims } = await user.getIdTokenResult();
  const role = isRole(claims.role) ? claims.role : null;
  await runTransaction(db, async transaction => {
    const ref = doc(db, 'purchaseOrders', id);
    const snapshot = await transaction.get(ref);
    if (auth.currentUser?.uid !== user.uid) throw new Error('Sesi pengguna berubah saat menyimpan.');
    if (!snapshot.exists()) throw new Error('PO tidak ditemukan di server.');
    const current = snapshot.data() as PurchaseOrder & { lastMutationId?: string };
    if (mutationId && current.lastMutationId === mutationId) return;
    assertPoTransition(current, patch.status, role, source);
    if (source === 'payment' && patch.paymentInfo?.amount !== paymentTotals(current).totalPaid) {
      throw new Error('Nominal pembayaran berbeda dengan PO terbaru. Muat ulang PO.');
    }
    transaction.update(ref, { ...patch, ...(mutationId ? { lastMutationId: mutationId } : {}) });
  });
}

export async function replayPoMutation(item: QueuedMutation) {
  if (item.type !== 'APPROVE_PO' && item.type !== 'REJECT_PO') {
    throw new Error('Jenis antrean lama belum didukung. Data tetap disimpan untuk pemulihan.');
  }
  const status = item.type === 'APPROVE_PO' ? 'Disetujui' : 'Ditolak';
  await persistPoTransition(item.entityId, { status, color: status === 'Disetujui' ? 'green' : 'red' }, 'approval', item.id, item.ownerId);
}
