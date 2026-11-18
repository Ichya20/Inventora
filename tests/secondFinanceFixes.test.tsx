import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { FinanceView } from '../src/components/FinanceView';
import { BillingSubscriptionView } from '../src/components/BillingSubscriptionView';
import { BILLING_KEYS, readBillingData, readSubscription, updateSubscription, type BillingData } from '../src/lib/billingStore';
import { FINANCE_INVOICES_KEY, readFinanceInvoices } from '../src/lib/financeStorage';
import { billingWindow, dateLabel } from '../src/lib/businessDates';
import { saveStoredData } from '../src/lib/storageUtils';

const memory = new Map<string, string>();
let failedWrite = false;
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => { if (failedWrite) throw new Error('Storage full'); memory.set(key, value); },
} });
const invoice = { id: 'INV-BASE', date: '01 Nov 2026', total: 1000, period: 'November 2026', status: 'Simulasi', client: 'Test client', planName: 'Enterprise', paymentMethod: 'Test card' };
const fallback: BillingData = {
  addons: { extraSeats: 0, extraAiPacks: 0, dedicatedDatabase: false },
  paymentMethod: { type: 'card', brand: 'Test', last4: '1234', holder: 'Test Entity', exp: '12/28', billingEmail: 'test@example.test' },
  salesMessage: '', subscription: { planId: 'enterprise', cycle: 'annual', anchorDate: '2026-11-01', autoRenew: true, invoices: [invoice] },
};
const financeInvoice = { id: 'INV-TEST', client: 'Test client', desc: 'Service', date: '18 Nov 2026', total: 1000, status: 'Pending', color: 'orange', isOverdue: false };
const trees = new Map<string, ts.SourceFile>();
function tree(file: string) {
  if (!trees.has(file)) trees.set(file, ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX));
  return trees.get(file)!;
}
function evaluate(context: vm.Context, file: string, name: string) {
  const source = tree(file);
  let expression: ts.Expression | undefined;
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === name) expression = node.initializer;
    ts.forEachChild(node, visit);
  };
  visit(source); assert.ok(expression, name);
  vm.runInContext(ts.transpileModule(`globalThis.${name} = (${expression.getText(source)});`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);
}
const billingFile = 'src/components/BillingSubscriptionView.tsx';
function tab(id: string) {
  const initial = structuredClone(fallback);
  const context = vm.createContext({
    fallbackBilling: initial, subscription: initial.subscription, subscriptionInvoices: initial.subscription.invoices,
    paymentMethod: initial.paymentMethod, storageError: false, subscriptionPending: { current: false },
    billingCycle: 'annual', lang: 'en', readBillingData, updateSubscription, billingWindow, dateLabel,
    businessDate: () => '2026-11-18', crypto: { randomUUID: () => id },
    PLANS: [{ id: 'starter', name: 'Starter', annualMonthlyPrice: 600000, monthlyPrice: 750000 },
      { id: 'business', name: 'Business', annualMonthlyPrice: 1800000, monthlyPrice: 2250000 }],
    setStorageError(value: boolean) { context.storageError = value; },
    setSubscription(value: unknown) { context.current = value; }, setIsSubscriptionSaving() {}, setIsChangePlanOpen() {}, setSelectedPlanForUpgrade() {}, setIsCancelModalOpen() {},
    onToast(message: string, type: string) { context.toast = { message, type }; },
  });
  for (const name of ['ensureBillingReadable', 'saveSubscription', 'handleConfirmPlanChange', 'handlePauseRenewal', 'handleResumeRenewal']) evaluate(context, billingFile, name);
  return context;
}

test('Billing stale tabs preserve every plan invoice and pause/resume the latest plan', async () => {
  memory.clear(); failedWrite = false;
  memory.set(BILLING_KEYS.subscription, JSON.stringify(fallback.subscription));
  const first = tab('aaaaaaaa-1234');
  const second = tab('bbbbbbbb-1234');
  await first.handleConfirmPlanChange('starter');
  await second.handleConfirmPlanChange('business');
  let current = readSubscription(fallback.subscription);
  assert.deepEqual(current.invoices.map(row => row.id), ['INV-SUB-2026-bbbbbbbb', 'INV-SUB-2026-aaaaaaaa', 'INV-BASE']);
  assert.equal(current.planId, 'business');
  assert.equal(first.toast.type, 'success'); assert.equal(second.toast.type, 'success');
  await first.handlePauseRenewal();
  current = readSubscription(fallback.subscription);
  assert.equal(current.planId, 'business'); assert.equal(current.autoRenew, false); assert.equal(current.invoices.length, 3);
  await second.handleResumeRenewal();
  current = readSubscription(fallback.subscription);
  assert.equal(current.autoRenew, true); assert.equal(current.planId, 'business'); assert.equal(current.invoices.length, 3);
});

test('subscription updates serialize under the shared browser lock and read only after acquiring it', async () => {
  memory.clear(); failedWrite = false;
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const jobs: { name: string; run: () => void }[] = [];
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { locks: { request(name: string, action: () => unknown) {
    return new Promise(resolve => jobs.push({ name, run: () => resolve(action()) }));
  } } } });
  try {
    const a = updateSubscription(fallback.subscription, current => ({ ...current, invoices: [{ ...invoice, id: 'A' }, ...current.invoices] }));
    const b = updateSubscription(fallback.subscription, current => ({ ...current, invoices: [{ ...invoice, id: 'B' }, ...current.invoices] }));
    assert.equal(memory.has(BILLING_KEYS.subscription), false);
    assert.deepEqual(jobs.map(job => job.name), ['inventora-billing-subscription', 'inventora-billing-subscription']);
    jobs[0].run(); await a;
    jobs[1].run(); await b;
    assert.deepEqual(readSubscription(fallback.subscription).invoices.map(row => row.id), ['B', 'A', 'INV-BASE']);
  } finally {
    if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator);
    else Reflect.deleteProperty(globalThis, 'navigator');
  }
});

