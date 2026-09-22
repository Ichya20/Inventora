export type ToastType = 'success' | 'warning' | 'info' | 'error';
export type Language = 'id' | 'en';

export interface ToastItem {
  id: number;
  msg: string;
  type: ToastType;
}

export type Role = 'Super Admin' | 'Warehouse Manager' | 'Finance Manager' | 'HR Manager';

export type POStatus = 'Pending Approval' | 'Disetujui' | 'Selesai' | 'Ditolak';

export interface PurchaseOrder {
  id: string;
  vendor: string;
  desc: string;
  date: string;
  total: number;
  status: POStatus | string;
  color: 'orange' | 'green' | 'blue' | 'red' | string;
  paymentInfo?: {
    paidAt: string;
    method: string;
    txId: string;
    reference: string;
    amount: number;
    accountOrCard: string;
    receiptNo: string;
    payerName: string;
  };
}

export interface PaymentTransaction {
  id: string;
  poId: string;
  vendor: string;
  amount: number;
  taxAmount: number;
  totalPaid: number;
  method: 'bank_transfer' | 'virtual_account' | 'credit_card' | 'qris';
  methodLabel: string;
  accountReference: string;
  status: 'SUCCESS' | 'PENDING' | 'FAILED';
  timestamp: string;
  receiptNumber: string;
  notes?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'payment' | 'approval' | 'system' | 'info';
  metadata?: {
    poId?: string;
    amount?: number;
    vendor?: string;
    method?: string;
    txId?: string;
    receiptNumber?: string;
  };
}
