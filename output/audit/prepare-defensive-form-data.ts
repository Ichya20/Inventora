import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { validatePurchaseOrderCreate } from '../../src/lib/purchaseOrderValidation';
import { validatedReceiptPatch } from '../../src/lib/goodsReceipt';
import { checkoutSale, COMMERCE_KEY } from '../../src/lib/commerce';

// Data latihan terisolasi; tidak memakai browser, jaringan, akun, atau database.
const out = 'output/defensive-programming';
mkdirSync(out, { recursive: true });

const po = {
  id: 'PO-2026-IT-UJI001', vendor: 'Dell EMC Indonesia', desc: 'IT Infrastructure Requisition (1 items)',
  date: '2026-11-18', deliveryDate: '2026-11-25', department: 'IT Infrastructure',
  status: 'Pending Approval', color: 'orange',
  items: [{ id: 'line-1', sku: 'RS-W1-PRO', name: 'Rack Server Web Infrastructure', qty: 10, unitPrice: 100000, subtotal: 1000000 }],
  subtotal: 1000000, discountAmount: 0, taxAmount: 110000, withholdingTaxAmount: 0, total: 1110000,
  notes: 'Kirim ke gudang utama.',
};
const approvedPo = { ...structuredClone(po), status: 'Disetujui' };
const grn = {
  id: 'GRN-UJI-001', grnNumber: 'GRN-UJI-001', poId: po.id, receivedDate: '2026-11-18',
  receivedBy: 'Petugas Gudang', suratJalanNumber: 'SJ-UJI-001',
  items: [{ sku: 'RS-W1-PRO', name: 'Rack Server Web Infrastructure', orderedQty: 10, receivedQty: 10, condition: 'GOOD' }],
  status: 'MATCHED', inspectorNotes: '',
};
const sale = {
  requestId: 'POS-UJI-001', actorId: 'kasir-uji', actorName: 'Kasir Uji', role: 'Warehouse Manager',
  lines: [{ sku: 'RS-W1-PRO', quantity: 2, unitPrice: 100000, discountPercent: 10 }],
  taxRate: 11, amountPaid: 200000,
};
const inventory = [{ id: 'RS-W1-PRO', name: 'Rack Server Web Infrastructure', stock: 5, stockMin: 1, unitPrice: 100000 }];
let memory = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => memory.set(key, value),
} });
function resetStorage() { memory = new Map([['inventora_inventory_v1', JSON.stringify(inventory)]]); }

type Case = {
  id: string; form: 'PO' | 'GRN' | 'POS'; title: string; category: string; path: string;
  input: string; expected: string; source: string; mutate: (value: any) => void;
};
const cases: Case[] = [];
function add(form: Case['form'], title: string, category: string, path: string, input: string, expected: string, source: string, mutate: Case['mutate']) {
  const id = `${form}-E${String(cases.filter(item => item.form === form).length + 1).padStart(2, '0')}`;
  cases.push({ id, form, title, category, path, input, expected, source, mutate });
}
const poSource = 'src/lib/purchaseOrderValidation.ts:14; src/components/PurchaseUnitView.tsx:196';
const grnSource = 'src/lib/goodsReceipt.ts:27; src/components/ThreeWayMatchModal.tsx:65';
const posSource = 'src/lib/commerce.ts:35,94; src/components/PosView.tsx:58';
const ui = 'Form';
const injected = 'Payload/validator';

