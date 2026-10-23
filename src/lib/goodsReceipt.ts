import type { GoodsReceiptItem, GoodsReceiptNote, PurchaseOrder, Role } from '../types';
import { assertPoTransition } from './procurement';

export function receiptOrderItems(po: PurchaseOrder): GoodsReceiptItem[] {
  const source = Array.isArray(po.items) && po.items.length ? po.items : po.lineItems;
  if (!Array.isArray(source) || !source.length) throw new Error('Rincian barang PO belum lengkap. Lengkapi PO sebelum mencatat penerimaan.');
  return source.map((item, index) => {
    const qty = item?.qty ?? item?.quantity;
    const name = item?.name ?? item?.desc;
    if (!Number.isSafeInteger(qty) || qty <= 0 || typeof name !== 'string' || !name.trim()) {
      throw new Error('Rincian barang PO tidak valid.');
    }
    return { sku: item.sku || `SKU-${index + 1}`, name, orderedQty: qty, receivedQty: 0, condition: 'GOOD', notes: '' };
  });
}

export function receiptMatchStatus(items: GoodsReceiptItem[]): 'MATCHED' | 'DISCREPANCY' {
  return items.length && items.every(item => item.receivedQty === item.orderedQty && ['GOOD', 'EXCELLENT'].includes(item.condition))
    ? 'MATCHED' : 'DISCREPANCY';
}

function requiredText(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim() || value.length > 500) throw new Error(`${label} wajib diisi dengan benar.`);
  return value.trim();
}

export function validatedReceiptPatch(po: PurchaseOrder, input: GoodsReceiptNote, role: Role | null): Partial<PurchaseOrder> {
  const expected = receiptOrderItems(po);
  if (!input || input.poId !== po.id || !Array.isArray(input.items) || input.items.length !== expected.length) {
    throw new Error('Daftar penerimaan harus sesuai dengan seluruh rincian PO.');
  }
  const items = expected.map((ordered, index) => {
    const received = input.items[index];
    if (!received || received.sku !== ordered.sku || received.name !== ordered.name || received.orderedQty !== ordered.orderedQty
      || !Number.isSafeInteger(received.receivedQty) || received.receivedQty < 0
      || !['GOOD', 'EXCELLENT', 'DAMAGED', 'SHORTAGE'].includes(received.condition)) {
      throw new Error('SKU, jumlah, atau kondisi barang tidak sesuai dengan PO.');
    }
    if (received.notes !== undefined && (typeof received.notes !== 'string' || received.notes.length > 2000)) throw new Error('Catatan barang tidak valid.');
    return { ...ordered, receivedQty: received.receivedQty, condition: received.condition, notes: received.notes || '' };
  });
  const matchStatus = receiptMatchStatus(items);
  if (input.status !== matchStatus) throw new Error('Status pencocokan tidak sesuai jumlah atau kondisi barang.');
  const status = matchStatus === 'MATCHED' ? 'Barang Diterima' : 'Selisih Penerimaan';
  assertPoTransition(po, status, role, 'receipt');
  if (typeof input.receivedDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(input.receivedDate)
    || Number.isNaN(Date.parse(input.receivedDate)) || new Date(input.receivedDate).toISOString().slice(0, 10) !== input.receivedDate) {
    throw new Error('Tanggal penerimaan tidak valid.');
  }
  if (input.inspectorNotes !== undefined && (typeof input.inspectorNotes !== 'string' || input.inspectorNotes.length > 4000)) throw new Error('Catatan pemeriksaan tidak valid.');
  return {
    status, color: matchStatus === 'MATCHED' ? 'green' : 'orange', threeWayMatchStatus: matchStatus,
    grn: {
      id: requiredText(input.id, 'ID GRN'), grnNumber: requiredText(input.grnNumber, 'Nomor GRN'), poId: po.id,
      receivedDate: input.receivedDate, receivedBy: requiredText(input.receivedBy, 'Petugas penerima'),
      suratJalanNumber: requiredText(input.suratJalanNumber, 'Nomor surat jalan'), items,
      status: matchStatus, inspectorNotes: input.inspectorNotes || '',
    },
  };
}
