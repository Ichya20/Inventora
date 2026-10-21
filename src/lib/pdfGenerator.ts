import { jsPDF } from 'jspdf';

interface InvoiceData {
  id: string;
  client: string;
  date: string;
  total: number;
  status: string;
  color?: string;
  desc?: string;
  isOverdue?: boolean;
}

interface ReceiptData {
  id: string;
  client: string;
  date: string;
  total: number;
  desc?: string;
  paymentMethod?: string;
  receiptNumber?: string;
}

interface PurchaseOrderData {
  id: string;
  vendor: string;
  desc?: string;
  date: string;
  deliveryDate?: string;
  total: number;
  status: string;
  department?: string;
  subtotal?: number;
  taxAmount?: number;
  discountAmount?: number;
  withholdingTaxAmount?: number;
  lineItems?: Array<{
    id?: string;
    sku?: string;
    name: string;
    qty: number;
    unitPrice: number;
    totalPrice?: number;
    subtotal?: number;
  }>;
  items?: Array<{
    id?: string;
    sku?: string;
    name: string;
    qty: number;
    unitPrice: number;
    subtotal?: number;
  }>;
}

function formatCurrency(amount: number, lang: 'id' | 'en'): string {
  const formatted = Math.round(amount).toLocaleString(lang === 'en' ? 'en-US' : 'id-ID');
  return `Rp ${formatted}`;
}

/**
 * Generates and directly downloads a professional Commercial Tax Invoice PDF.
 */
