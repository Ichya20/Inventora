import type { Role } from '../types';
import { canAccessMenu } from './authorization';
import { isInventoryList, stockHealth } from './inventory';

export const COMMERCE_KEY = 'inventora_commerce_v1';
export interface InventoryItem {
  id: string; name: string; desc?: string; stock: number; stockMin?: number; unitPrice?: number;
}
export const DEFAULT_INVENTORY: InventoryItem[] = [
  ['NV-H100-TC', 'NVIDIA H100 Tensor Core GPU', 142], ['RS-W1-PRO', 'Rack Server Web Infrastructure', 58],
  ['NV-4090-FE', 'NVIDIA RTX 4090 Founders Edition', 12], ['SW-10GBE-L3', '10GbE Network L3 Managed Switch', 86],
  ['AP-WIFI-6E', 'Enterprise WiFi 6E Access Point', 24], ['STR-NVME-8TB', '8TB NVMe Enterprise Storage', 8],
  ['UPS-3KVA-RT', '3kVA Rackmount UPS', 45], ['FW-NGFW-10G', 'Next-Gen Firewall 10Gbps', 15],
  ['LB-L4-PRO', 'Hardware Load Balancer L4/L7', 22], ['MON-32-4K', '32 inch 4K Professional Monitor', 110],
  ['KBM-WL-PRO', 'Wireless Pro Keyboard & Mouse', 340], ['DS-24B-NAS', '24-Bay Enterprise NAS', 5],
].map(([id, name, stock]) => ({ id: id as string, name: name as string, stock: stock as number }));

export interface SaleInputLine { sku: string; quantity: number; unitPrice: number; discountPercent: number }
export interface SaleLine extends SaleInputLine { name: string; gross: number; discount: number; total: number }
export interface SaleTransaction {
  id: string; requestId: string; fingerprint: string; createdAt: string; actorId: string; actorName: string;
  items: SaleLine[]; subtotal: number; discount: number; taxRate: number; tax: number; total: number;
  amountPaid: number; change: number; method: 'cash'; scope: 'browser-local';
}
export interface CommerceState {
  version: 1; inventory: InventoryItem[]; sales: SaleTransaction[];
  movements: { id: string; sku: string; quantity: number; kind: 'SALE' | 'DEPLOY'; createdAt: string; saleId?: string }[];
}

function rupiah(value: number, label: string, allowZero = true) {
  if (!Number.isSafeInteger(value) || value < (allowZero ? 0 : 1)) throw new Error(`${label} harus berupa rupiah bulat yang valid.`);
  return value;
}

export function calculateSale(lines: SaleInputLine[], taxRate: number) {
  if (!lines.length || lines.length > 100 || new Set(lines.map(item => item.sku)).size !== lines.length) throw new Error('Keranjang kosong atau SKU berulang.');
  if (![0, 11].includes(taxRate)) throw new Error('Tarif pajak tidak valid.');
  const items = lines.map(item => {
    if (!item.sku || !Number.isSafeInteger(item.quantity) || item.quantity <= 0) throw new Error('Jumlah barang harus bilangan bulat positif.');
    rupiah(item.unitPrice, 'Harga satuan', false);
    if (!Number.isFinite(item.discountPercent) || item.discountPercent < 0 || item.discountPercent > 100) throw new Error('Diskon harus antara 0 dan 100 persen.');
    const gross = rupiah(item.quantity * item.unitPrice, 'Subtotal');
    const discount = Math.round(gross * item.discountPercent / 100);
    return { ...item, gross, discount, total: gross - discount };
  });
  const subtotal = rupiah(items.reduce((sum, item) => sum + item.gross, 0), 'Subtotal');
  const discount = items.reduce((sum, item) => sum + item.discount, 0);
  const tax = Math.round((subtotal - discount) * taxRate / 100);
  return { items, subtotal, discount, taxRate, tax, total: rupiah(subtotal - discount + tax, 'Total', false) };
}

export function readCommerce(fallback: InventoryItem[] = DEFAULT_INVENTORY): CommerceState {
  const raw = localStorage.getItem(COMMERCE_KEY);
  if (raw !== null) {
    const state = JSON.parse(raw) as CommerceState;
    if (state?.version !== 1 || !isInventoryList(state.inventory) || !Array.isArray(state.sales) || !Array.isArray(state.movements)
      || !state.sales.every(isSavedSale) || new Set(state.sales.map(sale => sale.requestId)).size !== state.sales.length
      || !state.movements.every(item => item && typeof item.id === 'string' && typeof item.sku === 'string'
        && Number.isSafeInteger(item.quantity) && ['SALE', 'DEPLOY'].includes(item.kind))) {
      throw new Error('Data transaksi atau inventori tidak dapat dibaca. Pulihkan cadangan sebelum melanjutkan.');
    }
    return state;
  }
  const legacy = localStorage.getItem('inventora_inventory_v1');
  const inventory = legacy === null ? fallback : JSON.parse(legacy);
  if (!isInventoryList(inventory)) throw new Error('Inventori tersimpan tidak valid. Data asli tetap disimpan.');
  return { version: 1, inventory, sales: [], movements: [] };
}

