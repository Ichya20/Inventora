import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import express from 'express';
import { once } from 'node:events';
import { attachProductionFrontend } from '../server/staticAssets';
import { csvCell } from '../src/lib/exportUtils';
import { clearDemoSession, readDemoUser } from '../src/lib/demoSession';

test('CSV text neutralizes formula markers without changing numeric amounts or ordinary text', () => {
  for (const value of ['=1+1', '+SUM(1,2)', '-1+2', '@SUM(A1)', ' \t=1+1', '\uFEFF=1+1', '\rformula', '\nformula']) {
    assert.equal(csvCell(value), `"'${value}"`);
  }
  assert.equal(csvCell(-100), '"-100"');
  assert.equal(csvCell(100.5), '"100.5"');
  assert.equal(csvCell('Vendor "A", Jakarta\nDelivery #1'), '"Vendor ""A"", Jakarta\nDelivery #1"');
  assert.equal(csvCell(null), '""');
});

test('CSV downloads preserve quotes, Unicode, newlines and URL-fragment characters', async () => {
  let captured: Blob | undefined;
  let clicked = false;
  let revoked = false;
  const attributes: Record<string, string> = {};
  const link = { set href(value: string) { attributes.href = value; }, set download(value: string) { attributes.download = value; },
    click() { clicked = true; }, remove() {} };
  const context = vm.createContext({ Blob,
    URL: { createObjectURL(blob: Blob) { captured = blob; return 'blob:csv-test'; }, revokeObjectURL() { revoked = true; } },
    document: { createElement: () => link, body: { appendChild() {} } },
    setTimeout(callback: () => void) { callback(); },
  });
  const source = (await fs.readFile('src/lib/exportUtils.ts', 'utf8')).replace(/export function /g, 'function ');
  vm.runInContext(ts.transpileModule(source + '\nglobalThis.download = exportToCsv;', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);
  context.download('audit', ['Notes', 'Amount'], [['=1+1', 100], ['Barang #1, "uji"\nTiba besok', 0]]);
  assert.ok(clicked && revoked && captured);
  assert.equal(attributes.download, 'audit.csv');
  const bytes = new Uint8Array(await captured.arrayBuffer());
  assert.deepEqual(Array.from(bytes.slice(0, 3)), [0xef, 0xbb, 0xbf]);
  const csv = await captured.text();
  assert.ok(csv.includes('"\'=1+1","100"'));
  assert.ok(csv.includes('"Barang #1, ""uji""\nTiba besok","0"'));
});

test('production only serves frontend assets and routes, including when stale backend files remain in dist', async () => {
  const fixture = await fs.mkdtemp(path.join(os.tmpdir(), 'inventora-static-test-'));
  const publicDir = path.join(fixture, 'dist');
  await fs.mkdir(path.join(publicDir, 'assets'), { recursive: true });
  await Promise.all([
    fs.writeFile(path.join(publicDir, 'index.html'), '<html>INVENTORA-FRONTEND</html>'),
    fs.writeFile(path.join(publicDir, 'assets', 'app-hash.js'), '/* FRONTEND-ASSET */'),
    fs.writeFile(path.join(publicDir, 'icon.svg'), '<svg/>'),
    fs.writeFile(path.join(publicDir, 'manifest.webmanifest'), '{}'),
    fs.writeFile(path.join(publicDir, 'sw.js'), '/* SERVICE-WORKER */'),
    fs.writeFile(path.join(publicDir, 'server.cjs'), 'PRIVATE-BACKEND-SENTINEL'),
    fs.writeFile(path.join(publicDir, 'server.cjs.map'), 'PRIVATE-SOURCEMAP-SENTINEL'),
  ]);
  const app = express();
  attachProductionFrontend(app, publicDir);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  try {
    for (const route of ['/', '/index.html', '/dashboard', '/login']) {
      const response = await fetch(base + route);
      assert.equal(response.status, 200);
      assert.match(await response.text(), /INVENTORA-FRONTEND/);
      assert.equal(response.headers.get('cache-control'), 'no-cache');
    }
    const asset = await fetch(base + '/assets/app-hash.js');
    assert.equal(asset.status, 200);
    assert.match(await asset.text(), /FRONTEND-ASSET/);
    assert.match(asset.headers.get('cache-control')!, /immutable/);
    for (const route of ['/icon.svg', '/manifest.webmanifest', '/sw.js']) {
      assert.equal((await fetch(base + route)).status, 200);
    }
    const swTree = ts.createSourceFile('sw.js', await fs.readFile('public/sw.js', 'utf8'), ts.ScriptTarget.Latest, true);
    const precache = swTree.statements.filter(ts.isVariableStatement).flatMap(node => [...node.declarationList.declarations])
      .find(node => node.name.getText(swTree) === 'PRECACHE_ASSETS')!.initializer as ts.ArrayLiteralExpression;
    for (const entry of precache.elements) {
      const route = (entry as ts.StringLiteral).text;
      assert.equal((await fetch(base + route)).status, 200, `Service worker precache: ${route}`);
    }
    for (const route of ['/server.cjs', '/server.cjs.map', '/server%2ecjs', '/assets/%2e%2e/server.cjs', '/assets/missing', '/api/missing', '/missing.js']) {
      const response = await fetch(base + route);
      const body = await response.text();
      assert.ok(!body.includes('PRIVATE-'), route);
      if (route !== '/server%2ecjs') assert.equal(response.status, 404, route);
    }
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    assert.equal(path.dirname(path.resolve(fixture)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(fixture).startsWith('inventora-static-test-'));
    await fs.rm(fixture, { recursive: true });
  }
});

test('compiled startup selects production frontend without a NODE_ENV override', async () => {
  const source = ts.createSourceFile('server.ts', await fs.readFile('server.ts', 'utf8'), ts.ScriptTarget.Latest, true);
  const start = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'startServer')!;
  let mounted = false;
  let listening = false;
  const context = vm.createContext({ path, process: { env: {}, argv: ['node', 'build/server.cjs'], cwd: () => 'D:/Inventora' },
    createApp: () => ({ listen() { listening = true; } }),
    createViteServer() { throw new Error('Production must not launch Vite or HMR'); },
    attachProductionFrontend() { mounted = true; },
  });
  await vm.runInContext(ts.transpileModule(start.getText(source) + '\nstartServer();', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);
  assert.ok(mounted && listening);
});

test('Home and Login remain usable when browser language storage throws', async () => {
  const tree = ts.createSourceFile('App.tsx', await fs.readFile('src/App.tsx', 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  for (const name of ['Home', 'Login']) {
    const component = tree.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name)!;
    let initializer: ts.Expression | undefined;
    let toggle: ts.Expression | undefined;
    const visit = (node: ts.Node) => {
      if (ts.isVariableDeclaration(node) && ts.isArrayBindingPattern(node.name) && node.name.elements[0]?.getText(tree) === 'lang'
        && node.initializer && ts.isCallExpression(node.initializer)) initializer = node.initializer.arguments[0];
      if (ts.isVariableDeclaration(node) && node.name.getText(tree) === 'handleLangToggle') toggle = node.initializer;
      ts.forEachChild(node, visit);
    };
    visit(component);
    assert.ok(initializer && toggle);
    const context = vm.createContext({ localStorage: { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } },
      setLang(lang: string) { context.lang = lang; } });
    vm.runInContext(ts.transpileModule(`globalThis.initialize = (${initializer.getText(tree)}); globalThis.toggle = (${toggle.getText(tree)});`,
      { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);
    assert.equal(context.initialize(), 'en', name);
    assert.doesNotThrow(() => context.toggle('id'), name);
    assert.equal(context.lang, 'id', name);
  }
});

test('restricted session storage cannot cause silent demo navigation or mask a successful real sign-in', async () => {
  const tree = ts.createSourceFile('App.tsx', await fs.readFile('src/App.tsx', 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const callbacks = new Map<string, ts.Expression>();
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && ['handleGoogleLogin', 'handleDemoLogin'].includes(node.name.getText(tree)) && node.initializer) {
      callbacks.set(node.name.getText(tree), node.initializer);
    }
    ts.forEachChild(node, visit);
  };
  visit(tree);
  const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  const denied = { getItem() { throw new Error('Storage denied'); }, setItem() { throw new Error('Storage denied'); }, removeItem() { throw new Error('Storage denied'); } };
  const context = vm.createContext({ sessionStorage: denied, clearDemoSession, lang: 'en',
    setIsLoading() {}, setUnauthorizedDomain() {}, setErrorMsg(message: string) { context.error = message; },
    navigate(route: string) { context.route = route; },
    require: () => ({ googleSignIn: async () => ({ user: { uid: 'real-user' } }) }),
  });
  for (const [name, expression] of callbacks) {
    vm.runInContext(ts.transpileModule(`globalThis.${name} = (${expression.getText(tree)});`,
      { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, context);
  }
  try {
    Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: denied });
    assert.equal(readDemoUser(), null);
    assert.doesNotThrow(() => clearDemoSession());
    context.handleDemoLogin();
    assert.equal(context.route, undefined);
    assert.match(context.error, /Demo login needs browser storage/);
    await context.handleGoogleLogin();
    assert.equal(context.route, '/dashboard');
    assert.equal(context.error, '');

    Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: {
      getItem: () => '{"role":"Super Admin","email":"demo@example.test"}', removeItem() { throw new Error('Cannot remove'); },
    } });
    context.route = undefined;
    await context.handleGoogleLogin();
    assert.equal(context.route, undefined);
    assert.match(context.error, /demo session could not be cleared/i);
  } finally {
    if (originalStorage) Object.defineProperty(globalThis, 'sessionStorage', originalStorage);
    else Reflect.deleteProperty(globalThis, 'sessionStorage');
  }
});
