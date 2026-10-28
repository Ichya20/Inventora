import React from 'react';
import type { Language, PurchaseOrder } from '../types';

export function PurchaseOrderItems({ order, lang }: { order: PurchaseOrder; lang: Language }) {
  const en = lang === 'en';
  const say = (id: string, english: string) => en ? english : id;
  const money = (value: unknown) => typeof value === 'number' && Number.isFinite(value)
    ? `Rp ${value.toLocaleString(en ? 'en-US' : 'id-ID')}` : '—';
  const rawItems = Array.isArray(order.items) && order.items.length ? order.items : order.lineItems;
  const source: unknown[] = Array.isArray(rawItems) ? rawItems : [];
  const items = source.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object' && !Array.isArray(item));
  const text = (value: unknown) => typeof value === 'string' && value.trim() ? value : '—';
  const quantity = (value: unknown) => typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : '—';
  return <section className="order-items">
    <div className="po-section-heading"><h4>{say('Rincian barang', 'Order items')}</h4><span>{items.length} {say('barang', 'items')}</span></div>
    {items.length ? <table className="order-items-table">
      <caption className="sr-only">{say('Rincian barang untuk', 'Order items for')} {order.id}</caption>
      <thead><tr><th scope="col">{say('Barang / SKU', 'Item / SKU')}</th><th scope="col">{say('Jumlah', 'Qty')}</th><th scope="col">{say('Harga satuan', 'Unit price')}</th><th scope="col">Subtotal</th></tr></thead>
      <tbody>{items.map((item, index) => <tr key={index}>
        <td className="order-product"><strong>{text(item.name || item.desc)}</strong><small>{text(item.sku)}</small></td>
        <td data-label={say('Jumlah', 'Qty')}>{quantity(item.qty ?? item.quantity)}</td>
        <td data-label={say('Harga satuan', 'Unit price')}>{money(item.unitPrice)}</td>
        <td data-label="Subtotal">{money(item.subtotal ?? item.totalPrice)}</td>
      </tr>)}</tbody>
    </table> : <p className="po-review-muted">{say('Rincian barang belum tersimpan untuk PO ini.', 'No item details have been saved for this order.')}</p>}
    {(rawItems != null && !Array.isArray(rawItems) || items.length !== source.length) && <p role="alert" className="po-form-error">{say('Sebagian rincian barang tidak valid. Periksa data PO.', 'Some item details are invalid. Check the order data.')}</p>}
    <dl className="po-review-totals">
      {[
        { label: 'Subtotal', value: order.subtotal },
        { label: say('Diskon', 'Discount'), value: order.discountAmount, deduction: true },
        { label: say('PPN', 'VAT'), value: order.taxAmount },
        { label: say('Potongan PPh', 'Withholding tax'), value: order.withholdingTaxAmount, deduction: true },
      ].filter(line => typeof line.value === 'number' && Number.isFinite(line.value)).map(line => <div key={line.label}><dt>{line.label}</dt><dd>{line.deduction && line.value! > 0 ? '− ' : ''}{money(line.value)}</dd></div>)}
      <div className="po-review-total"><dt>{say('Total pesanan', 'Order total')}</dt><dd>{money(order.total)}</dd></div>
    </dl>
  </section>;
}
