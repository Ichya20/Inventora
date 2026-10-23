// Salinan deklarasi tipe sumber pada 21 Oktober 2026.
// Dipisahkan agar pemeriksaan kerangka tidak memuat komponen UI.
export interface EmployeeSalary {
  baseSalary: number;
  positionAllowance: number;
  transportAllowance: number;
  bonus: number;
  bpjsKesehatan: number;
  bpjsKetenagakerjaan: number;
  pph21: number;
  bankName: string;
  accountNumber: string;
  disbursementStatus: 'Disbursed' | 'Scheduled' | 'Pending Approval';
  lastDisbursed?: string;
  disbursementRef?: string;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  dept: string;
  role: string;
  status: string;
  color: 'green' | 'gray' | 'red';
  joined: string;
  taxId?: string;
  salary: EmployeeSalary;
}

export interface PayrollDisbursementRecord {
  id: string;
  referenceNumber: string;
  empId: string;
  empName: string;
  dept: string;
  role: string;
  taxId?: string;
  period: string;
  periodKey?: string;
  disbursedAt: string;
  disbursedDateFormatted: string;
  baseSalary: number;
  allowances: number;
  positionAllowance?: number;
  transportAllowance?: number;
  bpjsKesehatan?: number;
  bpjsKetenagakerjaan?: number;
  bonus: number;
  gross: number;
  deductions: number;
  pph21: number;
  bpjs: number;
  netPay: number;
  bankName: string;
  accountNumber: string;
  actor: string;
  status: 'SUCCESS' | 'SCHEDULED';
}

export type SubscriptionTier = 'starter' | 'business' | 'enterprise';
