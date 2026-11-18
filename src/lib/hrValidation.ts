import type { Employee, PayrollDisbursementRecord } from '../components/HRView';
import { readStoredArray } from './storageUtils';

export const HR_EMPLOYEES_KEY = 'inventora_hr_employees_v2';
export const PAYROLL_HISTORY_KEY = 'inventora_hr_payroll_history_v2';

const object = (value: unknown): value is Record<string, any> => value !== null && typeof value === 'object' && !Array.isArray(value);
const nonnegativeAmount = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const textFields = (value: Record<string, any>, keys: string[]) => keys.every(key => typeof value[key] === 'string');

export function isEmployee(value: unknown): value is Employee {
  if (!object(value) || !textFields(value, ['id', 'name', 'email', 'dept', 'role', 'status', 'joined'])
    || !value.id.trim() || !['green', 'gray', 'red'].includes(value.color) || !object(value.salary)) return false;
  return textFields(value.salary, ['bankName', 'accountNumber'])
    && ['baseSalary', 'positionAllowance', 'transportAllowance', 'bonus', 'bpjsKesehatan', 'bpjsKetenagakerjaan', 'pph21']
      .every(key => nonnegativeAmount(value.salary[key]));
}

export function isPayrollRecord(value: unknown): value is PayrollDisbursementRecord {
  if (!object(value) || !textFields(value, ['id', 'referenceNumber', 'empId', 'empName', 'dept', 'role', 'period',
    'disbursedAt', 'disbursedDateFormatted', 'bankName', 'accountNumber', 'actor'])
    || !value.id.trim() || !value.empId.trim() || !['SUCCESS', 'SCHEDULED'].includes(value.status)) return false;
  // Existing archived fractions are retained; only new payroll is restricted to whole rupiah.
  return ['baseSalary', 'allowances', 'bonus', 'gross', 'deductions', 'pph21', 'bpjs', 'netPay']
    .every(key => nonnegativeAmount(value[key]))
    && ['positionAllowance', 'transportAllowance', 'bpjsKesehatan', 'bpjsKetenagakerjaan']
      .every(key => value[key] === undefined || nonnegativeAmount(value[key]));
}

function uniqueIds<T extends { id: string }>(items: T[]): T[] {
  if (new Set(items.map(item => item.id)).size !== items.length) throw new Error('Duplicate IDs in saved HR data. Original data is retained.');
  return items;
}

export const readHrEmployees = (fallback: Employee[]) => uniqueIds(readStoredArray(HR_EMPLOYEES_KEY, fallback, isEmployee));
export const readPayrollHistory = (fallback: PayrollDisbursementRecord[]) => uniqueIds(readStoredArray(PAYROLL_HISTORY_KEY, fallback, isPayrollRecord));

export function isWholeRupiah(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

export function assertPayrollAmounts(values: Record<string, number>, bonus: unknown, lang: 'en' | 'id' = 'en') {
  if (!isWholeRupiah(bonus) || !Object.values(values).every(isWholeRupiah)) {
    throw new Error(lang === 'en' ? 'Payroll amounts must be whole, non-negative rupiah within the supported range.'
      : 'Nominal payroll harus berupa rupiah bulat, tidak negatif, dan dalam batas yang didukung.');
  }
}
