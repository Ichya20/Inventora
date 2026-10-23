import test from 'node:test';
import assert from 'node:assert/strict';
import { canAccessMenu, canPerformPoAction, isRole } from '../src/lib/authorization';
import { assertPoTransition, normalizePurchaseOrder, paymentInfoFromTransaction, paymentTotals, poStorageKey } from '../src/lib/procurement';
import { acknowledgeMutation, readQueue } from '../src/lib/offlineQueue';
import { validateParsedInvoice } from '../src/lib/invoiceValidation';
import { historicalPayrollBreakdown } from '../src/lib/payrollHistory';
import { clearAllInventoraStorage, createInventoraBackup, saveStoredData } from '../src/lib/storageUtils';
import type { PaymentTransaction, PurchaseOrder } from '../src/types';
import type { QueuedMutation } from '../src/lib/useNetworkStatus';
import { addMonths, billingWindow, businessDate, monthLabel } from '../src/lib/businessDates';
import { assertPayrollAvailable, findPayrollRecord, payrollPeriodKey } from '../src/lib/payrollHistory';
import { summarizePurchaseOrders } from '../src/lib/workspaceSummary';
import { receiptOrderItems, validatedReceiptPatch } from '../src/lib/goodsReceipt';
import { notificationStorageKey, readNotifications, visibleNotifications } from '../src/lib/notificationStore';
import type { AppNotification, GoodsReceiptNote } from '../src/types';

function memoryStorage(entries: Record<string, string> = {}): Storage {
  return Object.assign(Object.create({
    getItem(key: string) { return Object.hasOwn(this, key) ? this[key] : null; },
    setItem(key: string, value: string) { this[key] = value; },
    removeItem(key: string) { delete this[key]; },
  }), entries);
}

const po: PurchaseOrder = { id: 'PO-1', vendor: 'PT Vendor Mandiri', desc: 'Server', date: '2026-10-20', total: 111000000, subtotal: 100000000, taxAmount: 11000000, status: 'Pending Approval', color: 'orange' };

test('business dates use Jakarta even before UTC midnight and month labels are localized', () => {
  assert.equal(businessDate(new Date('2026-10-20T18:30:00Z')), '2026-10-21');
  assert.equal(monthLabel('2026-10', 'id'), 'Oktober 2026');
  assert.throws(() => monthLabel('2026-13', 'en'));
});

test('payroll receipt lookup and duplicate protection are scoped to the selected employee and period', () => {
  const august = { empId: 'EMP-1', period: 'August 2026', disbursedAt: '2026-08-25T10:00:00Z', status: 'SUCCESS', netPay: 12345 };
  const october = { ...august, period: 'Oktober 2026', periodKey: '2026-10', disbursedAt: '2026-10-21T10:00:00Z', netPay: 67890 };
  assert.equal(payrollPeriodKey(august), '2026-08');
  assert.equal(payrollPeriodKey({ period: 'Agustus 2026' }), '2026-08');
  assert.equal(payrollPeriodKey({ period: 'Unknown period' }), null);
  assert.equal(findPayrollRecord([august, october], 'EMP-1', '2026-08')?.netPay, 12345);
  assert.equal(findPayrollRecord([august, october], 'EMP-1', '2026-10')?.netPay, 67890);
  assert.equal(findPayrollRecord([august], 'EMP-1', '2026-10'), undefined);
  assert.throws(() => assertPayrollAvailable([august], 'EMP-1', '2026-08'), /sudah tercatat/);
  assert.doesNotThrow(() => assertPayrollAvailable([august], 'EMP-1', '2026-10'));
  assert.doesNotThrow(() => assertPayrollAvailable([august], 'EMP-2', '2026-08'));
  assert.doesNotThrow(() => assertPayrollAvailable([{ ...august, status: 'SCHEDULED' }], 'EMP-1', '2026-08'));
});

test('billing boundaries retain the anchor across short months, leap years and annual rollover', () => {
  assert.equal(addMonths('2026-01-31', 1), '2026-02-28');
  assert.equal(addMonths('2026-01-31', 2), '2026-03-31');
  assert.deepEqual(billingWindow('2026-01-31', 'monthly', '2026-02-28'), { start: '2026-02-28', end: '2026-03-31', expired: false });
  assert.deepEqual(billingWindow('2024-02-29', 'annual', '2025-02-28'), { start: '2025-02-28', end: '2026-02-28', expired: false });
  assert.equal(addMonths('2024-02-29', 48), '2028-02-29');
  assert.deepEqual(billingWindow('2026-10-21', 'annual', '2027-10-20'), { start: '2026-10-21', end: '2027-10-21', expired: false });
  assert.deepEqual(billingWindow('2026-10-21', 'annual', '2027-10-21'), { start: '2027-10-21', end: '2028-10-21', expired: false });
});

