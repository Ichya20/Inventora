import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import ts from 'typescript';
import { assertPayrollAvailable } from '../../src/lib/payrollHistory';
import { BUSINESS_TIME_ZONE, monthLabel } from '../../src/lib/businessDates';
import { loadStoredData, saveStoredData } from '../../src/lib/storageUtils';

const reports: any[] = [];
const memory = new Map<string, string>();
Object.assign(globalThis, { localStorage: {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => memory.set(key, value),
} });

function source(path: string) {
  return ts.createSourceFile(path, fs.readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true, path.endsWith('tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
}
function declaration(file: ts.SourceFile, name: string) {
  let result: ts.VariableDeclaration | ts.FunctionDeclaration | undefined;
  function visit(node: ts.Node) {
    if ((ts.isVariableDeclaration(node) || ts.isFunctionDeclaration(node)) && node.name?.getText(file) === name) result = node;
    ts.forEachChild(node, visit);
  }
  visit(file);
  assert.ok(result, name);
  return result;
}
function callback(file: ts.SourceFile, name: string) {
  return (declaration(file, name) as ts.VariableDeclaration).initializer!.getText(file);
}
function evaluate(context: vm.Context, sourceText: string) {
  vm.runInContext(ts.transpileModule(sourceText, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);
}

const hr = source('src/components/HRView.tsx');
const pdf = source('src/lib/pdfGenerator.ts');
const hrContext = vm.createContext({
  lang: 'en', isDisbursing: false, editableBonus: 0.5, payrollHistory: [], payrollPeriod: '2026-11', periodLabel: 'November 2026',
  assertPayrollAvailable, loadStoredData, saveStoredData, monthLabel, BUSINESS_TIME_ZONE,
  crypto: { randomUUID: () => '12345678-1234-1234-1234-123456789012' },
  setTimeout: (fn: () => void) => fn(), setIsDisbursing() {}, setPayrollHistory() {}, playNotificationChime() {},
  messages: [] as unknown[], onToast(message: string, type: string) { hrContext.messages.push({ message, type }); },
});
evaluate(hrContext, `globalThis.calculatePayroll = ${callback(hr, 'calculatePayroll')}; globalThis.record = ${callback(hr, 'handleDisbursePayroll')}; ${declaration(pdf, 'formatCurrency').getText(pdf)}`);
const employee = { id: 'EMP-AUDIT', name: 'Audit employee', dept: 'Finance', role: 'Staff', salary: { baseSalary: 10_000_000, positionAllowance: 1_000_000, transportAllowance: 500_000, bpjsKesehatan: 100_000, bpjsKetenagakerjaan: 300_000, pph21: 500_000, bankName: 'Test bank', accountNumber: '0000' } };
hrContext.record(employee);
const fractionalRecord = JSON.parse(memory.get('inventora_hr_payroll_history_v2')!)[0];
assert.equal(fractionalRecord.bonus, 0.5);
assert.equal(fractionalRecord.netPay, 10_600_000.5);
assert.equal(hrContext.formatCurrency(fractionalRecord.netPay, 'en'), 'Rp 10,600,001');
assert.equal(hrContext.messages.at(-1).type, 'success');
reports.push({
  id: 'HR-FRACTIONAL-PAYROLL', severity: 'P2', source: 'src/components/HRView.tsx', line: 579,
  trigger: 'In an unrecorded payroll period, enter 0.5 in Performance Bonus / Overtime, then click Record Payroll Simulation.',
  actual: { savedBonus: fractionalRecord.bonus, savedNetPay: fractionalRecord.netPay, pdfNetPay: hrContext.formatCurrency(fractionalRecord.netPay, 'en'), status: fractionalRecord.status },
  impact: 'Payroll accepts an input that fails its declared step=100000 constraint. Saved/onscreen money retains fractions while the generated PDF rounds them, so the archive and PDF disagree.',
  relatedLines: { input: 1246, normalization: 1250, recordingButton: 1334, pdfRounding: 58 },
});

const billing = source('src/components/BillingSubscriptionView.tsx');
const billingContext = vm.createContext({
  lang: 'en', pmForm: { type: 'card', brand: 'Mastercard', last4: '1234', holder: '   ', exp: '99/99', billingEmail: 'billing@example.test' },
  saveStoredData, setIsSubmitting() {}, setPaymentMethod() {}, setIsUpdatePmOpen() {},
  setTimeout: (fn: () => void) => fn(), messages: [] as unknown[],
  onToast(message: string, type: string) { billingContext.messages.push({ message, type }); },
});
evaluate(billingContext, `globalThis.save = ${callback(billing, 'handleSavePaymentMethod')};`);
billingContext.save({ preventDefault() {} });
const savedPayment = JSON.parse(memory.get('inventora_billing_pm_v1')!);
assert.equal(savedPayment.exp, '99/99');
assert.equal(savedPayment.holder, '   ');
assert.equal(billingContext.messages.at(-1).type, 'success');
reports.push({
  id: 'BILLING-INVALID-LABEL', severity: 'P3', source: 'src/components/BillingSubscriptionView.tsx', line: 225,
  trigger: 'Edit sample payment method: valid last four digits and billing email, Expiry Date=99/99, Cardholder / Entity Name=three spaces, then Save Payment Method.',
  actual: { storedExpiry: savedPayment.exp, storedHolder: savedPayment.holder, toast: 'success' },
  impact: 'Malformed expiry and blank cardholder labels pass native required checks and are persisted. This affects local simulation labels only, not a live payment processor.',
  relatedLines: { expiry: 863, holder: 879 },
});

memory.set('inventora_hr_payroll_history_v2', '[{"empId":"EMP-AUDIT","netPay":12345}');
const originalCorruptHistory = memory.get('inventora_hr_payroll_history_v2');
const fallbacks = [{ empId: 'EMP-FIXTURE', netPay: 22222 }];
const readHistory = loadStoredData('inventora_hr_payroll_history_v2', fallbacks);
saveStoredData('inventora_hr_payroll_history_v2', readHistory);
assert.notEqual(memory.get('inventora_hr_payroll_history_v2'), originalCorruptHistory);
reports.push({
  id: 'HR-CORRUPT-HISTORY-OVERWRITE', severity: 'P2', source: 'src/components/HRView.tsx', line: 315,
  trigger: 'If stored payroll history has invalid JSON, opening HR runs the lenient loader and unconditional persistence effect.',
  actual: 'The loader falls back to fixture payroll records, and the mount effect overwrites the original payroll history with those fixtures.',
  impact: 'Damaged payroll data cannot be recovered from browser storage after opening HR. Existing recorded/payroll status is silently replaced instead of showing a recoverable storage error.',
  relatedLines: { loader: 311, employeePersistence: 306, storageCatch: 15 },
  limitation: 'Requires already-corrupt localStorage; no normal UI input path to corrupt JSON was established.',
});

fs.mkdirSync('output/bug-audit', { recursive: true });
fs.writeFileSync('output/bug-audit/finance-hr.json', JSON.stringify({ checkedAt: new Date().toISOString(), method: 'Actual TypeScript callbacks evaluated in an isolated VM; browser storage and timer mocked, no network or Firebase calls.', findings: reports, disproved: ['Finance search pagination already resets page to 1 onSearchChange.'] }, null, 2));
console.log(JSON.stringify(reports, null, 2));
