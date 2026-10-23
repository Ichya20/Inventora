import { commitStoredArray } from './storageUtils';

export function markLocalInvoicePaid<T extends { id: string; status: string; color: string; isOverdue: boolean }>(key: string, fallback: T[], id: string): T[] {
  return commitStoredArray(key, fallback, current => {
    const target = current.find(item => item.id === id);
    if (!target) throw new Error('Faktur tidak ditemukan.');
    if (target.status === 'Lunas') throw new Error('Faktur sudah berstatus Lunas.');
    return current.map(item => item.id === id ? { ...item, status: 'Lunas', color: 'green', isOverdue: false } : item);
  });
}

export function reminderDraft(invoice: { id: string; client: string; date: string; total: number; status: string }, recipient = '', lang: 'id' | 'en' = 'id') {
  const email = recipient.trim();
  if (email && (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) || /[\r\n]/.test(email))) throw new Error('Alamat email penerima tidak valid.');
  if (!invoice || invoice.status === 'Lunas' || !Number.isFinite(invoice.total) || invoice.total < 0) throw new Error('Pengingat hanya tersedia untuk faktur yang belum lunas.');
  const subject = lang === 'id' ? `Pengingat pembayaran faktur ${invoice.id}` : `Payment reminder for invoice ${invoice.id}`;
  const body = lang === 'id'
    ? `Yth. ${invoice.client},\n\nMohon konfirmasi pembayaran faktur ${invoice.id} senilai Rp ${invoice.total.toLocaleString('id-ID')} dengan tanggal tagihan ${invoice.date}.\n\nJika pembayaran telah dilakukan, mohon kirimkan bukti pembayaran untuk pemeriksaan.\n\nTerima kasih.`
    : `Dear ${invoice.client},\n\nPlease confirm payment for invoice ${invoice.id}, amount IDR ${invoice.total.toLocaleString('en-US')}, invoice date ${invoice.date}.\n\nIf payment has been made, please provide the payment confirmation for review.\n\nThank you.`;
  const encode = (value: string) => btoa(Array.from(new TextEncoder().encode(value), byte => String.fromCharCode(byte)).join(''));
  return {
    filename: `reminder-${invoice.id.replace(/[^a-zA-Z0-9_-]/g, '_')}.eml`,
    content: [email ? `To: ${email}` : 'To:', `Subject: =?UTF-8?B?${encode(subject)}?=`, 'X-Unsent: 1', 'MIME-Version: 1.0', 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', encode(body).match(/.{1,76}/g)!.join('\r\n')].join('\r\n'),
  };
}
