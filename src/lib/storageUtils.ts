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

export function saveStoredData<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`Failed to write to localStorage key "${key}":`, err);
  }
}

export function clearAllInventoraStorage(): void {
  const keys = [
    'inventora_inventory_v1',
    'inventora_procurement_pos_v1',
    'inventora_finance_invoices_v1',
    'inventora_hr_employees_v1',
    'inventora_role_permissions_v1'
  ];
  keys.forEach(k => {
    try {
      localStorage.removeItem(k);
    } catch (e) {
      // ignore
    }
  });
}
