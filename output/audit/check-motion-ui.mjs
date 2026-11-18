import assert from 'node:assert/strict';
import { createServer } from 'vite';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// Server rendering only: no browser, HMR listener, real account, or stored user data.
const memory = new Map();
Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: { getItem: key => memory.get(key) ?? null } });
const vite = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false, watch: null }, optimizeDeps: { noDiscovery: true, include: [] }, ssr: { noExternal: ['react-router-dom', 'react-router'], resolve: { conditions: ['module-sync', 'module', 'node'] } }, appType: 'custom' });
try {
  const { MemoryRouter } = await vite.ssrLoadModule('react-router-dom');
  const { OpeningSequence } = await vite.ssrLoadModule('/src/components/OpeningSequence.tsx');
  const { InventoraMark } = await vite.ssrLoadModule('/src/components/InventoraMark.tsx');
  const { InventoraLoadingScreen } = await vite.ssrLoadModule('/src/components/InventoraLoadingScreen.tsx');
  const { ViewSkeleton } = await vite.ssrLoadModule('/src/components/ViewSkeleton.tsx');
  const { Modal, Drawer, UILanguageContext } = await vite.ssrLoadModule('/src/components/UI.tsx');
  const original = renderToStaticMarkup(React.createElement(InventoraMark));
  assert.equal((original.match(/<rect /g) ?? []).length, 4);
  for (const signature of ['viewBox="0 0 24 24"', 'width="8" height="8" rx="1.5"', 'fill-opacity="0.15"']) assert.ok(original.includes(signature));
  for (const lang of ['id', 'en']) {
    const renderOpening = () => renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(OpeningSequence, { lang, onLanguageChange() {} })));
    memory.clear();
    const first = renderOpening();
    assert.equal((first.match(/>Inventora</g) ?? []).length, 1);
    const mark = first.match(/<svg[^>]*class="inventora-mark[^"]*"[^>]*>[\s\S]*?<\/svg>/)?.[0] ?? '';
    assert.equal((mark.match(/<rect /g) ?? []).length, 4);
    assert.match(first, /width="288" height="288"/);
    assert.match(first, /hero-visual/);
    assert.doesNotMatch(first, /opening-sheet|opening-primary-action/);
    assert.doesNotMatch(first, /opening-registration|opening-ground|opening-footer/);
    assert.match(first, /is-revealing/);
    assert.match(first, /href="\/login"/);
    assert.doesNotMatch(first, /Putar ulang animasi|Replay animation|opening-replay/);
    assert.doesNotMatch(first, /opening-motion-toggle|Jeda animasi logo|Lanjutkan animasi logo|Pause logo animation|Resume logo animation/);
    assert.match(first, /aria-pressed="true"/);
    memory.set('inventora:brand-seen:v2', '1');
    const returned = renderOpening();
    assert.match(returned, /is-revealing/);
    assert.match(returned, /href="\/login"/);
    const loading = renderToStaticMarkup(React.createElement(InventoraLoadingScreen, { lang, role: 'Super Admin' }));
    assert.equal((loading.match(/>Inventora</g) ?? []).length, 1);
    assert.match(loading, /width="64" height="64"/);
    assert.match(loading, /inventora-brand-compact/);
    assert.match(loading, /role="status"/);
    assert.match(loading, lang === 'id' ? /Menyiapkan ruang kerja/ : /Preparing your workspace/);
    assert.doesNotMatch(loading, /Super Admin/);
    for (const variant of ['table', 'form', 'pos']) {
      const skeleton = renderToStaticMarkup(React.createElement(ViewSkeleton, { title: 'Inventora', variant, lang }));
      assert.match(skeleton, /role="status"/);
      assert.match(skeleton, /aria-busy="true"/);
      assert.match(skeleton, lang === 'id' ? /Memuat/ : /Loading/);
    }
    for (const Dialog of [Modal, Drawer]) {
      const html = renderToStaticMarkup(React.createElement(UILanguageContext.Provider, { value: lang }, React.createElement(Dialog, { isOpen: true, onClose() {}, title: 'PO-DEMO' }, 'Saved item details')));
      assert.match(html, /<dialog/);
      assert.match(html, /aria-labelledby=/);
      assert.match(html, /Saved item details/);
      assert.match(html, lang === 'id' ? /Tutup dialog/ : /Close dialog/);
    }
  }
  console.log(JSON.stringify({ originalLogoGeometry: 'pass', singleBrandAndNoOrnaments: 'pass', sharedCompactLoading: 'pass', introFirstAndRepeatVisit: 'pass', loginLinkImmediatelyPresent: 'pass', noPlaybackButtons: 'pass', bilingualSkeletons: 'pass', nativeDialogMarkup: 'pass', scope: 'server rendering; not browser animation or layout QA' }));
} finally {
  await vite.close();
}
