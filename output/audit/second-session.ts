import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { readQueue, acknowledgeMutation } from '../../src/lib/offlineQueue';
import { canAccessMenu, isStaffRole } from '../../src/lib/authorization';

// Actual hook with in-memory browser bindings. Effects are not scheduled; no network or account is used.
const tree = ts.createSourceFile('useNetworkStatus.ts', fs.readFileSync('src/lib/useNetworkStatus.ts', 'utf8'), ts.ScriptTarget.Latest, true);
const declaration = tree.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'useNetworkStatus')!;
const legacy = { id: 'LEGACY-1', entityId: 'PO-LEGACY-PRIVATE', description: 'Vendor lama, Rp 250.000.000',
  type: 'APPROVE_PO', timestamp: '2026-10-10T00:00:00Z', payload: {} };
const raw = JSON.stringify([legacy]);
const context = vm.createContext({
  useState: (value: any) => [typeof value === 'function' ? value() : value, () => {}],
  useRef: (value: unknown) => ({ current: value }), useCallback: (value: unknown) => value, useEffect() {},
  readQueue, acknowledgeMutation, navigator: { onLine: true },
  localStorage: { getItem: () => raw },
});
vm.runInContext(ts.transpileModule(`globalThis.hook = (${declaration.getText(tree).replace(/^export /, '')});`,
  { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);
// readQueue is imported from the real module, so its browser storage argument is still in-memory.
const result = context.hook({ ownerId: 'different-hr-uid', execute: async () => { assert.fail('No mutation expected'); } });
assert.equal(isStaffRole('HR Manager'), true);
assert.equal(canAccessMenu('HR Manager', 'po'), false);
assert.equal(result.queue.length, 1);
assert.equal(result.queue[0].entityId, legacy.entityId);
assert.equal(result.queue[0].description, legacy.description);
const app = fs.readFileSync('src/App.tsx', 'utf8');
assert.ok(app.includes('{isStaffRole(currentRole) && <NetworkStatusIndicator'));
const report = {
  scope: 'Current useNetworkStatus hook executed with memory storage; App/NetworkStatusIndicator rendering conditions reviewed. No browser/Firebase.',
  finding: { id: 'LEGACY-QUEUE-VISIBILITY', severity: 'P3 conditional',
    source: ['src/lib/useNetworkStatus.ts:89', 'src/App.tsx:704', 'src/components/NetworkStatusIndicator.tsx:109'],
    trigger: 'An old offline queue contains an entry without ownerId; another staff account, including HR Manager, opens Network & Synchronization Status.',
    observed: { accountHasPoAccess: false, visibleCount: result.queue.length, entityId: result.queue[0].entityId, description: result.queue[0].description },
    impact: 'Legacy PO details remain visible across accounts even when the account cannot open PO. Unowned entries cannot auto-sync, so this is display isolation, not a write authorization bypass.',
    limitation: 'Requires preexisting legacy queue without ownerId. New enqueue operations always attach an owner.' },
};
fs.mkdirSync('output/bug-audit', { recursive: true });
fs.writeFileSync('output/bug-audit/second-session.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ reproduced: report.finding.id, visibleToHr: result.queue.length }));
