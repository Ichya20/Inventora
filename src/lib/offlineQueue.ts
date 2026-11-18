import type { QueuedMutation } from './useNetworkStatus';

const KEY = 'inventora_offline_queue';
type QueueStorage = Pick<Storage, 'getItem' | 'setItem'>;

const text = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

export function isOwnedQueuedMutation(value: unknown): value is QueuedMutation {
  const item = value as QueuedMutation;
  return !!item && typeof item === 'object' && !Array.isArray(item)
    && [item.id, item.ownerId, item.entityId].every(text)
    && ['APPROVE_PO', 'REJECT_PO', 'PAY_PO', 'STOCK_ADJUSTMENT', 'HR_UPDATE'].includes(item.type)
    && typeof item.description === 'string' && typeof item.timestamp === 'string'
    && Number.isFinite(Date.parse(item.timestamp));
}

function isRetainedLegacyMutation(value: unknown): boolean {
  const item = value as QueuedMutation;
  return !!item && typeof item === 'object' && !Array.isArray(item)
    && [item.id, item.entityId].every(text) && (item.ownerId === undefined || item.ownerId === null || item.ownerId === '');
}

export function readQueue(storage: QueueStorage): QueuedMutation[] {
  const raw = storage.getItem(KEY);
  if (raw === null) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.some(item => !isOwnedQueuedMutation(item) && !isRetainedLegacyMutation(item))) throw new Error('Invalid offline queue');
    return parsed;
  } catch {
    // Preserve damaged data for recovery rather than replacing it with an empty queue.
    throw new Error('Antrean offline tidak dapat dibaca. Ekspor cadangan sebelum memulihkan data.');
  }
}

export async function acknowledgeMutation(storage: QueueStorage, item: QueuedMutation, execute: (item: QueuedMutation) => Promise<void>) {
  if (!isOwnedQueuedMutation(item)) throw new Error('Antrean lama atau tidak valid tidak dapat dikirim otomatis.');
  await execute(item);
  // Read again so operations enqueued during the request are retained.
  storage.setItem(KEY, JSON.stringify(readQueue(storage).filter(entry => !(entry.id === item.id && entry.ownerId === item.ownerId))));
}
