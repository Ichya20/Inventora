import { useEffect, useRef, useState } from 'react';
import type { AppNotification, Role } from '../types';
import { notificationStorageKey, readNotifications, visibleNotifications } from './notificationStore';

export function useNotifications(demo: boolean, uid: string | null, role: Role | null) {
  const key = notificationStorageKey(demo, uid, role);
  const currentKey = useRef(key);
  currentKey.current = key;
  const [state, setState] = useState<{ key: string | null; items: AppNotification[] }>({ key: null, items: [] });
  useEffect(() => {
    currentKey.current = key;
    // Legacy entries have no verified owner, so they must not be assigned to the next account.
    try { localStorage.removeItem('inventora_notifications'); } catch {}
    setState({ key, items: readNotifications(localStorage, key, role) });
    return () => { currentKey.current = null; };
  }, [key, role]);

  const update = (change: (items: AppNotification[]) => AppNotification[]) => {
    if (!key || currentKey.current !== key) return;
    setState(previous => {
      if (currentKey.current !== key) return previous;
      const items = visibleNotifications(change(previous.key === key ? previous.items : readNotifications(localStorage, key, role)), role);
      try { localStorage.setItem(key, JSON.stringify(items)); } catch {}
      return { key, items };
    });
  };
  return {
    notifications: state.key === key ? visibleNotifications(state.items, role) : [],
    notify: (data: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => update(items => [{ ...data, id: 'notif-' + crypto.randomUUID(), timestamp: new Date().toISOString(), read: false }, ...items]),
    markAllAsRead: () => update(items => items.map(item => ({ ...item, read: true }))),
    clearAll: () => update(() => []),
    clearSession: () => { currentKey.current = null; setState({ key: null, items: [] }); },
  };
}