function isSavedSale(sale: SaleTransaction): boolean {
  try {
    if (!sale || ![sale.id, sale.requestId, sale.fingerprint, sale.actorId, sale.actorName, sale.createdAt].every(value => typeof value === 'string' && value.length > 0)
      || !Number.isFinite(Date.parse(sale.createdAt)) || sale.method !== 'cash' || sale.scope !== 'browser-local'
      || !Array.isArray(sale.items) || !sale.items.every(item => item && typeof item.name === 'string' && item.name.length > 0)) return false;
    const totals = calculateSale(sale.items, sale.taxRate);
    return ['subtotal', 'discount', 'tax', 'total'].every(key => sale[key] === totals[key])
      && totals.items.every((item, index) => ['gross', 'discount', 'total'].every(key => item[key] === sale.items[index][key]))
      && Number.isSafeInteger(sale.amountPaid) && sale.amountPaid >= sale.total && sale.change === sale.amountPaid - sale.total;
  } catch { return false; }
}

function commit(state: CommerceState) {
  // One storage write commits the receipt, stock, and movements together.
  localStorage.setItem(COMMERCE_KEY, JSON.stringify(state));
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('inventora:data-changed'));
}

async function withCommerceLock<T>(action: () => T): Promise<T> {
  if (typeof navigator !== 'undefined' && navigator.locks) return navigator.locks.request('inventora-commerce', async () => action());
  if (typeof window !== 'undefined') throw new Error('Browser ini belum mendukung penguncian transaksi. Gunakan browser terbaru melalui HTTPS atau localhost.');
  return action();
}

export async function checkoutSale(input: {
  requestId: string; actorId: string; actorName: string; role: Role | null;
  lines: SaleInputLine[]; taxRate: number; amountPaid: number;
}): Promise<SaleTransaction> {
  if (!canAccessMenu(input.role, 'pos')) throw new Error('Anda tidak memiliki izin kasir.');
  if (!input.actorId || !input.actorName.trim() || !input.requestId || input.requestId.length > 100) throw new Error('Identitas transaksi tidak valid.');
  return withCommerceLock(() => {
    const state = readCommerce();
    const fingerprint = JSON.stringify({ actorId: input.actorId, lines: input.lines, taxRate: input.taxRate, amountPaid: input.amountPaid });
    const existing = state.sales.find(sale => sale.requestId === input.requestId);
    if (existing) {
      if (existing.fingerprint !== fingerprint) throw new Error('Identitas transaksi sudah digunakan untuk keranjang lain.');
      return existing;
    }
    const totals = calculateSale(input.lines, input.taxRate);
    rupiah(input.amountPaid, 'Uang diterima');
    if (input.amountPaid < totals.total) throw new Error('Uang diterima belum mencukupi total belanja.');
    const items = totals.items.map(line => {
      const product = state.inventory.find(item => item.id === line.sku);
      if (!product || product.stock < line.quantity) throw new Error(`Stok ${line.sku} tidak mencukupi. Perbarui keranjang.`);
      return { ...line, name: product.name };
    });
    const createdAt = new Date().toISOString();
    const sale: SaleTransaction = { ...totals, items, id: `SALE-${input.requestId}`, requestId: input.requestId, fingerprint,
      createdAt, actorId: input.actorId, actorName: input.actorName, amountPaid: input.amountPaid,
      change: input.amountPaid - totals.total, method: 'cash', scope: 'browser-local' };
    const inventory = state.inventory.map(product => {
      const line = items.find(item => item.sku === product.id);
      return line ? { ...product, stock: product.stock - line.quantity, unitPrice: line.unitPrice } : product;
    });
    commit({ ...state, inventory, sales: [...state.sales, sale], movements: [...state.movements,
      ...items.map(line => ({ id: `${sale.id}:${line.sku}`, sku: line.sku, quantity: -line.quantity, kind: 'SALE' as const, saleId: sale.id, createdAt }))] });
    return sale;
  });
}

export async function deployCommerceStock(id: string, fallback: InventoryItem[]): Promise<InventoryItem[]> {
  return withCommerceLock(() => {
    const state = readCommerce(fallback);
    const product = state.inventory.find(item => item.id === id);
    if (!product || product.stock <= 0) throw new Error('Stok barang tidak mencukupi.');
    const inventory = state.inventory.map(item => item.id === id ? { ...item, stock: item.stock - 1, ...stockHealth({ ...item, stock: item.stock - 1 }) } : item);
    commit({ ...state, inventory, movements: [...state.movements, { id: crypto.randomUUID(), sku: id, quantity: -1, kind: 'DEPLOY', createdAt: new Date().toISOString() }] });
    return inventory;
  });
}