test('paused billing retains its end date instead of silently renewing an expired cycle', () => {
  assert.deepEqual(billingWindow('2026-10-21', 'monthly', '2026-12-01', false), { start: '2026-10-21', end: '2026-11-21', expired: true });
});

test('dashboard distinguishes unavailable data from an empty registry and sums actual purchase records', () => {
  assert.equal(summarizePurchaseOrders(null).activePosCount, null);
  assert.deepEqual(summarizePurchaseOrders([]), { poValue: 0, activePosCount: 0, pendingApprovalsCount: 0 });
  assert.deepEqual(summarizePurchaseOrders([po, { ...po, id: '2', status: 'Selesai' }, { ...po, id: '3', status: 'Ditolak' }]), { poValue: 222000000, activePosCount: 1, pendingApprovalsCount: 1 });
});
const queued: QueuedMutation = { id: 'mutation-1', ownerId: 'user-1', type: 'APPROVE_PO', entityId: po.id, payload: { status: 'Disetujui' }, timestamp: '2026-10-20', description: 'Approve PO' };

test('unassigned accounts have no access and restricted roles cannot open other modules', () => {
  assert.equal(canAccessMenu(null, 'overview'), false);
  assert.equal(canAccessMenu('HR Manager', 'keuangan'), false);
  assert.equal(canAccessMenu('Warehouse Manager', 'purchase'), true);
  assert.equal(canAccessMenu('Super Admin', 'unknown'), false);
  assert.equal(canPerformPoAction('Warehouse Manager', 'pay'), false);
  assert.equal(canPerformPoAction('Finance Manager', 'receive'), false);
  assert.equal(isRole('Admin'), false);
});

test('a PO must be approved and physically received before payment, and cannot be paid twice', () => {
  assert.throws(() => assertPoTransition(po, 'Selesai', 'Super Admin', 'approval'));
  assert.throws(() => assertPoTransition(po, 'Barang Diterima', 'Warehouse Manager', 'receipt'));
  assert.throws(() => assertPoTransition(po, 'Disetujui', 'Warehouse Manager', 'approval'));
  assert.doesNotThrow(() => assertPoTransition(po, 'Disetujui', 'Finance Manager', 'approval'));
  const approved = { ...po, status: 'Disetujui' };
  assert.doesNotThrow(() => assertPoTransition(approved, 'Barang Diterima', 'Warehouse Manager', 'receipt'));
  assert.throws(() => assertPoTransition(approved, 'Selesai', 'Finance Manager', 'payment'));
  const received = { ...po, status: 'Barang Diterima', threeWayMatchStatus: 'MATCHED' as const };
  assert.doesNotThrow(() => assertPoTransition(received, 'Selesai', 'Finance Manager', 'payment'));
  assert.throws(() => assertPoTransition({ ...received, paymentInfo: {} as any }, 'Selesai', 'Super Admin', 'payment'));
  assert.throws(() => assertPoTransition({ ...received, status: 'Selesai' }, 'Barang Diterima', 'Super Admin', 'receipt'));
});

test('payment uses the final PO amount exactly once, including discount and withholding', () => {
  assert.equal(paymentTotals(po).totalPaid, 111000000);
  assert.equal(paymentTotals({ ...po, subtotal: 100000000, discountAmount: 10000000, taxAmount: 9900000, withholdingTaxAmount: 1350000, total: 98550000 }).totalPaid, 98550000);
  const { subtotal, taxAmount, ...legacy } = po;
  assert.deepEqual(paymentTotals(legacy), { amount: 111000000, taxAmount: 0, withholdingTaxAmount: 0, totalPaid: 111000000 });
  assert.throws(() => paymentTotals({ ...po, total: 123210000 }));
  assert.throws(() => paymentTotals({ ...po, total: NaN }));
});

test('legacy cloud payment fields migrate to the same receipt schema as local payments', () => {
  const migrated = normalizePurchaseOrder({ ...po, paymentInfo: { totalPaid: 111000000, receiptNumber: 'REC-1' } as any });
  assert.equal(migrated.paymentInfo?.receiptNo, 'REC-1');
  assert.equal(migrated.paymentInfo?.amount, 111000000);
  assert.equal('totalPaid' in migrated.paymentInfo!, false);
  const tx = { timestamp: '2026-10-20', methodLabel: 'BCA', id: 'TX-1', accountReference: '123', totalPaid: po.total, receiptNumber: 'REC-1' } as PaymentTransaction;
  assert.equal(paymentInfoFromTransaction(tx).receiptNo, 'REC-1');
  assert.notEqual(poStorageKey(true, 'user-1'), poStorageKey(false, 'user-1'));
  assert.notEqual(poStorageKey(false, 'user-1'), poStorageKey(false, 'user-2'));
});

