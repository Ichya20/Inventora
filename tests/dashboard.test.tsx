import React from 'react';
import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildWorkflow, recentOrders } from '../src/lib/dashboard';
import { OverviewView } from '../src/components/OverviewView';
import { ProcurementOverview } from '../src/components/ProcurementOverview';
import { PurchaseOrderDrawer } from '../src/components/PurchaseOrderDrawer';
import { translations } from '../src/i18n';
import type { PurchaseOrder, Role } from '../src/types';

const order = (id: string, status: string, date = '2026-10-23'): PurchaseOrder => ({ id, status, date, vendor: 'Vendor', desc: 'Barang', total: 125000, color: 'blue' });

test('workflow accounts for receipt discrepancies and preserves unrecognized statuses', () => {
  const input = [order('1', 'Pending Approval'), order('2', 'Barang Diterima'), order('3', 'Selisih Penerimaan'), order('4', 'Selesai'), order('5', 'Ditolak'), order('6', 'Migrated')];
  const result = buildWorkflow(input);
  assert.equal(result.stages.find(item => item.key === 'receipt')?.count, 2);
  assert.equal(result.stages.find(item => item.key === 'completed')?.count, 1);
  assert.equal(result.other, 1);
  assert.equal(result.stages.reduce((sum, item) => sum + item.count, result.other), input.length);
});

test('latest order filtering uses dates without changing the source order', () => {
  const input = [order('old', 'Pending Approval', '2026-10-01'), order('complete', 'Selesai', '2026-10-23'), order('new', 'Pending Approval', '2026-10-22')];
  assert.deepEqual(recentOrders(input, 'approval').map(item => item.id), ['new', 'old']);
  assert.deepEqual(input.map(item => item.id), ['old', 'complete', 'new']);
  assert.deepEqual(recentOrders(input, 'delivery'), []);
});

const summary = { orders: null, inventory: null, poValue: null, activePosCount: null, pendingApprovalsCount: null, lowStockCount: null, totalHeadcount: null, infrastructureUnits: null };
function render(role: Role, data = summary) {
  return renderToStaticMarkup(<OverviewView role={role} summary={data} onNavigate={() => {}} lang="id" t={translations.id} isDemo notifications={[]}/>);
}

test('dashboard preserves unavailable vs recorded zero and explains browser data sources', () => {
  const unavailable = render('Super Admin');
  assert.ok(unavailable.includes('Data belum tersedia'));
  assert.ok(unavailable.includes('—'));
  assert.ok(unavailable.includes('tersimpan di browser ini'));
  const loaded = render('Super Admin', { ...summary, orders: [], inventory: [], poValue: 0, activePosCount: 0, pendingApprovalsCount: 0, lowStockCount: 0 });
  assert.ok(loaded.includes('Belum ada PO pada tahap ini'));
  assert.ok(loaded.includes('Belum ada barang tercatat'));
  assert.ok(loaded.includes('Rp'));
});

test('HR overview does not expose purchase orders, stock details, or purchase actions', () => {
  const html = render('HR Manager', { ...summary, orders: [{ ...order('PO-PRIVATE', 'Selesai'), vendor: 'Restricted vendor' }] });
  assert.ok(html.includes('Direktori tim'));
  for (const restricted of ['Buat pesanan', 'Posisi purchase order', 'Pantauan stok', 'Nilai PO tercatat', 'PO-PRIVATE', 'Restricted vendor']) assert.ok(!html.includes(restricted), restricted);
});

test('other status filter includes only unmapped orders and leaves receipt discrepancies in receipt review', () => {
  const input = [order('legacy', 'Archived'), order('receipt', 'Selisih Penerimaan'), order('approved', 'Disetujui')];
  assert.deepEqual(recentOrders(input, 'other').map(item => item.id), ['legacy']);
  assert.deepEqual(recentOrders(input, 'receipt').map(item => item.id), ['receipt']);
  assert.equal(recentOrders(input, 'all').length, 3);
});

test('distribution publishes exact counts and percentages for all recorded statuses', () => {
  const input = [order('PO-1', 'Pending Approval'), order('PO-2', 'Pending Approval'), order('PO-3', 'Selesai'), order('PO-4', 'Archived')];
  const html = renderToStaticMarkup(<ProcurementOverview orders={input} lang="id" onNavigate={() => {}} />);
  assert.ok(html.includes('Persetujuan: 2 PO (50%)'));
  assert.ok(html.includes('Selesai: 1 PO (25%)'));
  assert.ok(html.includes('Status lain: 1 PO (25%)'));
  assert.ok(html.includes('role="tablist"'));
  assert.ok(html.includes('role="tabpanel"'));
  assert.ok(html.includes('aria-haspopup="dialog"'));
});

test('PO drawer preserves item prices, deductions, recorded payment and multiline instructions', () => {
  const po: PurchaseOrder = {
    ...order('PO-DETAIL', 'Selesai'), total: 261600, subtotal: 250000, discountAmount: 10000, taxAmount: 26400, withholdingTaxAmount: 4800,
    items: [{ id: '1', name: 'Network adapter', sku: 'NET-1', qty: 2, unitPrice: 125000, subtotal: 250000 }],
    notes: 'Periksa nomor seri.\nSimpan kemasan.',
    paymentInfo: { paidAt: '2026-10-22T18:30:00Z', method: 'Transfer bank', txId: 'TX-DETAIL', reference: 'REF-DETAIL', amount: 261600, accountOrCard: 'ACCOUNT-PRIVATE', receiptNo: 'RCPT-DETAIL', payerName: 'Inventora' },
  };
  const html = renderToStaticMarkup(<PurchaseOrderDrawer order={po} lang="id" onClose={() => {}} onNavigate={() => {}} />);
  for (const value of ['PO-DETAIL', 'Network adapter', 'NET-1', '125.000', '250.000', '261.600', '26.400', '4.800', '10.000', 'RCPT-DETAIL', 'Periksa nomor seri.\nSimpan kemasan.', '23 Okt 2026']) assert.ok(html.includes(value), value);
  assert.ok(!html.includes('ACCOUNT-PRIVATE'));
});

test('legacy PO details show saved lines and never invent missing tax or item amounts', () => {
  const po = { ...order('PO-LEGACY', 'Disetujui'), lineItems: [{ desc: 'Legacy item', quantity: 3, unitPrice: 50000, totalPrice: 150000 }], total: 150000 };
  const html = renderToStaticMarkup(<PurchaseOrderDrawer order={po} lang="en" onClose={() => {}} onNavigate={() => {}} />);
  for (const value of ['Legacy item', '50,000', '150,000']) assert.ok(html.includes(value), value);
  assert.ok(!html.includes('Withholding tax'));
  assert.ok(!html.includes('Discount'));
  assert.ok(!html.includes('VAT'));
  const missing = renderToStaticMarkup(<PurchaseOrderDrawer order={order('PO-EMPTY', 'Pending Approval')} lang="en" onClose={() => {}} onNavigate={() => {}} />);
  assert.ok(missing.includes('No item details have been saved'));
  assert.ok(missing.includes('125,000'));
});
