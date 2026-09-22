import { useState, useEffect, useCallback } from 'react';

export interface QueuedMutation {
  id: string;
  type: 'APPROVE_PO' | 'REJECT_PO' | 'PAY_PO' | 'STOCK_ADJUSTMENT' | 'HR_UPDATE';
  entityId: string;
  payload: any;
  timestamp: string;
  description: string;
}

const STORAGE_KEY = 'inventora_offline_queue';

export function useNetworkStatus(onSynced?: (count: number) => void) {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });

  const [queue, setQueue] = useState<QueuedMutation[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const persistQueue = (newQueue: QueuedMutation[]) => {
    setQueue(newQueue);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newQueue));
    } catch (e) {
      console.error('Failed to persist offline queue:', e);
    }
  };

  const enqueue = useCallback((mutation: Omit<QueuedMutation, 'id' | 'timestamp'>) => {
    const item: QueuedMutation = {
      ...mutation,
      id: `MUT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
    };
    const updated = [...queue, item];
    persistQueue(updated);
    return item;
  }, [queue]);

  const flushQueue = useCallback(() => {
    try {
      const current = localStorage.getItem(STORAGE_KEY);
      const items: QueuedMutation[] = current ? JSON.parse(current) : [];
      if (items.length > 0) {
        // Clear queue after synchronization
        localStorage.removeItem(STORAGE_KEY);
        setQueue([]);
        if (onSynced) {
          onSynced(items.length);
        }
      }
    } catch (err) {
      console.error('Error syncing offline queue:', err);
    }
  }, [onSynced]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Wait 1.5s after connection restores to flush
      setTimeout(() => {
        flushQueue();
      }, 1500);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [flushQueue]);

  return {
    isOnline,
    queue,
    queuedCount: queue.length,
    enqueue,
    flushQueue,
  };
}