test('failed offline replay keeps the mutation and successful replay acknowledges only that mutation', async () => {
  const storage = memoryStorage({ inventora_offline_queue: JSON.stringify([queued]) });
  await assert.rejects(acknowledgeMutation(storage, queued, async () => { throw Error('Permission denied'); }));
  assert.equal(readQueue(storage).length, 1);
  await acknowledgeMutation(storage, queued, async () => {
    storage.setItem('inventora_offline_queue', JSON.stringify([...readQueue(storage), { ...queued, id: 'mutation-2', ownerId: 'user-2' }]));
  });
  assert.deepEqual(readQueue(storage).map(item => item.id), ['mutation-2']);
  await assert.rejects(acknowledgeMutation(storage, { ...queued, ownerId: '' }, async () => assert.fail('Unowned legacy entries must not execute')));
});

test('damaged offline data is retained for recovery', () => {
  const storage = memoryStorage({ inventora_offline_queue: '{broken' });
  assert.throws(() => readQueue(storage));
  assert.equal(storage.getItem('inventora_offline_queue'), '{broken');
});

const invoice = { vendor: 'PT Vendor Mandiri', items: [{ name: 'Server', qty: 2, unitPrice: 500000, subtotal: 1000000 }], subtotal: 1000000, taxAmount: 110000, grandTotal: 1110000 };

test('invoice extraction requires internally consistent real line items and totals', () => {
  assert.deepEqual(validateParsedInvoice(invoice), invoice);
  assert.throws(() => validateParsedInvoice({ ...invoice, subtotal: 245000000, grandTotal: 1000000 }));
  assert.throws(() => validateParsedInvoice({ ...invoice, items: [{ ...invoice.items[0], qty: -1 }] }));
  assert.throws(() => validateParsedInvoice({ ...invoice, items: [] }));
  assert.throws(() => validateParsedInvoice({ ...invoice, vendor: '' }));
  assert.throws(() => validateParsedInvoice({ ...invoice, grandTotal: Infinity }));
});

test('payslip history preserves exact components and does not invent legacy splits', () => {
  const legacy = historicalPayrollBreakdown({ allowances: 6000000, bpjs: 1140000 });
  assert.equal(legacy.allowancesTotal, 6000000);
  assert.equal(legacy.bpjsTotal, 1140000);
  assert.equal(legacy.positionAllowance, 0);
  const exact = historicalPayrollBreakdown({ allowances: 6000000, bpjs: 1140000, positionAllowance: 4500000, transportAllowance: 1500000, bpjsKesehatan: 285000, bpjsKetenagakerjaan: 855000 });
  assert.equal(exact.positionAllowance, 4500000);
  assert.equal(exact.transportAllowance, 1500000);
  assert.equal(exact.allowancesTotal, undefined);
});

test('backup includes current HR, subscription and queue keys as structured data; reset clears data and preserves preferences', () => {
  const storage = memoryStorage({ inventora_hr_employees_v2: '[{"id":"EMP-1"}]', inventora_hr_payroll_history_v2: '[1]', inventora_subscription_invoices_v1: '[2]', inventora_po_transactions: '[3]', inventora_offline_queue: '[4]', inventora_rbac_matrix: '{}', inventora_language: 'id', inventora_theme: 'dark', unrelated: 'keep' });
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });
  const backup = createInventoraBackup();
  assert.deepEqual(backup.data.inventora_hr_employees_v2, [{ id: 'EMP-1' }]);
  assert.deepEqual(backup.data.inventora_subscription_invoices_v1, [2]);
  assert.deepEqual(backup.data.inventora_offline_queue, [4]);
  assert.equal(backup.data.inventora_language, 'id');
  assert.equal(backup.scope, 'browser-local');
  clearAllInventoraStorage();
  assert.equal(storage.getItem('inventora_hr_employees_v2'), null);
  assert.equal(storage.getItem('inventora_rbac_matrix'), null);
  assert.equal(storage.getItem('inventora_subscription_invoices_v1'), null);
  assert.equal(storage.getItem('inventora_language'), 'id');
  assert.equal(storage.getItem('inventora_theme'), 'dark');
  assert.equal(storage.getItem('unrelated'), 'keep');
});

test('critical local writes report storage failure instead of acknowledging success', () => {
  const warn = console.warn;
  console.warn = () => {};
  try {
    Object.defineProperty(globalThis, 'localStorage', { value: { setItem() { throw Error('Quota exceeded'); } }, configurable: true });
    assert.throws(() => saveStoredData('inventora_test', {}, true), /Quota exceeded/);
  } finally { console.warn = warn; }
});