add('PO', 'Vendor belum dipilih', 'Wajib diisi', ui, 'vendor=""', 'Tolak PO; vendor wajib diisi.', poSource, v => { v.vendor = ''; });
add('PO', 'Tanggal kirim kosong', 'Wajib diisi', ui, 'deliveryDate=""', 'Tolak PO; tanggal kirim wajib diisi.', poSource, v => { v.deliveryDate = ''; });
add('PO', 'Tanggal kalender tidak ada', 'Format/tanggal', injected, 'deliveryDate="2026-02-30"', 'Tolak tanggal yang tidak ada dalam kalender.', poSource, v => { v.deliveryDate = '2026-02-30'; });
add('PO', 'Nama barang hanya spasi', 'Wajib diisi', ui, 'items[0].name="   " (3 spasi)', 'Tolak nama kosong setelah trim.', poSource, v => { v.items[0].name = '   '; });
add('PO', 'Jumlah barang nol', 'Batas bawah', ui, 'qty=0; subtotal barang=0; subtotal PO=0; pajak=0; total=0', 'Tolak; jumlah harus bilangan bulat positif.', poSource, v => { v.items[0].qty = 0; v.items[0].subtotal = 0; v.subtotal = 0; v.taxAmount = 0; v.total = 0; });
add('PO', 'Jumlah barang pecahan', 'Tipe domain', ui, 'qty=1.5; subtotal barang=150000; subtotal PO=150000; pajak=16500; total=166500', 'Tolak meskipun total konsisten; jumlah harus bulat.', poSource, v => { v.items[0].qty = 1.5; v.items[0].subtotal = 150000; v.subtotal = 150000; v.taxAmount = 16500; v.total = 166500; });
add('PO', 'Harga satuan negatif', 'Batas bawah', ui, 'items[0].unitPrice=-100', 'Tolak harga negatif sebelum penyimpanan.', poSource, v => { v.items[0].unitPrice = -100; });
add('PO', 'Jumlah bertipe teks', 'Tipe data', injected, 'items[0].qty="dua"', 'Tolak; teks tidak boleh dipakai sebagai jumlah.', poSource, v => { v.items[0].qty = 'dua'; });
add('PO', 'Subtotal barang dimanipulasi', 'Konsistensi', injected, 'items[0].subtotal=999998; nilai yang benar=1000000', 'Tolak selisih subtotal Rp2 dari jumlah x harga.', poSource, v => { v.items[0].subtotal = 999998; });
add('PO', 'Total PO dimanipulasi', 'Konsistensi', injected, 'total=1110002; nilai yang benar=1110000', 'Tolak total yang berbeda Rp2 dari rincian.', poSource, v => { v.total = 1110002; });
add('PO', 'Daftar barang dikosongkan', 'Struktur data', injected, 'items=[]', 'Tolak; PO memerlukan sedikitnya satu barang.', poSource, v => { v.items = []; });
add('PO', 'Catatan melewati batas', 'Panjang data', injected, 'notes="A" sebanyak 10001 karakter', 'Tolak catatan yang melebihi 10000 karakter.', poSource, v => { v.notes = 'A'.repeat(10001); });

add('GRN', 'Nama penerima kosong', 'Wajib diisi', ui, 'receivedBy=""', 'Tolak GRN; nama penerima wajib diisi.', grnSource, v => { v.receivedBy = ''; });
add('GRN', 'Nama penerima hanya spasi', 'Wajib diisi', ui, 'receivedBy="   " (3 spasi)', 'Tolak nama kosong setelah trim.', grnSource, v => { v.receivedBy = '   '; });
add('GRN', 'Nomor surat jalan kosong', 'Wajib diisi', ui, 'suratJalanNumber=""', 'Tolak GRN; nomor surat jalan wajib diisi.', grnSource, v => { v.suratJalanNumber = ''; });
add('GRN', 'Nomor surat jalan terlalu panjang', 'Panjang data', injected, 'suratJalanNumber="A" sebanyak 501 karakter', 'Tolak; panjang maksimum 500 karakter.', grnSource, v => { v.suratJalanNumber = 'A'.repeat(501); });
add('GRN', 'Jumlah diterima negatif', 'Batas bawah', ui, 'items[0].receivedQty=-1', 'Tolak; jumlah diterima tidak boleh negatif.', grnSource, v => { v.items[0].receivedQty = -1; });
add('GRN', 'Jumlah diterima pecahan', 'Tipe domain', ui, 'items[0].receivedQty=1.5', 'Tolak; jumlah diterima harus bulat.', grnSource, v => { v.items[0].receivedQty = 1.5; });
add('GRN', 'Jumlah diterima null', 'Tipe data', injected, 'items[0].receivedQty=null', 'Tolak nilai null; bukan bilangan bulat.', grnSource, v => { v.items[0].receivedQty = null; });
add('GRN', 'Jumlah melebihi integer aman', 'Batas numerik', injected, 'items[0].receivedQty=9007199254740992', 'Tolak angka di atas batas integer aman JavaScript.', grnSource, v => { v.items[0].receivedQty = 9007199254740992; });
add('GRN', 'Catatan pemeriksaan terlalu panjang', 'Panjang data', injected, 'inspectorNotes="A" sebanyak 4001 karakter', 'Tolak; panjang maksimum 4000 karakter.', grnSource, v => { v.inspectorNotes = 'A'.repeat(4001); });
add('GRN', 'Kondisi di luar daftar pilihan', 'Whitelist', injected, 'items[0].condition="UNKNOWN"', 'Tolak kondisi di luar empat pilihan yang sah.', grnSource, v => { v.items[0].condition = 'UNKNOWN'; });
add('GRN', 'Rincian penerimaan hilang', 'Relasi data', injected, 'items=[]; PO memiliki 1 baris barang', 'Tolak; seluruh rincian PO harus diperiksa.', grnSource, v => { v.items = []; });
add('GRN', 'Status sesuai dipalsukan', 'Konsistensi', injected, 'receivedQty=9; orderedQty=10; status="MATCHED"', 'Tolak status MATCHED; jumlah tersebut berselisih.', grnSource, v => { v.items[0].receivedQty = 9; v.status = 'MATCHED'; });

