import React, { useEffect, useId, useRef, useState } from 'react';
import { LayoutGroup, motion, useReducedMotion } from 'motion/react';
import { ArrowRight, ArrowUpRight, ClipboardList } from 'lucide-react';
import type { Language, PurchaseOrder } from '../types';
import { buildWorkflow, poStatusLabel, poStatusTone, recentOrders } from '../lib/dashboard';
import { PurchaseOrderDrawer } from './PurchaseOrderDrawer';
import { Tooltip } from './Tooltip';

type Props = { orders: PurchaseOrder[] | null; lang: Language; onNavigate: (menu: string) => void };

export function ProcurementOverview({ orders, lang, onNavigate }: Props) {
  const [stage, setStage] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [chartFocus, setChartFocus] = useState<string | null>(null);
  const tabs = useRef<Record<string, HTMLButtonElement | null>>({});
  const id = useId();
  const reduceMotion = useReducedMotion();
  const en = lang === 'en';
  const say = (indonesian: string, english: string) => en ? english : indonesian;
  const locale = en ? 'en-US' : 'id-ID';
  const count = (value: number) => value.toLocaleString(locale);
  const money = (value: number) => Number.isFinite(value)
    ? new Intl.NumberFormat(locale, { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value) : '—';
  const workflow = buildWorkflow(orders ?? []);
  const groups = [
    ...workflow.stages.map(item => ({ key: item.key, label: item[lang], count: item.count })),
    ...(workflow.other > 0 ? [{ key: 'other', label: say('Status lain', 'Other statuses'), count: workflow.other }] : []),
  ];
  const filters = [{ key: 'all', label: say('Semua', 'All orders'), count: orders?.length ?? 0 }, ...groups];
  const activeStage = filters.some(item => item.key === stage) ? stage : 'all';
  const visibleOrders = recentOrders(orders ?? [], activeStage);
  const selectedOrder = orders?.find(order => order.id === selectedId) ?? null;
  const activeLabel = filters.find(item => item.key === activeStage)?.label;
  const chartItem = groups.find(item => item.key === chartFocus);
  const percentage = (value: number) => orders?.length ? value / orders.length * 100 : 0;
  const percentLabel = (value: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(percentage(value));

  useEffect(() => {
    if (stage !== activeStage) setStage(activeStage);
  }, [stage, activeStage]);
  useEffect(() => {
    if (selectedId && !selectedOrder) setSelectedId(null);
  }, [selectedId, selectedOrder]);

  const handleTabKey = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % filters.length;
    else if (event.key === 'ArrowLeft') next = (index + filters.length - 1) % filters.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = filters.length - 1;
    else return;
    event.preventDefault();
    const filter = filters[next];
    setStage(filter.key);
    tabs.current[filter.key]?.focus();
  };

  return <article className="dashboard-panel procurement-panel">
    <div className="panel-heading">
      <div><p className="eyebrow">{say('Pengadaan', 'Procurement')}</p><h3>{say('Posisi purchase order', 'Purchase order progress')}</h3></div>
      <button type="button" className="text-action" onClick={() => onNavigate('po')}>{say('Semua PO', 'All orders')}<ArrowUpRight size={15} aria-hidden="true" /></button>
    </div>

    <LayoutGroup id={id}>
      <div className="po-stage-tabs" role="tablist" aria-label={say('Saring PO menurut tahap', 'Filter orders by stage')}>
        {filters.map((filter, index) => <button key={filter.key} ref={node => { tabs.current[filter.key] = node; }}
          type="button" role="tab" id={`${id}-tab-${filter.key}`} aria-controls={`${id}-panel`}
          aria-selected={activeStage === filter.key} tabIndex={activeStage === filter.key ? 0 : -1}
          onClick={() => setStage(filter.key)} onKeyDown={event => handleTabKey(event, index)} className="po-stage-tab">
          <span>{filter.label}</span><span className="po-stage-count">{orders === null ? '—' : count(filter.count)}</span>
          {activeStage === filter.key && <motion.span layoutId="stage-indicator" className="po-stage-indicator" transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 430, damping: 38 }} />}
        </button>)}
      </div>
    </LayoutGroup>

    <div className="procurement-content">
      <figure className="po-distribution" aria-labelledby={`${id}-chart-title`}>
        <figcaption className="distribution-heading">
          <h4 id={`${id}-chart-title`}>{say('Distribusi PO', 'Order distribution')}</h4>
          <Tooltip label={say('Tentang distribusi PO', 'About order distribution')}>
            {say('Panjang batang menunjukkan bagian setiap tahap dari seluruh PO tercatat. Pilih batang untuk menyaring daftar pesanan.', 'Bar length shows each stage’s share of all recorded orders. Select a bar to filter the order list.')}
          </Tooltip>
        </figcaption>
        <p className="distribution-total">{orders === null ? '—' : count(orders.length)} <span>{say('PO tercatat', 'recorded orders')}</span></p>
        <div className="distribution-bars" role="group" aria-label={say('Pilih tahap dari grafik', 'Select a stage from the chart')} onMouseLeave={() => setChartFocus(null)}>
          {groups.map(group => <button key={group.key} type="button" className={`distribution-row ${activeStage === group.key ? 'is-selected' : ''}`}
            disabled={orders === null} aria-pressed={activeStage === group.key}
            aria-label={orders === null ? `${group.label}: ${say('data belum tersedia', 'data unavailable')}` : `${group.label}: ${count(group.count)} PO (${percentLabel(group.count)}%)`}
            onMouseEnter={() => setChartFocus(group.key)} onFocus={() => setChartFocus(group.key)} onBlur={() => setChartFocus(null)}
            onClick={() => setStage(activeStage === group.key ? 'all' : group.key)}>
            <span className="distribution-row-label">{group.label}<strong>{orders === null ? '—' : count(group.count)}</strong></span>
            <span className="distribution-track" aria-hidden="true">
              <motion.span initial={false} animate={{ scaleX: percentage(group.count) / 100 }} transition={{ duration: reduceMotion ? 0 : .25 }} />
            </span>
          </button>)}
        </div>
        <p className="distribution-caption">{orders === null ? say('Data belum tersedia.', 'Data unavailable.')
          : chartItem ? `${chartItem.label}: ${count(chartItem.count)} PO · ${percentLabel(chartItem.count)}%`
          : orders.length ? say('Pilih tahap untuk melihat pesanan.', 'Select a stage to view orders.') : say('Belum ada PO tercatat.', 'No recorded orders yet.')}</p>
      </figure>

      <div className="po-orders-panel" role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-tab-${activeStage}`} tabIndex={0}>
        <div className="orders-section-heading">
          <h4>{activeStage === 'all' ? say('Pesanan terbaru', 'Latest orders') : activeLabel}</h4>
          <span className="orders-visible-count">{orders === null ? '—' : `${Math.min(visibleOrders.length, 5)} / ${count(visibleOrders.length)}`}</span>
        </div>
        {visibleOrders.length ? <>
          <div className="overview-order-columns" aria-hidden="true"><span>{say('Pesanan / vendor', 'Order / vendor')}</span><span>Status</span><span>{say('Nilai', 'Amount')}</span></div>
          <ul className="overview-order-list" aria-label={say('Lima PO terbaru pada tahap yang dipilih', 'Five latest orders in the selected stage')}>
            {visibleOrders.slice(0, 5).map(order => <li key={order.id}>
              <button type="button" className="order-summary-button" aria-haspopup="dialog" onClick={() => setSelectedId(order.id)}>
                <span className="order-summary-identity"><span className="order-link">{order.id}<ArrowUpRight size={13} aria-hidden="true" /></span><span className="order-vendor">{order.vendor}</span></span>
                <span className={`order-status status-${poStatusTone(order.status)}`}>{poStatusLabel(order.status, lang)}</span>
                <span className="order-summary-amount">{money(order.total)}</span>
              </button>
            </li>)}
          </ul>
          <p className="orders-detail-hint">{say('Pilih pesanan untuk membuka rincian.', 'Select an order to open its details.')}</p>
        </> : <div className="dashboard-empty">
          <ClipboardList size={25} strokeWidth={1.3} aria-hidden="true" />
          <p>{orders === null ? say('Data belum tersedia. Buka modul untuk memuat atau memeriksa datanya.', 'Data is not available yet. Open the module to load or review it.') : say('Belum ada PO pada tahap ini.', 'No orders at this stage yet.')}</p>
          <button type="button" className="text-action" onClick={() => onNavigate('po')}>{say('Buka pengadaan', 'Open procurement')}<ArrowRight size={14} aria-hidden="true" /></button>
        </div>}
      </div>
    </div>
    <PurchaseOrderDrawer order={selectedOrder} lang={lang} onClose={() => setSelectedId(null)} onNavigate={onNavigate} />
  </article>;
}
