import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { HRView, type Employee, type PayrollDisbursementRecord } from '../src/components/HRView';
import { assertPayrollAvailable } from '../src/lib/payrollHistory';
import { assertPayrollAmounts, HR_EMPLOYEES_KEY, PAYROLL_HISTORY_KEY, readHrEmployees, readPayrollHistory } from '../src/lib/hrValidation';
import { saveStoredData } from '../src/lib/storageUtils';
import { BUSINESS_TIME_ZONE, monthLabel } from '../src/lib/businessDates';
import { validatePaymentMethodLabel } from '../src/lib/paymentMethodValidation';
import { BILLING_KEYS } from '../src/lib/billingStore';

const memory = new Map<string, string>();
Object.assign(globalThis, { localStorage: {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => { memory.set(key, value); },
} });

const employee: Employee = {
  id: 'EMP-AUDIT', name: 'Test employee', email: 'employee@example.test', dept: 'Finance', role: 'Staff', status: 'Active', color: 'green', joined: '01 Nov 2026',
  salary: { baseSalary: 10_000_000, positionAllowance: 1_000_000, transportAllowance: 500_000, bonus: 0,
    bpjsKesehatan: 100_000, bpjsKetenagakerjaan: 300_000, pph21: 500_000, bankName: 'Test bank', accountNumber: '0000', disbursementStatus: 'Pending Approval' },
};

const trees = new Map<string, ts.SourceFile>();
function source(file: string) {
  if (!trees.has(file)) trees.set(file, ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX));
  return trees.get(file)!;
}
function callback(file: string, name: string) {
  const tree = source(file);
  let result: ts.Node | undefined;
  function visit(node: ts.Node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(tree) === name) result = node.initializer;
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) result = node;
    ts.forEachChild(node, visit);
  }
  visit(tree); assert.ok(result, name); return result.getText(tree);
}
function evaluate(context: vm.Context, code: string) {
  vm.runInContext(ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);
}
function payroll(bonus: number | '') {
  const context = vm.createContext({
    storageError: false, isDisbursing: false, editableBonus: bonus, payrollHistory: [], employees: [employee], payrollPeriod: '2026-11', periodLabel: 'November 2026', lang: 'en',
    readHrEmployees, readPayrollHistory, assertPayrollAvailable, assertPayrollAmounts, saveStoredData, PAYROLL_HISTORY_KEY, BUSINESS_TIME_ZONE, monthLabel,
    crypto: { randomUUID: () => '12345678-1234-1234-1234-123456789012' },
    setIsDisbursing() {}, setStorageError(value: boolean) { context.failedStorage = value; }, setPayrollHistory(value: unknown) { context.history = value; },
    setTimeout: (fn: () => void) => fn(), playNotificationChime() {},
    messages: [] as { message: string; type: string }[], onToast(message: string, type: string) { context.messages.push({ message, type }); },
  });
  evaluate(context, `globalThis.calculatePayroll = (${callback('src/components/HRView.tsx', 'calculatePayroll')});
globalThis.record = (${callback('src/components/HRView.tsx', 'handleDisbursePayroll')});`);
  return context;
}

test('payroll rejects fractions, blank, negative and unsafe bonus before persistence, and stores whole rupiah', () => {
  for (const bonus of [0.5, '', -1, Infinity, Number.MAX_SAFE_INTEGER + 1] as const) {
    memory.clear();
    const action = payroll(bonus);
    action.record(employee);
    assert.equal(memory.has(PAYROLL_HISTORY_KEY), false, String(bonus));
    assert.equal(action.messages.at(-1)?.type, 'error');
  }
  memory.clear();
  const action = payroll(100);
  action.record(employee);
  const stored = JSON.parse(memory.get(PAYROLL_HISTORY_KEY)!)[0];
  assert.equal(stored.bonus, 100);
  assert.equal(stored.netPay, 10_600_100);
  assert.equal(action.messages.at(-1)?.type, 'success');
});

test('HR keeps corrupt employee/history bytes and renders recovery rather than replacement fixtures', () => {
  for (const key of [HR_EMPLOYEES_KEY, PAYROLL_HISTORY_KEY]) {
    for (const corrupt of ['[{"id":"RECOVERABLE"}', '{}', '[null]']) {
      memory.clear(); memory.set(key, corrupt);
      const html = renderToStaticMarkup(<HRView onToast={() => {}} />);
      assert.match(html, /Saved HR data cannot be read/);
      assert.match(html, /Download saved data/);
      assert.doesNotMatch(html, /Budi Santoso/);
      assert.equal(memory.get(key), corrupt);
      const action = payroll(100);
      action.record(employee);
      assert.equal(action.failedStorage, true);
      assert.equal(action.messages.at(-1)?.type, 'error');
      assert.equal(memory.get(key), corrupt);
    }
  }
});

