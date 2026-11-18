import type { PurchaseOrder } from '../types';

// Cache checks retain legacy fields; creation and workflow mutations use stricter validators.
export function isCachedOrder(value: unknown): value is PurchaseOrder {
  const po = value as PurchaseOrder;
  return !!po && typeof po === 'object' && !Array.isArray(po)
    && ['id', 'vendor', 'desc', 'date', 'status', 'color'].every(key => typeof po[key] === 'string')
    && !!po.id && Number.isFinite(po.total) && po.total >= 0 && po.total <= Number.MAX_SAFE_INTEGER
    && ['notes', 'department', 'deliveryDate', 'threeWayMatchStatus'].every(key => po[key] === undefined || typeof po[key] === 'string')
    && (po.grn === undefined || (!!po.grn && typeof po.grn === 'object' && !Array.isArray(po.grn)
      && ['grnNumber', 'suratJalanNumber', 'receivedBy', 'inspectorNotes'].every(key => po.grn![key] === undefined || typeof po.grn![key] === 'string')))
    && (po.paymentInfo === undefined || (!!po.paymentInfo && typeof po.paymentInfo === 'object' && !Array.isArray(po.paymentInfo)
      && ['paidAt', 'method', 'txId', 'reference', 'accountOrCard', 'receiptNo', 'receiptNumber', 'payerName'].every(key => po.paymentInfo![key] === undefined || typeof po.paymentInfo![key] === 'string')
      && ['amount', 'totalPaid'].every(key => po.paymentInfo![key] === undefined || (Number.isFinite(po.paymentInfo![key]) && po.paymentInfo![key] >= 0))));
}
