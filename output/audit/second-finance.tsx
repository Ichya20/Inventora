import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { FinanceView } from '../../src/components/FinanceView';
import { BillingSubscriptionView } from '../../src/components/BillingSubscriptionView';
import { loadStoredData, saveStoredData } from '../../src/lib/storageUtils';
import { billingWindow, businessDate, dateLabel } from '../../src/lib/businessDates';

// Read-only application audit: only these process-local storage values are changed.
const memory = new Map<string, string>();
const storage = { getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => memory.set(key, value), removeItem: (key: string) => memory.delete(key) };
Object.assign(globalThis, { localStorage: storage });
const reports: unknown[] = [];
const billingFile = ts.createSourceFile('BillingSubscriptionView.tsx', fs.readFileSync('src/components/BillingSubscriptionView.tsx', 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const snippets = new Map<string, string>();
const effects = new Map<string, string>();
function visit(node: ts.Node) {
  if (ts.isVariableDeclaration(node)) {
    if (ts.isIdentifier(node.name) && node.initializer) snippets.set(node.name.text, node.initializer.getText(billingFile));
    if (ts.isArrayBindingPattern(node.name) && node.initializer && ts.isCallExpression(node.initializer)) {
      const state = node.name.elements[0].getText(billingFile);
      snippets.set(`initial:${state}`, node.initializer.arguments[0]?.getText(billingFile));
    }
  }
  if (ts.isCallExpression(node) && node.expression.getText(billingFile) === 'useEffect') {
    if (node.arguments[0]?.getText(billingFile).includes("saveStoredData('inventora_subscription_v2'")) effects.set('subscription', node.arguments[0].getText(billingFile));
    if (node.arguments[0]?.getText(billingFile).includes("saveStoredData('inventora_billing_pm_v1'")) effects.set('paymentMethod', node.arguments[0].getText(billingFile));
  }
  ts.forEachChild(node, visit);
}
visit(billingFile);
function evaluate(context: vm.Context, name: string, code: string) {
  assert.ok(code, name);
  vm.runInContext(ts.transpileModule(`globalThis.${name} = (${code});`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);
}

const oldInvoice = { id: 'OLD-INVOICE', date: '01 Nov 2026', total: 100, period: 'November 2026', status: 'Simulasi', client: 'Audit client', planName: 'Enterprise', paymentMethod: 'Audit card' };
const base = { planId: 'enterprise', cycle: 'annual', anchorDate: '2026-11-01', autoRenew: true, invoices: [oldInvoice] };
const plans = [
  { id: 'starter', name: 'Starter', annualMonthlyPrice: 600000, monthlyPrice: 750000 },
  { id: 'business', name: 'Business', annualMonthlyPrice: 1800000, monthlyPrice: 2200000 },
];
function tab(id: string) {
  const initial = structuredClone(base);
  const context = vm.createContext({ subscription: initial, subscriptionInvoices: initial.invoices, billingCycle: 'annual', PLANS: plans,
    businessDate: () => '2026-11-18', billingWindow, dateLabel, lang: 'en', crypto: { randomUUID: () => id },
    paymentMethod: { brand: 'Audit', last4: '1234' }, saveStoredData,
    setSubscription(value: unknown) { context.subscription = value; }, setIsChangePlanOpen() {}, setSelectedPlanForUpgrade() {},
    onToast(message: string, type: string) { context.lastToast = { message, type }; },
  });
  evaluate(context, 'saveSubscription', snippets.get('saveSubscription')!);
  evaluate(context, 'changePlan', snippets.get('handleConfirmPlanChange')!);
  return context;
}
memory.set('inventora_subscription_v2', JSON.stringify(base));
const a = tab('aaaaaaaa-1234');
const b = tab('bbbbbbbb-1234');
a.changePlan('starter');
const afterA = JSON.parse(memory.get('inventora_subscription_v2')!);
assert.equal(afterA.planId, 'starter');
assert.equal(afterA.invoices.length, 2);
b.changePlan('business');
const afterB = JSON.parse(memory.get('inventora_subscription_v2')!);
assert.equal(afterB.planId, 'business');
assert.equal(afterB.invoices.length, 2);
assert.ok(afterB.invoices.some((invoice: { id: string }) => invoice.id.includes('bbbbbbbb')));
assert.ok(!afterB.invoices.some((invoice: { id: string }) => invoice.id.includes('aaaaaaaa')));
reports.push({ id: 'BILLING-STALE-TAB-OVERWRITE', severity: 'P2', trigger: 'Open Billing in two tabs. Change plan in A, then change plan in B without refreshing.',
  observed: { invoiceIdsAfterA: afterA.invoices.map((invoice: { id: string }) => invoice.id), invoiceIdsAfterB: afterB.invoices.map((invoice: { id: string }) => invoice.id) },
  impact: 'The first successful plan-change invoice is deleted from local history by the second tab. Both handlers show success. Pause/resume also serializes stale subscription state.',
  source: ['src/components/BillingSubscriptionView.tsx:171', 'src/components/BillingSubscriptionView.tsx:214', 'src/components/BillingSubscriptionView.tsx:1095'],
  scope: 'Normal local multi-tab workflow; no payment provider or Firestore involved.' });

memory.clear();
for (const [state, key, corrupt] of [
  ['subscription', 'inventora_subscription_v2', '{"planId":"RECOVERABLE"'],
  ['paymentMethod', 'inventora_billing_pm_v1', '{"holder":"RECOVERABLE"'],
] as const) {
  memory.set(key, corrupt);
  const context = vm.createContext({ loadStoredData, saveStoredData, businessDate, initialInvoices: [oldInvoice] });
  evaluate(context, 'initialize', snippets.get(`initial:${state}`)!);
  context[state] = context.initialize();
  evaluate(context, 'persist', effects.get(state)!);
  context.persist();
  assert.notEqual(memory.get(key), corrupt);
}
reports.push({ id: 'BILLING-CORRUPT-CACHE-OVERWRITE', severity: 'P2 conditional', trigger: 'Subscription or payment-method localStorage already contains truncated JSON; open Billing.',
  observed: 'loadStoredData returns fixture defaults; actual mount persistence effect immediately writes those defaults over the corrupt original.',
  impact: 'Recoverable plan/invoice/payment-label bytes are lost and sample records replace them silently.',
  source: ['src/components/BillingSubscriptionView.tsx:103', 'src/components/BillingSubscriptionView.tsx:160', 'src/components/BillingSubscriptionView.tsx:181', 'src/components/BillingSubscriptionView.tsx:184'],
  limitation: 'Needs already damaged local cache; no ordinary input path generating malformed JSON established.' });

const crashes: { module: string; raw: string; error: string }[] = [];
for (const raw of ['{}', '[null]']) {
  memory.clear(); memory.set('inventora_finance_invoices_v1', raw);
  let error = '';
  try { renderToStaticMarkup(<FinanceView onToast={() => {}} />); }
  catch (caught) { error = (caught as Error).message; }
  assert.ok(error);
  assert.equal(memory.get('inventora_finance_invoices_v1'), raw);
  crashes.push({ module: 'Finance', raw, error });
}
memory.clear(); memory.set('inventora_subscription_v2', '{}');
let billingError = '';
try { renderToStaticMarkup(<BillingSubscriptionView onToast={() => {}} />); }
catch (caught) { billingError = (caught as Error).message; }
assert.ok(billingError);
crashes.push({ module: 'Billing', raw: '{}', error: billingError });
reports.push({ id: 'FINANCE-BILLING-CACHE-SCHEMA', severity: 'P2 conditional', trigger: 'Already malformed cache has valid JSON but wrong structure, e.g. {} for invoice array/subscription record or [null] for invoice array.',
  observed: crashes, impact: 'Finance/Billing crash during render, before a recoverable state can be shown. Unlike new HR/PO recovery, these modules still trust loadStoredData generic type.',
  source: ['src/components/FinanceView.tsx:32', 'src/components/FinanceView.tsx:56', 'src/components/BillingSubscriptionView.tsx:160', 'src/components/BillingSubscriptionView.tsx:168'],
  limitation: 'Requires wrong-shape saved cache; no ordinary form input generating this structure established.' });

fs.mkdirSync('output/bug-audit', { recursive: true });
fs.writeFileSync('output/bug-audit/second-finance.json', JSON.stringify({ checkedAt: new Date().toISOString(), method: 'Actual source callbacks evaluated in VM and actual Finance/Billing rendered through React SSR with in-memory localStorage. No browser, Firebase, credentials or API calls.', findings: reports }, null, 2));
console.log(JSON.stringify({ verified: reports.length, report: 'output/bug-audit/second-finance.json' }));