export function downloadInvoicePdf(invoice: InvoiceData, lang: 'id' | 'en' = 'en'): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const numLocale = lang === 'en' ? 'en-US' : 'id-ID';
  const subtotal = Math.round(invoice.total / 1.11);
  const vatAmount = invoice.total - subtotal;

  // --- Header Banner ---
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.rect(0, 0, 210, 38, 'F');

  // Company Brand
  doc.setFillColor(0, 112, 243); // Inventora Blue
  doc.roundedRect(15, 8, 12, 12, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('INV', 21, 16, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('PT INVENTORA NUSANTARA TEKNOLOGI', 32, 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184); // Slate 400
  doc.text(lang === 'en' ? 'Example company details - tax identity not verified' : 'Data perusahaan contoh - identitas pajak belum diverifikasi', 32, 19);
  doc.text('Inventora - local invoice simulation', 32, 24);

  // Invoice Title Right
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text(lang === 'en' ? 'SAMPLE INVOICE' : 'INVOICE CONTOH', 195, 14, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(56, 189, 248); // Sky blue
  doc.text(invoice.id, 195, 20, { align: 'right' });

  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(`${lang === 'en' ? 'Issue Date' : 'Tgl Terbit'}: ${invoice.date}`, 195, 25, { align: 'right' });

  // --- Billing Meta Cards ---
  // Left: Bill To
  doc.setFillColor(248, 250, 252); // Slate 50
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.roundedRect(15, 45, 85, 36, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(lang === 'en' ? 'BILLED TO / CUSTOMER:' : 'DITAGIHKAN KEPADA:', 20, 52);

  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(doc.splitTextToSize(invoice.client, 75), 20, 59);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(lang === 'en' ? 'Local invoice record' : 'Catatan invoice lokal', 20, 70);
  doc.text(lang === 'en' ? 'Tax details below are illustrative' : 'Rincian pajak di bawah adalah contoh', 20, 75);

  // Right: Invoice Summary
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(110, 45, 85, 36, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(lang === 'en' ? 'INVOICE SPECIFICATIONS:' : 'RINCIAN FAKTUR:', 115, 52);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text(`${lang === 'en' ? 'Status' : 'Status Tagihan'}:`, 115, 59);
  doc.setFont('helvetica', 'bold');
  const isPaid = invoice.status === 'Lunas' || invoice.status === 'Paid';
  doc.setTextColor(isPaid ? 16 : 220, isPaid ? 185 : 38, isPaid ? 129 : 38);
  doc.text(invoice.status.toUpperCase(), 160, 59);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);
  doc.text(`${lang === 'en' ? 'Payment Due' : 'Jatuh Tempo'}:`, 115, 65);
  doc.text(invoice.date, 160, 65);

  doc.text(`${lang === 'en' ? 'Currency' : 'Mata Uang'}:`, 115, 71);
  doc.text('IDR (Indonesian Rupiah)', 160, 71);

  doc.text(`${lang === 'en' ? 'Record type' : 'Jenis catatan'}:`, 115, 77);
  doc.text(lang === 'en' ? 'Local simulation' : 'Simulasi lokal', 160, 77);

  // --- Table Header ---
  doc.setFillColor(241, 245, 249); // Slate 100
  doc.rect(15, 88, 180, 8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(lang === 'en' ? 'ITEM DESCRIPTION' : 'DESKRIPSI ITEM & JASA', 20, 93);
  doc.text(lang === 'en' ? 'QTY' : 'JML', 115, 93, { align: 'center' });
  doc.text(lang === 'en' ? 'TAX' : 'PPN', 140, 93, { align: 'right' });
  doc.text(lang === 'en' ? 'AMOUNT (IDR)' : 'JUMLAH (IDR)', 190, 93, { align: 'right' });

  // --- Table Row ---
  doc.setDrawColor(226, 232, 240);
  doc.line(15, 96, 195, 96);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(lang === 'en' ? 'Recorded invoice item' : 'Item catatan invoice', 20, 103);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  const descriptionLines = doc.splitTextToSize(invoice.desc || (lang === 'en' ? 'Sample subscription invoice' : 'Contoh invoice langganan'), 82);
  doc.text(descriptionLines, 20, 109);

  doc.setTextColor(15, 23, 42);
  doc.text('1 Cycle', 115, 105, { align: 'center' });
  doc.text('11%', 140, 105, { align: 'right' });
  doc.text(formatCurrency(subtotal, lang), 190, 105, { align: 'right' });

  const tableBottom = Math.max(119, 113 + descriptionLines.length * 4);
  doc.line(15, tableBottom, 195, tableBottom);

  // --- Calculation Breakdown ---
  const calcX = 120;
  let calcY = tableBottom + 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(lang === 'en' ? 'Subtotal (DPP):' : 'Dasar Pengenaan Pajak (DPP):', calcX, calcY);
  doc.setTextColor(15, 23, 42);
  doc.text(formatCurrency(subtotal, lang), 190, calcY, { align: 'right' });

  calcY += 6;
  doc.setTextColor(100, 116, 139);
  doc.text(lang === 'en' ? 'Value Added Tax (PPN 11%):' : 'PPN Terutang (11%):', calcX, calcY);
  doc.setTextColor(15, 23, 42);
  doc.text(formatCurrency(vatAmount, lang), 190, calcY, { align: 'right' });

  calcY += 6;
  doc.setFillColor(238, 242, 255); // Indigo 50
  doc.roundedRect(calcX - 5, calcY - 4, 80, 10, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 112, 243);
  doc.text(lang === 'en' ? 'Total Due (IDR):' : 'Total Tagihan (IDR):', calcX, calcY + 3);
  doc.text(formatCurrency(invoice.total, lang), 190, calcY + 3, { align: 'right' });

  // --- Payment Remittance Bank Box ---
  const bankBoxY = calcY + 13;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(15, bankBoxY, 180, 36, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text(lang === 'en' ? 'SIMULATION INFORMATION' : 'INFORMASI SIMULASI', 20, bankBoxY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);

  doc.text('1. Contoh kanal Virtual Account (simulasi):', 20, bankBoxY + 14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 112, 243);
  doc.text('Tidak ada nomor pembayaran aktif', 20, bankBoxY + 19);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('2. Contoh rekening perusahaan:', 110, bankBoxY + 14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Tidak untuk transfer dana', 110, bankBoxY + 19);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('* Contoh dokumen untuk meninjau data invoice lokal. Jangan gunakan untuk pembayaran.', 20, bankBoxY + 28);
  doc.text('* Rekonsiliasi bank dan penerbitan faktur pajak belum terintegrasi.', 20, bankBoxY + 32);

  // --- Legal Signatures & Stamp ---
  const sigY = bankBoxY + 47;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Jakarta, ' + invoice.date, 150, sigY);
  doc.text('Inventora - local simulation', 150, sigY + 4);

  // Digital Stamp Box
  doc.setDrawColor(0, 112, 243);
  doc.setLineWidth(0.4);
  doc.roundedRect(148, sigY + 8, 45, 18, 1.5, 1.5, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(0, 112, 243);
  doc.text('LOCAL SIMULATION', 170.5, sigY + 14, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('NO DIGITAL SIGNATURE', 170.5, sigY + 18, { align: 'center' });
  doc.text(invoice.id, 170.5, sigY + 22, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('Finance Officer (example)', 150, sigY + 32);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Sample approval placeholder', 150, sigY + 36);

  // Footer bar
  doc.setFillColor(241, 245, 249);
  doc.rect(0, 285, 210, 12, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('SIMULASI - Arsip lokal, bukan faktur pajak resmi atau bukti pembayaran bank.', 105, 291, { align: 'center' });

  // Save/Download directly as .pdf file
  const fileName = `invoice-${invoice.id}.pdf`;
  doc.save(fileName);
}

/**
 * Generates and directly downloads an Official Payment Settlement Receipt PDF.
 */
export function downloadReceiptPdf(receipt: ReceiptData, lang: 'id' | 'en' = 'en'): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const receiptNum = receipt.receiptNumber || `REC-${Date.now().toString().slice(-6)}`;

  // Header Banner
  doc.setFillColor(16, 185, 129); // Emerald 600
  doc.rect(0, 0, 210, 36, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text(lang === 'en' ? 'PAYMENT SIMULATION RECORD' : 'CATATAN SIMULASI BAYAR', 15, 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(209, 250, 229); // Emerald 100
  doc.text('Inventora | Local payment simulation', 15, 22);
  doc.text('Status: SIMULATION RECORDED / SIMULASI TERCATAT', 15, 27);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(receiptNum, 195, 16, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(209, 250, 229);
  doc.text(receipt.date, 195, 22, { align: 'right' });

  // Main Receipt Container
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(15, 45, 180, 85, 2, 2, 'FD');

  // Key Value Grid
  const leftX = 22;
  let curY = 56;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(lang === 'en' ? 'PARTY IN SIMULATED RECORD:' : 'PIHAK DALAM CATATAN SIMULASI:', leftX, curY);
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(receipt.client, leftX, curY + 6);

  curY += 16;
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(lang === 'en' ? 'PAYMENT FOR / INVOICE REF:' : 'UNTUK PEMBAYARAN FAKTUR:', leftX, curY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 112, 243);
  doc.text(`Invoice #${receipt.id} (${receipt.desc || 'Enterprise Cloud & IT Infrastructure'})`, leftX, curY + 5);

  curY += 15;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(lang === 'en' ? 'PAYMENT CHANNEL / METHOD:' : 'METODE PEMBAYARAN:', leftX, curY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(receipt.paymentMethod || (lang === 'en' ? 'Not specified' : 'Tidak dicantumkan'), leftX, curY + 5);

  curY += 15;
  // Settlement Amount Highlight Box
  doc.setFillColor(236, 253, 245); // Emerald 50
  doc.setDrawColor(16, 185, 129);
  doc.roundedRect(leftX, curY, 166, 16, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(6, 95, 70); // Emerald 800
  doc.text(lang === 'en' ? 'TOTAL SIMULATED AMOUNT:' : 'TOTAL NOMINAL SIMULASI:', leftX + 5, curY + 10);

  doc.setFontSize(13);
  doc.setTextColor(5, 150, 105);
  doc.text(formatCurrency(receipt.total, lang), leftX + 160, curY + 11, { align: 'right' });

  // Verification Box
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(15, 138, 180, 24, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text(lang === 'en' ? 'LOCAL SIMULATION RECORD' : 'CATATAN SIMULASI LOKAL', 22, 145);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Catatan simulasi lokal. Tidak ada verifikasi bank, transfer dana, atau meterai elektronik.', 22, 150);
  doc.text(`Kuitansi ini diterbitkan secara otomatis oleh sistem Inventora ERP pada ${new Date().toLocaleDateString('id-ID')}.`, 22, 155);

  // Digital Signatures
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Jakarta, ' + receipt.date, 150, 175);
  doc.text('Inventora - local simulation', 150, 180);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('Finance Officer (example)', 150, 205);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Sample approval placeholder', 150, 210);

  // Footer bar
  doc.setFillColor(241, 245, 249);
  doc.rect(0, 285, 210, 12, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Inventora ERP - Enterprise Financial Management System', 105, 291, { align: 'center' });

  const fileName = `receipt-${receipt.id}.pdf`;
  doc.save(fileName);
}

/**
 * Generates and directly downloads an Official Purchase Order Voucher PDF.
 */
export function downloadPurchaseOrderPdf(po: PurchaseOrderData, lang: 'id' | 'en' = 'en'): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const items = po.lineItems || po.items || [
    { name: po.desc || 'General Procurement Order Item', qty: 1, unitPrice: po.total, totalPrice: po.total }
  ];

  // Header Banner
  doc.setFillColor(30, 41, 59); // Slate 800
  doc.rect(0, 0, 210, 36, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text(lang === 'en' ? 'PURCHASE ORDER (PO)' : 'SURAT PESANAN PEMBELIAN (PO)', 15, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('PT INVENTORA NUSANTARA TEKNOLOGI | Corporate Procurement Division', 15, 21);
  doc.text(`Department: ${po.department || 'IT Infrastructure'} | Budget Tagged & Authorized`, 15, 26);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(56, 189, 248);
  doc.text(po.id, 195, 15, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text(`PO Date: ${po.date}`, 195, 21, { align: 'right' });
  if (po.deliveryDate) doc.text(`${lang === 'en' ? 'Delivery' : 'Tanggal Kirim'}: ${po.deliveryDate}`, 195, 31, { align: 'right' });
  doc.text(`Status: ${po.status.toUpperCase()}`, 195, 26, { align: 'right' });

  // Vendor & Delivery Details
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(15, 43, 85, 30, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(lang === 'en' ? 'OFFICIAL VENDOR / SUPPLIER:' : 'VENDOR / PEMASOK RESMI:', 20, 50);
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(po.vendor, 20, 57);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Supplier listed in this purchase order', 20, 63);

  // Delivery & Billing Box
  doc.roundedRect(110, 43, 85, 30, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(lang === 'en' ? 'DELIVERY DESTINATION:' : 'ALAMAT PENGIRIMAN:', 115, 50);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('Central Distribution Center & Data Hall A-1', 115, 56);
  doc.text('Gudang Inventora Logistik, Kawasan Industri MM2100', 115, 61);
  doc.text('Bekasi, Jawa Barat 17530', 115, 66);

  // Line Items Table Header
  let tableY = 80;
  doc.setFillColor(241, 245, 249);
  doc.rect(15, tableY, 180, 8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(lang === 'en' ? 'LINE ITEM & SPECIFICATION' : 'NAMA BARANG / SPESIFIKASI', 20, tableY + 5.5);
  doc.text(lang === 'en' ? 'QTY' : 'QTY', 115, tableY + 5.5, { align: 'center' });
  doc.text(lang === 'en' ? 'UNIT PRICE' : 'HARGA SATUAN', 150, tableY + 5.5, { align: 'right' });
  doc.text(lang === 'en' ? 'TOTAL (IDR)' : 'TOTAL (IDR)', 190, tableY + 5.5, { align: 'right' });

  tableY += 8;

  items.forEach((item, idx) => {
    const unitPrice = item.unitPrice || 0;
    const itemTotal = item.totalPrice || item.subtotal || unitPrice * item.qty;

    doc.setDrawColor(226, 232, 240);
    doc.line(15, tableY, 195, tableY);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`${idx + 1}. ${item.name}`, 20, tableY + 5);

    if (item.sku) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`SKU: ${item.sku}`, 20, tableY + 9.5);
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`${item.qty} Unit`, 115, tableY + 6, { align: 'center' });
    doc.text(formatCurrency(unitPrice, lang), 150, tableY + 6, { align: 'right' });
    doc.text(formatCurrency(itemTotal, lang), 190, tableY + 6, { align: 'right' });

    tableY += item.sku ? 13 : 9;
  });

  doc.line(15, tableY, 195, tableY);

  // Totals Box
  tableY += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(lang === 'en' ? 'Grand Total Purchase Order:' : 'Total Nilai Pesanan:', 110, tableY);
  doc.setTextColor(0, 112, 243);
  doc.text(formatCurrency(po.total, lang), 190, tableY, { align: 'right' });

  // 3-Way Match Notice
  tableY += 12;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(15, tableY, 180, 20, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text('KETENTUAN PENERIMAAN BARANG (3-WAY MATCHING AUDIT)', 20, tableY + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Barang wajib disertai Surat Jalan resmi. Tim Gudang akan melakukan inspeksi fisik (GRN) sebelum pembayaran diproses.', 20, tableY + 11);
  doc.text('Faktur tagihan vendor wajib sesuai dengan kuantitas yang lolos inspeksi penerimaan barang.', 20, tableY + 16);

  // Signatures
  tableY += 32;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Diajukan Oleh (Procurement):', 25, tableY);
  doc.text('Disetujui Oleh (Budget Approver):', 140, tableY);

  tableY += 18;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Procurement Officer (example)', 25, tableY);
  doc.text('Budget Approver (example)', 140, tableY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Procurement Operations', 25, tableY + 4);
  doc.text('General Manager / VP Finance', 140, tableY + 4);

  // Footer bar
  doc.setFillColor(241, 245, 249);
  doc.rect(0, 285, 210, 12, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Inventora ERP - Procurement simulation / Simulasi pengadaan', 105, 291, { align: 'center' });

  const fileName = `purchase-order-${po.id}.pdf`;
  doc.save(fileName);
}

export interface PayslipData {
  empId: string;
  empName: string;
  dept: string;
  role: string;
  taxId?: string;
  period: string;
  baseSalary: number;
  positionAllowance: number;
  transportAllowance: number;
  allowancesTotal?: number;
  bpjsTotal?: number;
  bonus: number;
  bpjsKesehatan: number;
  bpjsKetenagakerjaan: number;
  pph21: number;
  netPay: number;
  bankName: string;
  accountNumber: string;
  disbursementDate?: string;
  draft?: boolean;
}

export function downloadPayslipPdf(data: PayslipData, lang: 'id' | 'en' = 'id'): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Top header bar
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 28, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('INVENTORA ENTERPRISE ERP', 15, 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184);
  doc.text(lang === 'en' ? (data.draft ? 'DRAFT PAYSLIP - NOT RECORDED' : 'SIMULATED MONTHLY PAYSLIP') : (data.draft ? 'DRAF SLIP - BELUM DICATAT' : 'SLIP GAJI SIMULASI'), 15, 21);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(data.period, 195, 14, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(`Ref: PAY/${data.empId}/${data.period.replace(/\s+/g, '-')}`, 195, 21, { align: 'right' });

  // Employee Identity Card
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(15, 34, 180, 32, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(15, 34, 180, 32, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text(data.empName, 20, 42);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`${data.role} - ${data.dept} Department`, 20, 48);
  doc.text(`Employee ID: ${data.empId}  |  NPWP / Tax ID: ${data.taxId || '-'}`, 20, 54);
  doc.text(`${lang === 'en' ? 'Account reference' : 'Referensi rekening'}: ${data.bankName} (${data.accountNumber})`, 20, 60);

  // Section Headers: Earnings & Deductions
  let startY = 74;

  // Earnings Table (Left Column: 15 to 102)
  doc.setFillColor(241, 245, 249);
  doc.rect(15, startY, 88, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(lang === 'en' ? 'EARNINGS & ALLOWANCES' : 'PENDAPATAN & TUNJANGAN', 18, startY + 5.5);

  // Deductions Table (Right Column: 107 to 195)
  doc.setFillColor(241, 245, 249);
  doc.rect(107, startY, 88, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(lang === 'en' ? 'DEDUCTIONS & TAX' : 'POTONGAN & PAJAK', 110, startY + 5.5);

  let curY = startY + 14;
  const earnings = [
    { label: lang === 'en' ? 'Basic Salary' : 'Gaji Pokok', val: data.baseSalary },
    ...(data.allowancesTotal !== undefined
      ? [{ label: lang === 'en' ? 'Allowances (legacy total)' : 'Tunjangan (total arsip)', val: data.allowancesTotal }]
      : [{ label: lang === 'en' ? 'Position Allowance' : 'Tunjangan Jabatan', val: data.positionAllowance },
         { label: lang === 'en' ? 'Transport & Comm.' : 'Tunjangan Transportasi', val: data.transportAllowance }]),
    { label: lang === 'en' ? 'Performance Bonus' : 'Bonus Kinerja / Lembur', val: data.bonus },
  ];

  const deductions = [
    { label: lang === 'en' ? 'Income Tax (PPh 21 TER)' : 'PPh 21 Terutang', val: data.pph21 },
    ...(data.bpjsTotal !== undefined
      ? [{ label: 'BPJS (total arsip)', val: data.bpjsTotal }]
      : [{ label: 'BPJS Ketenagakerjaan', val: data.bpjsKetenagakerjaan },
         { label: 'BPJS Kesehatan', val: data.bpjsKesehatan }]),
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  // Print Earnings items
  earnings.forEach((e) => {
    doc.setTextColor(71, 85, 105);
    doc.text(e.label, 18, curY);
    doc.setTextColor(15, 23, 42);
    doc.text(formatCurrency(e.val, lang), 100, curY, { align: 'right' });
    curY += 7;
  });

  // Print Deductions items
  let dY = startY + 14;
  deductions.forEach((d) => {
    doc.setTextColor(71, 85, 105);
    doc.text(d.label, 110, dY);
    doc.setTextColor(225, 29, 72); // rose-600
    doc.text(`- ${formatCurrency(d.val, lang)}`, 192, dY, { align: 'right' });
    dY += 7;
  });

  const totalEarnings = data.baseSalary + (data.allowancesTotal ?? (data.positionAllowance + data.transportAllowance)) + data.bonus;
  const totalDeductions = data.pph21 + (data.bpjsTotal ?? (data.bpjsKetenagakerjaan + data.bpjsKesehatan));

  // Earnings Subtotal line
  doc.setDrawColor(226, 232, 240);
  doc.line(15, curY + 2, 103, curY + 2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(lang === 'en' ? 'Gross Earnings:' : 'Total Bruto:', 18, curY + 8);
  doc.text(formatCurrency(totalEarnings, lang), 100, curY + 8, { align: 'right' });

  // Deductions Subtotal line
  doc.line(107, curY + 2, 195, curY + 2);
  doc.text(lang === 'en' ? 'Total Deductions:' : 'Total Potongan:', 110, curY + 8);
  doc.setTextColor(225, 29, 72);
  doc.text(`- ${formatCurrency(totalDeductions, lang)}`, 192, curY + 8, { align: 'right' });

  // Net Take-Home Pay Grand Banner
  const bannerY = curY + 20;
  doc.setFillColor(16, 185, 129); // emerald-500
  doc.roundedRect(15, bannerY, 180, 24, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(lang === 'en' ? (data.draft ? 'ESTIMATED NET PAY' : 'NET PAY - SIMULATION') : (data.draft ? 'ESTIMASI GAJI BERSIH' : 'GAJI BERSIH - SIMULASI'), 25, bannerY + 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(lang === 'en' ? `${data.draft ? 'Not recorded' : 'Simulation recorded'} - ${data.bankName}` : `${data.draft ? 'Belum dicatat' : 'Simulasi tercatat'} - ${data.bankName}`, 25, bannerY + 17);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(formatCurrency(data.netPay, lang), 185, bannerY + 15, { align: 'right' });

  // Notes
  const noteY = bannerY + 34;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    lang === 'en'
      ? 'Local simulation only. No bank transfer or cryptographic signature is provided.'
      : 'Simulasi lokal. Tidak ada transfer bank atau tanda tangan kriptografis.',
    15,
    noteY
  );

  // Signatures
  const sigY = noteY + 16;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(lang === 'en' ? 'Prepared By (Payroll & Tax Officer):' : 'Dibuat Oleh (Payroll & Tax Specialist):', 25, sigY);
  doc.text(lang === 'en' ? 'Approved By (VP Human Resources):' : 'Disetujui Oleh (VP Human Resources):', 130, sigY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Payroll Officer (example)', 25, sigY + 16);
  doc.text('HR Approver (example)', 130, sigY + 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('People Operations & Compensation', 25, sigY + 20);
  doc.text('Head of Corporate People & Culture', 130, sigY + 20);

  // Footer bar
  doc.setFillColor(241, 245, 249);
  doc.rect(0, 285, 210, 12, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Inventora ERP - Payroll simulation / Simulasi payroll', 105, 291, { align: 'center' });

  const fileName = `payslip-${data.empId}-${data.period.replace(/\s+/g, '-')}.pdf`;
  doc.save(fileName);
}
