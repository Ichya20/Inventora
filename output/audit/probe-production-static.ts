import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFile, mkdir, stat, writeFile } from 'node:fs/promises';
import type { Server } from 'node:http';
import path from 'node:path';
import vm from 'node:vm';
import express from 'express';
import ts from 'typescript';

// Exercise the production middleware in the actual startServer function without
// importing Firebase, reading credentials, or binding the normal app/HMR ports.
const root = path.resolve('D:/Inventora');
const source = await readFile(path.join(root, 'server.ts'), 'utf8');
const ast = ts.createSourceFile('server.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const start = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'startServer');
assert.ok(start && ts.isFunctionDeclaration(start), 'startServer function was not found.');
const transpiled = ts.transpileModule(start.getText(ast), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;
let listener: Server | undefined;
const app = express();
const listen = app.listen.bind(app);
app.listen = ((...args: unknown[]) => {
  assert.equal(args[0], 3000, 'The source listen signature changed; re-review this probe.');
  listener = listen(0, '127.0.0.1', typeof args[2] === 'function' ? args[2] as () => void : undefined);
  return listener;
}) as typeof app.listen;

try {
  await vm.runInNewContext(transpiled + '\nstartServer();', {
    createApp: () => app,
    createViteServer: () => { throw new Error('The probe must not start Vite.'); },
    express,
    path,
    process: { env: { NODE_ENV: 'production' }, cwd: () => root },
    console: { log: () => undefined },
  }, { filename: 'isolated-production-static-probe.js', timeout: 3000 });
  assert.ok(listener, 'No isolated listener was created.');
  if (!listener.listening) await once(listener, 'listening');
  const address = listener.address();
  assert.ok(address && typeof address !== 'string' && address.address === '127.0.0.1');
  const base = `http://127.0.0.1:${address.port}`;
  const results = [];
  for (const filename of ['server.cjs', 'server.cjs.map']) {
    const localFile = await stat(path.join(root, 'dist', filename));
    const response = await fetch(`${base}/${filename}`, { signal: AbortSignal.timeout(5000) });
    const bytes = (await response.arrayBuffer()).byteLength;
    assert.equal(response.status, 200, `${filename} was not served.`);
    assert.equal(bytes, localFile.size, `${filename} response size did not match the backend build artifact.`);
    results.push({ route: `/${filename}`, status: response.status, responseBytes: bytes, artifactBytes: localFile.size });
  }
  const report = {
    method: 'Actual startServer function extracted from server.ts via TypeScript AST and executed in a VM. createApp replaced by an empty Express app; app.listen overridden to an ephemeral 127.0.0.1 port. Production static middleware is unchanged.',
    scope: 'Local artifact exposure only. No Firebase imports, credentials, external network calls, or production requests.',
    result: 'Backend bundle and source map are publicly served by the current production static configuration.',
    requests: results,
  };
  const folder = path.join(root, 'output', 'security-audit');
  await mkdir(folder, { recursive: true });
  await writeFile(path.join(folder, 'production-static-probe.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ requests: results, listener: 'ephemeral loopback, closed on completion' }));
} finally {
  if (listener) {
    listener.closeAllConnections();
    await new Promise<void>((resolve, reject) => listener!.close(error => error ? reject(error) : resolve()));
  }
}