add('POS', 'Keranjang kosong', 'Struktur data', 'Form/payload', 'lines=[]', 'Tolak transaksi tanpa barang.', posSource, v => { v.lines = []; });
add('POS', 'Jumlah penjualan nol', 'Batas bawah', ui, 'lines[0].quantity=0', 'Tolak; jumlah penjualan harus positif.', posSource, v => { v.lines[0].quantity = 0; });
add('POS', 'Jumlah penjualan negatif', 'Batas bawah', ui, 'lines[0].quantity=-1', 'Tolak jumlah negatif; stok tidak bertambah.', posSource, v => { v.lines[0].quantity = -1; });
add('POS', 'Jumlah penjualan pecahan', 'Tipe domain', ui, 'lines[0].quantity=1.5', 'Tolak; jumlah penjualan harus bulat.', posSource, v => { v.lines[0].quantity = 1.5; });
add('POS', 'Jumlah melebihi stok', 'Aturan stok', ui, 'quantity=6; stok tersedia=5; amountPaid=1000000', 'Tolak stok kurang meskipun uang mencukupi.', posSource, v => { v.lines[0].quantity = 6; v.amountPaid = 1000000; });
add('POS', 'Harga jual nol', 'Batas bawah', ui, 'lines[0].unitPrice=0', 'Tolak; harga satuan POS harus lebih dari nol.', posSource, v => { v.lines[0].unitPrice = 0; });
add('POS', 'Harga jual rupiah pecahan', 'Tipe domain', ui, 'lines[0].unitPrice=1250.5', 'Tolak; harga POS harus berupa rupiah bulat.', posSource, v => { v.lines[0].unitPrice = 1250.5; });
add('POS', 'Diskon negatif', 'Batas bawah', ui, 'lines[0].discountPercent=-1', 'Tolak diskon di bawah 0 persen.', posSource, v => { v.lines[0].discountPercent = -1; });
add('POS', 'Diskon di atas seratus persen', 'Batas atas', ui, 'lines[0].discountPercent=101', 'Tolak diskon di atas 100 persen.', posSource, v => { v.lines[0].discountPercent = 101; });
add('POS', 'Pembayaran kurang satu rupiah', 'Batas pembayaran', ui, 'amountPaid=199799; total=199800', 'Tolak pembayaran kurang; transaksi tidak tersimpan.', posSource, v => { v.amountPaid = 199799; });
add('POS', 'SKU tidak terdaftar', 'Relasi data', injected, 'lines[0].sku="SKU-TIDAK-ADA"', 'Tolak barang yang tidak ada pada inventori.', posSource, v => { v.lines[0].sku = 'SKU-TIDAK-ADA'; });
add('POS', 'SKU berulang dalam payload', 'Keunikan data', injected, 'lines=[baris dasar, salinan baris dasar]', 'Tolak SKU berulang; jangan kurangi stok dua kali.', posSource, v => { v.lines.push(structuredClone(v.lines[0])); });

