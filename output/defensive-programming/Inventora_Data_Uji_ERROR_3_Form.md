# Data Uji ERROR untuk 3 Form Inventora

18 November 2026

PO baru, penerimaan barang, dan kasir penjualan diperiksa karena ketiganya mengolah jumlah barang serta nilai transaksi. Jumlah 1,5 unit, nama penerima berisi tiga spasi, dan pembayaran kurang Rp1 adalah contoh kesalahan yang diuji. Seluruh data dibuat untuk latihan, terpisah dari transaksi pengguna.

Validator lokal dan penyimpanan tiruan di memori; bukan pengujian browser, API live, atau Firebase.

## Keterangan data uji

Setiap kasus memakai data awal yang valid, lalu mengubah bagian yang hendak diperiksa. Pada uji jumlah pecahan PO, subtotal dan total ikut dihitung ulang agar penolakan menunjukkan aturan jumlah bulat. Nominal rupiah ditulis tanpa pemisah ribuan; "" berarti teks kosong.

Jalur Form menandai masukan yang dapat dicoba pada tampilan aplikasi. Payload/validator menandai data yang dikirim langsung ke fungsi pemeriksaan, seperti kondisi barang di luar pilihan dropdown. Seluruh respons aktual di tabel berasal dari validator lokal. Tampilan pesan dan perilaku browser belum diuji.

## Form PO baru

PO-E06 memakai jumlah 1,5 dengan total yang sudah dihitung ulang. Penolakannya menunjukkan bahwa kecocokan total saja belum cukup: jumlah barang juga harus bulat. PO-E09 dan PO-E10 memakai selisih Rp2 karena validator masih menerima selisih nominal Rp1.

Data awal yang valid:

```json
{
  "id": "PO-2026-IT-UJI001",
  "vendor": "Dell EMC Indonesia",
  "desc": "IT Infrastructure Requisition (1 items)",
  "date": "2026-11-18",
  "deliveryDate": "2026-11-25",
  "department": "IT Infrastructure",
  "status": "Pending Approval",
  "color": "orange",
  "items": [
    {
      "id": "line-1",
      "sku": "RS-W1-PRO",
      "name": "Rack Server Web Infrastructure",
      "qty": 10,
      "unitPrice": 100000,
      "subtotal": 1000000
    }
  ],
  "subtotal": 1000000,
  "discountAmount": 0,
  "taxAmount": 110000,
  "withholdingTaxAmount": 0,
  "total": 1110000,
  "notes": "Kirim ke gudang utama."
}
```

| ID | Data tidak valid | Jalur | Harapan | Respons aktual validator |
| --- | --- | --- | --- | --- |
| PO-E01 | vendor="" | Form | Tolak PO; vendor wajib diisi. | Vendor tidak valid. |
| PO-E02 | deliveryDate="" | Form | Tolak PO; tanggal kirim wajib diisi. | Tanggal PO atau pengiriman tidak valid. |
| PO-E03 | deliveryDate="2026-02-30" | Payload/validator | Tolak tanggal yang tidak ada dalam kalender. | Tanggal PO atau pengiriman tidak valid. |
| PO-E04 | items[0].name="   " (3 spasi) | Form | Tolak nama kosong setelah trim. | Nama barang tidak valid. |
| PO-E05 | qty=0; subtotal barang=0; subtotal PO=0; pajak=0; total=0 | Form | Tolak; jumlah harus bilangan bulat positif. | Jumlah, harga, atau subtotal barang tidak konsisten. |
| PO-E06 | qty=1.5; subtotal barang=150000; subtotal PO=150000; pajak=16500; total=166500 | Form | Tolak meskipun total konsisten; jumlah harus bulat. | Jumlah, harga, atau subtotal barang tidak konsisten. |
| PO-E07 | items[0].unitPrice=-100 | Form | Tolak harga negatif sebelum penyimpanan. | Jumlah, harga, atau subtotal barang tidak konsisten. |
| PO-E08 | items[0].qty="dua" | Payload/validator | Tolak; teks tidak boleh dipakai sebagai jumlah. | Jumlah, harga, atau subtotal barang tidak konsisten. |
| PO-E09 | items[0].subtotal=999998; nilai yang benar=1000000 | Payload/validator | Tolak selisih subtotal Rp2 dari jumlah x harga. | Jumlah, harga, atau subtotal barang tidak konsisten. |
| PO-E10 | total=1110002; nilai yang benar=1110000 | Payload/validator | Tolak total yang berbeda Rp2 dari rincian. | Total PO tidak sesuai rincian barang, diskon, atau pajak. |
| PO-E11 | items=[] | Payload/validator | Tolak; PO memerlukan sedikitnya satu barang. | Rincian PO harus berupa daftar berisi 1–200 barang. |
| PO-E12 | notes="A" sebanyak 10001 karakter | Payload/validator | Tolak catatan yang melebihi 10000 karakter. | Catatan PO tidak valid. |

