import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function analyst(post: () => Promise<{ result?: string; error?: string }>) {
  const source = ts.createSourceFile('AnalyticsView.tsx', fs.readFileSync('src/components/AnalyticsView.tsx', 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let callback: ts.Expression | undefined;
  function visit(node: ts.Node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === 'handleAskAnalyst') callback = node.initializer;
    else ts.forEachChild(node, visit);
  }
  visit(source);
  assert.ok(callback);
  const context = vm.createContext({
    aiPrompt: 'Ringkas anggaran', aiRequestPending: { current: false }, lang: 'id', pieData: [], barData: [],
    authenticatedPost: post, setIsAiLoading(value: boolean) { context.loading = value; },
    setAiAnalysis(value: string | null) { context.analysis = value; }, setAiError(value: string | null) { context.error = value; },
  });
  vm.runInContext(ts.transpileModule(`globalThis.ask = (${callback.getText(source)});`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);
  return { context, ask: context.ask as (prompt?: string) => Promise<void> };
}

test('analyst suggestion clicks share one pending request and become available after completion', async () => {
  let requests = 0;
  let finish!: (value: { result: string }) => void;
  const pending = new Promise<{ result: string }>(resolve => { finish = resolve; });
  const action = analyst(async () => { requests++; return pending; });
  const first = action.ask('Anggaran');
  await action.ask('Risiko vendor');
  assert.equal(requests, 1);
  assert.equal(action.context.loading, true);
  finish({ result: 'Ringkasan tersedia.' });
  await first;
  assert.equal(action.context.analysis, 'Ringkasan tersedia.');
  assert.equal(action.context.loading, false);
  await action.ask('Coba lagi');
  assert.equal(requests, 2);
});

test('missing analyst results and failed requests show errors without presenting an analysis', async () => {
  const empty = analyst(async () => ({}));
  await empty.ask();
  assert.equal(empty.context.analysis, null);
  assert.match(empty.context.error, /belum tersedia/);
  assert.equal(empty.context.loading, false);
  const failed = analyst(async () => { throw new Error('Layanan tidak tersedia.'); });
  await failed.ask();
  assert.equal(failed.context.analysis, null);
  assert.equal(failed.context.error, 'Layanan tidak tersedia.');
  assert.equal(failed.context.aiRequestPending.current, false);
});

test('billing add-on changes are applied only after storage succeeds', () => {
  const source = ts.createSourceFile('BillingSubscriptionView.tsx', fs.readFileSync('src/components/BillingSubscriptionView.tsx', 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let callback: ts.Expression | undefined;
  function visit(node: ts.Node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === 'handleSaveAddons') callback = node.initializer;
    else ts.forEachChild(node, visit);
  }
  visit(source);
  assert.ok(callback);
  for (const fail of [false, true]) {
    const context = vm.createContext({
      addonDraft: { extraSeats: 10, extraAiPacks: 0, dedicatedDatabase: true }, lang: 'id',
      applied: null, open: true, messages: [] as string[],
      saveStoredData(_key: string, _draft: unknown, strict: boolean) { assert.equal(strict, true); if (fail) throw new Error('Full storage'); },
      setAddons(value: unknown) { context.applied = value; }, setIsAddonModalOpen(value: boolean) { context.open = value; },
      onToast(_message: string, type: string) { context.messages.push(type); },
    });
    vm.runInContext(ts.transpileModule(`globalThis.save = (${callback.getText(source)});`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);
    context.save();
    assert.equal(context.open, fail);
    assert.equal(context.messages.at(-1), fail ? 'error' : 'success');
    assert.equal(context.applied, fail ? null : context.addonDraft);
  }
});
