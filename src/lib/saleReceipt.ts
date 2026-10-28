import { jsPDF } from 'jspdf';
import type { Language } from '../types';
import type { SaleTransaction } from './commerce';

const money = (amount: number, lang: Language) => `Rp ${amount.toLocaleString(lang === 'en' ? 'en-US' : 'id-ID')}`;
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);

export function createSaleReceiptPdf(sale: SaleTransaction, lang: Language) {
  const en = lang === 'en';
  const pdf = new jsPDF({ unit: 'mm', format: [80, 297] });
  let y = 10;
  const line = (text: string, bold = false) => {
    pdf.setFont('helvetica', bold ? 'bold' : 'normal');
    pdf.setFontSize(9);
    for (const part of pdf.splitTextToSize(text, 68)) {
      if (y > 282) { pdf.addPage(); y = 10; }
      pdf.text(part, 6, y); y += 4.5;
    }
  };
  line('Inventora', true);
  line(en ? 'Sales receipt' : 'Struk penjualan');
  line(sale.id);
  line(new Date(sale.createdAt).toLocaleString(en ? 'en-US' : 'id-ID', { timeZone: 'Asia/Jakarta' }));
  line(`${en ? 'Cashier' : 'Kasir'}: ${sale.actorName}`);
  y += 3;
  sale.items.forEach(item => {
    line(item.name, true);
    line(`${item.sku} | ${item.quantity} x ${money(item.unitPrice, lang)}`);
    if (item.discount) line(`${en ? 'Discount' : 'Diskon'} ${item.discountPercent}%: ${money(item.discount, lang)}`);
    line(money(item.total, lang)); y += 2;
  });
  line(`Subtotal: ${money(sale.subtotal, lang)}`);
  line(`${en ? 'Discount' : 'Diskon'}: ${money(sale.discount, lang)}`);
  line(`${en ? 'VAT' : 'PPN'} ${sale.taxRate}%: ${money(sale.tax, lang)}`);
  line(`Total: ${money(sale.total, lang)}`, true);
  line(`${en ? 'Cash received' : 'Tunai diterima'}: ${money(sale.amountPaid, lang)}`);
  line(`${en ? 'Change' : 'Kembalian'}: ${money(sale.change, lang)}`, true);
  y += 3;
  line(en ? 'Recorded in this browser. Payment method: cash.' : 'Tercatat di browser ini. Metode pembayaran: tunai.');
  return pdf;
}

export function receiptHtml(sale: SaleTransaction, lang: Language) {
  const en = lang === 'en';
  const safe = (value: string) => escapeHtml(value);
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><title>${safe(sale.id)}</title><style>@page{size:80mm auto;margin:4mm}body{font:12px Arial,sans-serif;color:#000;width:70mm;margin:0 auto;line-height:1.5}h1{font-size:18px;margin:0}p{margin:6px 0;overflow-wrap:anywhere}table{width:100%;border-collapse:collapse}td{padding:6px 0;vertical-align:top}td:last-child{text-align:right;white-space:nowrap;padding-left:8px}.total{font-weight:bold;border-top:1px solid #000}.item{border-bottom:1px solid #aaa}small{display:block;font-size:11px}</style></head><body>
    <h1>Inventora</h1><p>${en ? 'Sales receipt' : 'Struk penjualan'}<br>${safe(sale.id)}<br>${safe(new Date(sale.createdAt).toLocaleString(en ? 'en-US' : 'id-ID', { timeZone: 'Asia/Jakarta' }))}<br>${en ? 'Cashier' : 'Kasir'}: ${safe(sale.actorName)}</p>
    <table>${sale.items.map(item => `<tr class="item"><td>${safe(item.name)}<small>${safe(item.sku)}<br>${item.quantity} x ${money(item.unitPrice, lang)}${item.discount ? `<br>${en ? 'Discount' : 'Diskon'} ${item.discountPercent}%` : ''}</small></td><td>${money(item.total, lang)}</td></tr>`).join('')}
    <tr><td>Subtotal</td><td>${money(sale.subtotal, lang)}</td></tr><tr><td>${en ? 'Discount' : 'Diskon'}</td><td>${money(sale.discount, lang)}</td></tr><tr><td>${en ? 'VAT' : 'PPN'} ${sale.taxRate}%</td><td>${money(sale.tax, lang)}</td></tr><tr class="total"><td>Total</td><td>${money(sale.total, lang)}</td></tr><tr><td>${en ? 'Cash received' : 'Tunai diterima'}</td><td>${money(sale.amountPaid, lang)}</td></tr><tr><td>${en ? 'Change' : 'Kembalian'}</td><td>${money(sale.change, lang)}</td></tr></table><p>${en ? 'Recorded in this browser. Payment method: cash.' : 'Tercatat di browser ini. Metode pembayaran: tunai.'}</p></body></html>`;
}

export function printSaleReceipt(sale: SaleTransaction, lang: Language) {
  const frame = document.createElement('iframe');
  frame.title = lang === 'en' ? 'Sales receipt print preview' : 'Pratinjau cetak struk penjualan';
  frame.style.cssText = 'position:fixed;width:0;height:0;border:0;left:-10000px';
  frame.onload = () => {
    const target = frame.contentWindow;
    if (!target) { frame.remove(); return; }
    target.addEventListener('afterprint', () => frame.remove(), { once: true });
    target.focus(); target.print();
  };
  frame.srcdoc = receiptHtml(sale, lang);
  document.body.appendChild(frame);
}
