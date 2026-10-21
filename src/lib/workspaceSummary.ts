import type { PurchaseOrder } from '../types';

export function summarizePurchaseOrders(orders: PurchaseOrder[] | null) {
  if (!orders) return { poValue: null, activePosCount: null, pendingApprovalsCount: null };
  return {
    poValue: orders.filter(po => po.status !== 'Ditolak').reduce((sum, po) => sum + (Number.isFinite(po.total) ? po.total : 0), 0),
    activePosCount: orders.filter(po => !['Selesai', 'Ditolak'].includes(po.status)).length,
    pendingApprovalsCount: orders.filter(po => po.status === 'Pending Approval').length,
  };
}
