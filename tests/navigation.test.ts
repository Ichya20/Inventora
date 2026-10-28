import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { canAccessMenu } from '../src/lib/authorization';

// Exercise the real hook with a small effect scheduler so rerender cleanup and
// shortcut expiry are covered without a browser session.
function hotkeys() {
  const states: unknown[] = [], effects: { deps?: unknown[]; cleanup?: () => void }[] = [];
  const queued: { index: number; run: () => (() => void) | void; deps: unknown[] }[] = [];
  const listeners = new Set<(event: any) => void>();
  const timers = new Map<number, { due: number; run: () => void }>();
  let stateIndex = 0, effectIndex = 0, now = 0, nextTimer = 0, dialogOpen = false;
  const calls: string[] = [];
  const callbacks = {
    onNavigate: (menu: string) => calls.push(menu), onNewPo: () => calls.push('purchase'),
    onOpenHelp: () => calls.push('help'), onToggleCmdK: () => calls.push('palette'), onToggleCopilot: () => calls.push('copilot'),
  };
  const react = {
    useState(initial: unknown) {
      const index = stateIndex++;
      if (!(index in states)) states[index] = initial;
      return [states[index], (next: unknown) => { states[index] = typeof next === 'function' ? next(states[index]) : next; }];
    },
    useEffect(run: () => (() => void) | void, deps: unknown[]) {
      const index = effectIndex++;
      if (!effects[index] || deps.some((value, i) => !Object.is(value, effects[index].deps?.[i]))) queued.push({ index, run, deps });
    },
  };
  const context = vm.createContext({
    exports: {}, require: (name: string) => name === 'react' ? react : {},
    window: { addEventListener: (_: string, fn: (event: any) => void) => listeners.add(fn), removeEventListener: (_: string, fn: (event: any) => void) => listeners.delete(fn) },
    document: { querySelector: () => dialogOpen },
    setTimeout: (run: () => void, delay: number) => { const id = ++nextTimer; timers.set(id, { due: now + delay, run }); return id; },
    clearTimeout: (id: number) => timers.delete(id),
  });
  vm.runInContext(ts.transpileModule(fs.readFileSync('src/components/ShortcutsModal.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
  }).outputText, context);
  function render() {
    stateIndex = 0; effectIndex = 0;
    const result = context.exports.useGlobalHotkeys(callbacks);
    while (queued.length) {
      const effect = queued.shift()!; effects[effect.index]?.cleanup?.();
      effects[effect.index] = { deps: effect.deps, cleanup: effect.run() || undefined };
    }
    return result;
  }
  render();
  return {
    calls, render,
    key(key: string, extras: Record<string, unknown> = {}) {
      const event = { key, defaultPrevented: false, repeat: false, target: { tagName: 'DIV', isContentEditable: false },
        preventDefault() { this.defaultPrevented = true; }, ...extras };
      [...listeners].forEach(fn => fn(event)); return render();
    },
    advance(ms: number) { now += ms; for (const [id, timer] of [...timers]) if (timer.due <= now) { timers.delete(id); timer.run(); } return render(); },
    setDialog(open: boolean) { dialogOpen = open; },
    dispose() { effects.forEach(effect => effect.cleanup?.()); },
  };
}

test('module sequences expire after rerenders and do not navigate on a stale second key', () => {
  const f = hotkeys();
  assert.equal(f.key('g').pendingSequence, 'g');
  f.render();
  assert.equal(f.advance(1200).pendingSequence, null);
  f.key('p'); assert.deepEqual(f.calls, []);
  f.key('g'); f.key('p'); assert.deepEqual(f.calls, ['po']);
  f.key('n'); f.advance(1200); f.key('p'); assert.deepEqual(f.calls, ['po']);
  f.key('n'); f.key('p'); assert.deepEqual(f.calls, ['po', 'purchase']);
  f.dispose();
});

test('overlay shortcuts toggle once per press and ignore held or already handled keys', () => {
  const f = hotkeys();
  f.key('k', { ctrlKey: true }); f.key('k', { ctrlKey: true });
  f.key('k', { ctrlKey: true, repeat: true }); f.key('k', { ctrlKey: true, defaultPrevented: true });
  f.key('j', { metaKey: true });
  assert.deepEqual(f.calls, ['palette', 'palette', 'copilot']);
  f.key('g', { ctrlKey: true }); f.key('p');
  f.key('g', { target: { tagName: 'INPUT' } }); f.key('p');
  f.setDialog(true); f.key('g'); f.key('p');
  assert.deepEqual(f.calls, ['palette', 'palette', 'copilot']);
  f.dispose();
});

function sourceCallback(file: string, name: string, context: vm.Context) {
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let expression: ts.Expression | undefined;
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText() === name) expression = node.initializer;
    if (!expression) ts.forEachChild(node, visit);
  };
  visit(source); assert.ok(expression, name);
  vm.runInContext(ts.transpileModule(`globalThis.callback = (${expression.getText()});`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);
  return context.callback;
}

test('assistant only marks copy complete after clipboard succeeds and shows rejected copy feedback', async () => {
  const context = vm.createContext({
    lang: 'id', copyTimer: { current: null }, stripAiClutter: (text: string) => text,
    setCopyError: (value: string) => { context.error = value; }, setCopiedId: (value: string | null) => { context.copied = value; },
    navigator: { clipboard: { writeText: async () => { throw new Error('denied'); } } }, setTimeout: () => 1, clearTimeout() {},
  });
  const copy = sourceCallback('src/components/AiCopilotDrawer.tsx', 'copyToClipboard', context);
  await copy('reply', 'Content'); assert.equal(context.copied, null); assert.match(context.error, /Belum dapat disalin/);
  context.navigator.clipboard.writeText = async () => {};
  await copy('reply', 'Content'); assert.equal(context.copied, 'reply'); assert.equal(context.error, '');
});

test('module navigation clears stale PO requests and preserves role restrictions', () => {
  const context = vm.createContext({ currentRole: 'Warehouse Manager', language: 'id', canAccessMenu,
    setRestockDraft() {}, setRequestedPoId(value: string | null) { context.po = value; },
    setActiveMenu(menu: string) { context.menu = menu; }, setIsSidebarOpen() {}, showToast: (...args: unknown[]) => { context.toast = args; },
  });
  const navigate = sourceCallback('src/App.tsx', 'handleMenuClick', context);
  navigate('stok'); assert.equal(context.po, null); assert.equal(context.menu, 'stok');
  navigate('billing'); assert.equal(context.menu, 'stok'); assert.equal(context.toast[1], 'error');
});
