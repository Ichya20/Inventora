// Kerangka rancangan kelas Inventora; belum dihubungkan ke React.
// Method berisi penanda saja. Login aplikasi tetap memakai kode yang ada.
import type { Auth, GoogleAuthProvider, User } from 'firebase/auth';
import type { Firestore, Unsubscribe } from 'firebase/firestore';
import type {
  Role, PurchaseOrder, POLineItem, GoodsReceiptNote,
  GoodsReceiptItem, PaymentTransaction, DepartmentBudget,
} from '../../src/types';
import type {
  Employee, EmployeeSalary, PayrollDisbursementRecord,
  SubscriptionTier,
} from './data-models';

export type {
  Role, PurchaseOrder, POLineItem, GoodsReceiptNote,
  GoodsReceiptItem, PaymentTransaction, DepartmentBudget,
  Employee, EmployeeSalary, PayrollDisbursementRecord,
};
export type PaymentInfo =
  NonNullable<PurchaseOrder['paymentInfo']>;
export type BillingCycle = 'monthly' | 'annual';
export type MutationSource = 'approval' | 'receipt' | 'payment';
export type PoAction = 'create' | 'approve' | 'receive' | 'pay';
export type SessionListener =
  (session: UserSession | null) => void;
export type PurchaseOrderListener =
  (orders: PurchaseOrder[]) => void;

export interface UserSession {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: Role | null;
  isDemo: boolean;
}

export interface InventoryItem {
  id: string;
  name: string;
  desc: string;
  stock: number;
  status: string;
  color: 'orange' | 'green' | 'blue' | 'red';
}

export interface InvoiceRecord {
  id: string;
  client: string;
  desc: string;
  date: string;
  total: number;
  status: string;
  color: 'orange' | 'green' | 'blue' | 'red';
  isOverdue: boolean;
}

export interface SubscriptionInvoice {
  id: string;
  date: string;
  total: number;
  period: string;
  status: string;
  client: string;
  planName: string;
  paymentMethod: string;
}

export interface SubscriptionRecord {
  planId: SubscriptionTier;
  cycle: BillingCycle;
  anchorDate: string;
  autoRenew: boolean;
  invoices: SubscriptionInvoice[];
}

export class AuthService {
  private provider!: GoogleAuthProvider;
  private cachedAccessToken: string | null = null;
  public constructor(private readonly auth: Auth) {}
  public signIn(): Promise<UserSession | null> {
    throw new Error('Belum diimplementasikan');
  }
  public observe(listener: SessionListener): Unsubscribe {
    throw new Error('Belum diimplementasikan');
  }
  public getGoogleAccessToken(
    forceRefresh?: boolean,
  ): Promise<string | null> {
    throw new Error('Belum diimplementasikan');
  }
  public signOut(): Promise<void> {
    throw new Error('Belum diimplementasikan');
  }
  private mapUser(user: User, role: Role | null): UserSession {
    throw new Error('Belum diimplementasikan');
  }
}

export class AuthorizationPolicy {
  public isRole(value: unknown): value is Role {
    throw new Error('Belum diimplementasikan');
  }
  public canAccessMenu(role: Role | null, menu: string): boolean {
    throw new Error('Belum diimplementasikan');
  }
  public canPerformPoAction(
    role: Role | null,
    action: PoAction,
  ): boolean {
    throw new Error('Belum diimplementasikan');
  }
}

export class LoginController {
  private session: UserSession | null = null;
  public constructor(
    private readonly authService: AuthService,
    private readonly policy: AuthorizationPolicy,
  ) {}
  public loginWithGoogle(): Promise<UserSession | null> {
    throw new Error('Belum diimplementasikan');
  }
  public logout(): Promise<void> {
    throw new Error('Belum diimplementasikan');
  }
  public canEnterDashboard(): boolean {
    throw new Error('Belum diimplementasikan');
  }
}

