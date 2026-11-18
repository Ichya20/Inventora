const CACHE_NAME = 'inventora-v2';
const PRECACHE_ASSETS = ['/', '/index.html', '/manifest.webmanifest', '/icon.svg'];
const PUBLIC_FILES = new Set(['/icon.svg', '/manifest.webmanifest']);

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys
    .filter(key => key.startsWith('inventora-') && key !== CACHE_NAME)
    .map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

async function cachedResponse(request) {
  try { return await (await caches.open(CACHE_NAME)).match(request); }
  catch { return undefined; }
}

async function remember(request, response) {
  if (response.status !== 200 || response.type !== 'basic') return;
  try { await (await caches.open(CACHE_NAME)).put(request, response.clone()); }
  catch { /* A full or unavailable cache must not prevent online use. */ }
}

function offlineResponse() {
  return new Response('Offline. This file is not cached.', { status: 503, headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
}

async function networkFirst(request, documentRequest) {
  try {
    const response = await fetch(request);
    if (response.status >= 500) throw new Error('Frontend unavailable');
    await remember(request, response);
    return response;
  } catch {
    return await cachedResponse(request)
      || (documentRequest && await cachedResponse('/index.html'))
      || offlineResponse();
  }
}

async function assetResponse(request) {
  const cached = await cachedResponse(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    await remember(request, response);
    return response;
  } catch { return offlineResponse(); }
}

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  let pathname;
  try { pathname = decodeURIComponent(url.pathname).replace(/\\/g, '/'); }
  catch { return; }
  if (pathname === '/api' || pathname.startsWith('/api/') || /\.(?:cjs|map)$/i.test(pathname)) return;

  const documentRequest = pathname === '/' || pathname === '/index.html'
    || (request.mode === 'navigate' && !pathname.split('/').pop().includes('.'));
  const asset = pathname.startsWith('/assets/')
    && /\.(?:js|css|wasm|json|lottie|svg|png|jpe?g|gif|webp|avif|ico|woff2?|ttf|otf|mp4|webm)$/i.test(pathname);

  if (documentRequest || PUBLIC_FILES.has(pathname)) {
    event.respondWith(networkFirst(request, documentRequest));
  } else if (asset) {
    event.respondWith(assetResponse(request));
  }
});
