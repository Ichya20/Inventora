import type { POLineItem, PurchaseOrder } from '../types';

const money = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= Number.MAX_SAFE_INTEGER;
function text(value: unknown, label: string, max = 500): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error(`${label} tidak valid.`);
  return value.trim();
}
function date(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value))
    || new Date(value).toISOString().slice(0, 10) !== value) throw new Error('Tanggal PO atau pengiriman tidak valid.');
  return value;
}

export function validatePurchaseOrderCreate(value: unknown): PurchaseOrder {
  const po = value as PurchaseOrder;
  if (!po || po.status !== 'Pending Approval' || po.paymentInfo || po.grn || po.receiptVerification) throw new Error('PO baru harus dimulai dari persetujuan dan belum memiliki penerimaan atau pembayaran.');
  const id = text(po.id, 'ID PO', 200);
  if (id.includes('/') || id === '.' || id === '..') throw new Error('ID PO tidak valid.');
  if (!Array.isArray(po.items) || !po.items.length || po.items.length > 200) throw new Error('Rincian PO harus berupa daftar berisi 1–200 barang.');
  const items: POLineItem[] = po.items.map((item, index) => {
    if (!item || !Number.isSafeInteger(item.qty) || item.qty <= 0 || !money(item.unitPrice) || !money(item.subtotal)
      || Math.abs(item.qty * item.unitPrice - item.subtotal) > 1) throw new Error('Jumlah, harga, atau subtotal barang tidak konsisten.');
    return { id: item.id ? text(item.id, 'ID barang', 200) : `line-${index + 1}`,
      sku: item.sku ? text(item.sku, 'SKU', 200) : `SKU-${index + 1}`, name: text(item.name, 'Nama barang'),
      qty: item.qty, unitPrice: item.unitPrice, subtotal: item.subtotal };
  });
  if (new Set(items.map(item => item.id)).size !== items.length) throw new Error('ID rincian barang tidak boleh berulang.');
  if (po.lineItems !== undefined && (!Array.isArray(po.lineItems) || po.lineItems.length !== items.length
    || po.lineItems.some((line, index) => !line || line.qty !== items[index].qty || typeof line.name !== 'string' || line.name.trim() !== items[index].name
      || line.unitPrice !== items[index].unitPrice))) throw new Error('Daftar barang PO saling bertentangan.');
  const { subtotal, total, discountAmount = 0, taxAmount = 0, withholdingTaxAmount = 0 } = po;
  if (![subtotal, total, discountAmount, taxAmount, withholdingTaxAmount].every(money) || subtotal <= 0 || total <= 0
    || discountAmount > subtotal || Math.abs(items.reduce((sum, item) => sum + item.subtotal, 0) - subtotal) > 1
    || Math.abs(subtotal - discountAmount + taxAmount - withholdingTaxAmount - total) > 1) throw new Error('Total PO tidak sesuai rincian barang, diskon, atau pajak.');
  return {
    id, vendor: text(po.vendor, 'Vendor'), desc: text(po.desc, 'Deskripsi', 2000), date: date(po.date), deliveryDate: date(po.deliveryDate),
    ...(po.notes !== undefined ? { notes: typeof po.notes === 'string' && !po.notes.trim() ? '' : text(po.notes, 'Catatan PO', 10000) } : {}),
    items, lineItems: items.map(item => ({ ...item, totalPrice: item.subtotal })), subtotal, total, discountAmount, taxAmount, withholdingTaxAmount,
    status: 'Pending Approval', color: 'orange', threeWayMatchStatus: 'PENDING_RECEIPT',
    ...(typeof po.department === 'string' ? { department: text(po.department, 'Departemen', 100) as PurchaseOrder['department'] } : {}),
  };
}
