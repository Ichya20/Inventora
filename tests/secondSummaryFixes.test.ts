import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { isSummaryOrderList, summarizePurchaseOrders } from '../src/lib/workspaceSummary';
import { canAccessMenu } from '../src/lib/authorization';
import { HR_EMPLOYEES_KEY, readHrEmployees } from '../src/lib/hrValidation';
import { poStorageKey } from '../src/lib/procurement';
import { stockHealth, isInventoryList } from '../src/lib/inventory';
import { commerceStorageKey, inventoryStorageKey, readCommerce } from '../src/lib/commerce';
import { acknowledgeMutation, isOwnedQueuedMutation, readQueue } from '../src/lib/offlineQueue';
import { notificationStorageKey, readNotifications, visibleNotifications } from '../src/lib/notificationStore';
import type { QueuedMutation } from '../src/lib/useNetworkStatus';

const queueKey = 'inventora_offline_queue';
function memory(initial: Record<string, string> = {}) {
  const data = { ...initial };
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => data[key] ?? null,
    setItem: (key: string, value: string) => { data[key] = value; },
  } });
  return data;
}
function hookRunner(file: string, name: string, bindings: Record<string, unknown>) {
  const tree = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const fn = tree.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name)!;
  assert.ok(fn, name);
  const state: unknown[] = [], refs: { current: any }[] = [];
  let stateIndex = 0, refIndex = 0;
  let effects: (() => unknown)[] = [];
  const context = vm.createContext({ ...bindings,
    useState(initial: unknown) {
      const index = stateIndex++;
      if (!(index in state)) state[index] = typeof initial === 'function' ? initial() : initial;
      return [state[index], (value: any) => { state[index] = typeof value === 'function' ? value(state[index]) : value; }];
    },
    useRef(initial: unknown) { return refs[refIndex++] ??= { current: initial }; },
    useEffect(effect: () => unknown) { effects.push(effect); },
    useCallback(callback: unknown) { return callback; },
  });
  vm.runInContext(ts.transpileModule(fn.getText(tree).replace('export ', '') + `\nglobalThis.renderHook = ${name};`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText, context);
  return {
    context,
    render(...args: unknown[]) { stateIndex = 0; refIndex = 0; effects = []; return context.renderHook(...args); },
    effect(containing: string) { const effect = effects.find(item => item.toString().includes(containing)); assert.ok(effect, containing); return effect; },
    state,
  };
}
const order = { id: 'PO-1', vendor: 'Vendor', desc: 'Goods', date: '2026-11-18', status: 'Pending Approval', color: 'orange', total: 1000 };
test('notifications remain usable in memory when access to the storage object itself is denied', () => {
  const hook = hookRunner('src/lib/useNotifications.ts', 'useNotifications', {
    notificationStorageKey, readNotifications, visibleNotifications, crypto,
  });
  Object.defineProperty(hook.context, 'localStorage', { get() { throw new Error('SecurityError: storage blocked'); } });
  hook.render(false, 'A', 'Finance Manager');
  assert.doesNotThrow(() => hook.effect('removeItem')());
  let current = hook.render(false, 'A', 'Finance Manager');
  current.notify({ type: 'payment', title: 'Payment saved', message: 'PO-A' });
  current = hook.render(false, 'A', 'Finance Manager');
  assert.equal(current.notifications.length, 1);
  current.markAllAsRead();
  assert.equal(hook.render(false, 'A', 'Finance Manager').notifications[0].read, true);
  // Account B may receive an event before its storage-reading effect has run.
  current = hook.render(false, 'B', 'Finance Manager');
  assert.equal(current.notifications.length, 0);
  assert.doesNotThrow(() => current.notify({ type: 'payment', title: 'Other payment', message: 'PO-B' }));
  current = hook.render(false, 'B', 'Finance Manager');
  assert.equal(current.notifications.length, 1);
  assert.equal(current.notifications[0].message, 'PO-B');
  current.clearAll();
  assert.equal(hook.render(false, 'B', 'Finance Manager').notifications.length, 0);
});
const employee = { id: 'EMP-1', name: 'Employee', email: 'e@example.test', dept: 'IT', role: 'Staff', status: 'Active', color: 'green', joined: '2026-11-01',
  salary: { baseSalary: 1, positionAllowance: 0, transportAllowance: 0, bonus: 0, bpjsKesehatan: 0, bpjsKetenagakerjaan: 0, pph21: 0, bankName: 'Test', accountNumber: '0' } };