test('invalid billing records render recovery and retain original data instead of fixture persistence', () => {
  const bad: [string, string][] = [
    [BILLING_KEYS.subscription, '{"recoverable":'], [BILLING_KEYS.subscription, '{}'],
    [BILLING_KEYS.subscription, JSON.stringify({ ...fallback.subscription, anchorDate: '2026-02-31' })],
    [BILLING_KEYS.subscription, JSON.stringify({ ...fallback.subscription, invoices: [null] })],
    [BILLING_KEYS.paymentMethod, '{"holder":'], [BILLING_KEYS.paymentMethod, '{}'],
    [BILLING_KEYS.addons, '{"extraSeats":-1}'], [BILLING_KEYS.salesMessage, '{}'],
    ['inventora_subscription_invoices_v1', '[null]'], ['inventora_subscription_plan_v1', '"unknown"'],
  ];
  for (const [key, raw] of bad) {
    memory.clear(); failedWrite = false; memory.set(key, raw);
    assert.throws(() => readBillingData(fallback), undefined, key);
    const html = renderToStaticMarkup(<BillingSubscriptionView onToast={() => {}} />);
    assert.match(html, /Saved billing data cannot be read/, key);
    assert.match(html, /Download saved data/, key);
    assert.equal(memory.get(key), raw, key);
    assert.equal(memory.size, 1, 'Initialization must not write defaults');
  }
});

test('Billing external corruption or quota failure cannot report successful plan updates', async () => {
  for (const mode of ['corrupt', 'quota']) {
    memory.clear(); failedWrite = false;
    const action = tab('cccccccc-1234');
    const raw = mode === 'corrupt' ? '{"recoverable":' : JSON.stringify(fallback.subscription);
    memory.set(BILLING_KEYS.subscription, raw);
    failedWrite = mode === 'quota';
    await action.handleConfirmPlanChange('starter');
    assert.equal(action.current, undefined);
    assert.equal(action.toast.type, 'error');
    assert.equal(memory.get(BILLING_KEYS.subscription), raw);
  }
  failedWrite = false;
});

test('Finance malformed cache renders recovery, and a repaired cache can be loaded without reload', () => {
  for (const raw of ['{}', '[null]', '{"recoverable":', JSON.stringify([{ ...financeInvoice, total: '1000' }])]) {
    memory.clear(); memory.set(FINANCE_INVOICES_KEY, raw);
    const html = renderToStaticMarkup(<FinanceView onToast={() => {}} />);
    assert.match(html, /Saved invoices cannot be read/);
    assert.match(html, /Download saved data/);
    assert.doesNotMatch(html, /Bank Mandiri/);
    assert.equal(memory.get(FINANCE_INVOICES_KEY), raw);
  }
  const context = vm.createContext({ readFinanceInvoices, defaultInvoices: [financeInvoice],
    setInvoices(value: unknown) { context.invoices = value; }, setStorageError(value: boolean) { context.error = value; }, setActiveModal() {} });
  evaluate(context, 'src/components/FinanceView.tsx', 'refreshInvoices');
  memory.set(FINANCE_INVOICES_KEY, JSON.stringify([financeInvoice]));
  context.refreshInvoices();
  assert.equal(context.error, false);
  assert.equal(context.invoices[0].id, financeInvoice.id);
});

test('Finance payment preflight rejects externally damaged invoice rows before writing', () => {
  memory.clear(); const raw = '[{"id":"INV-TEST","total":"bad"}]'; memory.set(FINANCE_INVOICES_KEY, raw);
  const context = vm.createContext({ storageError: false, readFinanceInvoices, defaultInvoices: [financeInvoice], FINANCE_INVOICES_KEY,
    markLocalInvoicePaid() { assert.fail('Invalid rows must not be committed'); },
    setStorageError(value: boolean) { context.error = value; }, setInvoices() {}, setActiveModal() {}, lang: 'en',
    onToast(_message: string, type: string) { context.toast = type; },
  });
  evaluate(context, 'src/components/FinanceView.tsx', 'handleMarkAsPaid');
  context.handleMarkAsPaid('INV-TEST');
  assert.equal(context.error, true); assert.equal(context.toast, 'error'); assert.equal(memory.get(FINANCE_INVOICES_KEY), raw);
});

test('Billing has no mount effects that write subscription or payment fixtures', () => {
  memory.clear(); memory.set(BILLING_KEYS.subscription, '{recoverable'); memory.set(BILLING_KEYS.paymentMethod, '{recoverable');
  const source = tree(billingFile);
  const effects: ts.Expression[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && node.expression.getText(source) === 'useEffect') effects.push(node.arguments[0]);
    ts.forEachChild(node, visit);
  };
  visit(source);
  const context = vm.createContext({ refreshBilling() {}, window: { addEventListener() {}, removeEventListener() {} },
    saveStoredData() { assert.fail('A mount effect must not persist a fallback'); } });
  for (const effect of effects) {
    vm.runInContext(ts.transpileModule(`globalThis.effect = (${effect.getText(source)});`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);
    context.effect();
  }
  assert.equal(memory.get(BILLING_KEYS.subscription), '{recoverable'); assert.equal(memory.get(BILLING_KEYS.paymentMethod), '{recoverable');
});
