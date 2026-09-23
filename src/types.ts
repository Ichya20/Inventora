export type ToastType = 'success' | 'warning' | 'info' | 'error';
export type Language = 'id' | 'en';

export interface ToastItem {
  id: number;
  msg: string;
  type: ToastType;
}

export type Role = 'Super Admin' | 'Warehouse Manager' | 'Finance Manager' | 'HR Manager';

export type POStatus = 'Pending Approval' | 'Disetujui' | 'Selesai' | 'Ditolak';

export interface POLineItem {
  id: string;
  sku?: string;
  name: string;
  qty: number;
  unitPrice: number;
  subtotal: number;
}

export type ThreeWayMatchStatus = 'MATCHED' | 'DISCREPANCY' | 'PENDING_RECEIPT' | 'PENDING_INVOICE';

export interface GoodsReceiptItem {
  sku?: string;
  name: string;
  orderedQty: number;
  receivedQty: number;
  condition: 'EXCELLENT' | 'GOOD' | 'DAMAGED' | 'SHORTAGE';
  notes?: string;
}

export interface GoodsReceiptNote {
  id: string;
  grnNumber: string;
  poId: string;
  receivedDate: string;
  receivedBy: string;
  suratJalanNumber: string;
  items: GoodsReceiptItem[];
  status: 'MATCHED' | 'DISCREPANCY' | 'PENDING';
  inspectorNotes?: string;
}

export interface PurchaseOrder {
  id: string;
  vendor: string;
  desc: string;
  date: string;
  total: number;
  status: POStatus | string;
  color: 'orange' | 'green' | 'blue' | 'red' | string;
  department?: 'IT Infrastructure' | 'Operations & Logistics' | 'Engineering & R&D' | 'HR & GA';
  items?: POLineItem[];
  lineItems?: any[];
  subtotal?: number;
  discountAmount?: number;
  taxAmount?: number;
  withholdingTaxAmount?: number;
  grn?: GoodsReceiptNote;
  threeWayMatchStatus?: ThreeWayMatchStatus;
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

export interface DepartmentBudget {
  id: string;
  name: string;
  code: string;
  quarter: string;
  allocated: number;
  spent: number;
  committed: number;
  currency: string;
}

export interface RbacPermission {
  id: string;
  label: string;
  category: 'PROCUREMENT' | 'FINANCE' | 'INVENTORY' | 'HR' | 'SYSTEM';
  description: string;
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
  type: 'payment' | 'approval' | 'system' | 'info' | 'status_change';
  metadata?: {
    poId?: string;
    amount?: number;
    vendor?: string;
    method?: string;
    txId?: string;
    receiptNumber?: string;
    grnNumber?: string;
    matchStatus?: string;
  };
}
