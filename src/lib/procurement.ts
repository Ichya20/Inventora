import type { PaymentTransaction, PurchaseOrder, Role } from '../types';
import { canPerformPoAction } from './authorization';

export function poStorageKey(demo: boolean, ownerId: string): string {
  return demo ? 'inventora_procurement_pos_v1' : `inventora_procurement_pos_v1:${ownerId}`;
}

export function paymentTotals(po: PurchaseOrder) {
  const total = po.total;
  const taxAmount = po.taxAmount ?? 0;
  const withholdingTaxAmount = po.withholdingTaxAmount ?? 0;
  if (![total, taxAmount, withholdingTaxAmount].every(n => Number.isFinite(n) && n >= 0)) {
    throw new Error('Invalid purchase order amounts');
  }
  // Legacy POs have only a final total. Never infer an additional tax charge.
  const amount = total - taxAmount + withholdingTaxAmount;
  if (amount < 0) throw new Error('Invalid purchase order tax breakdown');
  if (po.subtotal !== undefined && Math.abs(po.subtotal - (po.discountAmount ?? 0) - amount) > 1) {
    throw new Error('Purchase order total does not match its breakdown');
  }
  return { amount, taxAmount, withholdingTaxAmount, totalPaid: total };
}

export function normalizePurchaseOrder(po: PurchaseOrder): PurchaseOrder {
  if (!po.paymentInfo) return po;
  const legacy = po.paymentInfo as PurchaseOrder['paymentInfo'] & { totalPaid?: number; receiptNumber?: string };
  const { totalPaid, receiptNumber, ...paymentInfo } = legacy;
  return { ...po, paymentInfo: {
    ...paymentInfo,
    amount: paymentInfo.amount ?? totalPaid ?? po.total,
    receiptNo: paymentInfo.receiptNo ?? receiptNumber ?? '',
  } };
}

export function assertPoTransition(po: PurchaseOrder, nextStatus: string, role: Role | null, source: 'approval' | 'receipt' | 'payment') {
  const action = source === 'approval' ? 'approve' : source === 'receipt' ? 'receive' : 'pay';
  if (!canPerformPoAction(role, action)) throw new Error('Anda tidak memiliki izin untuk tindakan ini.');
  const valid = source === 'approval'
    ? po.status === 'Pending Approval' && ['Disetujui', 'Ditolak'].includes(nextStatus)
    : source === 'receipt'
      ? (['Disetujui', 'Selisih Penerimaan'].includes(po.status) || (po.status === 'Barang Diterima' && !po.receiptVerification && !po.paymentInfo))
        && ['Barang Diterima', 'Selisih Penerimaan'].includes(nextStatus)
      : po.status === 'Barang Diterima' && po.threeWayMatchStatus === 'MATCHED' && nextStatus === 'Selesai' && !po.paymentInfo;
  if (!valid) throw new Error('Perubahan status tidak valid. Gunakan persetujuan, penerimaan barang, lalu pembayaran sesuai urutan.');
}

export function paymentInfoFromTransaction(tx: PaymentTransaction): NonNullable<PurchaseOrder['paymentInfo']> {
  return {
    paidAt: tx.timestamp, method: tx.methodLabel, txId: tx.id,
    reference: tx.accountReference, accountOrCard: tx.accountReference,
    amount: tx.totalPaid, receiptNo: tx.receiptNumber, payerName: 'Inventora (simulasi)',
  };
}
