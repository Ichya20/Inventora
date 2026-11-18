import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { loadStoredData, saveStoredData } from '../../src/lib/storageUtils';
import { normalizePurchaseOrder } from '../../src/lib/procurement';

// Real PO initializer and persistence effect; all storage stays in this process.
const memory = new Map<string, string>();
Object.assign(globalThis, { localStorage: {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => memory.set(key, value),
} });
const tree = ts.createSourceFile('ProcurementView.tsx', fs.readFileSync('src/components/ProcurementView.tsx', 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let initializer: ts.Expression | undefined;
let persistence: ts.Expression | undefined;
function visit(node: ts.Node) {
  if (ts.isVariableDeclaration(node) && ts.isArrayBindingPattern(node.name)
    && node.name.elements[0]?.getText(tree) === 'pos' && node.initializer && ts.isCallExpression(node.initializer)) {
    initializer = node.initializer.arguments[0];
  }
  if (ts.isCallExpression(node) && node.expression.getText(tree) === 'useEffect'
    && node.arguments[1]?.getText(tree) === '[pos]'
    && node.arguments[0]?.getText(tree).includes('saveStoredData(storageKey, pos)')) persistence = node.arguments[0];
  ts.forEachChild(node, visit);
}
visit(tree);
assert.ok(initializer && persistence);
const context = vm.createContext({ loadStoredData, saveStoredData, normalizePurchaseOrder,
  storageKey: 'audit-po-cache', isDemo: false, defaultPOs: [], pos: null });
vm.runInContext(ts.transpileModule(`globalThis.initialize = (${initializer.getText(tree)});
globalThis.persist = (${persistence.getText(tree)});`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);

memory.set('audit-po-cache', '{}');
assert.throws(() => context.initialize(), /map is not a function/);
const corrupt = '[{"id":"RECOVERABLE-PO"}';
memory.set('audit-po-cache', corrupt);
context.pos = context.initialize();
assert.ok(Array.isArray(context.pos));
assert.equal(context.pos.length, 0);
context.persist();
assert.equal(memory.get('audit-po-cache'), '[]');
assert.notEqual(memory.get('audit-po-cache'), corrupt);

fs.mkdirSync('output/bug-audit', { recursive: true });
fs.writeFileSync('output/bug-audit/po-cache.json', JSON.stringify({
  scope: 'Actual PO initialization/persistence callbacks with in-memory storage; no browser or Firebase.',
  findings: [{ id: 'PO-CACHE-RECOVERY', severity: 'P2 conditional',
    source: ['src/components/ProcurementView.tsx:199', 'src/components/ProcurementView.tsx:204', 'src/lib/storageUtils.ts:5'],
    trigger: 'PO cache already contains a non-array JSON value or truncated JSON.',
    observed: { objectCache: 'initializer throws: .map is not a function', truncatedCache: 'fallback [] is saved over original bytes' },
    impact: 'Opening PO fails before subscription starts, or discards recoverable cached bytes. Live authoritative Firestore records are not erased.',
    limitation: 'Requires damaged/preexisting cache; no normal form input producing this cache was established.' }],
}, null, 2));
console.log(JSON.stringify({ reproduced: ['non-array cache crashes PO initializer', 'truncated cache overwritten by mount persistence'] }));