function summaryHarness(extra: Record<string, unknown> = {}) {
  return hookRunner('src/lib/useWorkspaceSummary.ts', 'useWorkspaceSummary', {
    localStorage, canAccessMenu, HR_EMPLOYEES_KEY, readHrEmployees, isSummaryOrderList, summarizePurchaseOrders,
    poStorageKey, stockHealth, isInventoryList, commerceStorageKey, inventoryStorageKey, readCommerce, ...extra,
  });
}

test('Dashboard treats malformed cached PO and HR arrays as unavailable, preserving the saved bytes', () => {
  for (const raw of ['[null]', '[1]', '[{}]', '{}', 'null', '[{"id":"recoverable"}', JSON.stringify([order, order])]) {
    const data = memory({ [poStorageKey(true, 'demo')]: raw });
    const hook = summaryHarness();
    const summary = hook.render(true, 'demo', 'Super Admin');
    assert.equal(summary.orders, null, raw);
    assert.equal(summary.poValue, null, raw);
    assert.equal(data[poStorageKey(true, 'demo')], raw);
    assert.equal(summarizePurchaseOrders(JSON.parse(raw === '[{"id":"recoverable"}' ? '[null]' : raw) as any).activePosCount, null);
  }
  for (const raw of ['[null]', '[{}]', JSON.stringify([employee, employee]), JSON.stringify([{ ...employee, salary: null }])]) {
    const data = memory({ [HR_EMPLOYEES_KEY]: raw });
    assert.equal(summaryHarness().render(true, 'demo', 'HR Manager').totalHeadcount, null, raw);
    assert.equal(data[HR_EMPLOYEES_KEY], raw);
  }
  memory();
  assert.equal(summaryHarness().render(true, 'demo', 'HR Manager').totalHeadcount, null);
  memory({ [poStorageKey(true, 'demo')]: '[]', [HR_EMPLOYEES_KEY]: '[]' });
  const empty = summaryHarness().render(true, 'demo', 'Super Admin');
  assert.equal(empty.poValue, 0); assert.equal(empty.totalHeadcount, 0);
  memory({ [poStorageKey(true, 'demo')]: JSON.stringify([order]), [HR_EMPLOYEES_KEY]: JSON.stringify([employee]) });
  const valid = summaryHarness().render(true, 'demo', 'Super Admin');
  assert.equal(valid.poValue, 1000); assert.equal(valid.totalHeadcount, 1);
});

test('invalid live snapshots are unavailable and disposed subscriptions cannot overwrite the next account summary', async () => {
  memory();
  const subscriptions: { next: (snapshot: any) => void; fail: () => void }[] = [];
  const hook = summaryHarness({ require(name: string) {
    return name === '../firebase' ? { db: {} } : { collection: () => ({}), onSnapshot(_ref: unknown, next: any, fail: any) {
      subscriptions.push({ next, fail }); return () => {};
    } };
  } });
  const snapshot = (value: unknown) => ({ docs: [{ id: 'PO-LIVE', data: () => value }] });
  hook.render(false, 'owner-A', 'Finance Manager');
  const cleanupA = hook.effect('onSnapshot')() as () => void;
  await new Promise(setImmediate);
  subscriptions[0].next(snapshot({ ...order, vendor: {} }));
  assert.equal(hook.render(false, 'owner-A', 'Finance Manager').orders, null);
  cleanupA();
  hook.render(false, 'owner-B', 'Finance Manager');
  hook.effect('onSnapshot')();
  await new Promise(setImmediate);
  subscriptions[1].next(snapshot(order));
  assert.equal(hook.render(false, 'owner-B', 'Finance Manager').poValue, 1000);
  subscriptions[0].next(snapshot({ ...order, total: 999999 }));
  subscriptions[0].fail();
  assert.equal(hook.render(false, 'owner-B', 'Finance Manager').poValue, 1000);
});

const queued = (ownerId: string, id = ownerId): QueuedMutation => ({ id, ownerId, entityId: `PO-${ownerId}`, type: 'APPROVE_PO', payload: { status: 'Disetujui' },
  timestamp: '2026-11-18T10:00:00Z', description: `Private queue ${ownerId}` });
const legacy = { id: 'legacy', entityId: 'PO-LEGACY', description: { privateLegacyData: true } };
function queueHarness(initial: Record<string, string>) {
  const data = memory(initial);
  const listeners: Record<string, () => void> = {};
  const navigator = { onLine: true };
  const hook = hookRunner('src/lib/useNetworkStatus.ts', 'useNetworkStatus', { localStorage,
    navigator, acknowledgeMutation, readQueue, isOwnedQueuedMutation, QUEUE_STORAGE_KEY: queueKey,
    crypto: { randomUUID: () => 'new-queue-id' },
    window: { addEventListener(name: string, callback: () => void) { listeners[name] = callback; }, removeEventListener() {} },
  });
  return { ...hook, data, listeners, navigator };
}

