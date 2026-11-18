import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act, useEffect, useRef, useState } from 'react';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { JSDOM } from 'jsdom';
import { NumericInput } from '../src/components/NumericInput';
import { canAccessMenu } from '../src/lib/authorization';
import { calculateSale, checkoutSale, commerceStorageKey, inventoryStorageKey, readCommerce } from '../src/lib/commerce';

test('numeric editing replaces zero, stays empty after deletion and preserves decimal text until blur', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://inventora.test' });
  const globals = ['window', 'document', 'navigator', 'HTMLElement', 'HTMLInputElement', 'IS_REACT_ACT_ENVIRONMENT'];
  const originals = globals.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const);
  Object.defineProperties(globalThis, {
    window: { configurable: true, value: dom.window }, document: { configurable: true, value: dom.window.document },
    navigator: { configurable: true, value: dom.window.navigator }, HTMLElement: { configurable: true, value: dom.window.HTMLElement },
    HTMLInputElement: { configurable: true, value: dom.window.HTMLInputElement },
    IS_REACT_ACT_ENVIRONMENT: { configurable: true, value: true },
  });
  const { createRoot } = await import('react-dom/client');
  const root = createRoot(dom.window.document.getElementById('root')!);
  let numericValue = 0;
  function Form() {
    const [value, setValue] = useState(0);
    return <form><NumericInput aria-label="Discount %" required min={0} max={100} step="0.01" value={value}
      onChange={event => { numericValue = Number(event.target.value); setValue(numericValue); }} /></form>;
  }
  try {
    await act(async () => root.render(<Form />));
    const input = dom.window.document.querySelector('input')!;
    const enter = async (value: string) => act(async () => {
      Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value')!.set!.call(input, value);
      input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    });
    assert.equal(input.value, '0');
    await act(async () => input.focus());
    assert.equal(input.value, '', 'initial zero must not remain before or after the newly typed digits');
    await enter('7');
    assert.equal(input.value, '7'); assert.equal(numericValue, 7);
    await enter('');
    assert.equal(input.value, '', 'deleting must not inject a zero while still editing');
    assert.equal(numericValue, 0);
    await enter('15');
    assert.equal(input.value, '15'); assert.equal(numericValue, 15);
    await enter('0.50');
    assert.equal(input.value, '0.50', 'parent numeric conversion must not move the cursor by rewriting the draft');
    assert.equal(numericValue, 0.5); assert.ok(input.checkValidity());
    await act(async () => input.blur());
    assert.equal(input.valueAsNumber, 0.5);
    await act(async () => input.focus());
    await enter('');
    assert.equal(input.value, '');
    await act(async () => input.blur());
    assert.equal(input.value, '0', 'untouched/cleared optional zero is restored after editing');

    await act(async () => input.focus());
    await enter('101');
    assert.equal(input.validity.rangeOverflow, true);
    await enter('-1');
    assert.equal(input.validity.rangeUnderflow, true);
    await enter('2.555');
    assert.equal(input.validity.stepMismatch, true);
    await enter('2.55');
    assert.ok(input.checkValidity());
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});

