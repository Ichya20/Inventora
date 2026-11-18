import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { JSDOM } from 'jsdom';
import { WorkspaceSidebar, type WorkspaceSidebarProps } from '../src/components/ui/navbars';
import { translations } from '../src/i18n';
import type { Role } from '../src/types';

async function sidebar(initial: Partial<WorkspaceSidebarProps> = {}, initialMobile = false) {
  const dom = new JSDOM('<main id="workspace-content"><button id="open-navigation">Open navigation</button></main><div id="root"></div>', { url: 'http://inventora.test' });
  const globals = ['window', 'document', 'navigator', 'HTMLElement', 'IS_REACT_ACT_ENVIRONMENT'];
  const originals = globals.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const);
  let mobile = initialMobile;
  const media = new Map<string, { listeners: Set<() => void>; value: MediaQueryList }>();
  dom.window.matchMedia = (query: string): MediaQueryList => {
    let entry = media.get(query);
    if (!entry) {
      const listeners = new Set<() => void>();
      const value = {
        media: query, onchange: null,
        get matches() { return query.includes('max-width') ? mobile : query.includes('min-width') ? !mobile : query.includes('reduced-motion'); },
        addEventListener(_type: string, listener: () => void) { listeners.add(listener); },
        removeEventListener(_type: string, listener: () => void) { listeners.delete(listener); },
        addListener(listener: () => void) { listeners.add(listener); },
        removeListener(listener: () => void) { listeners.delete(listener); },
        dispatchEvent() { listeners.forEach(listener => listener()); return true; },
      } as unknown as MediaQueryList;
      entry = { listeners, value };
      media.set(query, entry);
    }
    return entry.value;
  };
  // jsdom has no layout. Model the responsive control visibility used by the trap.
  dom.window.HTMLElement.prototype.getClientRects = function () {
    const hidden = mobile ? this.classList.contains('workspace-sidebar-collapse') : this.classList.contains('workspace-sidebar-close');
    return (hidden ? [] : [{ x: 0, y: 0, width: 44, height: 44 }]) as unknown as DOMRectList;
  };
  Object.defineProperties(globalThis, {
    window: { configurable: true, value: dom.window }, document: { configurable: true, value: dom.window.document },
    navigator: { configurable: true, value: dom.window.navigator }, HTMLElement: { configurable: true, value: dom.window.HTMLElement },
    IS_REACT_ACT_ENVIRONMENT: { configurable: true, value: true },
  });
  const { createRoot } = await import('react-dom/client');
  const root = createRoot(dom.window.document.getElementById('root')!);
  const calls = { navigation: [] as string[], mobile: [] as boolean[], theme: 0, logout: 0 };
  const main = dom.window.document.getElementById('workspace-content')!;
  main.inert = false;
  const opener = dom.window.document.getElementById('open-navigation') as HTMLButtonElement;
  let props: WorkspaceSidebarProps = {
    activeMenu: 'overview', role: 'Super Admin', language: 'en', labels: translations.en.nav,
    account: { displayName: 'Inventora Owner', email: 'owner@inventora.test' }, isDemo: true,
    pendingApprovalsCount: 0, mobileOpen: false,
    onMobileOpenChange(open) {
      calls.mobile.push(open);
      props = { ...props, mobileOpen: open };
      root.render(<WorkspaceSidebar {...props} />);
    },
    onNavigate(menu) { calls.navigation.push(menu); },
    onToggleTheme() { calls.theme++; }, onLogout() { calls.logout++; },
    ...initial,
  };
  const render = async (next: Partial<WorkspaceSidebarProps> = {}) => {
    props = { ...props, ...next };
    await act(async () => root.render(<WorkspaceSidebar {...props} />));
  };
  const query = <T extends Element = HTMLElement>(selector: string): T => {
    const element = dom.window.document.querySelector<T>(selector);
    assert.ok(element, selector);
    return element;
  };
  const click = async (selector: string) => act(async () => query<HTMLButtonElement>(selector).click());
  const key = async (value: string, shiftKey = false) => {
    const event = new dom.window.KeyboardEvent('keydown', { key: value, shiftKey, bubbles: true, cancelable: true });
    await act(async () => dom.window.document.dispatchEvent(event));
    return event;
  };
  const viewport = async (value: boolean) => {
    mobile = value;
    await act(async () => {
      for (const entry of media.values()) entry.listeners.forEach(listener => listener());
      dom.window.dispatchEvent(new dom.window.Event('resize'));
    });
  };
  const dispose = async () => {
    await act(async () => root.unmount());
    dom.window.close();
    for (const [name, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else Reflect.deleteProperty(globalThis, name);
    }
  };
  await render();
  return { dom, calls, main, opener, render, query, click, key, viewport, dispose };
}

