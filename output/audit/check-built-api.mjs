import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { createApp } = createRequire(import.meta.url)(path.join(root, 'dist/server.cjs'));
const server = createApp().listen(0, '127.0.0.1');
try {
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const health = await fetch(base + '/api/health');
  assert.equal(health.status, 200);
  assert.equal((await health.json()).status, 'ok');
  for (const route of ['/api/purchase-orders', '/api/ai/forecast-restock']) {
    const response = await fetch(base + route, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(response.status, 401, route);
  }
  const html = await readFile(path.join(root, 'dist/index.html'), 'utf8');
  const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"?]+)"/g)].map(match => match[1]);
  assert.ok(assets.length > 0);
  await Promise.all(assets.map(asset => access(path.join(root, 'dist', asset))));
  console.log(JSON.stringify({ health: 200, anonymousCreate: 401, anonymousRestock: 401, linkedAssetsFound: assets.length }));
} finally {
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}
