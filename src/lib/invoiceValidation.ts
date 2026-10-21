export interface ParsedInvoiceData {
  vendor: string;
  invoiceNo?: string;
  date?: string;
  items: { name: string; qty: number; unitPrice: number; subtotal: number }[];
  subtotal: number;
  taxAmount: number;
  grandTotal: number;
  notes?: string;
}

export function validateParsedInvoice(value: unknown): ParsedInvoiceData {
  const data = value as ParsedInvoiceData;
  const validMoney = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0;
  if (!data || typeof data.vendor !== 'string' || !data.vendor.trim() || !Array.isArray(data.items) || !data.items.length || data.items.length > 200) {
    throw new Error('Vendor dan rincian barang harus tersedia dalam dokumen.');
  }
  for (const item of data.items) {
    if (!item || typeof item.name !== 'string' || !item.name.trim() || !validMoney(item.qty) || item.qty === 0 || !validMoney(item.unitPrice) || !validMoney(item.subtotal) ||
      Math.abs(item.qty * item.unitPrice - item.subtotal) > 1) {
      throw new Error('Rincian jumlah atau harga barang tidak konsisten.');
    }
  }
  if (![data.subtotal, data.taxAmount, data.grandTotal].every(validMoney) || data.grandTotal === 0 ||
    Math.abs(data.items.reduce((sum, item) => sum + item.subtotal, 0) - data.subtotal) > 1 ||
    Math.abs(data.subtotal + data.taxAmount - data.grandTotal) > 1) {
    throw new Error('Total invoice tidak cocok dengan rincian barang dan pajak. Periksa dokumen secara manual.');
  }
  return {
    vendor: data.vendor.trim(), items: data.items.map(item => ({ name: item.name.trim(), qty: item.qty, unitPrice: item.unitPrice, subtotal: item.subtotal })),
    subtotal: data.subtotal, taxAmount: data.taxAmount, grandTotal: data.grandTotal,
    ...(typeof data.invoiceNo === 'string' ? { invoiceNo: data.invoiceNo } : {}),
    ...(typeof data.date === 'string' ? { date: data.date } : {}),
    ...(typeof data.notes === 'string' ? { notes: data.notes } : {}),
  };
}