test('HR mount persistence does not overwrite records changed after initialization', () => {
  const tree = source('src/components/HRView.tsx');
  let effect: ts.Node | undefined;
  function visit(node: ts.Node) {
    if (ts.isCallExpression(node) && node.expression.getText(tree) === 'useEffect'
      && node.arguments[0]?.getText(tree).includes('localStorage.getItem(HR_EMPLOYEES_KEY)')) effect = node.arguments[0];
    ts.forEachChild(node, visit);
  }
  visit(tree); assert.ok(effect);
  memory.clear(); memory.set(HR_EMPLOYEES_KEY, 'damaged employees'); memory.set(PAYROLL_HISTORY_KEY, 'damaged history');
  const context = vm.createContext({ localStorage, storageError: false, HR_EMPLOYEES_KEY, PAYROLL_HISTORY_KEY,
    employees: [employee], payrollHistory: [], saveStoredData() { assert.fail('Mount must not overwrite existing bytes'); }, setStorageError() {} });
  evaluate(context, `globalThis.persist = (${effect.getText(tree)});`);
  context.persist();
  assert.equal(memory.get(HR_EMPLOYEES_KEY), 'damaged employees');
  assert.equal(memory.get(PAYROLL_HISTORY_KEY), 'damaged history');
});

test('legacy payroll fractions remain intact in storage and PDF currency output', () => {
  const record: PayrollDisbursementRecord = { id: 'PAY-LEGACY', referenceNumber: 'REF-1', empId: employee.id, empName: employee.name, dept: 'Finance', role: 'Staff',
    period: 'October 2026', disbursedAt: '2026-10-25T00:00:00Z', disbursedDateFormatted: '25 Oct 2026',
    baseSalary: 10_000_000, allowances: 1_500_000, bonus: 0.5, gross: 11_500_000.5, deductions: 900_000, pph21: 500_000, bpjs: 400_000,
    netPay: 10_600_000.5, bankName: 'Test bank', accountNumber: '0000', actor: 'Test operator', status: 'SUCCESS' };
  memory.clear(); const raw = JSON.stringify([record]); memory.set(PAYROLL_HISTORY_KEY, raw);
  assert.equal(readPayrollHistory([])[0].netPay, record.netPay);
  assert.equal(memory.get(PAYROLL_HISTORY_KEY), raw);
  const context = vm.createContext({});
  evaluate(context, callback('src/lib/pdfGenerator.ts', 'formatCurrency'));
  assert.equal(context.formatCurrency(record.netPay, 'en'), 'Rp 10,600,000.5');
  assert.equal(context.formatCurrency(record.netPay, 'id'), 'Rp 10.600.000,5');
  assert.equal(context.formatCurrency(10000, 'en'), 'Rp 10,000');
});

const validLabel = { type: 'card', brand: 'Mastercard', last4: '1234', holder: 'Test Entity', exp: '11/26', billingEmail: 'billing@example.test' };

test('payment label validates holder, last digits, email and expiry, accepting the current month', () => {
  for (const input of [
    { ...validLabel, exp: '99/99' }, { ...validLabel, exp: '00/27' }, { ...validLabel, exp: '10/26' },
    { ...validLabel, holder: '   ' }, { ...validLabel, last4: '123' }, { ...validLabel, billingEmail: 'not an email' },
  ]) assert.throws(() => validatePaymentMethodLabel(input, '2026-11-18'));
  const normalized = validatePaymentMethodLabel({ ...validLabel, holder: ' Test Entity ', billingEmail: ' billing@example.test ' }, '2026-11-30');
  assert.equal(normalized.holder, 'Test Entity'); assert.equal(normalized.billingEmail, 'billing@example.test');
  assert.equal(normalized.exp, '11/26');
});

test('billing handler never persists invalid labels and applies normalized labels only after durable save', () => {
  for (const mode of ['invalid', 'full', 'valid'] as const) {
    memory.clear(); const writes: unknown[] = [];
    const context = vm.createContext({
      isSubmitting: false, pmForm: mode === 'invalid' ? { ...validLabel, holder: '   ', exp: '99/99' } : { ...validLabel, holder: ' Test Entity ' }, lang: 'en',
      validatePaymentMethodLabel, businessDate: () => '2026-11-18',
      BILLING_KEYS, ensureBillingReadable() {},
      setIsSubmitting() {}, setTimeout: (fn: () => void) => fn(),
      saveStoredData(_key: string, value: unknown, strict: boolean) { assert.equal(strict, true); if (mode === 'full') throw new Error('Full'); writes.push(value); },
      setPaymentMethod(value: unknown) { context.applied = value; }, setPmForm() {}, setIsUpdatePmOpen(value: boolean) { context.open = value; },
      messages: [] as string[], onToast(_message: string, type: string) { context.messages.push(type); },
    });
    evaluate(context, `globalThis.save = (${callback('src/components/BillingSubscriptionView.tsx', 'handleSavePaymentMethod')});`);
    context.save({ preventDefault() {} });
    assert.equal(writes.length, mode === 'valid' ? 1 : 0);
    assert.equal(context.messages.at(-1), mode === 'valid' ? 'success' : 'error');
    if (mode === 'valid') { assert.equal(context.applied.holder, 'Test Entity'); assert.equal(context.open, false); }
    else assert.equal(context.applied, undefined);
  }
});
