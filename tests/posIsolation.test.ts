import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { checkoutSale, commerceStorageKey, inventoryStorageKey, readCommerce, deployCommerceStock } from '../src/lib/commerce';
import { isInventoryList, stockHealth } from '../src/lib/inventory';
import { canAccessMenu } from '../src/lib/authorization';
import { poStorageKey } from '../src/lib/procurement';
import { isSummaryOrderList, summarizePurchaseOrders } from '../src/lib/workspaceSummary';
import { HR_EMPLOYEES_KEY, readHrEmployees } from '../src/lib/hrValidation';

function memoryStorage(initial: Record<string, string> = {}, failWrite = false) {
  const data = { ...initial };
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => data[key] ?? null,
    setItem(key: string, value: string) { if (failWrite) throw new Error('Storage full'); data[key] = value; },
  } });
  return data;
}
const inventory = (stock: number) => [{ id: 'SKU-A', name: 'Audit server', stock }];
const input = (isDemo = false) => ({ requestId: 'same-request', actorId: isDemo ? 'demo-cashier' : 'cashier', actorName: 'Cashier',
  role: 'Warehouse Manager' as const, lines: [{ sku: 'SKU-A', quantity: 1, unitPrice: 1000, discountPercent: 0 }], taxRate: 0, amountPaid: 1000, isDemo });

test('demo checkout and warehouse dispatch never alter live stock, receipts or legacy bytes', async () => {
  const data = memoryStorage({ [inventoryStorageKey()]: JSON.stringify(inventory(5)), [inventoryStorageKey(true)]: JSON.stringify(inventory(8)) });
  const originalLegacy = data[inventoryStorageKey()];
  const liveSale = await checkoutSale(input());
  const liveRaw = data[commerceStorageKey()];
  const demoSale = await checkoutSale(input(true));
  assert.equal(readCommerce().inventory[0].stock, 4);
  assert.equal(readCommerce(undefined, true).inventory[0].stock, 7);
  assert.deepEqual(readCommerce().sales.map(sale => sale.actorId), [liveSale.actorId]);
  assert.deepEqual(readCommerce(undefined, true).sales.map(sale => sale.actorId), [demoSale.actorId]);
  await deployCommerceStock('SKU-A', [], true);
  assert.equal(readCommerce(undefined, true).inventory[0].stock, 6);
  assert.equal(readCommerce(undefined, true).movements.length, 2);
  assert.equal(data[commerceStorageKey()], liveRaw);
  assert.equal(data[inventoryStorageKey()], originalLegacy);
});

test('new demo workspace does not adopt unscoped live or damaged legacy records', () => {
  const data = memoryStorage({ [commerceStorageKey()]: '{recoverable-live-ledger', [inventoryStorageKey()]: '{recoverable-live-inventory' });
  const before = { ...data };
  const demo = readCommerce(undefined, true);
  assert.equal(demo.sales.length, 0);
  assert.ok(demo.inventory.length > 0);
  assert.deepEqual(data, before);
  assert.throws(() => readCommerce());
});

test('cached invalid prices fail recoverably while legacy unpriced products remain supported', async () => {
  for (const isDemo of [false, true]) {
    for (const unitPrice of ['abc', -1, 0.5, { unexpected: true }]) {
      const raw = JSON.stringify([{ ...inventory(5)[0], unitPrice }]);
      const key = inventoryStorageKey(isDemo);
      const data = memoryStorage({ [key]: raw });
      assert.throws(() => readCommerce(undefined, isDemo), /Inventori/);
      await assert.rejects(checkoutSale(input(isDemo)));
      assert.equal(data[key], raw);
      assert.equal(data[commerceStorageKey(isDemo)], undefined);
    }
    memoryStorage({ [inventoryStorageKey(isDemo)]: JSON.stringify(inventory(5)) });
    await checkoutSale(input(isDemo));
    assert.equal(readCommerce(undefined, isDemo).inventory[0].unitPrice, 1000);
  }
});

