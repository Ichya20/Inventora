import { readStoredArray } from './storageUtils';

export const FINANCE_INVOICES_KEY = 'inventora_finance_invoices_v1';
export interface LocalInvoice {
  id: string; client: string; desc: string; date: string; total: number; status: string; color: string; isOverdue: boolean;
}
export function isLocalInvoice(value: unknown): value is LocalInvoice {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const invoice = value as Record<string, unknown>;
  return ['id', 'client', 'desc', 'date', 'status', 'color'].every(key => typeof invoice[key] === 'string')
    && !!(invoice.id as string).trim() && typeof invoice.total === 'number' && Number.isFinite(invoice.total)
    && invoice.total >= 0 && invoice.total <= Number.MAX_SAFE_INTEGER && typeof invoice.isOverdue === 'boolean';
}
export function readFinanceInvoices(fallback: LocalInvoice[]): LocalInvoice[] {
  const invoices = readStoredArray(FINANCE_INVOICES_KEY, fallback, isLocalInvoice);
  if (new Set(invoices.map(invoice => invoice.id)).size !== invoices.length) throw new Error('Duplicate invoice IDs. Original data is retained.');
  return invoices;
}
