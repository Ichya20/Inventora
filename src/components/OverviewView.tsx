import React from 'react';
import { ArrowUpRight, Plus, Package, CheckCircle2, Clock3, CircleAlert, Users } from 'lucide-react';
import type { AppNotification, Language, Role } from '../types';
import type { Translations } from '../i18n';
import type { useWorkspaceSummary } from '../lib/useWorkspaceSummary';
import { canAccessMenu } from '../lib/authorization';
import { stockHealth } from '../lib/inventory';
import { ProcurementOverview } from './ProcurementOverview';
import { Tooltip } from './Tooltip';

type Props = {
  onNavigate: (menu: string) => void; t: Translations; lang: Language;
  summary: ReturnType<typeof useWorkspaceSummary>; role: Role | null; isDemo: boolean; notifications: AppNotification[];
};

export function OverviewView({ onNavigate, lang, summary, role, isDemo, notifications }: Props) {
  const en = lang === 'en';
  const locale = en ? 'en-US' : 'id-ID';
  const say = (id: string, english: string) => en ? english : id;
  const count = (value: number | null) => value === null ? '—' : value.toLocaleString(locale);
  const money = (value: number | null) => value === null ? '—' : new Intl.NumberFormat(locale, { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);
  const can = (menu: string) => canAccessMenu(role, menu);
  const alerts = summary.inventory?.filter(item => stockHealth(item).needsReview).sort((a, b) => a.stock - b.stock) ?? [];
  const activities = [...notifications].sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp)).slice(0, 4);
  const metrics = [
    { menu: 'po', label: say('Nilai PO tercatat', 'Recorded PO value'), value: money(summary.poValue), detail: say('Termasuk PO selesai; di luar yang ditolak', 'Includes completed orders; excludes rejected') },
    { menu: 'po', label: say('PO aktif', 'Active orders'), value: count(summary.activePosCount), detail: say('Dari persetujuan hingga pemeriksaan', 'From approval through receipt review') },
    { menu: 'stok', label: say('Stok perlu ditinjau', 'Stock to review'), value: count(summary.lowStockCount), detail: say('Habis, kritis, atau dalam pemantauan', 'Out of stock, critical, or under monitoring') },
    { menu: 'sdm', label: say('Anggota tim', 'Team members'), value: count(summary.totalHeadcount), detail: say('Pada direktori SDM tersimpan', 'In the saved people directory') },
  ].filter(item => can(item.menu));
  const unavailable = say('Data belum tersedia. Buka modul untuk memuat atau memeriksa datanya.', 'Data is not available yet. Open the module to load or review it.');

  return <section className="workspace-overview" aria-label={say('Ringkasan operasional', 'Operations overview')}>
    <div className="overview-heading">
      <div><p className="eyebrow">{say('Ruang kerja / Ringkasan', 'Workspace / Overview')}</p>
        <h2>{say('Ringkasan operasional', 'Operations overview')}</h2>
        <p className="overview-description">{say('Status purchase order, persediaan, dan aktivitas terbaru.', 'Purchase orders, stock levels, and recent activity.')}</p>
      </div>
      {can('purchase') && <button className="ui-button ui-button-primary" onClick={() => onNavigate('purchase')}><Plus size={16} />{say('Buat pesanan', 'Create order')}</button>}
    </div>

    <div className="overview-source"><span className={`source-tag ${isDemo ? 'source-demo' : ''}`}>{isDemo ? 'Demo' : say('Ruang kerja', 'Workspace')}</span>
      <p>{isDemo ? say('PO demo dan data modul yang tersimpan di browser ini.', 'Demo orders and module data saved in this browser.') : say('PO dari Firestore. Stok dan SDM dari data modul yang tersimpan di browser ini.', 'Orders from Firestore. Stock and people from module data saved in this browser.')} <span>{say('“—” berarti belum tersedia.', '“—” means unavailable.')}</span></p>
    </div>

    <div className="metric-strip" style={{ '--metric-count': metrics.length } as React.CSSProperties}>
      {metrics.map(metric => <div key={`${metric.menu}:${metric.label}`} className="metric-cell">
        <div className="metric-label"><span>{metric.label}</span><Tooltip label={`${say('Tentang', 'About')} ${metric.label.toLowerCase()}`}>{metric.detail}</Tooltip></div>
        <button type="button" className="metric-value-link" onClick={() => onNavigate(metric.menu)} aria-label={`${metric.label}: ${metric.value}. ${say('Buka modul', 'Open module')}`}>
          <strong className={metric.value.length > 17 ? 'metric-value metric-value-long' : 'metric-value'}>{metric.value}</strong><ArrowUpRight size={15} aria-hidden="true" />
        </button>
        <span className="metric-detail">{metric.detail}</span>
      </div>)}
    </div>

    <div className={`overview-grid ${!can('po') ? 'overview-grid-simple' : ''}`}>
      {can('po') && <ProcurementOverview orders={summary.orders} lang={lang} onNavigate={onNavigate} />}

      <div className="overview-side">
        <article className="dashboard-panel attention-panel"><div className="panel-heading"><div><p className="eyebrow">{say('Langkah berikutnya', 'Next steps')}</p><h3>{say('Perlu ditindaklanjuti', 'Needs your attention')}</h3></div><CircleAlert size={19} className="attention-icon" aria-hidden="true"/></div>
          {can('po') && <button className="attention-row" onClick={() => onNavigate('po')}><span className="attention-symbol"><Clock3 size={17}/></span><span><strong>{say('Tinjau persetujuan PO', 'Review order approvals')}</strong><small>{summary.pendingApprovalsCount === null ? say('Periksa di modul pengadaan', 'Check the procurement module') : `${count(summary.pendingApprovalsCount)} ${say('pesanan menunggu', 'orders waiting')}`}</small></span><ArrowUpRight size={16}/></button>}
          {can('stok') && <button className="attention-row" onClick={() => onNavigate('stok')}><span className="attention-symbol stock"><Package size={17}/></span><span><strong>{say('Periksa ketersediaan stok', 'Check stock availability')}</strong><small>{summary.lowStockCount === null ? say('Muat data inventori terlebih dahulu', 'Load inventory data first') : `${count(summary.lowStockCount)} ${say('item perlu ditinjau', 'items to review')}`}</small></span><ArrowUpRight size={16}/></button>}
          {can('sdm') && <button className="attention-row" onClick={() => onNavigate('sdm')}><span className="attention-symbol"><Users size={17}/></span><span><strong>{say('Direktori tim', 'People directory')}</strong><small>{say('Kelola data dan status anggota tim', 'Manage team records and status')}</small></span><ArrowUpRight size={16}/></button>}
        </article>
        {can('stok') && <article className="dashboard-panel stock-panel"><div className="panel-heading"><div><p className="eyebrow">{say('Inventori', 'Inventory')}</p><h3>{say('Pantauan stok', 'Stock watch')}</h3></div><button className="text-action" onClick={() => onNavigate('stok')} aria-label={say('Buka inventori', 'Open inventory')}><ArrowUpRight size={17}/></button></div>
          {alerts.length ? <ul className="stock-list">{alerts.slice(0, 4).map(item => <li key={item.id}><span><strong>{item.name}</strong><small>{item.id}</small></span><span><strong>{item.stock} <small>{say('unit', 'units')}</small></strong><small className={item.stock <= stockHealth(item).stockMin ? 'stock-critical' : 'stock-monitor'}>{stockHealth(item, lang).status}</small></span></li>)}</ul> : <div className="stock-empty"><CheckCircle2 size={20}/><p>{summary.inventory === null ? unavailable : summary.inventory.length === 0 ? say('Belum ada barang tercatat.', 'No inventory items recorded yet.') : say('Seluruh stok berada di atas batas pemantauan.', 'All stock is above monitoring thresholds.')}</p></div>}
          <p className="data-note">{say('Berdasarkan stok tersimpan dan batas minimum per barang.', 'Based on saved stock and each item’s minimum threshold.')}</p>
        </article>}
      </div>
    </div>

    <article className="dashboard-panel activity-panel"><div className="panel-heading"><div><p className="eyebrow">{say('Catatan ruang kerja', 'Workspace log')}</p><h3>{say('Aktivitas terbaru', 'Recent activity')}</h3></div><span className="activity-count">{notifications.length} {say('tercatat', 'recorded')}</span></div>
      {activities.length ? <ol className="activity-list">{activities.map(item => <li key={item.id}><span className={`activity-dot ${item.type === 'payment' ? 'payment' : ''}`} aria-hidden="true"/><div><strong>{item.title}</strong><p>{item.message}</p></div><time dateTime={item.timestamp}>{Number.isFinite(Date.parse(item.timestamp)) ? new Date(item.timestamp).toLocaleString(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}</time></li>)}</ol> : <p className="activity-empty">{say('Belum ada aktivitas. Pembaruan pengadaan dan pembayaran akan muncul di sini.', 'No activity yet. Procurement and payment updates will appear here.')}</p>}
    </article>
  </section>;
}
