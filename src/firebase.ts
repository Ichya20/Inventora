import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, signInWithPopup, reauthenticateWithPopup, GoogleAuthProvider, User, signOut } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

const signInProvider = new GoogleAuthProvider();
signInProvider.setCustomParameters({ prompt: 'select_account' });
const integrationProvider = new GoogleAuthProvider();
integrationProvider.addScope('https://www.googleapis.com/auth/spreadsheets');
integrationProvider.addScope('https://www.googleapis.com/auth/calendar.events');

let cachedAccessToken: string | null = null;
let tokenOwner: string | null = null;
let tokenExpiresAt = 0;
type IntegrationRequest = { ownerId: string; session: number; promise?: Promise<string | null> };
let tokenRequest: IntegrationRequest | null = null;
let integrationSession = 0;
let identityTransition: object | null = null;

function invalidateIntegrationSession() {
  integrationSession++;
  cachedAccessToken = null;
  tokenOwner = null;
  tokenExpiresAt = 0;
  tokenRequest = null;
}

function beginIdentityTransition() {
  invalidateIntegrationSession();
  const transition = {};
  identityTransition = transition;
  return transition;
}

export const googleSignIn = async (): Promise<{ user: User; accessToken: string | null } | null> => {
  const transition = beginIdentityTransition();
  try {
    const result = await signInWithPopup(auth, signInProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    // A sign-in grant does not include permission to access Sheets or Calendar.
    return { user: result.user, accessToken: credential?.accessToken ?? null };
  } catch (error: any) {
    const isCancelled =
      error?.code === 'auth/popup-closed-by-user' ||
      error?.code === 'auth/cancelled-popup-request' ||
      error?.message?.includes('auth/popup-closed-by-user') ||
      error?.message?.includes('auth/cancelled-popup-request');

    if (isCancelled) {
      console.info('[Firebase Auth] Sign-in popup was closed by user.');
      return null;
    }

    if (error?.code === 'auth/unauthorized-domain' || error?.message?.includes('auth/unauthorized-domain')) {
      console.warn(
        `[Firebase Auth] Current domain (${typeof window !== 'undefined' ? window.location.hostname : 'unknown'}) is not in Firebase's Authorized Domains list.`
      );
    } else if (error?.code === 'auth/popup-blocked' || error?.message?.includes('auth/popup-blocked')) {
      console.warn('[Firebase Auth] Sign-in popup was blocked by browser.');
    } else {
      console.error('Sign in error:', error);
    }
    throw error;
  } finally { if (identityTransition === transition) identityTransition = null; }
};

export const getAccessToken = async (forceRefresh = false): Promise<string | null> => {
  await auth.authStateReady();
  if (identityTransition) return null;
  const user = auth.currentUser;
  if (!user || sessionStorage.getItem('inventora_demo_user')) { invalidateIntegrationSession(); return null; }
  if (!forceRefresh && tokenOwner === user.uid && Date.now() < tokenExpiresAt && cachedAccessToken) return cachedAccessToken;
  if (tokenRequest?.ownerId === user.uid && tokenRequest.session === integrationSession && tokenRequest.promise) return tokenRequest.promise;
  const request: IntegrationRequest = { ownerId: user.uid, session: integrationSession };
  tokenRequest = request;
  request.promise = (async () => {
    try {
      const result = await reauthenticateWithPopup(user, integrationProvider);
      const token = GoogleAuthProvider.credentialFromResult(result)?.accessToken;
      if (!token || auth.currentUser?.uid !== user.uid || request.session !== integrationSession
        || tokenRequest !== request || identityTransition || sessionStorage.getItem('inventora_demo_user')) {
        throw new Error('Google authorization did not return a token for this account.');
      }
      cachedAccessToken = token;
      tokenOwner = user.uid;
      tokenExpiresAt = Date.now() + 50 * 60 * 1000;
      return token;
    } catch (error: any) {
      if (tokenRequest === request) {
        cachedAccessToken = null; tokenOwner = null; tokenExpiresAt = 0;
      }
      if (['auth/popup-closed-by-user', 'auth/cancelled-popup-request'].includes(error?.code)) return null;
      throw error;
    } finally { if (tokenRequest === request) tokenRequest = null; }
  })();
  return request.promise;
};

export const logout = async () => {
  const transition = beginIdentityTransition();
  try { await signOut(auth); }
  finally { if (identityTransition === transition) identityTransition = null; }
};