test('sidebar filters real Inventora modules for each role before and after collapsing', async () => {
  const expected: Record<Role, string[]> = {
    'Super Admin': ['overview', 'stok', 'pos', 'po', 'keuangan', 'sdm', 'analytics', 'billing', 'settings'],
    'Warehouse Manager': ['overview', 'stok', 'pos', 'po'],
    'Finance Manager': ['overview', 'pos', 'po', 'keuangan', 'analytics', 'billing'],
    'HR Manager': ['overview', 'sdm'],
    User: ['overview', 'settings'],
  };
  for (const [role, menus] of Object.entries(expected)) {
    const view = await sidebar({ role: role as Role });
    try {
      for (const collapsed of [false, true]) {
        assert.equal(view.query('aside').getAttribute('data-collapsed'), String(collapsed), role);
        assert.deepEqual([...view.dom.window.document.querySelectorAll('[data-menu]')].map(element => element.getAttribute('data-menu')), menus, role);
        for (const group of view.dom.window.document.querySelectorAll('.workspace-sidebar-group')) assert.ok(group.querySelector('[data-menu]'), 'No empty menu groups');
        for (const button of view.dom.window.document.querySelectorAll('[data-menu]')) {
          assert.ok(button.getAttribute('aria-label'), `${role}: every menu icon needs a name`);
          assert.ok(button.querySelector('.workspace-sidebar-link-label')?.textContent);
        }
        assert.match(view.query('.workspace-sidebar-identity').textContent!, /owner@inventora\.test/);
        assert.match(view.query('.workspace-sidebar-identity').textContent!, new RegExp(role));
        if (!collapsed) await view.click('.workspace-sidebar-collapse');
      }
      await view.click('.workspace-sidebar-collapse');
      assert.equal(view.query('.workspace-sidebar-collapse').getAttribute('aria-expanded'), 'true');
      assert.equal(view.query('aside').getAttribute('data-collapsed'), 'false');
    } finally { await view.dispose(); }
  }
});

test('Procurement stays active on purchase aliases and announces the exact approval count', async () => {
  const view = await sidebar({ pendingApprovalsCount: 137 });
  try {
    for (const activeMenu of ['po', 'purchase', 'new-po']) {
      await view.render({ activeMenu });
      assert.equal(view.query('[data-menu="po"]').getAttribute('aria-current'), 'page');
      assert.equal(view.dom.window.document.querySelectorAll('[aria-current="page"]').length, 1);
      assert.match(view.query('[data-menu="po"]').getAttribute('aria-label')!, /137 pending approvals/);
      assert.equal(view.query('.workspace-sidebar-count').textContent, '99+');
    }
    await view.click('.workspace-sidebar-collapse');
    assert.equal(view.query('[data-menu="po"]').getAttribute('aria-current'), 'page');
    await view.render({ activeMenu: 'stok', pendingApprovalsCount: 0 });
    assert.equal(view.query('[data-menu="po"]').hasAttribute('aria-current'), false);
    assert.equal(view.query('[data-menu="stok"]').getAttribute('aria-current'), 'page');
    assert.equal(Boolean(view.dom.window.document.querySelector('.workspace-sidebar-count')), false);
    assert.equal(view.query('[data-menu="po"]').getAttribute('aria-label'), translations.en.nav.procurement);
    await view.render({ language: 'id', labels: translations.id.nav, activeMenu: 'po', pendingApprovalsCount: 2, isDemo: false });
    assert.match(view.query('[data-menu="po"]').getAttribute('aria-label')!, /2 menunggu persetujuan/);
    assert.equal(view.query('aside').getAttribute('aria-label'), 'Navigasi utama');
    assert.equal(Boolean(view.dom.window.document.querySelector('.workspace-sidebar-mode')), false);
  } finally { await view.dispose(); }
});

