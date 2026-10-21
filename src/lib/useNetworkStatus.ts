import { useState, useEffect, useCallback, useRef } from 'react';
import { acknowledgeMutation, readQueue } from './offlineQueue';

export interface QueuedMutation {
  id: string;
  ownerId: string;
  type: 'APPROVE_PO' | 'REJECT_PO' | 'PAY_PO' | 'STOCK_ADJUSTMENT' | 'HR_UPDATE';
  entityId: string;
  payload: unknown;
  timestamp: string;
  description: string;
}

export const QUEUE_STORAGE_KEY = 'inventora_offline_queue';

interface NetworkOptions {
  ownerId: string | null;
  execute: (item: QueuedMutation) => Promise<void>;
  onSynced?: (count: number) => void;
  onError?: (error: unknown) => void;
}

export function useNetworkStatus(options: NetworkOptions) {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [initial] = useState(() => {
    try { return { queue: readQueue(localStorage), error: null }; }
    catch (error) { return { queue: [] as QueuedMutation[], error }; }
  });
  const [queue, setQueue] = useState(initial.queue);
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const syncing = useRef(false);

  const enqueue = useCallback((mutation: Omit<QueuedMutation, 'id' | 'timestamp' | 'ownerId'>) => {
    const ownerId = optionsRef.current.ownerId;
    if (!ownerId) throw new Error('Pengguna belum terverifikasi.');
    const item: QueuedMutation = { ...mutation, ownerId, id: crypto.randomUUID(), timestamp: new Date().toISOString() };
    const existing = readQueue(localStorage);
    if (existing.some(entry => entry.ownerId === ownerId && entry.entityId === mutation.entityId)) {
      throw new Error('PO ini sudah memiliki perubahan tertunda. Sinkronkan terlebih dahulu.');
    }
    const updated = [...existing, item];
    // Do not acknowledge an offline operation until durable storage succeeds.
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(updated));
    setQueue(updated);
    return item;
  }, []);

  const flushQueue = useCallback(async () => {
    const { ownerId, execute, onSynced, onError } = optionsRef.current;
    if (!navigator.onLine || !ownerId || syncing.current) return;
    syncing.current = true;
    let count = 0;
    try {
      for (const item of readQueue(localStorage).filter(item => item.ownerId === ownerId)) {
        if (optionsRef.current.ownerId !== ownerId || !navigator.onLine) break;
        await acknowledgeMutation(localStorage, item, execute);
        count++;
        setQueue(readQueue(localStorage));
      }
    } catch (error) {
      onError?.(error);
    } finally {
      syncing.current = false;
      if (count) onSynced?.(count);
    }
  }, []);

  useEffect(() => {
    const online = () => { setIsOnline(true); void flushQueue(); };
    const offline = () => setIsOnline(false);
    const refresh = () => {
      try { setQueue(readQueue(localStorage)); }
      catch (error) { optionsRef.current.onError?.(error); }
    };
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('online', online);
      window.removeEventListener('offline', offline);
      window.removeEventListener('storage', refresh);
    };
  }, [flushQueue]);

  useEffect(() => { void flushQueue(); }, [options.ownerId, flushQueue]);
  useEffect(() => { if (initial.error) optionsRef.current.onError?.(initial.error); }, [initial]);

  const visibleQueue = queue.filter(item => item.ownerId === options.ownerId || !item.ownerId);
  return { isOnline, queue: visibleQueue, queuedCount: visibleQueue.length, enqueue, flushQueue };
}
