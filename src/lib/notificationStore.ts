import type { AppNotification, Role } from '../types';
import { canAccessMenu } from './authorization';

export function notificationStorageKey(demo: boolean, uid: string | null, role: Role | null): string | null {
  return uid && role ? `inventora_notifications_v2:${demo ? 'demo' : 'live'}:${encodeURIComponent(uid)}:${encodeURIComponent(role)}` : null;
}

export function visibleNotifications(items: AppNotification[], role: Role | null): AppNotification[] {
  if (!role) return [];
  return items.filter(item => item && typeof item.id === 'string' && typeof item.message === 'string'
    && (canAccessMenu(role, 'po') || (!['payment', 'approval', 'status_change'].includes(item.type)
      && !item.metadata?.poId && item.metadata?.amount === undefined && !item.metadata?.vendor)));
}

export function readNotifications(storage: Pick<Storage, 'getItem'>, key: string | null, role: Role | null): AppNotification[] {
  if (!key) return [];
  try {
    const parsed = JSON.parse(storage.getItem(key) || '[]');
    return Array.isArray(parsed) ? visibleNotifications(parsed, role) : [];
  } catch { return []; }
}
