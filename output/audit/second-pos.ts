import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { checkoutSale, commerceStorageKey, inventoryStorageKey, readCommerce, deployCommerceStock, calculateSale } from '../../src/lib/commerce';
import { isInventoryList, stockHealth } from '../../src/lib/inventory';
import { canAccessMenu } from '../../src/lib/authorization';
import { poStorageKey } from '../../src/lib/procurement';
import { summarizePurchaseOrders } from '../../src/lib/workspaceSummary';

// Local source callbacks only. No browser, Firebase, or external request.
const data = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
  getItem: (key: string) => data.get(key) ?? null,
  setItem: (key: string, value: string) => data.set(key, value),
} });
const tree = ts.createSourceFile('useWorkspaceSummary.ts', fs.readFileSync('src/lib/useWorkspaceSummary.ts', 'utf8'), ts.ScriptTarget.Latest, true);
const hook = tree.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'useWorkspaceSummary');
assert.ok(hook);
const context = vm.createContext({ localStorage, useState: (initial: unknown) => [initial, () => {}], useEffect() {},
  canAccessMenu, poStorageKey, summarizePurchaseOrders, stockHealth, isInventoryList, commerceStorageKey, inventoryStorageKey, readCommerce });
vm.runInContext(ts.transpileModule(hook.getText(tree).replace('export ', '') + '\nglobalThis.summary = useWorkspaceSummary;', {
  compilerOptions: { target: ts.ScriptTarget.ES2022 },
}).outputText, context);

const findings: unknown[] = [];
data.set(poStorageKey(true, 'demo-owner'), '[null]');
assert.throws(() => context.summary(true, 'demo-owner', 'Super Admin'), /Cannot read properties of null.*status/);
assert.equal(data.get(poStorageKey(true, 'demo-owner')), '[null]');
data.delete(poStorageKey(true, 'demo-owner'));
data.set('inventora_hr_employees_v2', '[null]');
assert.equal(context.summary(true, 'demo-owner', 'HR Manager').totalHeadcount, 1);
data.delete('inventora_hr_employees_v2');
findings.push({ id: 'SUMMARY-CACHE-SCHEMA', severity: 'P2 conditional',
  trigger: 'A preexisting demo PO cache contains valid JSON [null]. Open Dashboard with a role allowed to view POs.',
  observed: 'Actual useWorkspaceSummary hook calls summarizePurchaseOrders and throws Cannot read properties of null (reading status).',
  impact: 'The parent Dashboard render fails before the Procurement recovery interface is reachable; module-level recovery is insufficient.',
  source: ['src/lib/useWorkspaceSummary.ts:36', 'src/lib/useWorkspaceSummary.ts:41', 'src/lib/workspaceSummary.ts:6', 'src/App.tsx:415'],
  related: 'The same generic array loader counts HR cache [null] as one employee although HR strict validation rejects it.',
  limitation: 'Requires already-invalid cached data. No ordinary UI input that creates [null] was established.' });

const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
let release!: () => Promise<void>;
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { locks: {
  request(_name: string, action: () => Promise<unknown>) {
    return new Promise((resolve, reject) => { release = async () => { try { resolve(await action()); } catch (error) { reject(error); } }; });
  },
} } });
try {
  data.set(inventoryStorageKey(), JSON.stringify([{ id: 'SKU-A', name: 'Audit server', stock: 5 }]));
  let sessionActive = true;
  const pending = deployCommerceStock('SKU-A', []);
  sessionActive = false;
  await release();
  await pending;
  assert.equal(readCommerce().inventory[0].stock, 4);
  assert.equal(sessionActive, false);
} finally {
  if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator);
  else Reflect.deleteProperty(globalThis, 'navigator');
}

assert.equal(isInventoryList([{ id: 'MIN-0', name: 'Minimum zero', stock: 5, stockMin: 0 }]), true);
assert.equal(stockHealth({ stock: 5, stockMin: 0 }).stockMin, 10);
assert.throws(() => calculateSale([{ sku: 'SKU-A', quantity: 1, unitPrice: 100, discountPercent: 100 }], 0), /Total/);

const report = { scope: 'Post-fix POS/inventory/summary source audit with in-memory storage and VM callback execution; no app source edits.', findings,
  observations: [
    { id: 'QUEUED-DISPATCH-LIFECYCLE', result: 'Reproduced but not classified as new confirmed bug',
      actual: 'Inventory dispatch waiting on a Web Lock still changes stock after the caller session has ended, unlike checkout now accepting AbortSignal.',
      source: ['src/components/InventoryView.tsx:160', 'src/lib/commerce.ts:138'],
      limitation: 'The dispatch was requested while session active; cancellation policy is a product decision. No Firebase auth bypass.' },
    { id: 'ZERO-MINIMUM', result: 'Configuration contract ambiguity',
      actual: 'isInventoryList accepts stockMin=0, stockHealth replaces it by10.',
      limitation: 'No UI edits stockMin and zero may intentionally mean use default. Do not count as confirmed without defining zero behavior.' },
    { id: 'FREE-SALE-DISCOUNT', result: 'UI/calculation contract ambiguity',
      actual: 'Discount input allows100 but calculateSale rejects a zero-total sale; invalid totals render as dashes and Complete sale is disabled.',
      limitation: 'Free-sale support is a business decision. No invalid sale was committed.' },
  ],
  passedReview: ['Demo/live storage separation remains wired through POS, Inventory, and summary.', 'Checkout validates current stock inside lock and supports abort on session end.', 'Invalid quantities/prices/payments do not commit.'] };
fs.mkdirSync('output/bug-audit', { recursive: true });
fs.writeFileSync('output/bug-audit/second-pos.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ verifiedFindings: findings.length, report: 'output/bug-audit/second-pos.json' }));
