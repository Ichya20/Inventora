# Hasil pemeriksaan bug Inventora

Tanggal: 18 November 2026.

Status sesudah pengerjaan: temuan laporan ini telah ditangani. Laporan di bawah mempertahankan bukti sebelum perbaikan. Hasil terbaru dan batas pengujian ada di [laporan perbaikan](D:/Inventora/docs/perbaikan-audit-2026-11-18.md); suite terbaru lulus 138/138 tes.

Pemeriksaan ini menjalankan tes proyek dan potongan fungsi dari kode saat ini dengan penyimpanan dalam memori, respons API tiruan, serta server lokal sementara untuk middleware produksi. Tidak memakai akun/data Firebase, browser, atau layanan AI sungguhan. Kode aplikasi tidak diubah.

`npm test`: **93 lulus, 0 gagal**. Temuan berikut berasal dari kasus tambahan yang belum dicakup suite tersebut. Kelulusan tes belum mencakup seluruh perilaku aplikasi.

## Temuan utama

### 1. POS demo mencampur stok dan riwayat transaksi mode biasa — P2

- Sumber: [commerce.ts](D:/Inventora/src/lib/commerce.ts:5), [PosView.tsx](D:/Inventora/src/components/PosView.tsx:64), [App.tsx](D:/Inventora/src/App.tsx:775).
- Pemicu: lakukan penjualan mode biasa, lalu gunakan POS demo di browser yang sama.
- Bukti: stok awal 5 menjadi 4 setelah transaksi biasa, kemudian menjadi 3 setelah transaksi demo. Kedua struk dan identitas pelakunya tersimpan dalam kumpulan yang sama.
- Dampak: percobaan di mode demo dapat mengubah stok operasional lokal dan memperlihatkan struk yang sebelumnya dibuat dalam mode biasa.
- Penyebab: keduanya menggunakan key tetap `inventora_commerce_v1`; mode demo tidak diteruskan sebagai lingkup penyimpanan.
- Perbaikan: pisahkan penyimpanan dan data awal demo dari penyimpanan operasional. Temuan ini menyangkut data browser, bukan perubahan stok di Firestore.
- Bukti rinci: [pos-storage.json](D:/Inventora/output/bug-audit/pos-storage.json).

### 2. GRN dengan SKU berulang gagal disimpan setelah dibuka ulang — P2

- Sumber: [PurchaseUnitView.tsx](D:/Inventora/src/components/PurchaseUnitView.tsx:173), [ThreeWayMatchModal.tsx](D:/Inventora/src/components/ThreeWayMatchModal.tsx:27), [goodsReceipt.ts](D:/Inventora/src/lib/goodsReceipt.ts:33).
- Pemicu: impor produk `Enterprise Server A` dan `Enterprise Server B`. Keduanya memperoleh SKU `ENTERPRISE SER`. Buat PO, setujui, catat kekurangan penerimaan, lalu buka kembali GRN untuk koreksi.
- Bukti: nama baris kedua berubah menjadi `Enterprise Server A`. Menyimpan ulang menghasilkan pesan `SKU, jumlah, atau kondisi barang tidak sesuai dengan PO.`
- Dampak: penerimaan tidak dapat dikoreksi/diselesaikan melalui alur tersebut.
- Perbaikan: pertahankan identitas setiap baris menggunakan ID/posisi yang konsisten. Jangan mencocokkan nama hanya berdasarkan hasil pertama dari pencarian SKU; buat SKU impor yang tidak bertabrakan.
- Bukti rinci: [po-inputs.json](D:/Inventora/output/bug-audit/po-inputs.json).

### 3. Hasil ekstraksi invoice lama masih dapat diterapkan — P2

- Sumber: [SmartInvoiceParserModal.tsx](D:/Inventora/src/components/SmartInvoiceParserModal.tsx:54).
- Pemicu: mulai ekstraksi teks invoice A, ganti textarea menjadi invoice B sebelum respons A selesai, lalu terapkan hasilnya.
- Bukti: textarea berisi B, tetapi vendor dan item dari respons A tetap ditampilkan dan dikirim ke formulir PO.
- Dampak: PO dapat berisi vendor/barang dari dokumen yang sudah diganti pengguna.
- Perbaikan: batalkan/abaikan respons saat teks sumber berubah, atau kunci pengeditan teks selama ekstraksi.
- Bukti rinci: [po-inputs.json](D:/Inventora/output/bug-audit/po-inputs.json).

### 4. Bonus payroll pecahan tersimpan, tetapi PDF membulatkannya — P2

