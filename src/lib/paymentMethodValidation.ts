import { businessDate } from './businessDates';

export interface PaymentMethodLabel {
  type: string;
  brand: string;
  last4: string;
  holder: string;
  exp: string;
  billingEmail: string;
}

export function validateCardLabel<T extends { last4: string; holder: string; exp: string }>(input: T, today = businessDate(), lang: 'en' | 'id' = 'en'): T {
  const label = { ...input, last4: input.last4.trim(), holder: input.holder.trim(), exp: input.exp.trim() };
  const fail = (en: string, id: string): never => { throw new Error(lang === 'en' ? en : id); };
  if (!/^\d{4}$/.test(label.last4)) fail('Enter exactly four card digits.', 'Masukkan tepat empat digit kartu.');
  if (!label.holder || label.holder.length > 120) fail('Enter a cardholder or entity name (up to 120 characters).', 'Isi nama pemegang kartu atau entitas (maksimal 120 karakter).');
  if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(label.exp)) fail('Use a valid expiry month in MM/YY format.', 'Gunakan bulan berlaku yang valid dengan format MM/YY.');
  const [month, year] = label.exp.split('/').map(Number);
  if (`${2000 + year}-${String(month).padStart(2, '0')}` < today.slice(0, 7)) fail('The payment label has expired.', 'Masa berlaku label pembayaran sudah habis.');
  return label;
}

export function validatePaymentMethodLabel(input: PaymentMethodLabel, today = businessDate(), lang: 'en' | 'id' = 'en'): PaymentMethodLabel {
  const label = validateCardLabel({ ...input, billingEmail: input.billingEmail.trim() }, today, lang);
  const fail = (en: string, id: string): never => { throw new Error(lang === 'en' ? en : id); };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(label.billingEmail) || label.billingEmail.length > 254) fail('Enter a valid billing email.', 'Masukkan email penagihan yang valid.');
  return label;
}
