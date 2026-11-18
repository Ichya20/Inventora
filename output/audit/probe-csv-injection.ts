import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { validatePurchaseOrderCreate } from '../../src/lib/purchaseOrderValidation';

// Local, harmless export probe. No DOM, browser, spreadsheet, server or database is used.
const formula = '=1+1';
const sample = validatePurchaseOrderCreate({
  id: 'PO-AUDIT-CSV-001', vendor: 'Vendor Uji', desc: 'Pengadaan uji CSV',
  date: '2026-11-18', deliveryDate: '2026-11-25', status: 'Pending Approval',
  notes: formula, department: 'IT Infrastructure',
  items: [{ id: 'line-1', sku: 'AUDIT-001', name: 'Barang Uji', qty: 1, unitPrice: 100000, subtotal: 100000 }],
  subtotal: 100000, total: 100000, discountAmount: 0, taxAmount: 0, withholdingTaxAmount: 0,
});
assert.equal(sample.notes, formula);

function anchorCapture() {
  const attributes: Record<string, string> = {};
  let clicks = 0;
  const anchor = {
    setAttribute(key: string, value: string) { attributes[key] = value; },
    click() { clicks++; },
    remove() {},
  };
  const document = {
    createElement(tag: string) { assert.equal(tag, 'a'); return anchor; },
    body: { appendChild(element: unknown) { assert.equal(element, anchor); }, removeChild(element: unknown) { assert.equal(element, anchor); } },
  };
  return { attributes, document, get clicks() { return clicks; } };
}

const source = ts.createSourceFile('ProcurementView.tsx', fs.readFileSync('src/components/ProcurementView.tsx', 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let callback: ts.Expression | undefined;
function visit(node: ts.Node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(source) === 'handleExport') callback = node.initializer;
  else ts.forEachChild(node, visit);
}
visit(source);
assert.ok(callback, 'Actual ProcurementView handleExport not found');
const poCapture = anchorCapture();
const loading: boolean[] = [];
const notifications: { message: string; type: string }[] = [];
const context = vm.createContext({
  filteredPos: [sample], lang: 'en', document: poCapture.document,
  setIsExporting(value: boolean) { loading.push(value); },
  onToast(message: string, type: string) { notifications.push({ message, type }); },
  setTimeout(action: () => void) { action(); },
});
vm.runInContext(ts.transpileModule(`globalThis.runExport = (${callback.getText(source)});`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);
await context.runExport();
assert.equal(poCapture.clicks, 1);
assert.equal(notifications.at(-1)?.type, 'success');
assert.deepEqual(loading, [true, false]);
const poCsv = decodeURI(poCapture.attributes.href).split(',').slice(1).join(',');
assert.match(poCsv, /,"=1\+1",/);

// Exercise the actual reusable export utility with mocked DOM and object URLs.
const utilityCapture = anchorCapture();
let utilityBlob: Blob | undefined;
const utilityContext = vm.createContext({
  document: utilityCapture.document, Blob,
  URL: { createObjectURL(blob: Blob) { utilityBlob = blob; return 'blob:local-csv-audit'; }, revokeObjectURL() {} },
});
const utilitySource = fs.readFileSync('src/lib/exportUtils.ts', 'utf8').replace(/export function /g, 'function ');
vm.runInContext(ts.transpileModule(utilitySource + '\nglobalThis.runCsvExport = exportToCsv;', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, utilityContext);
utilityContext.runCsvExport('audit-csv-probe.csv', ['Notes'], [[formula]]);
assert.equal(utilityCapture.clicks, 1);
assert.ok(utilityBlob);
const utilityCsv = await utilityBlob.text();
assert.match(utilityCsv, /(?:^|\r?\n)"=1\+1"(?:\r?\n|$)/);

const result = {
  scope: 'Actual export functions executed locally with document/URL/timer stubs; no browser, spreadsheet, network or Firebase.',
  payload: formula,
  purchaseOrderValidatorAcceptedNotes: true,
  procurementExport: { source: 'src/components/ProcurementView.tsx:381', downloadTriggered: poCapture.clicks === 1, formulaPreserved: true, csv: poCsv },
  reusableCsvExport: { source: 'src/lib/exportUtils.ts:20', downloadTriggered: utilityCapture.clicks === 1, formulaPreserved: true, csv: utilityCsv },
  conclusion: 'The generated CSV cells retain a leading formula marker. Spreadsheet formula execution was not performed or observed.',
};
fs.mkdirSync('output/security-audit', { recursive: true });
fs.writeFileSync('output/security-audit/csv-probe.json', JSON.stringify(result, null, 2));
console.log(JSON.stringify({ payload: formula, validatorAccepted: true, procurementFormulaPreserved: true, reusableExporterFormulaPreserved: true, spreadsheetExecutionTested: false }));
