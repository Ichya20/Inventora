import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import React, { useState, useEffect } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as icons from 'lucide-react';
import { canAccessMenu, canPerformPoAction, isRole, isStaffRole, resolveAccountRole, STAFF_ROLES } from '../src/lib/authorization';
import { OverviewView } from '../src/components/OverviewView';
import { Card, Button } from '../src/components/UI';
import { translations } from '../src/i18n';

test('verified new accounts receive User while existing staff claims are preserved', () => {
  assert.equal(resolveAccountRole(undefined), 'User');
  assert.equal(resolveAccountRole(null), 'User');
  assert.equal(resolveAccountRole('User'), 'User');
  for (const role of STAFF_ROLES) assert.equal(resolveAccountRole(role), role);
  for (const invalid of ['', 'Admin', { role: 'Super Admin' }, ['Super Admin']]) assert.equal(resolveAccountRole(invalid), null);
  assert.equal(isRole('User'), true);
  assert.equal(isStaffRole('User'), false);
});

test('User cannot open business modules or perform any PO action', () => {
  assert.equal(canAccessMenu('User', 'overview'), true);
  assert.equal(canAccessMenu('User', 'settings'), true);
  for (const menu of ['stok', 'pos', 'po', 'purchase', 'new-po', 'keuangan', 'analytics', 'billing', 'sdm', 'unknown']) {
    assert.equal(canAccessMenu('User', menu), false, menu);
  }
  for (const action of ['create', 'approve', 'receive', 'pay'] as const) {
    assert.equal(canPerformPoAction('User', action), false);
    assert.equal(canPerformPoAction('Super Admin', action), true);
  }
  assert.equal(canAccessMenu('Super Admin', 'settings'), true);
});

test('User home renders account identity and hides operational data even if a summary is passed', () => {
  const summary: any = { orders: [{ id: 'SECRET-PO', vendor: 'PRIVATE-VENDOR', total: 9999 }],
    inventory: [{ id: 'SECRET-SKU', name: 'PRIVATE-STOCK', stock: 1 }], poValue: 9999, activePosCount: 1,
    pendingApprovalsCount: 1, lowStockCount: 1, totalHeadcount: 80 };
  const html = renderToStaticMarkup(<OverviewView role="User" lang="en" t={translations.en}
    summary={summary} isDemo={false} notifications={[]} account={{ displayName: 'New User', email: 'new@example.test' }} onNavigate={() => {}}/>);
  assert.match(html, /New User/);
  assert.match(html, /new@example.test/);
  assert.match(html, /Account settings/);
  for (const hidden of ['SECRET-PO', 'PRIVATE-VENDOR', 'SECRET-SKU', 'PRIVATE-STOCK', 'Recorded PO value', 'People directory', 'Create order']) {
    assert.ok(!html.includes(hidden), hidden);
  }
});

function sourceFunction(name: string, bindings: Record<string, unknown>) {
  const source = ts.createSourceFile('src/App.tsx', fs.readFileSync('src/App.tsx', 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let target: ts.Node | undefined;
  const visit = (node: ts.Node) => {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) target = node;
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === name) target = node.initializer;
    if (!target) ts.forEachChild(node, visit);
  };
  visit(source); assert.ok(target, name);
  const context = vm.createContext(bindings);
  vm.runInContext(ts.transpileModule(`globalThis.callback = (${target.getText(source)});`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React },
  }).outputText, context);
  return context.callback;
}

test('User settings expose profile and language, while workspace controls remain Super Admin only', () => {
  const Settings = sourceFunction('SettingsView', { React, useState, useEffect, ...icons, Card, Button,
    localStorage: { getItem: () => null } });
  const props = { account: { uid: 'new-user', email: 'new@example.test', displayName: 'New User' },
    lang: 'en', t: translations.en, onToast() {}, onLanguageChange() {} };
  const user = renderToStaticMarkup(<Settings {...props} role="User"/>);
  const owner = renderToStaticMarkup(<Settings {...props} role="Super Admin"/>);
  assert.ok(!user.includes(translations.en.settings.workspaceTab));
  assert.ok(owner.includes(translations.en.settings.workspaceTab));
  assert.match(user, /new@example.test/);
  assert.ok(user.includes(translations.en.settings.languageTab));
});

test('successful Google login clears a previous demo identity before navigating', async () => {
  for (const success of [true, false]) {
    const calls: string[] = [];
    const login = sourceFunction('handleGoogleLogin', {
      require: () => ({ googleSignIn: async () => success ? { user: { uid: 'real-user' } } : null }),
      setIsLoading() {}, setErrorMsg() {}, setUnauthorizedDomain() {},
      authPending: { current: false }, setCopied() {}, setCopyError() {},
      lang: 'en', clearDemoSession: () => calls.push('remove:inventora_demo_user'),
      navigate: (path: string) => calls.push(`navigate:${path}`),
    });
    await login();
    assert.deepEqual(calls, success ? ['remove:inventora_demo_user', 'navigate:/dashboard'] : []);
  }
});
