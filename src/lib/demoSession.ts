import { isRole } from './authorization';

export function readDemoUser() {
  try {
    const user = JSON.parse(sessionStorage.getItem('inventora_demo_user') || 'null');
    return user && isRole(user.role) ? user as { role: import('../types').Role; email: string; displayName: string } : null;
  } catch { return null; }
}

export function clearDemoSession(lang: 'en' | 'id' = 'en'): void {
  try { sessionStorage.removeItem('inventora_demo_user'); }
  catch {
    let marker: string | null;
    try { marker = sessionStorage.getItem('inventora_demo_user'); }
    catch { return; } // Unavailable storage cannot supply an active demo identity either.
    if (marker !== null) throw new Error(lang === 'en'
      ? 'The demo session could not be cleared. Allow browser storage and try again.'
      : 'Sesi demo belum dapat dihapus. Izinkan penyimpanan browser lalu coba lagi.');
  }
}
