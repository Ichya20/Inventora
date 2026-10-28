import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateSale, checkoutSale, COMMERCE_KEY, readCommerce, deployCommerceStock } from '../src/lib/commerce';
import { canAccessMenu } from '../src/lib/authorization';
import { createSaleReceiptPdf, receiptHtml } from '../src/lib/saleReceipt';

function storage(stock = 5, failWrite = false) {
  const data: Record<string, string> = { inventora_inventory_v1: JSON.stringify([{ id: 'SKU-A', name: 'Server <A>', stock }, { id: 'SKU-B', name: 'Switch', stock: 4 }]) };
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem(key: string) { return data[key] ?? null; },
    setItem(key: string, value: string) { if (failWrite) throw new Error('Quota exceeded'); data[key] = value; },
  } });
  return data;
}
const input = () => ({ requestId: 'test-request-1', actorId: 'cashier', actorName: 'Kasir', role: 'Warehouse Manager' as const,
  lines: [{ sku: 'SKU-A', quantity: 2, unitPrice: 100000, discountPercent: 10 }], taxRate: 11, amountPaid: 200000 });

test('POS uses item discounts before VAT and keeps whole-rupiah totals', () => {
  const sale = calculateSale([...input().lines, { sku: 'SKU-B', quantity: 1, unitPrice: 333, discountPercent: 0 }], 11);
  assert.deepEqual({ subtotal: sale.subtotal, discount: sale.discount, tax: sale.tax, total: sale.total }, { subtotal: 200333, discount: 20000, tax: 19837, total: 200170 });
  for (const bad of [{ quantity: -1 }, { quantity: 1.5 }, { unitPrice: NaN }, { unitPrice: 1.5 }, { unitPrice: 0 }, { discountPercent: 101 }]) {
    assert.throws(() => calculateSale([{ ...input().lines[0], ...bad }], 0));
  }
  assert.throws(() => calculateSale([], 0));
  assert.throws(() => calculateSale([input().lines[0], input().lines[0]], 0));
  assert.throws(() => calculateSale(input().lines, 12));
});

test('cash checkout commits the sale, change, stock and movement in one snapshot', async () => {
  const data = storage(); const legacy = data.inventora_inventory_v1;
  const sale = await checkoutSale(input());
  assert.equal(sale.total, 199800); assert.equal(sale.change, 200); assert.equal(sale.method, 'cash');
  const state = readCommerce();
  assert.equal(state.inventory[0].stock, 3); assert.equal(state.inventory[1].stock, 4);
  assert.equal(state.sales[0].items[0].name, 'Server <A>'); assert.equal(state.sales.length, 1);
  assert.equal(state.movements[0].quantity, -2); assert.equal(state.movements[0].saleId, sale.id);
  assert.equal(data.inventora_inventory_v1, legacy);
});

test('duplicate submission is idempotent and conflicting reuse is rejected', async () => {
  storage();
  const first = await checkoutSale(input()); const again = await checkoutSale(input());
  assert.deepEqual(first, again); assert.equal(readCommerce().sales.length, 1); assert.equal(readCommerce().inventory[0].stock, 3);
  await assert.rejects(checkoutSale({ ...input(), amountPaid: 300000 }), /keranjang lain/);
});

test('underpayment, unavailable stock and write failure leave stock and sales unchanged', async () => {
  let data = storage();
  await assert.rejects(checkoutSale({ ...input(), amountPaid: 10 }), /belum mencukupi/);
  await assert.rejects(checkoutSale({ ...input(), lines: [{ ...input().lines[0], quantity: 6 }], amountPaid: 1000000 }), /Stok/);
  assert.equal(data[COMMERCE_KEY], undefined); assert.equal(readCommerce().inventory[0].stock, 5);
  data = storage(5, true);
  await assert.rejects(checkoutSale(input()), /Quota/);
  assert.equal(data[COMMERCE_KEY], undefined); assert.equal(readCommerce().sales.length, 0); assert.equal(readCommerce().inventory[0].stock, 5);
});

test('competing checkouts revalidate current stock and inventory deploy shares the same state', async () => {
  storage(2);
  const results = await Promise.allSettled([checkoutSale(input()), checkoutSale({ ...input(), requestId: 'second' })]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(readCommerce().inventory[0].stock, 0);
  const inventory = await deployCommerceStock('SKU-B', []);
  assert.equal(inventory[1].stock, 3); assert.equal(readCommerce().sales.length, 1); assert.equal(readCommerce().movements.length, 2);
});

test('POS roles and corrupt saved data are checked before mutation', async () => {
  const data = storage();
  for (const role of [null, 'HR Manager'] as const) {
    assert.equal(canAccessMenu(role, 'pos'), false);
    await assert.rejects(checkoutSale({ ...input(), role }), /izin kasir/);
  }
  assert.equal(canAccessMenu('Finance Manager', 'pos'), true);
  assert.equal(canAccessMenu('Super Admin', 'pos'), true);
  data[COMMERCE_KEY] = '{broken';
  await assert.rejects(checkoutSale(input())); assert.equal(data[COMMERCE_KEY], '{broken');
});

test('invalid saved receipts are preserved for recovery instead of silently starting an empty ledger', async () => {
  const data = storage(); await checkoutSale(input());
  const state = JSON.parse(data[COMMERCE_KEY]); state.sales[0].change = 900000;
  const raw = JSON.stringify(state); data[COMMERCE_KEY] = raw;
  assert.throws(() => readCommerce(), /tidak dapat dibaca/);
  await assert.rejects(checkoutSale({ ...input(), requestId: 'new-attempt' }));
  assert.equal(data[COMMERCE_KEY], raw);
});

test('receipt uses the committed transaction, escapes HTML and retains long item lists in PDF', async () => {
  storage();
  const sale = await checkoutSale(input());
  const html = receiptHtml({ ...sale, actorName: '<script>alert(1)</script>' }, 'id');
  assert.match(html, /Server &lt;A&gt;/); assert.doesNotMatch(html, /<script>/);
  assert.match(html, /Kembalian/); assert.match(html, /199.800/);
  const pdf = createSaleReceiptPdf({ ...sale, items: Array.from({ length: 100 }, (_, i) => ({ ...sale.items[0], name: `LINE-${i}-END`, sku: `SKU-${i}` })) }, 'id');
  assert.ok(pdf.getNumberOfPages() > 1); assert.match(pdf.output(), /LINE-99-END/); assert.match(pdf.output(), /Kembalian/);
});
