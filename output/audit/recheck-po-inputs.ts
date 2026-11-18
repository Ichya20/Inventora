import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { validatePurchaseOrderCreate } from '../../src/lib/purchaseOrderValidation';
import { validateParsedInvoice } from '../../src/lib/invoiceValidation';
import { receiptOrderItems, receiptMatchStatus, validatedReceiptPatch } from '../../src/lib/goodsReceipt';
import type { GoodsReceiptNote, PurchaseOrder } from '../../src/types';

const sources = new Map<string, ts.SourceFile>();
function source(file: string) {
  if (!sources.has(file)) sources.set(file, ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX));
  return sources.get(file)!;
}
function named(file: string, name: string) {
  const tree = source(file);
  let found: ts.Node | undefined;
  function visit(node: ts.Node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) found = node;
    if (ts.isVariableDeclaration(node) && node.name.getText(tree) === name) found = node.initializer;
    ts.forEachChild(node, visit);
  }
  visit(tree);
  assert.ok(found, `Missing actual source function ${name}`);
  return found.getText(tree);
}
function evaluate(context: vm.Context, name: string, code: string) {
  vm.runInContext(ts.transpileModule(`globalThis.${name} = (${code});`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);
}
const invoiceFile = 'src/components/SmartInvoiceParserModal.tsx';
const purchaseFile = 'src/components/PurchaseUnitView.tsx';
const modalFile = 'src/components/ThreeWayMatchModal.tsx';
const invoice = validateParsedInvoice({
  vendor: 'Audit Vendor A',
  items: [
    { name: 'Enterprise Server A', qty: 2, unitPrice: 100, subtotal: 200 },
    { name: 'Enterprise Server B', qty: 2, unitPrice: 200, subtotal: 400 },
  ],
  subtotal: 600, taxAmount: 0, grandTotal: 600,
});
const applyContext = vm.createContext({
  setVendor(value: string) { applyContext.vendor = value; },
  setItems(value: unknown) { applyContext.items = value; },
  setApplyVat() {}, setImportedTaxAmount() {}, setApplyPph() {}, setDiscountPercent() {}, setNotes() {},
});
evaluate(applyContext, 'applyInvoice', named(purchaseFile, 'handleApplyAiInvoice'));
applyContext.applyInvoice(invoice);
assert.equal(applyContext.items[0].sku, applyContext.items[1].sku);
const po = validatePurchaseOrderCreate({
  id: 'PO-AUDIT-COLLISION', vendor: invoice.vendor, desc: 'Local isolated audit fixture',
  date: '2026-11-18', deliveryDate: '2026-11-19', status: 'Pending Approval', color: 'orange',
  items: applyContext.items.map((item: any) => ({ ...item, subtotal: item.total })),
  subtotal: invoice.subtotal, total: invoice.grandTotal,
});
const approved = { ...po, status: 'Disetujui' } as PurchaseOrder;
const receiptItems = receiptOrderItems(approved).map(item => ({ ...item, receivedQty: item.orderedQty - 1 }));
const receipt: GoodsReceiptNote = {
  id: 'GRN-AUDIT', grnNumber: 'GRN-AUDIT', poId: approved.id, receivedDate: '2026-11-18',
  receivedBy: 'Audit Operator', suratJalanNumber: 'SJ-AUDIT', items: receiptItems,
  status: receiptMatchStatus(receiptItems), inspectorNotes: '',
};
const initial = validatedReceiptPatch(approved, receipt, 'Warehouse Manager');
const saved = { ...approved, ...initial } as PurchaseOrder;
const inspectionContext = vm.createContext({ receiptOrderItems });
evaluate(inspectionContext, 'inspect', named(modalFile, 'inspectionItems'));
const reopened = inspectionContext.inspect(saved);
assert.equal(reopened[1].name, reopened[0].name);
assert.notEqual(reopened[1].name, saved.grn!.items[1].name);
let receiptError = '';
try {
  validatedReceiptPatch(saved, { ...saved.grn!, items: reopened }, 'Warehouse Manager');
} catch (error) { receiptError = (error as Error).message; }
assert.match(receiptError, /tidak sesuai/);

let resolveParse!: (value: unknown) => void;
const pending = new Promise(resolve => { resolveParse = resolve; });
let posted: unknown;
const parserContext = vm.createContext({
  rawText: 'Quote A, vendor A, Enterprise Server A', parsed: null, loading: false,
  authenticatedPost(_url: string, body: unknown) { posted = body; return pending; },
  validateParsedInvoice,
  setParsed(value: unknown) { parserContext.parsed = value; },
  setRawText(value: string) { parserContext.rawText = value; },
  setIsLoading(value: boolean) { parserContext.loading = value; },
  setError(value: unknown) { parserContext.error = value; },
  onApply(value: unknown) { parserContext.applied = value; }, onClose() {},
});
evaluate(parserContext, 'parse', named(invoiceFile, 'handleParse'));
evaluate(parserContext, 'confirmApply', named(invoiceFile, 'handleConfirmApply'));
const invoiceTree = source(invoiceFile);
let textareaOnChange: ts.Expression | undefined;
function visitTextarea(node: ts.Node) {
  if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && node.tagName.getText(invoiceTree) === 'textarea') {
    const attr = node.attributes.properties.find(prop => ts.isJsxAttribute(prop) && prop.name.getText(invoiceTree) === 'onChange') as ts.JsxAttribute;
    if (attr?.initializer && ts.isJsxExpression(attr.initializer)) textareaOnChange = attr.initializer.expression;
  }
  ts.forEachChild(node, visitTextarea);
}
visitTextarea(invoiceTree);
assert.ok(textareaOnChange);
evaluate(parserContext, 'changeText', textareaOnChange.getText(invoiceTree));
const request = parserContext.parse();
assert.equal(parserContext.loading, true);
parserContext.changeText({ target: { value: 'Quote B, vendor B, different products' } });
assert.equal(parserContext.parsed, null);
resolveParse(invoice);
await request;
assert.equal(parserContext.rawText, 'Quote B, vendor B, different products');
assert.equal(parserContext.parsed.vendor, 'Audit Vendor A');
parserContext.confirmApply();
assert.equal(parserContext.applied.vendor, 'Audit Vendor A');

