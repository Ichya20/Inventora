import assert from 'node:assert/strict';
import { once } from 'node:events';
import fs from 'node:fs/promises';
import path from 'node:path';
import express from 'express';
import { attachProductionFrontend } from '../../server/staticAssets';

const dist = path.resolve('dist');
const app = express();
attachProductionFrontend(app, dist);
const listener = app.listen(0, '127.0.0.1');
await once(listener, 'listening');
const base = `http://127.0.0.1:${(listener.address() as { port: number }).port}`;
const results: { route: string; status: number; bytes: number }[] = [];
try {
  assert.equal((await fs.readdir(dist)).some(file => file.endsWith('.cjs') || file.endsWith('.map')), false);
  assert.ok((await fs.stat('build/server.cjs')).size > 0);
  const html = await fs.readFile(path.join(dist, 'index.html'), 'utf8');
  const entryAssets = Array.from(html.matchAll(/(?:src|href)="(\/assets\/[^"?]+)"/g), match => match[1]);
  assert.ok(entryAssets.length >= 2);
  const wasm = (await fs.readdir(path.join(dist, 'assets'))).find(file => file.endsWith('.wasm'))!;
  for (const route of ['/dashboard', '/index.html', '/sw.js', '/manifest.webmanifest', '/icon.svg', ...new Set(entryAssets), `/assets/${wasm}`, '/server.cjs', '/server.cjs.map', '/build/server.cjs']) {
    const response = await fetch(base + route, { signal: AbortSignal.timeout(5000) });
    const bytes = (await response.arrayBuffer()).byteLength;
    const expected = route.endsWith('.cjs') || route.endsWith('.map') ? 404 : 200;
    assert.equal(response.status, expected, route);
    results.push({ route, status: response.status, bytes });
  }
  await fs.mkdir('output/bug-audit', { recursive: true });
  await fs.writeFile('output/bug-audit/production-after-fixes.json', JSON.stringify({
    scope: 'Current production frontend build and actual static middleware on temporary loopback listener. No Firebase, credentials, browser, or deployment requests.',
    frontendContainsBackendBundle: false, serverBuild: 'build/server.cjs', requests: results,
  }, null, 2));
  console.log(JSON.stringify({ checked: results.length, backendRoutes: '404', frontendAndWasm: '200', serverBuild: 'build/server.cjs' }));
} finally {
  listener.closeAllConnections();
  await new Promise<void>((resolve, reject) => listener.close(error => error ? reject(error) : resolve()));
}