validatePurchaseOrderCreate(po);
validatedReceiptPatch(approvedPo as any, grn as any, 'Warehouse Manager');
resetStorage();
const validSale = await checkoutSale(sale as any);
assert.equal(validSale.total, 199800);
assert.equal(validSale.change, 200);
const results = [];
for (const testCase of cases) {
  const input: any = structuredClone(testCase.form === 'PO' ? po : testCase.form === 'GRN' ? grn : sale);
  testCase.mutate(input);
  const before = JSON.stringify(input);
  resetStorage();
  let actual = '';
  try {
    if (testCase.form === 'PO') validatePurchaseOrderCreate(input);
    else if (testCase.form === 'GRN') validatedReceiptPatch(approvedPo as any, input, 'Warehouse Manager');
    else await checkoutSale(input);
  } catch (error) { actual = error instanceof Error ? error.message : String(error); }
  assert.ok(actual, `${testCase.id} seharusnya ditolak`);
  assert.equal(JSON.stringify(input), before, `${testCase.id}: input berubah`);
  assert.equal(memory.has(COMMERCE_KEY), false, `${testCase.id}: transaksi tersimpan`);
  assert.equal(memory.get('inventora_inventory_v1'), JSON.stringify(inventory));
  const { mutate, ...fields } = testCase;
  results.push({ ...fields, payload: input, actual, result: 'LULUS (validator menolak)' });
}