test('POS zero-discount editing validates boundaries and commits a 25 percent discount through the actual checkout', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://inventora.test' });
  const globals = ['window', 'document', 'navigator', 'HTMLElement', 'HTMLInputElement', 'Event', 'localStorage', 'IS_REACT_ACT_ENVIRONMENT'];
  const originals = globals.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const);
  // Exercise the real commerce lock instead of replacing checkout or persistence.
  const locks = (globalThis.navigator as any)?.locks;
  assert.ok(locks, 'This DOM integration test requires the Node Web Locks implementation.');
  Object.defineProperty(dom.window.navigator, 'locks', { configurable: true, value: locks });
  Object.defineProperties(globalThis, {
    window: { configurable: true, value: dom.window }, document: { configurable: true, value: dom.window.document },
    navigator: { configurable: true, value: dom.window.navigator }, HTMLElement: { configurable: true, value: dom.window.HTMLElement },
    HTMLInputElement: { configurable: true, value: dom.window.HTMLInputElement }, Event: { configurable: true, value: dom.window.Event },
    localStorage: { configurable: true, value: dom.window.localStorage }, IS_REACT_ACT_ENVIRONMENT: { configurable: true, value: true },
  });
  const { createRoot } = await import('react-dom/client');
  const root = createRoot(dom.window.document.getElementById('root')!);
  const messages: { message: string; type: string }[] = [];
  const source = ts.createSourceFile('PosView.tsx', fs.readFileSync('src/components/PosView.tsx', 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const component = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'PosView');
  assert.ok(component);
  const icon = () => null;
  const PresentationalDiv = ({ children, initial, animate, exit, transition, ...props }: any) => <div {...props}>{children}</div>;
  const Button = ({ children, isLoading, variant, ...props }: any) => <button {...props}>{children}</button>;
  const context = vm.createContext({
    React, useState, useEffect, useRef, NumericInput, calculateSale, checkoutSale, readCommerce, canAccessMenu,
    window: dom.window, crypto: globalThis.crypto, AbortController,
    useReducedMotion: () => true,
    AnimatePresence: ({ children }: any) => <>{children}</>, motion: { div: PresentationalDiv },
    workspaceMotion: { exit: 0, feedback: 0, ease: 'linear' },
    Banknote: icon, Plus: icon, Receipt: icon, Search: icon, Trash2: icon,
    Button, Modal: ({ isOpen, children }: any) => isOpen ? <section role="dialog">{children}</section> : null,
    ChangeHighlight: ({ children }: any) => <span>{children}</span>, SuccessMark: icon,
  });
  vm.runInContext(ts.transpileModule(`globalThis.PosView = (${component.getText(source).replace(/^export\s+/, '')});`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS },
  }).outputText, context);
  const Pos = context.PosView as React.ComponentType<any>;
  const initialInventory = JSON.stringify([{ id: 'POS-TEST', name: 'DOM checkout product', stock: 5, unitPrice: 1000 }]);
  dom.window.localStorage.setItem(inventoryStorageKey(true), initialInventory);
  const edit = async (input: HTMLInputElement, value: string) => act(async () => {
    input.focus();
    Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value')!.set!.call(input, value);
    input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  });
  const submit = async () => act(async () => {
    dom.window.document.querySelector('form')!.requestSubmit();
    await new Promise(resolve => setTimeout(resolve, 0));
  });
  const field = (label: string) => {
    const row = [...dom.window.document.querySelectorAll('label')].find(element => element.textContent?.startsWith(label));
    assert.ok(row, label);
    const input = row.querySelector('input'); assert.ok(input, label);
    return input;
  };
  try {
    await act(async () => root.render(<Pos role="Warehouse Manager" actorId="dom-cashier" actorName="DOM Cashier" lang="en" isDemo
      onToast={(message: string, type: string) => messages.push({ message, type })} />));
    await act(async () => (dom.window.document.querySelector('.pos-product') as HTMLButtonElement).click());
    const discount = field('Discount %');
    const quantity = field('Quantity');
    const price = field('Unit price Rp');
    const cash = field('Cash received Rp');
    assert.equal(discount.value, '0');
    await act(async () => discount.focus());
    assert.equal(discount.value, '', 'POS must allow replacing zero instead of appending to it');

    await edit(cash, '1000');
    for (const value of ['101', '-1']) {
      await edit(discount, value);
      assert.equal(discount.checkValidity(), false, value);
      await submit();
      assert.equal(dom.window.localStorage.getItem(commerceStorageKey(true)), null, 'invalid discount must not create a sale');
    }
    await edit(discount, '25');
    await edit(quantity, '1.5');
    assert.equal(quantity.validity.stepMismatch, true);
    await submit();
    assert.equal(dom.window.localStorage.getItem(commerceStorageKey(true)), null);
    await edit(quantity, '1');
    await edit(price, '');
    assert.equal(price.validity.valueMissing, true);
    await submit();
    assert.equal(dom.window.localStorage.getItem(commerceStorageKey(true)), null);
    await edit(price, '1000');
    assert.equal(discount.value, '25');
    assert.match(dom.window.document.querySelector('.pos-total')!.textContent!, /Rp 750/);
    assert.match(dom.window.document.querySelector('.pos-change')!.textContent!, /Rp 250/);
    assert.ok(dom.window.document.querySelector('form')!.checkValidity());
    assert.equal(dom.window.localStorage.getItem(inventoryStorageKey(true)), initialInventory);

    await submit();
    const committed = readCommerce(undefined, true);
    assert.equal(committed.sales.length, 1);
    assert.equal(committed.sales[0].items[0].discountPercent, 25);
    assert.equal(committed.sales[0].subtotal, 1000);
    assert.equal(committed.sales[0].discount, 250);
    assert.equal(committed.sales[0].total, 750);
    assert.equal(committed.sales[0].amountPaid, 1000);
    assert.equal(committed.sales[0].change, 250);
    assert.equal(committed.inventory[0].stock, 4);
    assert.equal(committed.movements[0].quantity, -1);
    assert.equal(messages.at(-1)?.type, 'success');
    assert.match(dom.window.document.querySelector('[role="dialog"]')!.textContent!, /Sale saved/);
    assert.equal(dom.window.localStorage.getItem(commerceStorageKey()), null, 'demo checkout must leave live storage untouched');
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});
