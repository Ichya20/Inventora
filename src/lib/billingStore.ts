import { saveStoredData } from './storageUtils';
import type { PaymentMethodLabel } from './paymentMethodValidation';

export const BILLING_KEYS = {
  subscription: 'inventora_subscription_v2', addons: 'inventora_billing_addons_v1',
  paymentMethod: 'inventora_billing_pm_v1', salesMessage: 'inventora_requirements_draft_v1',
} as const;

export type BillingCycle = 'monthly' | 'annual';
export type BillingTier = 'starter' | 'business' | 'enterprise';
export interface BillingInvoice {
  id: string; date: string; total: number; period: string; status: string;
  client: string; planName: string; paymentMethod: string;
}
export interface SubscriptionRecord {
  planId: BillingTier; cycle: BillingCycle; anchorDate: string; autoRenew: boolean; invoices: BillingInvoice[];
}
export interface BillingAddons { extraSeats: number; extraAiPacks: number; dedicatedDatabase: boolean }
export interface BillingData {
  addons: BillingAddons; paymentMethod: PaymentMethodLabel; salesMessage: string; subscription: SubscriptionRecord;
}

const object = (value: unknown): value is Record<string, any> => !!value && typeof value === 'object' && !Array.isArray(value);
const text = (value: Record<string, any>, keys: string[]) => keys.every(key => typeof value[key] === 'string');
const amount = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= Number.MAX_SAFE_INTEGER;
const validTier = (value: unknown): value is BillingTier => ['starter', 'business', 'enterprise'].includes(value as string);
const validCycle = (value: unknown): value is BillingCycle => value === 'monthly' || value === 'annual';
const validDate = (value: unknown) => typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])-\d{2}$/.test(value)
  && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
export function isBillingInvoices(value: unknown): value is BillingInvoice[] {
  return Array.isArray(value) && value.every(invoice => object(invoice)
    && text(invoice, ['id', 'date', 'period', 'status', 'client', 'planName', 'paymentMethod'])
    && !!invoice.id.trim() && amount(invoice.total)) && new Set(value.map(invoice => invoice.id)).size === value.length;
}
export function isSubscriptionRecord(value: unknown): value is SubscriptionRecord {
  return object(value) && validTier(value.planId) && validCycle(value.cycle) && validDate(value.anchorDate)
    && typeof value.autoRenew === 'boolean' && isBillingInvoices(value.invoices);
}
export function isBillingAddons(value: unknown): value is BillingAddons {
  return object(value) && [value.extraSeats, value.extraAiPacks].every(number => Number.isSafeInteger(number) && number >= 0)
    && typeof value.dedicatedDatabase === 'boolean';
}
export function isPaymentMethodRecord(value: unknown): value is PaymentMethodLabel {
  return object(value) && text(value, ['type', 'brand', 'last4', 'holder', 'exp', 'billingEmail'])
    && /^\d{4}$/.test(value.last4) && !!value.holder.trim() && /^(0[1-9]|1[0-2])\/\d{2}$/.test(value.exp)
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.billingEmail);
}
function readValue<T>(key: string, fallback: T, validate: (value: unknown) => value is T): T {
  const raw = localStorage.getItem(key);
  const value: unknown = raw === null ? fallback : JSON.parse(raw);
  if (!validate(value)) throw new Error('Saved billing data is invalid. Original data is retained for recovery.');
  return value;
}
export function readSubscription(fallback: SubscriptionRecord): SubscriptionRecord {
  if (localStorage.getItem(BILLING_KEYS.subscription) !== null) return readValue(BILLING_KEYS.subscription, fallback, isSubscriptionRecord);
  // Legacy values are consulted only while no current record exists.
  return { ...fallback,
    planId: readValue('inventora_subscription_plan_v1', fallback.planId, validTier),
    cycle: readValue('inventora_billing_cycle_v1', fallback.cycle, validCycle),
    invoices: readValue('inventora_subscription_invoices_v1', fallback.invoices, isBillingInvoices),
  };
}
export function readBillingData(fallback: BillingData): BillingData {
  return {
    subscription: readSubscription(fallback.subscription),
    addons: readValue(BILLING_KEYS.addons, fallback.addons, isBillingAddons),
    paymentMethod: readValue(BILLING_KEYS.paymentMethod, fallback.paymentMethod, isPaymentMethodRecord),
    salesMessage: readValue(BILLING_KEYS.salesMessage, fallback.salesMessage, (value): value is string => typeof value === 'string'),
  };
}
export async function updateSubscription(fallback: SubscriptionRecord, change: (current: SubscriptionRecord) => SubscriptionRecord): Promise<SubscriptionRecord> {
  const commit = () => {
    const next = change(readSubscription(fallback));
    if (!isSubscriptionRecord(next)) throw new Error('Subscription change is invalid.');
    saveStoredData(BILLING_KEYS.subscription, next, true);
    return next;
  };
  if (typeof navigator !== 'undefined' && navigator.locks) return navigator.locks.request('inventora-billing-subscription', commit);
  if (typeof window !== 'undefined') throw new Error('This browser cannot lock subscription changes. Use a current browser over HTTPS or localhost.');
  return commit();
}
