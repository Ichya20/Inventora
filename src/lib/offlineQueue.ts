import type { QueuedMutation } from './useNetworkStatus';

const KEY = 'inventora_offline_queue';
type QueueStorage = Pick<Storage, 'getItem' | 'setItem'>;

export function readQueue(storage: QueueStorage): QueuedMutation[] {
  const raw = storage.getItem(KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.some(item => !item || typeof item.id !== 'string' || typeof item.entityId !== 'string')) throw new Error('Invalid offline queue');
    return parsed;
  } catch {
    // Preserve damaged data for recovery rather than replacing it with an empty queue.
    throw new Error('Antrean offline tidak dapat dibaca. Ekspor cadangan sebelum memulihkan data.');
  }
}

export async function acknowledgeMutation(storage: QueueStorage, item: QueuedMutation, execute: (item: QueuedMutation) => Promise<void>) {
  if (!item.ownerId) throw new Error('Antrean lama belum terikat ke pengguna dan tidak dapat dikirim otomatis.');
  await execute(item);
  // Read again so operations enqueued during the request are retained.
  storage.setItem(KEY, JSON.stringify(readQueue(storage).filter(entry => !(entry.id === item.id && entry.ownerId === item.ownerId))));
}
