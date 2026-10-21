/**
 * Local storage persistence helper for enterprise state retention across sessions.
 */

export function loadStoredData<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    const parsed = JSON.parse(raw);
    return parsed !== null && parsed !== undefined ? parsed : defaultValue;
  } catch (err) {
    console.warn(`Failed to read from localStorage key "${key}":`, err);
    return defaultValue;
  }
}

export function saveStoredData<T>(key: string, value: T, required = false): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('inventora:data-changed'));
  } catch (err) {
    console.warn(`Failed to write to localStorage key "${key}":`, err);
    if (required) throw err;
  }
}

export function clearAllInventoraStorage(): void {
  const preferences = new Set(['inventora_language', 'inventora_lang', 'inventora_theme']);
  const keys = Object.keys(localStorage).filter(key => key.startsWith('inventora_') && !preferences.has(key));
  keys.forEach(key => localStorage.removeItem(key));
}

export function createInventoraBackup() {
  const data: Record<string, unknown> = {};
  for (const key of Object.keys(localStorage).filter(key => key.startsWith('inventora_'))) {
    const raw = localStorage.getItem(key);
    try { data[key] = JSON.parse(raw!); } catch { data[key] = raw; }
  }
  return { version: '2.0', exportedAt: new Date().toISOString(), scope: 'browser-local', data };
}