export class PurchaseOrderModel {
  public constructor(private readonly data: PurchaseOrder) {}
  public getData(): Readonly<PurchaseOrder> {
    throw new Error('Belum diimplementasikan');
  }
  public calculateTotal(): number {
    throw new Error('Belum diimplementasikan');
  }
  public approve(role: Role): void {
    throw new Error('Belum diimplementasikan');
  }
  public reject(role: Role): void {
    throw new Error('Belum diimplementasikan');
  }
  public receive(note: GoodsReceiptNote, role: Role): void {
    throw new Error('Belum diimplementasikan');
  }
  public recordPayment(info: PaymentInfo, role: Role): void {
    throw new Error('Belum diimplementasikan');
  }
}

export class GoodsReceiptModel {
  public constructor(private readonly data: GoodsReceiptNote) {}
  public getData(): Readonly<GoodsReceiptNote> {
    throw new Error('Belum diimplementasikan');
  }
  public hasDiscrepancy(): boolean {
    throw new Error('Belum diimplementasikan');
  }
}

export class PurchaseOrderRepository {
  public constructor(private readonly db: Firestore) {}
  public create(po: PurchaseOrder): Promise<void> {
    throw new Error('Belum diimplementasikan');
  }
  public findById(id: string): Promise<PurchaseOrder | null> {
    throw new Error('Belum diimplementasikan');
  }
  public listen(listener: PurchaseOrderListener): Unsubscribe {
    throw new Error('Belum diimplementasikan');
  }
  public transition(
    id: string, patch: Partial<PurchaseOrder>,
    source: MutationSource, mutationId?: string,
  ): Promise<void> {
    throw new Error('Belum diimplementasikan');
  }
}

export class ProcurementService {
  public constructor(
    private readonly repository: PurchaseOrderRepository,
    private readonly policy: AuthorizationPolicy,
  ) {}
  public create(po: PurchaseOrder, role: Role): Promise<void> {
    throw new Error('Belum diimplementasikan');
  }
  public approve(id: string, role: Role): Promise<void> {
    throw new Error('Belum diimplementasikan');
  }
  public reject(id: string, role: Role): Promise<void> {
    throw new Error('Belum diimplementasikan');
  }
  public receive(
    id: string, note: GoodsReceiptNote, role: Role,
  ): Promise<void> {
    throw new Error('Belum diimplementasikan');
  }
  public pay(
    id: string, info: PaymentInfo, role: Role,
  ): Promise<void> {
    throw new Error('Belum diimplementasikan');
  }
}

export class InventoryService {
  public constructor(private readonly storage: Storage) {}
  public list(): InventoryItem[] {
    throw new Error('Belum diimplementasikan');
  }
  public deploy(sku: string, qty: number): void {
    throw new Error('Belum diimplementasikan');
  }
}

export class PayrollService {
  public constructor(private readonly storage: Storage) {}
  public listEmployees(): Employee[] {
    throw new Error('Belum diimplementasikan');
  }
  public getRecord(
    empId: string, periodKey: string,
  ): PayrollDisbursementRecord | undefined {
    throw new Error('Belum diimplementasikan');
  }
  public record(
    empId: string, periodKey: string,
  ): PayrollDisbursementRecord {
    throw new Error('Belum diimplementasikan');
  }
}

export class FinanceService {
  public constructor(private readonly storage: Storage) {}
  public listInvoices(): InvoiceRecord[] {
    throw new Error('Belum diimplementasikan');
  }
  public markAsPaid(id: string): InvoiceRecord {
    throw new Error('Belum diimplementasikan');
  }
}

export class BillingService {
  public constructor(private readonly storage: Storage) {}
  public getSubscription(): SubscriptionRecord {
    throw new Error('Belum diimplementasikan');
  }
  public changePlan(
    planId: SubscriptionTier, cycle: BillingCycle,
  ): SubscriptionRecord {
    throw new Error('Belum diimplementasikan');
  }
  public setAutoRenew(enabled: boolean): void {
    throw new Error('Belum diimplementasikan');
  }
}