test('expanded and collapsed sidebar controls call the real module, theme and logout callbacks', async () => {
  const view = await sidebar();
  try {
    const menus = ['overview', 'stok', 'pos', 'po', 'keuangan', 'sdm', 'analytics', 'billing', 'settings'];
    for (const collapsed of [false, true]) {
      for (const menu of menus) await view.click(`[data-menu="${menu}"]`);
      await view.click('.workspace-sidebar-theme');
      await view.click('.workspace-sidebar-logout');
      if (!collapsed) await view.click('.workspace-sidebar-collapse');
    }
    assert.deepEqual(view.calls.navigation, [...menus, ...menus]);
    assert.deepEqual(view.calls.mobile, Array(menus.length * 2).fill(false));
    assert.equal(view.calls.theme, 2);
    assert.equal(view.calls.logout, 2);
    assert.equal(view.query('.workspace-sidebar-theme').getAttribute('aria-label'), 'Toggle color theme');
    assert.equal(view.query('.workspace-sidebar-logout').getAttribute('aria-label'), translations.en.nav.logout);
  } finally { await view.dispose(); }
});

test('collapsed desktop tooltips support focus, pointer transfer and dismissal', async () => {
  const view = await sidebar();
  try {
    const inventory = view.query<HTMLButtonElement>('[data-menu="stok"]');
    await act(async () => inventory.focus());
    assert.equal(Boolean(view.dom.window.document.querySelector('[role="tooltip"]')), false);
    await view.click('.workspace-sidebar-collapse');
    await act(async () => { inventory.blur(); inventory.focus(); });
    assert.equal(view.query('[role="tooltip"]').textContent, translations.en.nav.inventory);
    await view.key('Escape');
    assert.equal(Boolean(view.dom.window.document.querySelector('[role="tooltip"]')), false);
    await act(async () => { inventory.blur(); inventory.focus(); });
    assert.ok(view.query('[role="tooltip"]'));
    await act(async () => inventory.blur());
    assert.ok(view.query('[role="tooltip"]'), 'Blur leaves time to move the pointer into the tooltip');
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 180)); });
    assert.equal(Boolean(view.dom.window.document.querySelector('[role="tooltip"]')), false);

    const pointer = async (element: Element, type: string, relatedTarget: EventTarget | null) => act(async () => {
      element.dispatchEvent(new view.dom.window.MouseEvent(type, { bubbles: true, relatedTarget }));
    });
    await pointer(inventory, 'pointerover', view.dom.window.document.body);
    const panel = view.query('[role="tooltip"]');
    const matches = panel.matches.bind(panel);
    // Keep :hover false so surviving the timeout proves pointerenter cancelled it.
    panel.matches = selector => selector === ':hover' ? false : matches(selector);
    await pointer(inventory, 'pointerout', view.dom.window.document.body);
    assert.ok(view.query('[role="tooltip"]') === panel, 'Leaving the trigger must not instantly remove its label');
    await pointer(panel, 'pointerover', view.dom.window.document.body);
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 180)); });
    assert.ok(view.query('[role="tooltip"]') === panel, 'Entering the portal cancels the pending close');
    assert.ok(view.dom.window.document.activeElement !== inventory);
    await pointer(panel, 'pointerout', view.dom.window.document.body);
    assert.ok(view.query('[role="tooltip"]'));
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 180)); });
    assert.equal(Boolean(view.dom.window.document.querySelector('[role="tooltip"]')), false, 'Leaving both trigger and portal closes the label');

    await act(async () => inventory.focus());
    await view.viewport(false);
    assert.equal(Boolean(view.dom.window.document.querySelector('[role="tooltip"]')), false);
    await view.viewport(true);
    await act(async () => { inventory.blur(); inventory.focus(); });
    assert.equal(Boolean(view.dom.window.document.querySelector('[role="tooltip"]')), false, 'Desktop collapse state must not produce mobile tooltips');
  } finally { await view.dispose(); }
});

