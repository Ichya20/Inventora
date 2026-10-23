import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import { Modal, TableWrapper, Th } from '../../src/components/UI';
import { PurchaseUnitView } from '../../src/components/PurchaseUnitView';
import { validatePurchaseOrderCreate } from '../../src/lib/purchaseOrderValidation';

const noop = () => {};
const modal = renderToStaticMarkup(<Modal isOpen onClose={noop} title="Rincian PO"><button>Simpan</button></Modal>);
const table = renderToStaticMarkup(<TableWrapper title="Inventori" placeholder="Cari barang" searchValue="" onSearchChange={noop} currentPage={2} totalPages={3} onPageChange={noop}><thead><tr><Th sortable onSort={noop}>Stok</Th></tr></thead></TableWrapper>);
const sortableHeader = table.match(/<th\b([^>]*)>([\s\S]*?)<\/th>/);
const purchase = renderToStaticMarkup(<PurchaseUnitView role="Warehouse Manager" isDemo ownerId="audit" onNavigate={noop} lang="id" initialDraft={{ skuId: 'SKU-AUDIT', name: 'Barang uji', recommendedOrderQty: 2 }} />);
const priceInput = purchase.match(/<input[^>]*step="10000"[^>]*>/)?.[0];
assert.ok(priceInput, 'Verify the actual rendered unit-price constraints.');
const validOrder = validatePurchaseOrderCreate({ id: 'PO-UI-AUDIT', vendor: 'Vendor uji', desc: 'Barang uji', date: '2026-10-23', deliveryDate: '2026-10-27', status: 'Pending Approval', subtotal: 250000, total: 250000, items: [{ name: 'Barang uji', qty: 2, unitPrice: 125000, subtotal: 250000 }] });

const appSource = ts.createSourceFile('src/App.tsx', fs.readFileSync('src/App.tsx', 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let save: ts.VariableDeclaration | undefined;
function visit(node: ts.Node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(appSource) === 'handleSave') save = node;
  ts.forEachChild(node, visit);
}
visit(appSource);
assert.ok(save?.initializer);
const toasts: unknown[] = [];
let writes = 0;
const context = vm.createContext({ setIsSaving: noop, selectedLang: 'id', lang: 'id', onLanguageChange: noop, onToast: (...args: unknown[]) => toasts.push(args), setTimeout: (callback: () => void) => callback(), localStorage: { setItem: () => writes++ } });
vm.runInContext(ts.transpileModule(`(${save.initializer.getText(appSource)})();`, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText, context);

const results = {
  method: 'Local source inspection, actual React static rendering, actual settings callback with mocked timer. No browser or external service.',
  modalHasDialogRole: /role="(?:dialog|alertdialog)"/.test(modal),
  modalHasModalSemantics: /aria-modal="true"/.test(modal),
  sortableHeaderHasKeyboardControl: !!sortableHeader && (/tabindex=/.test(sortableHeader[1]) || /<button\b/.test(sortableHeader[2])),
  paginationButtonsHaveNames: [...table.matchAll(/<button([^>]*)>(.*?)<\/button>/gs)].every(([, attributes, content]) => /aria-label=|aria-labelledby=|title=/.test(attributes) || !!content.replace(/<svg\b[\s\S]*?<\/svg>/g, '').replace(/<[^>]+>/g, '').trim()),
  poPriceConstraint: { min: 0, step: 10000, examplePrice: validOrder.items![0].unitPrice, acceptedByServerValidator: true, conformsToRenderedStep: (125000 - 0) % 10000 === 0 },
  profileSave: { toastCount: toasts.length, localStorageWrites: writes, includesSuccessToast: toasts.some((toast: any) => toast[1] === 'success') },
  paginationStillEnglish: table.includes('Page <span') && table.includes('of <span'),
};
fs.writeFileSync('output/audit/ui-review-2026-10-23.json', JSON.stringify(results, null, 2) + '\n');
console.log(JSON.stringify(results, null, 2));
