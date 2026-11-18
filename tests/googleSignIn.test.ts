import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function googleAuth() {
  const providers: { scopes: string[]; parameters: Record<string, string> }[] = [];
  const state = {
    currentUser: { uid: 'user-1' } as { uid: string } | null,
    loginToken: 'identity-only-token' as string | null,
    loginFailure: null as unknown,
    integrationFailure: null as unknown,
    integrationHandler: null as null | ((user: { uid: string }, requestNumber: number) => Promise<{ user: { uid: string }; accessToken: string | null }>),
    storageFailure: false,
    demo: false,
    signInProviders: [] as typeof providers,
    integrationProviders: [] as typeof providers,
    async authStateReady() {},
  };
  class Provider {
    scopes: string[] = [];
    parameters: Record<string, string> = {};
    constructor() { providers.push(this); }
    addScope(scope: string) { this.scopes.push(scope); }
    setCustomParameters(parameters: Record<string, string>) { this.parameters = parameters; }
    static credentialFromResult(result: { accessToken: string | null }) {
      return result.accessToken ? { accessToken: result.accessToken } : null;
    }
  }
  const context = vm.createContext({
    firebaseConfig: {}, initializeApp: () => ({}), getFirestore: () => ({}), getAuth: () => state,
    GoogleAuthProvider: Provider,
    signInWithPopup: async (_auth: unknown, provider: Provider) => {
      state.signInProviders.push(provider);
      if (state.loginFailure) throw state.loginFailure;
      return { user: state.currentUser, accessToken: state.loginToken };
    },
    reauthenticateWithPopup: async (user: { uid: string }, provider: Provider) => {
      state.integrationProviders.push(provider);
      if (state.integrationFailure) throw state.integrationFailure;
      if (state.integrationHandler) return state.integrationHandler(user, state.integrationProviders.length);
      return { user, accessToken: `integration-${user.uid}-${state.integrationProviders.length}` };
    },
    signOut: async () => { state.currentUser = null; },
    sessionStorage: { getItem: () => { if (state.storageFailure) throw new Error('Storage unavailable'); return state.demo ? 'demo' : null; } },
    console: { info() {}, warn() {}, error() {} },
  });
  const source = fs.readFileSync('src/firebase.ts', 'utf8').replace(/^import .*;\r?$/gm, '').replace(/\bexport /g, '');
  vm.runInContext(ts.transpileModule(source + '\nglobalThis.actions = { googleSignIn, getAccessToken, logout };', {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText, context);
  const actions = context.actions as {
    googleSignIn(): Promise<{ user: { uid: string }; accessToken: string | null } | null>;
    getAccessToken(force?: boolean): Promise<string | null>;
    logout(): Promise<void>;
  };
  return { state, actions };
}

test('Google sign-in requests identity without Sheets or Calendar permissions', async () => {
  const { state, actions } = googleAuth();
  const result = await actions.googleSignIn();
  assert.equal(result?.user.uid, 'user-1');
  assert.equal(state.signInProviders.length, 1);
  assert.equal(state.signInProviders[0].scopes.length, 0);
  assert.equal(state.signInProviders[0].parameters.prompt, 'select_account');
  assert.equal(state.integrationProviders.length, 0);
});

test('a valid Firebase sign-in does not require an integration access token', async () => {
  const { state, actions } = googleAuth();
  state.loginToken = null;
  assert.equal((await actions.googleSignIn())?.user.uid, 'user-1');
});

test('integration authorization is requested separately and only its grant is cached', async () => {
  const { state, actions } = googleAuth();
  await actions.googleSignIn();
  const token = await actions.getAccessToken();
  assert.equal(token, 'integration-user-1-1');
  assert.equal(state.integrationProviders[0].scopes.join(','), [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/calendar.events',
  ].join(','));
  assert.equal(await actions.getAccessToken(), token);
  assert.equal(state.integrationProviders.length, 1);
  assert.equal(await actions.getAccessToken(true), 'integration-user-1-2');
});

test('changing Google accounts cannot reuse the previous account integration grant', async () => {
  const { state, actions } = googleAuth();
  await actions.googleSignIn();
  await actions.getAccessToken();
  state.currentUser = { uid: 'user-2' };
  await actions.googleSignIn();
  assert.equal(await actions.getAccessToken(), 'integration-user-2-2');
});

test('cancelled sign-in and integration popups can be retried', async () => {
  const { state, actions } = googleAuth();
  state.loginFailure = { code: 'auth/popup-closed-by-user' };
  assert.equal(await actions.googleSignIn(), null);
  state.loginFailure = null;
  assert.equal((await actions.googleSignIn())?.user.uid, 'user-1');
  state.integrationFailure = { code: 'auth/cancelled-popup-request' };
  assert.equal(await actions.getAccessToken(), null);
  state.integrationFailure = null;
  assert.equal(await actions.getAccessToken(), 'integration-user-1-2');
});

test('demo and signed-out sessions cannot request Google integration grants', async () => {
  const { state, actions } = googleAuth();
  state.demo = true;
  assert.equal(await actions.getAccessToken(), null);
  state.demo = false;
  await actions.logout();
  assert.equal(await actions.getAccessToken(), null);
  assert.equal(state.integrationProviders.length, 0);
});

function deferredGrant() {
  let resolve!: (value: { user: { uid: string }; accessToken: string | null }) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<{ user: { uid: string }; accessToken: string | null }>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const tick = () => new Promise(setImmediate);

test('same-account concurrent integration calls share one authorization request', async () => {
  const { state, actions } = googleAuth();
  const grant = deferredGrant();
  state.integrationHandler = () => grant.promise;
  const first = actions.getAccessToken();
  const second = actions.getAccessToken(true);
  await tick();
  assert.equal(state.integrationProviders.length, 1);
  grant.resolve({ user: { uid: 'user-1' }, accessToken: 'shared-grant' });
  assert.deepEqual(await Promise.all([first, second]), ['shared-grant', 'shared-grant']);
  assert.equal(await actions.getAccessToken(), 'shared-grant');
});

test('stale success or failure cannot clear a new account request or cached grant', async () => {
  for (const completion of ['success', 'failure'] as const) {
    const { state, actions } = googleAuth();
    const old = deferredGrant();
    const current = deferredGrant();
    state.integrationHandler = user => user.uid === 'user-1' ? old.promise : current.promise;
    const first = actions.getAccessToken().then(value => ({ value }), error => ({ error }));
    await tick();
    state.currentUser = { uid: 'user-2' };
    await actions.googleSignIn();
    const second = actions.getAccessToken();
    await tick();
    assert.equal(state.integrationProviders.length, 2);
    if (completion === 'success') old.resolve({ user: { uid: 'user-1' }, accessToken: 'stale-grant' });
    else old.reject(new Error('Old popup failed'));
    assert.ok('error' in await first);
    const coalesced = actions.getAccessToken();
    await tick();
    assert.equal(state.integrationProviders.length, 2);
    current.resolve({ user: { uid: 'user-2' }, accessToken: 'current-grant' });
    assert.deepEqual(await Promise.all([second, coalesced]), ['current-grant', 'current-grant']);
    assert.equal(await actions.getAccessToken(), 'current-grant');
    assert.equal(state.integrationProviders.length, 2);
  }
});

test('old completion after a new grant is cached cannot overwrite or discard it', async () => {
  for (const completion of ['success', 'failure'] as const) {
    const { state, actions } = googleAuth();
    const old = deferredGrant();
    state.integrationHandler = async user => user.uid === 'user-1' ? old.promise : { user, accessToken: 'new-grant' };
    const first = actions.getAccessToken().then(value => ({ value }), error => ({ error }));
    await tick();
    state.currentUser = { uid: 'user-2' };
    await actions.googleSignIn();
    assert.equal(await actions.getAccessToken(), 'new-grant');
    if (completion === 'success') old.resolve({ user: { uid: 'user-1' }, accessToken: 'old-grant' });
    else old.reject(new Error('Old failure'));
    assert.ok('error' in await first);
    assert.equal(await actions.getAccessToken(), 'new-grant');
    assert.equal(state.integrationProviders.length, 2);
  }
});

test('an account change observed outside the sign-in wrapper cannot join the old request', async () => {
  const { state, actions } = googleAuth();
  const old = deferredGrant();
  state.integrationHandler = async user => user.uid === 'user-1' ? old.promise : { user, accessToken: 'external-switch-grant' };
  const first = actions.getAccessToken().then(value => ({ value }), error => ({ error }));
  await tick();
  state.currentUser = { uid: 'user-2' };
  assert.equal(await actions.getAccessToken(), 'external-switch-grant');
  old.resolve({ user: { uid: 'user-1' }, accessToken: 'stale-grant' });
  assert.ok('error' in await first);
  assert.equal(await actions.getAccessToken(), 'external-switch-grant');
  assert.equal(state.integrationProviders.length, 2);
});

test('logout invalidates pending grants even when the same account logs in again', async () => {
  const { state, actions } = googleAuth();
  const old = deferredGrant();
  state.integrationHandler = (_user, number) => number === 1 ? old.promise : Promise.resolve({ user: { uid: 'user-1' }, accessToken: 'fresh-grant' });
  const first = actions.getAccessToken().then(value => ({ value }), error => ({ error }));
  await tick();
  await actions.logout();
  state.currentUser = { uid: 'user-1' };
  await actions.googleSignIn();
  old.resolve({ user: { uid: 'user-1' }, accessToken: 'before-logout' });
  assert.ok('error' in await first);
  assert.equal(await actions.getAccessToken(), 'fresh-grant');
  assert.equal(state.integrationProviders.length, 2);
});

test('entering demo mode or losing storage access prevents a pending grant from being returned', async () => {
  for (const mode of ['demo', 'storageFailure'] as const) {
    const { state, actions } = googleAuth();
    const grant = deferredGrant();
    state.integrationHandler = () => grant.promise;
    const pending = actions.getAccessToken().then(value => ({ value }), error => ({ error }));
    await tick();
    state[mode] = true;
    grant.resolve({ user: { uid: 'user-1' }, accessToken: 'must-not-return' });
    assert.ok('error' in await pending);
    state[mode] = false;
    state.integrationHandler = null;
    assert.equal(await actions.getAccessToken(), 'integration-user-1-2');
  }
});