const fractional = validateParsedInvoice({
  vendor: 'Audit Vendor Fractional', items: [{ name: 'Fractional item', qty: 1.5, unitPrice: 100, subtotal: 150 }],
  subtotal: 150, taxAmount: 0, grandTotal: 150,
});
let fractionError = '';
try {
  validatePurchaseOrderCreate({ ...po, subtotal: 150, total: 150,
    items: fractional.items.map((item, index) => ({ ...item, id: String(index), sku: 'AUDIT-SKU' })),
    lineItems: undefined,
  });
} catch (error) { fractionError = (error as Error).message; }
assert.match(fractionError, /tidak konsisten/);

const findings = [
  {
    id: 'po-grn-duplicate-sku', severity: 'P2', verified: true,
    title: 'Saved GRN cannot be corrected when different lines share a SKU',
    source: ['src/components/PurchaseUnitView.tsx:173', 'src/lib/purchaseOrderValidation.ts:27', 'src/components/ThreeWayMatchModal.tsx:27', 'src/lib/goodsReceipt.ts:33'],
    trigger: 'Import Enterprise Server A and Enterprise Server B, create/approve PO, save a receipt discrepancy, reopen receipt.',
    observed: { sku: applyContext.items[0].sku, originalNames: saved.grn!.items.map(item => item.name), reopenedNames: Array.from(reopened, (item: any) => item.name), saveError: receiptError },
    impact: 'The second line is relabelled with the first line name and the unchanged reopened receipt is rejected; correcting or completing receipt is blocked.',
    remedy: 'Preserve line-position/line-ID identity when reopening receipts; generate collision-safe imported identifiers.',
  },
  {
    id: 'invoice-stale-response', severity: 'P2', verified: true,
    title: 'Invoice response is applied after source text has changed',
    source: ['src/components/SmartInvoiceParserModal.tsx:54', 'src/components/SmartInvoiceParserModal.tsx:55', 'src/components/SmartInvoiceParserModal.tsx:88', 'src/components/SmartInvoiceParserModal.tsx:64'],
    trigger: 'Start extracting quote A, replace textarea with quote B while request is pending, then let A response resolve and press Apply.',
    observed: { request: posted, currentText: parserContext.rawText, displayedResultVendor: parserContext.parsed.vendor, appliedVendor: parserContext.applied.vendor },
    impact: 'PO receives vendor/items from the old quote even though the current invoice text contains another quote.',
    remedy: 'Invalidate pending requests using a generation/source token when source text changes, or disable source editing during extraction.',
  },
  {
    id: 'invoice-po-fractional-contract', severity: 'P3', verified: true,
    title: 'Invoice extraction accepts fractional quantities that the PO form cannot submit',
    source: ['src/lib/invoiceValidation.ts:19', 'src/components/PurchaseUnitView.tsx:200', 'src/lib/purchaseOrderValidation.ts:21'],
    trigger: 'An extracted invoice contains qty 1.5 with a consistent subtotal.',
    observed: { acceptedInvoiceQty: fractional.items[0].qty, rejectedPOError: fractionError },
    impact: 'Extraction reports success and can populate the form, but creation fails until the user manually corrects the imported quantity.',
    remedy: 'Align accepted invoice quantity rules with PO rules, or consistently support fractional units throughout.',
  },
];
const reportPath = 'output/bug-audit/po-inputs.json';
fs.mkdirSync('output/bug-audit', { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify({ scope: 'PO, GRN, invoice inputs; isolated local source probes only', findings }, null, 2) + '\n');
console.log(JSON.stringify({ reportPath, verifiedFindings: findings.map(({ id, severity }) => ({ id, severity })) }, null, 2));
