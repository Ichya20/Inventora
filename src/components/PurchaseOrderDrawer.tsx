import React from 'react';
import { ArrowUpRight, ClipboardList } from 'lucide-react';
import type { Language, PurchaseOrder } from '../types';
import { poStatusLabel, poStatusTone } from '../lib/dashboard';
import { normalizePurchaseOrder } from '../lib/procurement';
import { Button, Drawer } from './UI';
import { PurchaseOrderItems } from './PurchaseOrderItems';
import { ChangeHighlight } from './MotionFeedback';

type Props = {
  order: PurchaseOrder | null;
  lang: Language;
  onClose: () => void;
  onNavigate: (menu: string) => void;
};

export function PurchaseOrderDrawer({ order, lang, onClose, onNavigate }: Props) {
  const en = lang === 'en';
  const say = (id: string, english: string) => en ? english : id;
  const locale = en ? 'en-US' : 'id-ID';
  const money = (value: unknown) => typeof value === 'number' && Number.isFinite(value)
    ? new Intl.NumberFormat(locale, { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value) : '—';
  const date = (value?: string) => value && Number.isFinite(Date.parse(value))
    ? new Date(value).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' }) : '—';
  const po = order ? normalizePurchaseOrder(order) : null;

  return <Drawer isOpen={!!po} onClose={onClose} title={say('Detail purchase order', 'Purchase order details')}
    footer={<><Button variant="secondary" onClick={onClose}>{say('Tutup', 'Close')}</Button>
      <Button onClick={() => { onClose(); onNavigate('po'); }}>{say('Buka pengadaan', 'Open procurement')}<ArrowUpRight size={15} /></Button></>}>
    {po && <div className="po-detail">
      <div className="po-detail-identity">
        <span className="po-document-icon" aria-hidden="true"><ClipboardList size={23} strokeWidth={1.5} /></span>
        <div><p className="po-detail-id">{po.id}</p><h4>{po.vendor}</h4></div>
        <ChangeHighlight value={po.status}><span className={`order-status status-${poStatusTone(po.status)}`}>{poStatusLabel(po.status, lang)}</span></ChangeHighlight>
      </div>
      <dl className="po-metadata">
        <div><dt>{say('Tanggal pesanan', 'Order date')}</dt><dd>{date(po.date)}</dd></div>
        <div><dt>{say('Target pengiriman', 'Expected delivery')}</dt><dd>{date(po.deliveryDate)}</dd></div>
        <div className="po-metadata-wide"><dt>{say('Departemen', 'Department')}</dt><dd>{po.department || '—'}</dd></div>
      </dl>
      {po.desc && <section className="po-detail-section"><h5>{say('Keperluan', 'Description')}</h5><p>{po.desc}</p></section>}
      <PurchaseOrderItems order={po} lang={lang}/>
      {po.notes && <section className="po-detail-section"><h5>{say('Catatan pesanan', 'Order notes')}</h5><p className="po-notes">{po.notes}</p></section>}
      {po.grn && <section className="po-detail-section"><h5>{say('Penerimaan barang', 'Goods receipt')}</h5><dl className="po-metadata">
        <div><dt>{say('Nomor penerimaan', 'Receipt number')}</dt><dd>{po.grn.grnNumber || '—'}</dd></div>
        <div><dt>{say('Tanggal diterima', 'Received date')}</dt><dd>{date(po.grn.receivedDate)}</dd></div>
        <div><dt>{say('Diterima oleh', 'Received by')}</dt><dd>{po.grn.receivedBy || '—'}</dd></div>
        <div><dt>{say('Hasil pemeriksaan', 'Receipt result')}</dt><dd>{po.grn.status === 'MATCHED' ? say('Sesuai', 'Matched') : po.grn.status === 'DISCREPANCY' ? say('Ada selisih', 'Discrepancy') : say('Belum selesai', 'Pending')}</dd></div>
      </dl></section>}
      {po.paymentInfo && <section className="po-detail-section"><h5>{say('Pembayaran tercatat', 'Recorded payment')}</h5><dl className="po-metadata">
        <div><dt>{say('Metode', 'Method')}</dt><dd>{po.paymentInfo.method || '—'}</dd></div>
        <div><dt>{say('Tanggal pembayaran', 'Payment date')}</dt><dd>{date(po.paymentInfo.paidAt)}</dd></div>
        <div><dt>{say('Nomor bukti', 'Receipt number')}</dt><dd>{po.paymentInfo.receiptNo || '—'}</dd></div>
        <div><dt>{say('Jumlah dibayar', 'Paid amount')}</dt><dd>{money(po.paymentInfo.amount)}</dd></div>
      </dl></section>}
    </div>}
  </Drawer>;
}
