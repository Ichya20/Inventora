import { isMonthKey } from './businessDates';

interface HistoricalBreakdown {
  allowances: number;
  bpjs: number;
  positionAllowance?: number;
  transportAllowance?: number;
  bpjsKesehatan?: number;
  bpjsKetenagakerjaan?: number;
}

interface PeriodRecord {
  empId: string;
  period: string;
  periodKey?: string;
  disbursedAt: string;
  status: string;
}

export function payrollPeriodKey(record: Pick<PeriodRecord, 'period' | 'periodKey'>): string | null {
  if (record.periodKey && isMonthKey(record.periodKey)) return record.periodKey;
  // Read legacy English/Indonesian labels without relying on platform Date.parse heuristics.
  const months = ['january|januari', 'february|februari', 'march|maret', 'april', 'may|mei', 'june|juni', 'july|juli', 'august|agustus', 'september', 'october|oktober', 'november', 'december|desember'];
  const match = record.period.trim().toLowerCase().match(/^(\S+)\s+(\d{4})$/);
  if (!match) return null;
  const index = months.findIndex(names => names.split('|').includes(match[1]));
  return index < 0 ? null : `${match[2]}-${String(index + 1).padStart(2, '0')}`;
}

export function findPayrollRecord<T extends PeriodRecord>(records: T[], empId: string, period: string): T | undefined {
  return records.filter(record => record.empId === empId && record.status === 'SUCCESS' && payrollPeriodKey(record) === period)
    .sort((a, b) => b.disbursedAt.localeCompare(a.disbursedAt))[0];
}

export function assertPayrollAvailable(records: PeriodRecord[], empId: string, period: string) {
  if (!isMonthKey(period)) throw new Error('Periode payroll tidak valid.');
  if (findPayrollRecord(records, empId, period)) throw new Error('Payroll karyawan untuk periode ini sudah tercatat. Pembayaran ulang diblokir.');
}

export function historicalPayrollBreakdown(record: HistoricalBreakdown) {
  const exactAllowances = record.positionAllowance !== undefined && record.transportAllowance !== undefined;
  const exactBpjs = record.bpjsKesehatan !== undefined && record.bpjsKetenagakerjaan !== undefined;
  return {
    positionAllowance: exactAllowances ? record.positionAllowance : 0,
    transportAllowance: exactAllowances ? record.transportAllowance : 0,
    bpjsKesehatan: exactBpjs ? record.bpjsKesehatan : 0,
    bpjsKetenagakerjaan: exactBpjs ? record.bpjsKetenagakerjaan : 0,
    ...(!exactAllowances ? { allowancesTotal: record.allowances } : {}),
    ...(!exactBpjs ? { bpjsTotal: record.bpjs } : {}),
  };
}