- Sumber: [HRView.tsx](D:/Inventora/src/components/HRView.tsx:579), [input bonus](D:/Inventora/src/components/HRView.tsx:1246), [pdfGenerator.ts](D:/Inventora/src/lib/pdfGenerator.ts:58).
- Pemicu: isi `Performance Bonus / Overtime` dengan `0.5`, lalu klik `Record Payroll Simulation` pada periode yang belum dicatat.
- Bukti: bonus `0.5` dan net pay `10600000.5` tercatat dengan status `SUCCESS`; pemformat PDF menghasilkan `Rp 10,600,001`.
- Dampak: nominal arsip dan slip berbeda. Atribut `step` pada input tidak menghentikan handler tombol ini.
- Perbaikan: tetapkan aturan nominal yang konsisten, validasi sebelum penyimpanan, dan gunakan aturan pembulatan yang sama pada arsip, tampilan, dan PDF.
- Bukti rinci: [finance-hr.json](D:/Inventora/output/bug-audit/finance-hr.json).

### 5. Berkas backend dapat diunduh dari server produksi — P2

- Sumber: [package.json](D:/Inventora/package.json:8), [server.ts](D:/Inventora/server.ts:406).
- Pemicu: jalankan hasil `npm run build` melalui konfigurasi produksi saat ini.
- Bukti: middleware produksi aktual yang diuji pada port lokal sementara mengembalikan HTTP 200 untuk `/server.cjs` (35.023 byte) dan `/server.cjs.map` (63.132 byte), sesuai ukuran berkas build.
- Dampak: kode backend dan source map dapat diunduh. Pengujian ini tidak membuktikan kebocoran kredensial atau akses ke server yang sudah dideploy.
- Penyebab: output backend diletakkan dalam folder `dist` yang seluruhnya disajikan oleh `express.static`.
- Perbaikan: pisahkan output backend dari direktori publik, atau batasi penyajian statis ke aset frontend yang diperlukan.
- Bukti rinci: [production-static-probe.json](D:/Inventora/output/security-audit/production-static-probe.json).

### 6. Ekspor CSV mempertahankan penanda rumus dari input pengguna — P2, risiko saat dibuka di spreadsheet

- Sumber: [ProcurementView.tsx](D:/Inventora/src/components/ProcurementView.tsx:381), [exportUtils.ts](D:/Inventora/src/lib/exportUtils.ts:20).
- Pemicu: masukkan `=1+1` sebagai catatan PO, kemudian ekspor CSV.
- Bukti: validator menerima catatan tersebut dan kedua fungsi ekspor menghasilkan sel `"=1+1"`. Tanda kutip CSV tidak menetralkan penanda rumus.
- Dampak: aplikasi spreadsheet tertentu dapat menafsirkan teks sebagai rumus. Eksekusi rumus di Excel/Sheets tidak diuji; tidak ada klaim eksekusi perintah atau pencurian data.
- Perbaikan: perlakukan kolom teks sebagai teks saat diekspor, termasuk nilai yang diawali penanda rumus.
- Bukti rinci: [csv-probe.json](D:/Inventora/output/security-audit/csv-probe.json).

### 7. Aturan quantity hasil ekstraksi dan PO berbeda — P3

- Sumber: [invoiceValidation.ts](D:/Inventora/src/lib/invoiceValidation.ts:19), [PurchaseUnitView.tsx](D:/Inventora/src/components/PurchaseUnitView.tsx:200), [purchaseOrderValidation.ts](D:/Inventora/src/lib/purchaseOrderValidation.ts:21).
- Pemicu: hasil ekstraksi invoice berisi `qty: 1.5` dengan perhitungan subtotal yang benar.
- Bukti: hasil ekstraksi diterima, tetapi pembuatan PO ditolak karena quantity harus bilangan bulat.
- Dampak: pengguna mendapat hasil ekstraksi yang terlihat berhasil tetapi tidak bisa langsung digunakan.
- Perbaikan: samakan aturan kedua jalur; tolak pecahan sejak ekstraksi jika satuan PO memang harus bulat.
- Bukti rinci: [po-inputs.json](D:/Inventora/output/bug-audit/po-inputs.json).

### 8. Data label pembayaran tidak tervalidasi — P3

- Sumber: [BillingSubscriptionView.tsx](D:/Inventora/src/components/BillingSubscriptionView.tsx:225).
- Pemicu: isi `Expiry Date` dengan `99/99`, `Cardholder / Entity Name` dengan spasi, lalu simpan bersama empat digit terakhir dan email yang valid.
- Bukti: nilai tersebut tersimpan dan pesan sukses muncul. Input hanya memakai `required`; handler juga tidak memvalidasi nilainya.
- Dampak: data label menjadi tidak valid. Fitur ini merupakan simulasi lokal, bukan pembayaran sungguhan.
- Perbaikan: trim nama, tolak nama kosong, serta validasi format, bulan, dan masa berlaku tanggal.
- Bukti rinci: [finance-hr.json](D:/Inventora/output/bug-audit/finance-hr.json).

## Bug dengan kondisi khusus

### 9. Cache PO rusak dapat menggagalkan halaman atau tertimpa — P2 bersyarat

