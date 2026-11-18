import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Mock Firebase callbacks only; no account, browser or database is contacted.
const reports: unknown[] = [];
let resolveGrant!: (value: unknown) => void;
const pendingGrant = new Promise(resolve => { resolveGrant = resolve; });
const auth = { currentUser: { uid: 'account-A' }, async authStateReady() {} };
const requests: string[] = [];
class Provider {
  addScope() {} setCustomParameters() {}
  static credentialFromResult(result: any) { return { accessToken: result.token }; }
}
const authContext = vm.createContext({
  firebaseConfig: {}, initializeApp: () => ({}), getFirestore: () => ({}), getAuth: () => auth,
  GoogleAuthProvider: Provider,
  signInWithPopup: async () => ({ user: auth.currentUser, token: 'identity' }),
  reauthenticateWithPopup: async (user: { uid: string }) => {
    requests.push(user.uid);
    if (user.uid === 'account-A') return pendingGrant;
    return { token: 'grant-B', user };
  },
  signOut: async () => { auth.currentUser = null as any; },
  sessionStorage: { getItem: () => null }, console: { info() {}, warn() {}, error() {} },
});
const source = fs.readFileSync('src/firebase.ts', 'utf8').replace(/^import .*;\r?$/gm, '').replace(/\bexport /g, '');
vm.runInContext(ts.transpileModule(source + '\nglobalThis.actions = { googleSignIn, getAccessToken };', {
  compilerOptions: { target: ts.ScriptTarget.ES2022 },
}).outputText, authContext);
const first = authContext.actions.getAccessToken().then((value: unknown) => ({ value }), (error: Error) => ({ error: error.message }));
await new Promise(setImmediate);
assert.deepEqual(requests, ['account-A']);
auth.currentUser = { uid: 'account-B' };
await authContext.actions.googleSignIn();
const second = authContext.actions.getAccessToken().then((value: unknown) => ({ value }), (error: Error) => ({ error: error.message }));
await new Promise(setImmediate);
assert.deepEqual(requests, ['account-A']);
resolveGrant({ token: 'grant-A', user: { uid: 'account-A' } });
const [a, b] = await Promise.all([first, second]);
assert.ok('error' in a && 'error' in b);
assert.equal((a as any).error, (b as any).error);
assert.equal(await authContext.actions.getAccessToken(), 'grant-B');
reports.push({
  id: 'AUTH-01', classification: 'Candidate; real Firebase popup lifecycle not verified',
  trigger: 'Account A has a pending integration popup; sign in as B and immediately request integration access.',
  observed: 'B reuses A pending promise and fails with an account-mismatch error instead of requesting B authorization.',
  requestsBeforeRetry: ['account-A'], requestsAfterRetry: requests,
  impact: 'First Calendar/Sheets authorization attempt after account switch fails; retry works. No cross-account token leakage observed.',
  limitation: 'Mock permits the first popup to stay pending across sign-in. Firebase may cancel concurrent popups; reachability requires real multi-tab/session testing.',
  source: 'src/firebase.ts:60',
});

const appSource = ts.createSourceFile('App.tsx', fs.readFileSync('src/App.tsx', 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
for (const name of ['Home', 'Login']) {
  const fn = appSource.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name)!;
  assert.ok(fn);
  const callbacks: ts.Node[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && ts.isArrayBindingPattern(node.name)
      && node.name.elements[0]?.getText(appSource) === 'lang' && node.initializer && ts.isCallExpression(node.initializer)) {
      callbacks.push(node.initializer.arguments[0]);
    }
    ts.forEachChild(node, visit);
  };
  visit(fn); assert.equal(callbacks.length, 1);
  const context = vm.createContext({ localStorage: { getItem() { throw new Error('Storage access denied'); } } });
  vm.runInContext(ts.transpileModule(`globalThis.initialize = (${callbacks[0].getText(appSource)});`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText, context);
  assert.throws(() => context.initialize(), /Storage access denied/);
}
reports.push({ id: 'AUTH-02', classification: 'Conditional storage error handling bug', trigger: 'Browser refuses localStorage access.',
  observed: 'Language initializers in Home and Login throw without a fallback; those components cannot render.',
  impact: 'The login screen fails before the Google button is usable in storage-restricted environments.', source: 'src/App.tsx:854,870' });

fs.mkdirSync('output/bug-audit', { recursive: true });
fs.writeFileSync('output/bug-audit/auth-session.json', JSON.stringify({ scope: 'Actual source executed with local mocks; no browser or Firebase test.', findings: reports }, null, 2));
console.log(JSON.stringify({ reproduced: reports.length, scope: 'isolated source callbacks' }));
