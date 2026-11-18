import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { COMMERCE_KEY, checkoutSale, readCommerce } from '../../src/lib/commerce';
import { isInventoryList } from '../../src/lib/inventory';

// Isolated audit: no browser, network, Firebase, credentials, or disk storage data.
const values = new Map<string, string>();
const descriptors = new Map(['localStorage', 'navigator', 'window'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
const storage = {
  getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => { values.set(key, value); },
};
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {} });
Object.defineProperty(globalThis, 'window', { configurable: true, value: undefined });
const seed = (unitPrice: unknown = 100000) => {
  values.clear();
  values.set('inventora_inventory_v1', JSON.stringify([{ id: 'SKU-A', name: 'Audit product', stock: 5, unitPrice }]));
};
const input = (requestId: string, actorId: string, actorName = actorId) => ({
  requestId, actorId, actorName, role: 'Warehouse Manager' as const,
  lines: [{ sku: 'SKU-A', quantity: 1, unitPrice: 100000, discountPercent: 0 }],
  taxRate: 0, amountPaid: 100000,
});
const checks: Record<string, unknown>[] = [];

try {
  seed();
  await checkoutSale(input('audit-live', 'live-staff-uid', 'Live staff'));
  const beforeDemo = readCommerce();
  await checkoutSale(input('audit-demo', 'warehouse.manager@inventora.com', 'Demo warehouse manager'));
  const afterDemo = readCommerce();
  assert.equal(beforeDemo.inventory[0].stock, 4);
  assert.equal(afterDemo.inventory[0].stock, 3);
  assert.deepEqual(afterDemo.sales.map(sale => sale.actorId), ['live-staff-uid', 'warehouse.manager@inventora.com']);
  checks.push({
    id: 'demo-live-commerce-mixing', result: 'reproduced', storageKey: COMMERCE_KEY,
    stockAfterLiveSale: 4, stockAfterDemoSale: 3,
    visibleSaleActors: afterDemo.sales.map(sale => sale.actorId),
    sourceWiring: 'App.tsx passes both demo/live identities to the same PosView and no mode/scope; commerce uses one fixed key.',
    limitation: 'Demonstrates storage behavior plus source wiring; no actual browser or Firebase session used. Shared data between live coworkers alone may be intentional.',
  });

  seed();
  let releaseLock: (() => void) | undefined;
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {
    locks: { request: (_name: string, action: () => unknown) => new Promise(resolve => {
      releaseLock = () => resolve(action());
    }) },
  } });
  let currentActor: string | null = 'live-staff-uid';
  const pending = checkoutSale(input('audit-queued', currentActor));
  assert.ok(releaseLock, 'checkout must have queued on the mocked Web Lock');
  currentActor = null; // Simulates logout while the same document is alive.
  releaseLock!();
  const completed = await pending;
  assert.equal(currentActor, null);
  assert.equal(readCommerce().inventory[0].stock, 4);
  assert.equal(completed.actorId, 'live-staff-uid');
  checks.push({
    id: 'queued-checkout-after-session-change', result: 'reproduced',
    sessionAtCommit: currentActor, committedActor: completed.actorId, stockAfterCommit: 4,
    limitation: 'A checkout accepted before logout continues after a queued Web Lock. Whether cancellation is required is a product decision; this is browser-local state, not a Firebase authorization bypass.',
  });
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {} });

  for (const price of ['abc', -1, { unexpected: true }]) {
    seed(price);
    assert.equal(isInventoryList(JSON.parse(storage.getItem('inventora_inventory_v1')!)), true);
    const loaded = readCommerce();
    assert.deepEqual(loaded.inventory[0].unitPrice, price);
    await assert.rejects(checkoutSale({
      ...input('audit-invalid-price', 'live-staff-uid'),
      lines: [{ sku: 'SKU-A', quantity: 1, unitPrice: price as number, discountPercent: 0 }],
    }), /Harga satuan/);
  }
  checks.push({
    id: 'invalid-persisted-unit-price', result: 'reproduced',
    acceptedPrices: ['abc', -1, { unexpected: true }], checkoutRejectsInvalidPrice: true,
    limitation: 'Requires a malformed preexisting/imported/cache record; standard checkout writes valid integer prices. No incorrect sale committed.',
  });

  seed();
  for (const quantity of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    await assert.rejects(checkoutSale({ ...input(`qty-${quantity}`, 'live-staff-uid'),
      lines: [{ sku: 'SKU-A', quantity, unitPrice: 100000, discountPercent: 0 }],
    }));
  }
  await assert.rejects(checkoutSale({ ...input('audit-insufficient', 'live-staff-uid'), amountPaid: 99999 }), /mencukupi/);
  await assert.rejects(checkoutSale({ ...input('audit-stock', 'live-staff-uid'),
    lines: [{ sku: 'SKU-A', quantity: 6, unitPrice: 100000, discountPercent: 0 }], amountPaid: 600000,
  }), /Stok/);
  await assert.rejects(checkoutSale({ ...input('audit-user', 'ordinary-user'), role: 'User' }), /izin kasir/);
  assert.equal(readCommerce().inventory[0].stock, 5);
  assert.equal(readCommerce().sales.length, 0);
  checks.push({ id: 'pos-invalid-input-and-stock-guards', result: 'passed',
    rejected: ['zero/negative/fractional/unsafe quantity', 'insufficient payment', 'insufficient stock', 'ordinary User role'],
    stateUnchanged: true,
  });

  const report = { auditedAt: new Date().toISOString(), approach: 'Isolated in-memory TypeScript probes plus source review; no browser/network/Firebase access.', checks };
  await mkdir('output/bug-audit', { recursive: true });
  await writeFile('output/bug-audit/pos-storage.json', JSON.stringify(report, null, 2) + '\n');
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
} finally {
  for (const [key, descriptor] of descriptors) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else Reflect.deleteProperty(globalThis, key);
  }
}