test('mobile navigation traps focus, makes content inert and restores the opener after Escape', async () => {
  const view = await sidebar({}, true);
  try {
    view.opener.focus();
    await view.render({ mobileOpen: true });
    const first = view.query<HTMLButtonElement>('.workspace-sidebar-close');
    const last = view.query<HTMLButtonElement>('.workspace-sidebar-logout');
    assert.equal(view.query('aside').getAttribute('role'), 'dialog');
    assert.equal(view.query('aside').getAttribute('aria-modal'), 'true');
    assert.equal(view.main.inert, true);
    assert.ok(view.dom.window.document.activeElement === first);
    await act(async () => last.focus());
    assert.equal((await view.key('Tab')).defaultPrevented, true);
    assert.ok(view.dom.window.document.activeElement === first);
    assert.equal((await view.key('Tab', true)).defaultPrevented, true);
    assert.ok(view.dom.window.document.activeElement === last);
    assert.equal((await view.key('Escape')).defaultPrevented, true);
    assert.deepEqual(view.calls.mobile, [false]);
    assert.equal(view.main.inert, false);
    assert.ok(view.dom.window.document.activeElement === view.opener);
    assert.equal(view.query('aside').hasAttribute('aria-modal'), false);
    assert.equal(Boolean(view.dom.window.document.querySelector('.workspace-nav-backdrop')), false);
  } finally { await view.dispose(); }
});

test('mobile backdrop, close button, module selection and desktop resize close the controlled drawer', async () => {
  const view = await sidebar({}, true);
  try {
    for (const target of ['.workspace-nav-backdrop', '.workspace-sidebar-close', '[data-menu="pos"]']) {
      view.opener.focus();
      await view.render({ mobileOpen: true });
      await view.click(target);
      assert.equal(view.main.inert, false, target);
      assert.ok(view.dom.window.document.activeElement === view.opener, target);
      assert.equal(Boolean(view.dom.window.document.querySelector('.workspace-nav-backdrop')), false, target);
    }
    assert.deepEqual(view.calls.navigation, ['pos']);
    assert.deepEqual(view.calls.mobile, [false, false, false]);
    view.opener.focus();
    await view.render({ mobileOpen: true });
    await view.viewport(false);
    assert.equal(view.calls.mobile.at(-1), false);
    assert.equal(view.main.inert, false);
    assert.ok(view.dom.window.document.activeElement === view.opener);
    assert.equal(view.query('aside').hasAttribute('role'), false);
    await view.key('Escape');
    assert.equal(view.calls.mobile.length, 4, 'Closing must remove the drawer key listener');
  } finally { await view.dispose(); }
});

test('drawer cleanup preserves existing inert state and desktop rejects a mobile open request', async () => {
  const view = await sidebar({}, true);
  try {
    view.main.inert = true;
    view.opener.focus();
    await view.render({ mobileOpen: true });
    await view.click('.workspace-sidebar-close');
    assert.equal(view.main.inert, true, 'Another modal may already own the inert state');
    view.main.inert = false;
    await view.viewport(false);
    await view.render({ mobileOpen: true });
    assert.equal(view.calls.mobile.at(-1), false);
    assert.equal(view.main.inert, false);
    assert.equal(view.query('aside').hasAttribute('aria-modal'), false);
  } finally { await view.dispose(); }
});
