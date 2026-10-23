import { commitStoredArray } from './storageUtils';
import type { Language } from '../types';

export interface StockRecord { id: string; stock: number; stockMin?: number }
export function isInventoryList(value: unknown): value is (StockRecord & { name: string })[] {
  if (!Array.isArray(value)) return false;
  const valid = value.every(value => {
    const item = value as Record<string, unknown> | null;
    return !!item && typeof item.id === 'string' && !!item.id.trim() && typeof item.name === 'string' && !!item.name.trim()
      && (item.desc === undefined || typeof item.desc === 'string') && typeof item.stock === 'number' && Number.isSafeInteger(item.stock) && item.stock >= 0
      && (item.stockMin === undefined || (typeof item.stockMin === 'number' && Number.isFinite(item.stockMin) && item.stockMin >= 0));
  });
  return valid && new Set(value.map(item => item.id)).size === value.length;
}
export function stockHealth(item: Pick<StockRecord, 'stock' | 'stockMin'>, lang: Language = 'en') {
  const stockMin = Number.isFinite(item.stockMin) && item.stockMin > 0 ? item.stockMin : 10;
  if (!Number.isFinite(item.stock) || item.stock < 0) return { status: lang === 'en' ? 'Check stock data' : 'Periksa data stok', color: 'red' as const, needsReview: true, stockMin };
  if (item.stock === 0) return { status: lang === 'en' ? 'Out of stock' : 'Habis', color: 'red' as const, needsReview: true, stockMin };
  if (item.stock <= stockMin) return { status: lang === 'en' ? 'Critical' : 'Kritis', color: 'red' as const, needsReview: true, stockMin };
  if (item.stock <= stockMin * 2) return { status: lang === 'en' ? 'Monitoring' : 'Pemantauan', color: 'orange' as const, needsReview: true, stockMin };
  return { status: 'Optimal', color: 'green' as const, needsReview: false, stockMin };
}

export function dispatchInventory<T extends StockRecord>(key: string, fallback: T[], id: string): T[] {
  return commitStoredArray(key, fallback, current => {
    const target = current.find(item => item.id === id);
    if (!target || !Number.isSafeInteger(target.stock) || target.stock <= 0) throw new Error('Barang tidak ditemukan atau stok tidak mencukupi.');
    return current.map(item => item.id === id ? { ...item, stock: item.stock - 1, ...stockHealth({ ...item, stock: item.stock - 1 }) } : item);
  });
}