// Pembeda data salah dari selisih bisnis yang sah.
const controls = [0, 9, 11].map(receivedQty => {
  const input: any = structuredClone(grn);
  input.items[0].receivedQty = receivedQty; input.status = 'DISCREPANCY';
  const patch = validatedReceiptPatch(approvedPo as any, input, 'Warehouse Manager');
  assert.equal(patch.status, 'Selisih Penerimaan');
  return { receivedQty, status: input.status, actual: patch.status, result: 'DITERIMA sebagai selisih yang sah' };
});
const report = {
  title: 'Data Uji ERROR untuk 3 Form Inventora', prepared: '2026-11-18',
  sourceMaterial: '# CAK3BAB3 #9 - DEFENSIVE PROGRAMMING - INT_compressed.pdf',
  materialPages: [2, 3, 12, 13, 14, 15, 16, 31, 32],
  scope: 'Validator lokal dan penyimpanan tiruan di memori; bukan pengujian browser, API live, atau Firebase.',
  baselines: { po, approvedPo, grn, sale, inventory }, results, controls,
  summary: { forms: 3, errorCases: results.length, rejected: results.filter(row => row.actual).length, validControls: 3 },
};
writeFileSync(`${out}/Inventora_Data_Uji_ERROR_3_Form.json`, JSON.stringify(report, null, 2));
const header = ['ID', 'Form', 'Kategori', 'Jalur', 'Data tidak valid', 'Hasil yang diharapkan', 'Respons validator', 'Hasil pemeriksaan'];
const cell = (value: string) => '"' + value.replace(/"/g, '""') + '"';
writeFileSync(`${out}/Inventora_Data_Uji_ERROR_3_Form.csv`, '\ufeff' + [header, ...results.map(row => [row.id, row.form, row.category, row.path, row.input, row.expected, row.actual, row.result])].map(row => row.map(cell).join(',')).join('\r\n'));
const md = [
  '# Data Uji ERROR untuk 3 Form Inventora', '', '18 November 2026', '',
  'PO baru, penerimaan barang, dan kasir penjualan diperiksa karena ketiganya mengolah jumlah barang serta nilai transaksi. Jumlah 1,5 unit, nama penerima berisi tiga spasi, dan pembayaran kurang Rp1 adalah contoh kesalahan yang diuji. Seluruh data dibuat untuk latihan, terpisah dari transaksi pengguna.', '',
  report.scope, '',
  '## Keterangan data uji', '',
  'Setiap kasus memakai data awal yang valid, lalu mengubah bagian yang hendak diperiksa. Pada uji jumlah pecahan PO, subtotal dan total ikut dihitung ulang agar penolakan menunjukkan aturan jumlah bulat. Nominal rupiah ditulis tanpa pemisah ribuan; "" berarti teks kosong.', '',
  'Jalur Form menandai masukan yang dapat dicoba pada tampilan aplikasi. Payload/validator menandai data yang dikirim langsung ke fungsi pemeriksaan, seperti kondisi barang di luar pilihan dropdown. Seluruh respons aktual di tabel berasal dari validator lokal. Tampilan pesan dan perilaku browser belum diuji.', '',
];
const discussion = {
  PO: 'PO-E06 memakai jumlah 1,5 dengan total yang sudah dihitung ulang. Penolakannya menunjukkan bahwa kecocokan total saja belum cukup: jumlah barang juga harus bulat. PO-E09 dan PO-E10 memakai selisih Rp2 karena validator masih menerima selisih nominal Rp1.',
  GRN: 'GRN-E02 memeriksa nama yang berisi tiga spasi. GRN-E05 dan GRN-E06 memeriksa jumlah negatif serta pecahan. Pada GRN-E12, jumlah diterima 9 dipasangkan dengan status MATCHED, padahal PO memesan 10 unit.',
  POS: 'POS-E05 menguji penjualan 6 unit saat stok latihan hanya 5. POS-E10 menguji uang Rp199799 terhadap total Rp199800. Keduanya harus ditolak sebelum transaksi tersimpan atau stok berkurang. Stok latihan tidak otomatis menjadi stok di website.',
};
for (const [form, label, baseline] of [['PO', 'Form PO baru', po], ['GRN', 'Form penerimaan barang', grn], ['POS', 'Form kasir penjualan', sale]] as const) {
  md.push(`## ${label}`, '', discussion[form], '', 'Data awal yang valid:', '', '```json', JSON.stringify(baseline, null, 2), '```', '', '| ID | Data tidak valid | Jalur | Harapan | Respons aktual validator |', '| --- | --- | --- | --- | --- |');
  for (const row of results.filter(row => row.form === form)) md.push(`| ${row.id} | ${row.input} | ${row.path} | ${row.expected} | ${row.actual} |`);
  md.push('');
}
md.push('## Hasil dan batas pemeriksaan', '', `Validator lokal menolak seluruh ${results.length} data ERROR dan menerima tiga data awal yang valid. Pada penolakan POS, stok latihan dan daftar penjualan tidak berubah. PO serta GRN diperiksa tanpa menjalankan proses simpan.`, '',
  'Pesanan 10 unit yang datang 9 tetap boleh dicatat sebagai DISCREPANCY / Selisih Penerimaan. Jumlah 0 dan 11 juga diterima dengan status tersebut. Barang rusak dapat dicatat. Kesalahan GRN-E12 terletak pada status MATCHED yang menyatakan penerimaan sesuai, padahal jumlahnya kurang.', '',
  'Harga nol pada PO masih dapat diterima jika total PO tetap positif, sedangkan POS mewajibkan harga positif. Catatan kosong diperbolehkan karena opsional. Tanggal kirim sebelum tanggal PO juga belum ditolak validator saat ini; laporan ini tidak mencatatnya sebagai kasus yang berhasil ditahan.', '',
  'Hasil skrip belum membuktikan bahwa pesan error di website terbaca, fokus menuju kolom yang salah, atau isian tetap tersedia setelah penolakan. Browser, API langsung, rules Firestore, dan database Firebase belum diuji dalam pemeriksaan ini.', '',
  'Inventora memakai Firebase/Firestore. Contoh SQL pada materi tidak dijadikan query aplikasi. Pemeriksaan ini mengikuti validator PO, GRN, dan POS; pengujian XSS serta otorisasi menyeluruh belum termasuk.', '',
  '## Sumber', '', '- Materi kuliah Defensive Programming, halaman 2-3, 12-16, dan 31-32.', '- src/components/PurchaseUnitView.tsx dan src/lib/purchaseOrderValidation.ts.', '- src/components/ThreeWayMatchModal.tsx dan src/lib/goodsReceipt.ts.', '- src/components/PosView.tsx dan src/lib/commerce.ts.', '',
  'Jalankan ulang pemeriksaan: node --import tsx output/audit/prepare-defensive-form-data.ts', '');
writeFileSync(`${out}/Inventora_Data_Uji_ERROR_3_Form.md`, md.join('\n'));
console.log(JSON.stringify(report.summary));
