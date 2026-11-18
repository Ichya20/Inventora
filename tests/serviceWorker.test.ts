import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const origin = 'https://inventora.test';
function response(body: string, status = 200) {
  const result = new Response(body, { status });
  Object.defineProperty(result, 'type', { value: 'basic' });
  return result;
}
function worker() {
  const listeners: Record<string, (event: any) => void> = {};
  const stores = new Map<string, Map<string, Response>>();
  const requested: string[] = [];
  let fetcher: (request: any) => Promise<Response> = async () => response('NETWORK');
  let skipped = false;
  let claimed = false;
  let unavailableCache = false;
  const key = (request: string | { url: string }) => new URL(typeof request === 'string' ? request : request.url, origin).href;
  const caches = {
    async open(name: string) {
      if (unavailableCache) throw new Error('Cache unavailable');
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name)!;
      return {
        async match(request: any) { return store.get(key(request))?.clone(); },
        async put(request: any, value: Response) { store.set(key(request), value.clone()); },
        async addAll(urls: string[]) { for (const url of urls) { requested.push(url); store.set(key(url), response('PRECACHE-' + url)); } },
      };
    },
    async keys() { return [...stores.keys()]; },
    async delete(name: string) { return stores.delete(name); },
  };
  const context = vm.createContext({ URL, Response, caches,
    fetch: (request: any) => fetcher(request),
    self: { location: { origin }, addEventListener(name: string, callback: (event: any) => void) { listeners[name] = callback; },
      async skipWaiting() { skipped = true; }, clients: { async claim() { claimed = true; } } },
  });
  vm.runInContext(fs.readFileSync('public/sw.js', 'utf8'), context);
  const lifecycle = async (name: string) => {
    let pending: Promise<unknown> | undefined;
    listeners[name]({ waitUntil(value: Promise<unknown>) { pending = value; } });
    assert.ok(pending); await pending;
  };
  const get = (url: string, options: { mode?: string; method?: string } = {}) => {
    let pending: Promise<Response> | undefined;
    listeners.fetch({ request: { url: new URL(url, origin).href, method: options.method ?? 'GET', mode: options.mode ?? 'cors' },
      respondWith(value: Promise<Response>) { pending = value; } });
    return pending;
  };
  return { stores, requested, lifecycle, get,
    set fetch(value: typeof fetcher) { fetcher = value; },
    set unavailableCache(value: boolean) { unavailableCache = value; },
    get skipped() { return skipped; }, get claimed() { return claimed; },
  };
}

test('service worker precaches the app shell and activation removes only older Inventora caches', async () => {
  const sw = worker();
  sw.stores.set('inventora-v1', new Map([[origin + '/server.cjs', response('OLD-BACKEND')]]));
  sw.stores.set('another-app-cache', new Map());
  await sw.lifecycle('install');
  assert.ok(sw.skipped);
  assert.deepEqual(sw.requested, ['/', '/index.html', '/manifest.webmanifest', '/icon.svg']);
  await sw.lifecycle('activate');
  assert.ok(sw.claimed);
  assert.equal(sw.stores.has('inventora-v1'), false);
  assert.equal(sw.stores.has('inventora-v2'), true);
  assert.equal(sw.stores.has('another-app-cache'), true);
});

test('service worker ignores backend, maps, arbitrary files, cross-origin and non-GET requests', () => {
  const sw = worker();
  for (const url of ['/api', '/api/report', '/api%2Freport', '/server.cjs', '/server.cjs.map', '/server%2ecjs', '/assets/server.cjs',
    '/assets/app.js.map', '/credentials.json', '/sw.js', 'https://googleapis.com/calendar']) {
    assert.equal(sw.get(url, { mode: 'navigate' }), undefined, url);
  }
  assert.equal(sw.get('/assets/app.js', { method: 'POST' }), undefined);
  assert.equal(sw.get('/data', { mode: 'cors' }), undefined);
});

test('HTML uses current network responses and retains the newest shell for offline routes', async () => {
  const sw = worker();
  await sw.lifecycle('install');
  sw.fetch = async () => response('NEW-INDEX');
  assert.equal(await (await sw.get('/index.html')!).text(), 'NEW-INDEX');
  sw.fetch = async () => response('NEW-DASHBOARD');
  assert.equal(await (await sw.get('/dashboard', { mode: 'navigate' })!).text(), 'NEW-DASHBOARD');
  sw.fetch = async () => { throw new Error('Offline'); };
  assert.equal(await (await sw.get('/dashboard', { mode: 'navigate' })!).text(), 'NEW-DASHBOARD');
  assert.equal(await (await sw.get('/settings', { mode: 'navigate' })!).text(), 'NEW-INDEX');
});

test('hashed assets use cache after the first fetch and missing offline files return a valid response', async () => {
  const sw = worker();
  let requests = 0;
  sw.fetch = async () => { requests++; return response('HASHED-ASSET'); };
  assert.equal(await (await sw.get('/assets/app-hash.js')!).text(), 'HASHED-ASSET');
  assert.equal(await (await sw.get('/assets/app-hash.js')!).text(), 'HASHED-ASSET');
  assert.equal(requests, 1);
  sw.fetch = async () => { throw new Error('Offline'); };
  const missing = await sw.get('/assets/missing-hash.wasm')!;
  assert.ok(missing instanceof Response); assert.equal(missing.status, 503);
  assert.equal((await sw.get('/dashboard', { mode: 'navigate' })!).status, 503);
});

test('cache failures do not prevent serving an online frontend response', async () => {
  const sw = worker(); sw.unavailableCache = true;
  sw.fetch = async () => response('ONLINE-WITHOUT-CACHE');
  assert.equal(await (await sw.get('/index.html')!).text(), 'ONLINE-WITHOUT-CACHE');
  assert.equal(await (await sw.get('/assets/app-hash.js')!).text(), 'ONLINE-WITHOUT-CACHE');
});