## Form penerimaan barang

GRN-E02 memeriksa nama yang berisi tiga spasi. GRN-E05 dan GRN-E06 memeriksa jumlah negatif serta pecahan. Pada GRN-E12, jumlah diterima 9 dipasangkan dengan status MATCHED, padahal PO memesan 10 unit.

Data awal yang valid:

```json
{
  "id": "GRN-UJI-001",
  "grnNumber": "GRN-UJI-001",
  "poId": "PO-2026-IT-UJI001",
  "receivedDate": "2026-11-18",
  "receivedBy": "Petugas Gudang",
  "suratJalanNumber": "SJ-UJI-001",
  "items": [
    {
      "sku": "RS-W1-PRO",
      "name": "Rack Server Web Infrastructure",
      "orderedQty": 10,
      "receivedQty": 10,
      "condition": "GOOD"
    }
  ],
  "status": "MATCHED",
  "inspectorNotes": ""
}
```

| ID | Data tidak valid | Jalur | Harapan | Respons aktual validator |
| --- | --- | --- | --- | --- |
| GRN-E01 | receivedBy="" | Form | Tolak GRN; nama penerima wajib diisi. | Petugas penerima wajib diisi dengan benar. |
| GRN-E02 | receivedBy="   " (3 spasi) | Form | Tolak nama kosong setelah trim. | Petugas penerima wajib diisi dengan benar. |
| GRN-E03 | suratJalanNumber="" | Form | Tolak GRN; nomor surat jalan wajib diisi. | Nomor surat jalan wajib diisi dengan benar. |
| GRN-E04 | suratJalanNumber="A" sebanyak 501 karakter | Payload/validator | Tolak; panjang maksimum 500 karakter. | Nomor surat jalan wajib diisi dengan benar. |
| GRN-E05 | items[0].receivedQty=-1 | Form | Tolak; jumlah diterima tidak boleh negatif. | SKU, jumlah, atau kondisi barang tidak sesuai dengan PO. |
| GRN-E06 | items[0].receivedQty=1.5 | Form | Tolak; jumlah diterima harus bulat. | SKU, jumlah, atau kondisi barang tidak sesuai dengan PO. |
| GRN-E07 | items[0].receivedQty=null | Payload/validator | Tolak nilai null; bukan bilangan bulat. | SKU, jumlah, atau kondisi barang tidak sesuai dengan PO. |
| GRN-E08 | items[0].receivedQty=9007199254740992 | Payload/validator | Tolak angka di atas batas integer aman JavaScript. | SKU, jumlah, atau kondisi barang tidak sesuai dengan PO. |
| GRN-E09 | inspectorNotes="A" sebanyak 4001 karakter | Payload/validator | Tolak; panjang maksimum 4000 karakter. | Catatan pemeriksaan tidak valid. |
| GRN-E10 | items[0].condition="UNKNOWN" | Payload/validator | Tolak kondisi di luar empat pilihan yang sah. | SKU, jumlah, atau kondisi barang tidak sesuai dengan PO. |
| GRN-E11 | items=[]; PO memiliki 1 baris barang | Payload/validator | Tolak; seluruh rincian PO harus diperiksa. | Daftar penerimaan harus sesuai dengan seluruh rincian PO. |
| GRN-E12 | receivedQty=9; orderedQty=10; status="MATCHED" | Payload/validator | Tolak status MATCHED; jumlah tersebut berselisih. | Status pencocokan tidak sesuai jumlah atau kondisi barang. |

## Form kasir penjualan

POS-E05 menguji penjualan 6 unit saat stok latihan hanya 5. POS-E10 menguji uang Rp199799 terhadap total Rp199800. Keduanya harus ditolak sebelum transaksi tersimpan atau stok berkurang. Stok latihan tidak otomatis menjadi stok di website.

Data awal yang valid:

```json
{
  "requestId": "POS-UJI-001",
  "actorId": "kasir-uji",
  "actorName": "Kasir Uji",
  "role": "Warehouse Manager",
  "lines": [
    {
      "sku": "RS-W1-PRO",
      "quantity": 2,
      "unitPrice": 100000,
      "discountPercent": 10
    }
  ],
  "taxRate": 11,
  "amountPaid": 200000
}
```