test('checkout queued behind a browser lock is cancelled when its cashier session ends', async () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  let release!: () => Promise<unknown>;
  const requested: string[] = [];
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { locks: {
    request(name: string, action: () => Promise<unknown>) {
      requested.push(name);
      return new Promise((resolve, reject) => { release = async () => { try { resolve(await action()); } catch (error) { reject(error); } }; });
    },
  } } });
  try {
    const data = memoryStorage({ [inventoryStorageKey(true)]: JSON.stringify(inventory(5)) });
    const before = { ...data };
    const session = new AbortController();
    const pending = checkoutSale({ ...input(true), signal: session.signal });
    session.abort();
    await release();
    await assert.rejects(pending, /Sesi kasir berubah/);
    assert.deepEqual(requested, ['inventora-commerce:demo']);
    assert.deepEqual(data, before);
  } finally { if (previous) Object.defineProperty(globalThis, 'navigator', previous); else delete (globalThis as any).navigator; }
});

test('demo rejects unauthorized checkout and preserves records when storage writes fail', async () => {
  let data = memoryStorage({ [inventoryStorageKey(true)]: JSON.stringify(inventory(5)) });
  await assert.rejects(checkoutSale({ ...input(true), role: 'User' }), /izin kasir/);
  assert.equal(data[commerceStorageKey(true)], undefined);
  data = memoryStorage({ [inventoryStorageKey(true)]: JSON.stringify(inventory(5)) }, true);
  await assert.rejects(checkoutSale(input(true)), /Storage full/);
  assert.equal(data[commerceStorageKey(true)], undefined);
  assert.equal(readCommerce(undefined, true).inventory[0].stock, 5);
});

test('workspace dashboard reads inventory from the active demo/live scope', () => {
  memoryStorage({ [inventoryStorageKey()]: JSON.stringify(inventory(4)), [inventoryStorageKey(true)]: JSON.stringify(inventory(7)) });
  const tree = ts.createSourceFile('useWorkspaceSummary.ts', fs.readFileSync('src/lib/useWorkspaceSummary.ts', 'utf8'), ts.ScriptTarget.Latest, true);
  const fn = tree.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'useWorkspaceSummary');
  assert.ok(fn);
  const context = vm.createContext({ localStorage, useState: (initial: unknown) => [initial, () => {}], useEffect() {},
    canAccessMenu, poStorageKey, summarizePurchaseOrders, isSummaryOrderList, HR_EMPLOYEES_KEY, readHrEmployees,
    stockHealth, isInventoryList, commerceStorageKey, inventoryStorageKey, readCommerce });
  vm.runInContext(ts.transpileModule(fn.getText(tree).replace('export ', '') + '\nglobalThis.summary = useWorkspaceSummary;', {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText, context);
  assert.equal(context.summary(false, 'cashier', 'Warehouse Manager').inventory[0].stock, 4);
  assert.equal(context.summary(true, 'cashier', 'Warehouse Manager').inventory[0].stock, 7);
});

test('POS and inventory screen initializers load the requested mode and retain corrupt demo data', () => {
  const data = memoryStorage({ [inventoryStorageKey()]: JSON.stringify(inventory(4)), [inventoryStorageKey(true)]: JSON.stringify(inventory(7)) });
  for (const [file, binding, field] of [
    ['src/components/PosView.tsx', 'source', 'data'],
    ['src/components/InventoryView.tsx', 'inventoryState', 'items'],
  ]) {
    const tree = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    let callback: ts.Expression | undefined;
    const visit = (node: ts.Node) => {
      if (ts.isVariableDeclaration(node) && ts.isArrayBindingPattern(node.name)
        && node.name.elements[0]?.getText(tree) === binding && node.initializer && ts.isCallExpression(node.initializer)) callback = node.initializer.arguments[0];
      ts.forEachChild(node, visit);
    };
    visit(tree);
    assert.ok(callback);
    const context = vm.createContext({ isDemo: true, defaultItems: inventory(9), readCommerce, isInventoryList });
    vm.runInContext(ts.transpileModule(`globalThis.load = (${callback.getText(tree)});`, {
      compilerOptions: { target: ts.ScriptTarget.ES2022 },
    }).outputText, context);
    const loaded = context.load();
    assert.equal(field === 'data' ? loaded.data.inventory[0].stock : loaded.items[0].stock, 7);
    data[commerceStorageKey(true)] = '{retain-broken-demo';
    assert.ok(context.load().error);
    assert.equal(data[commerceStorageKey(true)], '{retain-broken-demo');
    delete data[commerceStorageKey(true)];
    assert.equal(readCommerce().inventory[0].stock, 4);
  }
});
