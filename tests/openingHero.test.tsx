import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import React, { act, useId, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { JSDOM } from 'jsdom';
import { InventoraMark } from '../src/components/InventoraMark';
import { workspaceMotion } from '../src/lib/motion';

// Execute the actual component bodies without importing CSS into Node.
function components(reduced: () => boolean) {
  const heroSource = ts.createSourceFile('hero-section-2.tsx', fs.readFileSync('src/components/ui/hero-section-2.tsx', 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const hero = heroSource.statements.filter(ts.isVariableStatement).flatMap(node => [...node.declarationList.declarations])
    .find(node => node.name.getText(heroSource) === 'HeroSection')?.initializer;
  const openingSource = ts.createSourceFile('OpeningSequence.tsx', fs.readFileSync('src/components/OpeningSequence.tsx', 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const opening = openingSource.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'OpeningSequence');
  assert.ok(hero && opening);
  const context = vm.createContext({ React, useId, useState, motion, workspaceMotion, Link, ArrowRight, InventoraMark,
    useReducedMotion: reduced,
    InventoraLogoAnimation: ({ reveal, paused = false }: { reveal: boolean; paused?: boolean }) =>
      <div data-testid="logo-player" data-reveal={String(reveal)} data-paused={String(paused)} />,
  });
  vm.runInContext(ts.transpileModule(`globalThis.HeroSection = ${hero.getText(heroSource)};\n${opening.getText(openingSource).replace(/^export\s+/, '')}\nglobalThis.OpeningSequence = OpeningSequence;`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React },
  }).outputText, context);
  return { Hero: context.HeroSection as React.ComponentType<any>, Opening: context.OpeningSequence as React.ComponentType<any> };
}

test('opening hero provides immediate login, original brand geometry and bilingual content without example assets', () => {
  const { Opening } = components(() => false);
  for (const lang of ['en', 'id']) {
    const markup = renderToStaticMarkup(<MemoryRouter><Opening lang={lang} onLanguageChange={() => {}} /></MemoryRouter>);
    const dom = new JSDOM(markup);
    try {
      const { document } = dom.window;
      assert.equal(document.querySelectorAll('main').length, 1);
      assert.equal(document.querySelector('main main'), null);
      const link = document.querySelector<HTMLAnchorElement>('a[href="/login"]');
      assert.ok(link, 'navigation must not depend on logo completion');
      assert.equal(link.textContent, lang === 'en' ? 'Open workspace' : 'Buka ruang kerja');
      assert.equal(document.querySelector('main')!.lang, lang);
      assert.equal(document.querySelector('h1')!.textContent, lang === 'en' ? 'Inventory.Purchases.Sales.' : 'Persediaan.Pembelian.Penjualan.');
      const logo = document.querySelector('.hero-brand svg')!;
      assert.equal(logo.getAttribute('viewBox'), '0 0 24 24');
      assert.equal(logo.querySelectorAll('rect').length, 4);
      assert.deepEqual([...logo.querySelectorAll('rect')].map(rect => [rect.getAttribute('x'), rect.getAttribute('y'), rect.getAttribute('width'), rect.getAttribute('height'), rect.getAttribute('rx'), rect.getAttribute('fill-opacity')]), [
        ['2', '2', '8', '8', '1.5', '1'], ['14', '2', '8', '8', '1.5', '0.15'],
        ['2', '14', '8', '8', '1.5', '0.15'], ['14', '14', '8', '8', '1.5', '1'],
      ]);
      assert.equal(document.querySelector('.hero-brand')!.textContent, 'Inventora');
      assert.equal(document.querySelector('[data-testid="logo-player"]')!.getAttribute('data-reveal'), 'true');
      assert.equal(document.querySelector('.opening-motion-toggle'), null);
      assert.equal(document.querySelectorAll('button').length, 2, 'only language buttons belong on the opening');
      assert.equal(document.querySelectorAll('.opening-modules li').length, 3);
      assert.equal(document.querySelector('img'), null, 'the supplied travel photograph must not be used as product imagery');
      assert.doesNotMatch(markup, /Your Logo|yourwebsite\.com|Fieldstone|Roswell|mountain expeditions|cdn\.21st\.dev|Replay animation|Putar ulang animasi|Pause logo animation|Resume logo animation|Jeda animasi logo|Lanjutkan animasi logo/);
    } finally { dom.window.close(); }
  }
});

test('opening language controls update real component state with no playback buttons, and reduced motion disables logo playback', async () => {
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
  let reduced = false;
  const { Opening } = components(() => reduced);
  const languageChanges: string[] = [];
  function Page() {
    const [lang, setLang] = useState('en');
    return <MemoryRouter><Opening lang={lang} onLanguageChange={(value: string) => { languageChanges.push(value); setLang(value); }} /></MemoryRouter>;
  }
  try {
    await act(async () => root.render(<Page />));
    const { document } = dom.window;
    const player = () => document.querySelector('[data-testid="logo-player"]')!;
    assert.equal(player().getAttribute('data-paused'), 'false');
    assert.equal(player().getAttribute('data-reveal'), 'true');
    assert.equal(document.querySelector('.opening-motion-toggle'), null);
    assert.equal(document.querySelectorAll('button').length, 2);
    await act(async () => document.querySelector<HTMLButtonElement>('[aria-label="Bahasa Indonesia"]')!.click());
    assert.deepEqual(languageChanges, ['id']);
    assert.equal(document.querySelector('main')!.lang, 'id');
    assert.equal(document.querySelector('[aria-label="Bahasa Indonesia"]')!.getAttribute('aria-pressed'), 'true');
    assert.equal(document.querySelector('[aria-label="English"]')!.getAttribute('aria-pressed'), 'false');
    assert.equal(player().getAttribute('data-paused'), 'false');
    assert.equal(document.querySelector('.opening-motion-toggle'), null);
    assert.ok(document.querySelector('a[href="/login"]'));

    reduced = true;
    await act(async () => root.render(<Page />));
    assert.equal(player().getAttribute('data-reveal'), 'false');
    assert.equal(document.querySelector('.opening-motion-toggle'), null);
    assert.equal(document.querySelector('main')!.classList.contains('is-revealing'), false);
    assert.equal(document.querySelectorAll('button').length, 2);
    assert.ok(document.querySelector('a[href="/login"]'));
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});

test('hero forwards semantic attributes without rendering optional controls or footer', () => {
  const { Hero } = components(() => true);
  const markup = renderToStaticMarkup(<Hero brand="Inventora" title="Inventory" subtitle="Stock and sales"
    callToAction={<a href="/login">Sign in</a>} visual={<span>Original mark</span>} lang="en" data-testid="hero" />);
  const dom = new JSDOM(markup);
  try {
    const section = dom.window.document.querySelector('section')!;
    assert.equal(section.getAttribute('lang'), 'en');
    assert.equal(section.getAttribute('data-testid'), 'hero');
    assert.equal(dom.window.document.getElementById(section.getAttribute('aria-labelledby')!)!.textContent, 'Inventory');
    assert.equal(dom.window.document.querySelector('footer'), null);
    assert.equal(dom.window.document.querySelector('button'), null);
    assert.ok(dom.window.document.querySelector('a[href="/login"]'));
  } finally { dom.window.close(); }
});