test('legacy queue entries are retained but never displayed or replayed for another account or an unassigned session', async () => {
  const raw = JSON.stringify([queued('A'), queued('B'), legacy]);
  const h = queueHarness({ [queueKey]: raw });
  const executed: string[] = [];
  const options = (ownerId: string | null) => ({ ownerId, execute: async (item: QueuedMutation) => { executed.push(item.ownerId); } });
  assert.equal(h.render(options(null)).queuedCount, 0);
  assert.deepEqual(Array.from(h.render(options('A')).queue, (item: QueuedMutation) => item.ownerId), ['A']);
  assert.deepEqual(Array.from(h.render(options('B')).queue, (item: QueuedMutation) => item.ownerId), ['B']);
  assert.equal(h.data[queueKey], raw);
  await h.render(options('A')).flushQueue();
  assert.deepEqual(executed, ['A']);
  assert.deepEqual(JSON.parse(h.data[queueKey]), [queued('B'), legacy]);
  await assert.rejects(acknowledgeMutation(localStorage, legacy as any, async () => assert.fail('Legacy must not replay')));
});

test('malformed owned queue fields cannot reach the UI, overwrite original data, or execute', async () => {
  for (const entry of [{ ...queued('A'), description: {} }, { ...queued('A'), timestamp: {} }, { ...queued('A'), timestamp: 'not-a-date' },
    { ...queued('A'), ownerId: {} }, { ...queued('A'), type: {} }, { ...queued('A'), entityId: '' }]) {
    const raw = JSON.stringify([entry]);
    const h = queueHarness({ [queueKey]: raw });
    let failures = 0;
    const options = { ownerId: 'A', execute: async () => assert.fail('Malformed queue must not execute'), onError() { failures++; } };
    assert.throws(() => readQueue(localStorage));
    const result = h.render(options);
    assert.equal(result.queuedCount, 0);
    await result.flushQueue();
    assert.equal(failures, 1);
    assert.equal(h.data[queueKey], raw);
    assert.throws(() => result.enqueue({ type: 'APPROVE_PO', entityId: 'PO-NEW', payload: {}, description: {} }));
    assert.equal(h.data[queueKey], raw);
  }
});

test('late synchronization results cannot notify a new account or block its queue synchronization', async () => {
  for (const failOld of [false, true]) {
    const h = queueHarness({ [queueKey]: JSON.stringify([queued('A'), queued('B'), legacy]) });
    let settleOld!: () => void;
    const pending = new Promise<void>((resolve, reject) => { settleOld = () => failOld ? reject(new Error('Old account error')) : resolve(); });
    const events: string[] = [];
    const optionsA = { ownerId: 'A', execute: () => pending, onSynced: () => events.push('A:success'), onError: () => events.push('A:error') };
    const optionsB = { ownerId: 'B', execute: async () => {}, onSynced: () => events.push('B:success'), onError: () => events.push('B:error') };
    const first = h.render(optionsA).flushQueue();
    await h.render(optionsB).flushQueue();
    assert.deepEqual(events, ['B:success']);
    settleOld(); await first;
    assert.deepEqual(events, ['B:success']);
    assert.deepEqual(JSON.parse(h.data[queueKey]), failOld ? [queued('A'), legacy] : [legacy]);
    assert.equal(h.render(optionsB).queuedCount, 0);
  }
});

test('disposed queue hooks suppress late sync notifications and invalid storage refresh clears stale displayed rows', async () => {
  const h = queueHarness({ [queueKey]: JSON.stringify([queued('A')]) });
  let resolve!: () => void;
  const pending = new Promise<void>(done => { resolve = done; });
  let events = 0;
  const options = { ownerId: 'A', execute: () => pending, onSynced() { events++; }, onError() { events++; } };
  const result = h.render(options);
  const cleanup = h.effect('version: ownerSession.current.version + 1')() as () => void;
  const first = result.flushQueue();
  cleanup(); resolve(); await first;
  assert.equal(events, 0);

  h.data[queueKey] = JSON.stringify([queued('A')]);
  h.render(options);
  h.effect("addEventListener('storage'")();
  h.data[queueKey] = JSON.stringify([{ ...queued('A'), description: {} }]);
  h.listeners.storage();
  assert.equal(h.render(options).queuedCount, 0);
  assert.equal(events, 1);
});