const receiptPo: PurchaseOrder = { ...po, status: 'Disetujui', items: [{ id: 'line-1', sku: 'SERVER-1', name: 'Server', qty: 10, unitPrice: 10000000, subtotal: 100000000 }] };
const receipt: GoodsReceiptNote = {
  id: 'GRN-1', grnNumber: 'GRN-1', poId: po.id, receivedDate: '2026-10-22', receivedBy: 'Petugas Gudang', suratJalanNumber: 'SJ-1',
  items: [{ sku: 'SERVER-1', name: 'Server', orderedQty: 10, receivedQty: 10, condition: 'GOOD' }], status: 'MATCHED',
};

test('GRN rejects false match labels, missing lines, changed quantities and invalid conditions', () => {
  assert.equal(validatedReceiptPatch(receiptPo, receipt, 'Warehouse Manager').status, 'Barang Diterima');
  assert.throws(() => validatedReceiptPatch(receiptPo, { ...receipt, items: [{ ...receipt.items[0], receivedQty: 0, condition: 'SHORTAGE' }] }, 'Warehouse Manager'), /Status pencocokan/);
  assert.throws(() => validatedReceiptPatch(receiptPo, { ...receipt, items: [] }, 'Warehouse Manager'));
  for (const changed of [{ sku: 'WRONG' }, { orderedQty: 0, receivedQty: 0 }, { receivedQty: NaN }, { receivedQty: 1.5 }, { receivedQty: -1 }, { condition: 'UNKNOWN' }]) {
    assert.throws(() => validatedReceiptPatch(receiptPo, { ...receipt, items: [{ ...receipt.items[0], ...changed }] } as GoodsReceiptNote, 'Warehouse Manager'));
  }
  assert.throws(() => validatedReceiptPatch(receiptPo, receipt, 'Finance Manager'), /izin/);
  assert.throws(() => validatedReceiptPatch(receiptPo, { ...receipt, receivedBy: '' }, 'Warehouse Manager'));
});

test('GRN records shortage or damage as a discrepancy and never fabricates missing order quantities', () => {
  const short = { ...receipt, status: 'DISCREPANCY' as const, items: [{ ...receipt.items[0], receivedQty: 0 }] };
  assert.equal(validatedReceiptPatch(receiptPo, short, 'Warehouse Manager').status, 'Selisih Penerimaan');
  const damaged = { ...receipt, status: 'DISCREPANCY' as const, items: [{ ...receipt.items[0], condition: 'DAMAGED' as const }] };
  assert.equal(validatedReceiptPatch(receiptPo, damaged, 'Warehouse Manager').threeWayMatchStatus, 'DISCREPANCY');
  assert.throws(() => receiptOrderItems({ ...po, items: [] }), /belum lengkap/);
  assert.throws(() => receiptOrderItems({ ...po, items: 'broken' as any, lineItems: 'broken' as any }));
  assert.equal(receiptOrderItems(receiptPo)[0].receivedQty, 0);
});

test('legacy received orders can be reverified but verified or completed receipts cannot be rewritten', () => {
  assert.doesNotThrow(() => validatedReceiptPatch({ ...receiptPo, status: 'Barang Diterima' }, receipt, 'Warehouse Manager'));
  assert.throws(() => validatedReceiptPatch({ ...receiptPo, status: 'Barang Diterima', receiptVerification: { version: 1, verifiedBy: 'warehouse', verifiedAt: 'now' } }, receipt, 'Warehouse Manager'));
  assert.throws(() => validatedReceiptPatch({ ...receiptPo, status: 'Selesai' }, receipt, 'Warehouse Manager'));
});

test('notification storage isolates users, demo mode and roles without adopting unowned legacy data', () => {
  const key = notificationStorageKey(false, 'user-1', 'Finance Manager')!;
  const payment: AppNotification = { id: 'n1', type: 'payment', title: 'Payment', message: 'PO-1 Rp111000000', timestamp: 'now', read: false, metadata: { poId: 'PO-1', amount: 111000000 } };
  const storage = memoryStorage({ [key]: JSON.stringify([payment]), inventora_notifications: JSON.stringify([payment]) });
  assert.equal(readNotifications(storage, key, 'Finance Manager').length, 1);
  assert.equal(readNotifications(storage, notificationStorageKey(false, 'user-2', 'Finance Manager'), 'Finance Manager').length, 0);
  assert.equal(readNotifications(storage, notificationStorageKey(true, 'user-1', 'Finance Manager'), 'Finance Manager').length, 0);
  assert.equal(readNotifications(storage, notificationStorageKey(false, 'user-1', 'HR Manager'), 'HR Manager').length, 0);
  assert.deepEqual(visibleNotifications([payment], 'HR Manager'), []);
  assert.deepEqual(visibleNotifications([payment], null), []);
  assert.equal(notificationStorageKey(false, null, 'Finance Manager'), null);
});
