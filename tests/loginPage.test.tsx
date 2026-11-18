import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import React, { act } from 'react';
import { JSDOM } from 'jsdom';
import { AuthForm, type AuthFormProps } from '../src/components/ui/sign-in-1';

function loginActions() {
  const source = ts.createSourceFile('App.tsx', fs.readFileSync('src/App.tsx', 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const callbacks = new Map<string, ts.Expression>();
  const names = ['handleGoogleLogin', 'handleDemoLogin'];
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && names.includes(node.name.getText(source)) && node.initializer) {
      callbacks.set(node.name.getText(source), node.initializer);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  assert.equal(callbacks.size, names.length);
  const state = {
    calls: [] as string[], errors: [] as string[], loading: [] as boolean[], domain: null as string | null,
    saved: null as Record<string, string> | null, failStorage: false,
    signIn: async (): Promise<unknown> => null,
  };
  const context = vm.createContext({
    authPending: { current: false }, lang: 'en', window: { location: { hostname: 'preview.inventora.test' } },
    setIsLoading(value: boolean) { state.loading.push(value); },
    setErrorMsg(value: string) { state.errors.push(value); },
    setUnauthorizedDomain(value: string | null) { state.domain = value; },
    setCopied() {}, setCopyError() {},
    clearDemoSession() { state.calls.push('clear-demo'); },
    sessionStorage: { setItem(key: string, value: string) {
      if (state.failStorage) throw new Error('Storage unavailable');
      state.calls.push(`save:${key}`); state.saved = JSON.parse(value);
    } },
    navigate(route: string) { state.calls.push(`navigate:${route}`); },
    require: () => ({ googleSignIn: () => state.signIn() }),
  });
  for (const [name, callback] of callbacks) {
    vm.runInContext(ts.transpileModule(`globalThis.${name} = (${callback.getText(source)});`, {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    }).outputText, context);
  }
  return { state, context, google: context.handleGoogleLogin as () => Promise<void>, demo: context.handleDemoLogin as (role?: string) => void };
}

test('pending Google login blocks repeat requests and demo navigation, then cancellation permits retry', async () => {
  const { state, context, google, demo } = loginActions();
  let finish!: (value: unknown) => void;
  let requests = 0;
  state.signIn = () => { requests++; return new Promise(resolve => { finish = resolve; }); };
  const pending = google();
  await new Promise(setImmediate);
  assert.equal(context.authPending.current, true);
  await google();
  demo('Super Admin');
  assert.equal(requests, 1);
  assert.equal(state.saved, null);
  assert.deepEqual(state.calls, []);
  finish(null);
  await pending;
  assert.equal(context.authPending.current, false);
  assert.equal(state.loading.at(-1), false);
  assert.deepEqual(state.calls, []);

  state.signIn = async () => { requests++; return { user: { uid: 'real-user' } }; };
  await google();
  assert.equal(requests, 2);
  assert.deepEqual(state.calls, ['clear-demo', 'navigate:/dashboard']);
});

test('Google error states release loading and allow a successful retry without retaining the domain warning', async () => {
  for (const code of ['auth/popup-closed-by-user', 'auth/cancelled-popup-request', 'auth/popup-blocked', 'auth/unauthorized-domain', 'auth/network-request-failed']) {
    const { state, context, google } = loginActions();
    state.signIn = async () => { throw { code, message: 'Sign-in could not finish' }; };
    await google();
    assert.equal(context.authPending.current, false, code);
    assert.equal(state.loading.at(-1), false, code);
    assert.deepEqual(state.calls, [], code);
    if (code === 'auth/unauthorized-domain') assert.equal(state.domain, 'preview.inventora.test');
    else if (code === 'auth/popup-blocked') assert.match(state.errors.at(-1)!, /allow popups/i);
    else if (code.includes('popup-closed') || code.includes('cancelled')) assert.equal(state.errors.at(-1), '');
    else assert.match(state.errors.at(-1)!, /could not finish/);

    state.signIn = async () => ({ user: { uid: 'real-user' } });
    await google();
    assert.equal(state.domain, null, code);
    assert.equal(state.errors.at(-1), '', code);
    assert.deepEqual(state.calls, ['clear-demo', 'navigate:/dashboard'], code);
  }
});

test('domain copy only reports success after clipboard completion and reports denied or absent clipboard access', async () => {
  const source = ts.createSourceFile('App.tsx', fs.readFileSync('src/App.tsx', 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let callback: ts.Expression | undefined;
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === 'copyDomain') callback = node.initializer;
    ts.forEachChild(node, visit);
  };
  visit(source); assert.ok(callback);
  for (const mode of ['success', 'denied', 'unavailable', 'no-domain']) {
    let finish!: () => void;
    let attempts = 0;
    const state = { copied: false, error: 'Previous copy failure' };
    const context = vm.createContext({
      unauthorizedDomain: mode === 'no-domain' ? null : 'preview.inventora.test', lang: 'en',
      setCopied(value: boolean) { state.copied = value; },
      setCopyError(value: string) { state.error = value; },
      navigator: mode === 'unavailable' ? {} : { clipboard: { writeText(text: string) {
        attempts++; assert.equal(text, 'preview.inventora.test');
        if (mode === 'denied') return Promise.reject(new Error('Permission denied'));
        return new Promise<void>(resolve => { finish = resolve; });
      } } },
    });
    vm.runInContext(ts.transpileModule(`globalThis.copy = (${callback.getText(source)});`, {
      compilerOptions: { target: ts.ScriptTarget.ES2022 },
    }).outputText, context);
    const pending = context.copy();
    if (mode === 'success') {
      assert.equal(state.copied, false, 'pending write must not report success');
      assert.equal(state.error, '');
      finish();
    }
    await pending;
    if (mode === 'success') { assert.equal(state.copied, true); assert.equal(state.error, ''); }
    else if (mode === 'no-domain') { assert.equal(attempts, 0); assert.equal(state.copied, false); }
    else { assert.equal(state.copied, false); assert.match(state.error, /select and copy/i); }
  }
});

test('demo choices preserve their role mapping and only navigate after the demo identity is saved', () => {
  for (const role of ['Super Admin', 'Warehouse Manager', 'Finance Manager', 'HR Manager']) {
    const { state, demo } = loginActions();
    demo(role);
    assert.deepEqual(state.saved, { role, email: `${role.toLowerCase().replace(/\s+/g, '.')}@inventora.com`, displayName: `${role} (Preview)` });
    assert.deepEqual(state.calls, ['save:inventora_demo_user', 'navigate:/dashboard']);
  }
  const { state, demo } = loginActions();
  state.failStorage = true;
  demo('Warehouse Manager');
  assert.equal(state.saved, null);
  assert.deepEqual(state.calls, []);
  assert.match(state.errors.at(-1)!, /browser storage/);
});

test('auth card exposes accessible content, runs real actions and disables every login path while pending', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://inventora.test' });
  const globals = ['window', 'document', 'navigator', 'HTMLElement', 'IS_REACT_ACT_ENVIRONMENT'];
  const originals = globals.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const);
  Object.defineProperties(globalThis, {
    window: { configurable: true, value: dom.window }, document: { configurable: true, value: dom.window.document },
    navigator: { configurable: true, value: dom.window.navigator }, HTMLElement: { configurable: true, value: dom.window.HTMLElement },
    IS_REACT_ACT_ENVIRONMENT: { configurable: true, value: true },
  });
  const { createRoot } = await import('react-dom/client');
  const root = createRoot(dom.window.document.getElementById('root')!);
  const calls: string[] = [];
  const ref = React.createRef<HTMLDivElement>();
  const props: AuthFormProps = {
    title: 'Sign in to Inventora', description: 'Manage your inventory.', logo: <span>Inventora logo</span>,
    primaryAction: { label: 'Continue with Google', onClick: () => calls.push('google') },
    secondaryActions: [{ label: 'Warehouse Manager', description: 'Inventory and receipts', onClick: () => calls.push('warehouse') }],
    secondaryLabel: 'Explore the demo', secondaryDescription: 'Uses local sample data.',
    skipAction: { label: 'Back to Inventora', onClick: () => calls.push('back') },
    footerContent: <span>Access follows your account role.</span>,
  };
  const button = (label: string) => {
    const match = [...dom.window.document.querySelectorAll('button')].find(item => item.textContent?.includes(label));
    assert.ok(match, label); return match;
  };
  try {
    await act(async () => root.render(<AuthForm {...props} ref={ref} data-testid="auth-card"><p role="alert">Login can be retried.</p></AuthForm>));
    const card = dom.window.document.querySelector('section')!;
    assert.equal(dom.window.document.getElementById(card.getAttribute('aria-labelledby')!)!.textContent, props.title);
    assert.equal(dom.window.document.getElementById(card.getAttribute('aria-describedby')!)!.textContent, props.description);
    assert.equal(ref.current?.getAttribute('data-testid'), 'auth-card');
    assert.equal(dom.window.document.querySelector('details')!.open, false);
    assert.match(dom.window.document.querySelector('footer')!.textContent!, /account role/);
    assert.ok(dom.window.document.querySelector('[role="alert"]'));
    await act(async () => {
      button('Continue with Google').click();
      dom.window.document.querySelector('details')!.open = true;
      button('Warehouse Manager').click();
      button('Back to Inventora').click();
    });
    assert.deepEqual(calls, ['google', 'warehouse', 'back']);

    await act(async () => root.render(<AuthForm {...props} isLoading />));
    assert.equal(button('Continue with Google').getAttribute('aria-busy'), 'true');
    for (const label of ['Continue with Google', 'Warehouse Manager', 'Back to Inventora']) {
      assert.equal(button(label).disabled, true);
      await act(async () => button(label).click());
    }
    assert.equal(calls.length, 3);

    await act(async () => root.render(<AuthForm {...props}
      primaryAction={{ ...props.primaryAction, disabled: true }}
      secondaryActions={[{ ...props.secondaryActions![0], disabled: true }]} />));
    assert.equal(button('Continue with Google').disabled, true);
    assert.equal(button('Warehouse Manager').disabled, true);
    assert.equal(button('Back to Inventora').disabled, false);

    await act(async () => root.render(<AuthForm title="Inventora" logoSrc="/icon.svg" logoAlt="Inventora logo"
      primaryAction={props.primaryAction} />));
    assert.equal(dom.window.document.querySelector('section')!.hasAttribute('aria-describedby'), false);
    assert.equal(dom.window.document.querySelector('img')!.alt, 'Inventora logo');
    assert.equal(dom.window.document.querySelector('details'), null);
    assert.equal(dom.window.document.querySelector('footer'), null);
    assert.equal(dom.window.document.querySelectorAll('button').length, 1);
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});
