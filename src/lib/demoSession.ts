import { isRole } from './authorization';

export function readDemoUser() {
  try {
    const user = JSON.parse(sessionStorage.getItem('inventora_demo_user') || 'null');
    return user && isRole(user.role) ? user as { role: import('../types').Role; email: string; displayName: string } : null;
  } catch { return null; }
}