| ID | Data tidak valid | Jalur | Harapan | Respons aktual validator |
| --- | --- | --- | --- | --- |
| POS-E01 | lines=[] | Form/payload | Tolak transaksi tanpa barang. | Keranjang kosong atau SKU berulang. |
| POS-E02 | lines[0].quantity=0 | Form | Tolak; jumlah penjualan harus positif. | Jumlah barang harus bilangan bulat positif. |
| POS-E03 | lines[0].quantity=-1 | Form | Tolak jumlah negatif; stok tidak bertambah. | Jumlah barang harus bilangan bulat positif. |
| POS-E04 | lines[0].quantity=1.5 | Form | Tolak; jumlah penjualan harus bulat. | Jumlah barang harus bilangan bulat positif. |
| POS-E05 | quantity=6; stok tersedia=5; amountPaid=1000000 | Form | Tolak stok kurang meskipun uang mencukupi. | Stok RS-W1-PRO tidak mencukupi. Perbarui keranjang. |
| POS-E06 | lines[0].unitPrice=0 | Form | Tolak; harga satuan POS harus lebih dari nol. | Harga satuan harus berupa rupiah bulat yang valid. |
| POS-E07 | lines[0].unitPrice=1250.5 | Form | Tolak; harga POS harus berupa rupiah bulat. | Harga satuan harus berupa rupiah bulat yang valid. |
| POS-E08 | lines[0].discountPercent=-1 | Form | Tolak diskon di bawah 0 persen. | Diskon harus antara 0 dan 100 persen. |
| POS-E09 | lines[0].discountPercent=101 | Form | Tolak diskon di atas 100 persen. | Diskon harus antara 0 dan 100 persen. |
| POS-E10 | amountPaid=199799; total=199800 | Form | Tolak pembayaran kurang; transaksi tidak tersimpan. | Uang diterima belum mencukupi total belanja. |
| POS-E11 | lines[0].sku="SKU-TIDAK-ADA" | Payload/validator | Tolak barang yang tidak ada pada inventori. | Stok SKU-TIDAK-ADA tidak mencukupi. Perbarui keranjang. |
| POS-E12 | lines=[baris dasar, salinan baris dasar] | Payload/validator | Tolak SKU berulang; jangan kurangi stok dua kali. | Keranjang kosong atau SKU berulang. |

## Hasil dan batas pemeriksaan

Validator lokal menolak seluruh 36 data ERROR dan menerima tiga data awal yang valid. Pada penolakan POS, stok latihan dan daftar penjualan tidak berubah. PO serta GRN diperiksa tanpa menjalankan proses simpan.

Pesanan 10 unit yang datang 9 tetap boleh dicatat sebagai DISCREPANCY / Selisih Penerimaan. Jumlah 0 dan 11 juga diterima dengan status tersebut. Barang rusak dapat dicatat. Kesalahan GRN-E12 terletak pada status MATCHED yang menyatakan penerimaan sesuai, padahal jumlahnya kurang.

Harga nol pada PO masih dapat diterima jika total PO tetap positif, sedangkan POS mewajibkan harga positif. Catatan kosong diperbolehkan karena opsional. Tanggal kirim sebelum tanggal PO juga belum ditolak validator saat ini; laporan ini tidak mencatatnya sebagai kasus yang berhasil ditahan.

Hasil skrip belum membuktikan bahwa pesan error di website terbaca, fokus menuju kolom yang salah, atau isian tetap tersedia setelah penolakan. Browser, API langsung, rules Firestore, dan database Firebase belum diuji dalam pemeriksaan ini.

Inventora memakai Firebase/Firestore. Contoh SQL pada materi tidak dijadikan query aplikasi. Pemeriksaan ini mengikuti validator PO, GRN, dan POS; pengujian XSS serta otorisasi menyeluruh belum termasuk.

## Sumber

- Materi kuliah Defensive Programming, halaman 2-3, 12-16, dan 31-32.
- src/components/PurchaseUnitView.tsx dan src/lib/purchaseOrderValidation.ts.
- src/components/ThreeWayMatchModal.tsx dan src/lib/goodsReceipt.ts.
- src/components/PosView.tsx dan src/lib/commerce.ts.

Jalankan ulang pemeriksaan: node --import tsx output/audit/prepare-defensive-form-data.ts