- Sumber: [ProcurementView.tsx](D:/Inventora/src/components/ProcurementView.tsx:199), [storageUtils.ts](D:/Inventora/src/lib/storageUtils.ts:5).
- Cache JSON `{}` diterima helper lalu memicu `.map is not a function` pada initializer PO.
- Cache JSON terpotong membuat helper mengembalikan array kosong pada mode biasa; efek penyimpanan kemudian menimpa bytes aslinya dengan `[]`.
- Membutuhkan cache yang sudah rusak/tidak sesuai format; belum ditemukan input formulir normal yang menghasilkan kerusakan tersebut. Data otoritatif di Firestore tidak terhapus oleh probe ini.
- Perbaikan: validasi struktur, tampilkan opsi pemulihan, dan hentikan penulisan otomatis ketika pembacaan gagal.
- Bukti: [po-cache.json](D:/Inventora/output/bug-audit/po-cache.json).

### 10. Riwayat payroll rusak diganti data contoh — P2 bersyarat

- Sumber: [HRView.tsx](D:/Inventora/src/components/HRView.tsx:311), [efek penyimpanan](D:/Inventora/src/components/HRView.tsx:315).
- Jika JSON riwayat payroll sudah rusak, pembacaan memakai data contoh sebagai fallback. Efek penyimpanan saat menu dibuka menulis fallback tersebut ke key yang sama.
- Dampak: isi asli yang mungkin masih bisa dipulihkan hilang. Belum ditemukan input normal yang merusak JSON.
- Perbaikan: bedakan data belum ada dan data gagal dibaca; jangan menyimpan fallback ke riwayat yang gagal dibaca.
- Bukti: [finance-hr.json](D:/Inventora/output/bug-audit/finance-hr.json).

### 11. Halaman awal/login gagal jika akses browser storage ditolak — P3 bersyarat

- Sumber: [Home](D:/Inventora/src/App.tsx:854), [Login](D:/Inventora/src/App.tsx:870).
- Kedua initializer bahasa memanggil `localStorage.getItem` tanpa penanganan exception. Ketika storage melempar error, komponen gagal dirender sebelum tombol Google bisa digunakan.
- Membutuhkan lingkungan browser yang menolak akses storage; tidak berarti login normal selalu gagal.
- Perbaikan: gunakan bahasa bawaan ketika pembacaan/penulisan preferensi gagal.
- Bukti: entri `AUTH-02` dalam [auth-session.json](D:/Inventora/output/bug-audit/auth-session.json).

## Kandidat yang belum dibuktikan pada Firebase/browser

`getAccessToken` menggunakan satu promise otorisasi global tanpa identitas pemilik request ([firebase.ts](D:/Inventora/src/firebase.ts:60)). Dalam mock, request akun B memakai request akun A yang masih berjalan dan keduanya gagal saat pemeriksaan UID. Percobaan ulang B berhasil; token A tidak bocor ke B.

Namun, mock mengizinkan popup A tetap hidup ketika akun berganti. Firebase dapat membatalkan popup yang bersaing. Jalur nyata, terutama pergantian akun lintas tab, perlu diverifikasi sebelum kandidat ini dinyatakan sebagai bug produksi. Bukti: entri `AUTH-01` dalam [auth-session.json](D:/Inventora/output/bug-audit/auth-session.json).

Checkout yang sudah dimulai juga dapat selesai setelah logout ketika menunggu Web Lock. Ini hanya transaksi lokal yang sudah diterima sebelum logout; kebutuhan pembatalannya memerlukan keputusan perilaku produk. Tidak ditemukan bypass otorisasi Firebase dari probe tersebut.

## Pemeriksaan yang lolos

- Suite utama: 93/93 tes lulus pada pemeriksaan ini.
- POS menolak quantity nol, negatif, pecahan, dan melampaui batas aman; pembayaran kurang; stok kurang; serta role `User`. Penolakan tidak mengubah stok.
- Pembatasan endpoint AI berdasarkan token/role dan akses akun Google biasa tetap lulus dalam suite lokal.
- Kandidat pagination Finance setelah pencarian tidak terbukti: handler sudah mengembalikan halaman ke 1.
- Harga yang rusak dalam cache inventory masih dapat lolos pembacaan, tetapi checkout menolaknya; tidak terbukti terjadi penjualan dengan harga tersebut.

Pengujian ini belum memverifikasi tampilan/interaksi browser, deployment aktif, aturan Firebase terhadap layanan nyata, ataupun login Google dengan akun sungguhan. Tidak ada perubahan pada custom claims akun utama.

## Reproduksi lokal

Jalankan dari `D:\Inventora`:

```powershell
npm test
npx tsx output/audit/recheck-pos-storage.ts
npx tsx output/audit/recheck-po-inputs.ts
npx tsx output/audit/recheck-finance-hr.ts
npx tsx output/audit/recheck-po-cache.ts
npx tsx output/audit/recheck-auth-session.ts
npx tsx output/audit/probe-csv-injection.ts
npx tsx output/audit/probe-production-static.ts
```

Probe terakhir memerlukan output build dalam `dist`; memakai port loopback sementara dan menutup listener setelah selesai. Peringatan JSON pada probe cache adalah bagian dari kasus uji yang sengaja merusak data dalam memori.
