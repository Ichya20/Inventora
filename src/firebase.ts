import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, signInWithPopup, reauthenticateWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/calendar.events');

let isSigningIn = false;
let cachedAccessToken: string | null = null;
let tokenOwner: string | null = null;
let tokenExpiresAt = 0;
let tokenRequest: Promise<string | null> | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Firebase Auth');
    }

    cachedAccessToken = credential.accessToken;
    tokenOwner = result.user.uid;
    tokenExpiresAt = Date.now() + 50 * 60 * 1000;
    return { user: result.user, accessToken: cachedAccessToken };
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
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (forceRefresh = false): Promise<string | null> => {
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user || sessionStorage.getItem('inventora_demo_user')) return null;
  if (!forceRefresh && tokenOwner === user.uid && Date.now() < tokenExpiresAt && cachedAccessToken) return cachedAccessToken;
  if (tokenRequest) return tokenRequest;
  tokenRequest = (async () => {
    try {
      const result = await reauthenticateWithPopup(user, provider);
      const token = GoogleAuthProvider.credentialFromResult(result)?.accessToken;
      if (!token || auth.currentUser?.uid !== user.uid) throw new Error('Google authorization did not return a token for this account.');
      cachedAccessToken = token;
      tokenOwner = user.uid;
      tokenExpiresAt = Date.now() + 50 * 60 * 1000;
      return token;
    } catch (error: any) {
      cachedAccessToken = null;
      if (['auth/popup-closed-by-user', 'auth/cancelled-popup-request'].includes(error?.code)) return null;
      throw error;
    } finally { tokenRequest = null; }
  })();
  return tokenRequest;
};

export const logout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
  tokenOwner = null;
  tokenExpiresAt = 0;
};
