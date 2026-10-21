export const BUSINESS_TIME_ZONE = 'Asia/Jakarta';

export function businessDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: BUSINESS_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const part = (type: string) => parts.find(p => p.type === type)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function isMonthKey(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function monthLabel(key: string, lang: 'en' | 'id'): string {
  if (!isMonthKey(key)) throw new Error('Periode payroll tidak valid.');
  return new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'id-ID', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${key}-01T00:00:00Z`));
}

export function dateLabel(key: string, lang: 'en' | 'id'): string {
  return new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${key}T00:00:00Z`));
}

// Calculate each boundary from the original anchor so January 31 does not drift to the 28th.
export function addMonths(anchor: string, count: number): string {
  const [year, month, day] = anchor.split('-').map(Number);
  const target = new Date(Date.UTC(year, month - 1 + count, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target.toISOString().slice(0, 10);
}

export function billingWindow(anchor: string, cycle: 'monthly' | 'annual', today = businessDate(), autoRenew = true) {
  const interval = cycle === 'annual' ? 12 : 1;
  const months = (Number(today.slice(0, 4)) - Number(anchor.slice(0, 4))) * 12 + Number(today.slice(5, 7)) - Number(anchor.slice(5, 7));
  let step = autoRenew ? Math.max(0, Math.floor(months / interval)) : 0;
  if (addMonths(anchor, step * interval) > today) step = Math.max(0, step - 1);
  const start = addMonths(anchor, step * interval);
  const end = addMonths(anchor, (step + 1) * interval);
  return { start, end, expired: end <= today };
}
