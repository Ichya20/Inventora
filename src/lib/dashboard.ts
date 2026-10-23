import type { PurchaseOrder } from '../types';

export const workflowStages = [
  { key: 'approval', statuses: ['Pending Approval'], id: 'Persetujuan', en: 'Approval' },
  { key: 'delivery', statuses: ['Disetujui'], id: 'Pengiriman', en: 'Delivery' },
  { key: 'receipt', statuses: ['Barang Diterima', 'Selisih Penerimaan'], id: 'Pemeriksaan', en: 'Receipt review' },
  { key: 'completed', statuses: ['Selesai'], id: 'Selesai', en: 'Completed' },
  { key: 'rejected', statuses: ['Ditolak'], id: 'Ditolak', en: 'Rejected' },
] as const;

export function buildWorkflow(orders: PurchaseOrder[]) {
  const stages = workflowStages.map(stage => ({ ...stage, count: orders.filter(po => (stage.statuses as readonly string[]).includes(po.status)).length }));
  const other = orders.length - stages.reduce((sum, stage) => sum + stage.count, 0);
  return { stages, other };
}

export function recentOrders(orders: PurchaseOrder[], stage = 'all') {
  const statuses = workflowStages.find(item => item.key === stage)?.statuses as readonly string[] | undefined;
  const knownStatuses = workflowStages.flatMap(item => [...item.statuses]) as string[];
  return orders.filter(po => stage === 'other' ? !knownStatuses.includes(po.status) : !statuses || statuses.includes(po.status)).slice().sort((a, b) => {
    const date = (value: string) => Number.isFinite(Date.parse(value)) ? Date.parse(value) : 0;
    return date(b.date) - date(a.date) || a.id.localeCompare(b.id);
  });
}

export function poStatusLabel(status: string, lang: 'id' | 'en') {
  if (lang === 'id') return status === 'Pending Approval' ? 'Menunggu persetujuan' : status;
  return ({
    'Pending Approval': 'Pending approval', Disetujui: 'Approved',
    'Barang Diterima': 'Received', 'Selisih Penerimaan': 'Receipt discrepancy',
    Selesai: 'Completed', Ditolak: 'Rejected',
  } as Record<string, string>)[status] ?? status;
}

export function poStatusTone(status: string) {
  if (status === 'Selesai') return 'done';
  if (['Ditolak', 'Selisih Penerimaan'].includes(status)) return 'issue';
  return status === 'Pending Approval' ? 'pending' : 'active';
}
