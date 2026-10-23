# Crosscheck lanjutan Inventora

Tanggal: 22 Oktober 2026. Pemeriksaan ini mengecualikan gangguan layanan Gemini.

Status 23 Oktober 2026: keenam temuan di bawah sudah diperbaiki. Hasil validasi dan batas pemeriksaannya tercatat di [laporan perbaikan lanjutan](perbaikan-lanjutan-2026-10-23.md). Reproduksi di dokumen ini merupakan catatan kondisi sebelum perbaikan.

Enam temuan berikut dikonfirmasi melalui pembacaan kode dan eksekusi callback sumber dengan penyimpanan memori serta API tiruan. Kode aplikasi tidak diubah dalam pemeriksaan ini.

## 1. [P1] Mengedit jumlah atau harga menyebabkan submit PO ditolak

Lokasi: `src/components/PurchaseUnitView.tsx:117`, `src/components/PurchaseUnitView.tsx:551`, `src/components/PurchaseUnitView.tsx:562`, `src/lib/purchaseOrderValidation.ts:21`.

Input HTML mengirim string. `handleItemChange` menyimpan nilai tersebut langsung pada `qty` atau `unitPrice`; konversi angka hanya dipakai menghitung total baris. Validasi awal form menguji `Number(value)`, tetapi payload masih membawa string. Validator PO yang diperketat pada perbaikan sebelumnya mensyaratkan tipe angka dan menolak payload tersebut.

Reproduksi: ubah jumlah 2 menjadi 3 atau harga 500 menjadi 600 melalui callback input. Total baris terhitung, tetapi validator menolak masing-masing perubahan dengan pesan jumlah/harga/subtotal tidak konsisten. Submit dengan nilai awal numerik tidak mengalami masalah ini.

Perbaikan: normalisasi input numerik sebelum membentuk payload, dengan penanganan input kosong dan nilai tidak valid. Pertahankan pemeriksaan tipe di server.

## 2. [P1] PO berhasil dibuat, tetapi error cache dapat mendorong pembuatan duplikat

Lokasi: `src/components/PurchaseUnitView.tsx:194`, `src/components/PurchaseUnitView.tsx:242`.

Setelah API berhasil menyimpan PO, handler memuat cache lokal lalu menyebarkannya sebagai array di blok try yang sama. Cache JSON valid dengan bentuk `{}` lolos pembacaan, tetapi bukan iterable. UI menampilkan error dan tetap membuka form, meskipun penyimpanan server sudah berhasil. Percobaan berikutnya membuat ID baru.

Reproduksi: isi cache PO dengan `{}` pada penyimpanan memori; mock API mengonfirmasi penyimpanan. Dua kali submit menghasilkan dua panggilan create dengan ID berbeda dan dua pesan error. Tidak ada PO sungguhan dibuat saat audit.

Perbaikan: pisahkan keberhasilan penyimpanan server dari kegagalan cache. Gunakan ID yang tetap selama percobaan ulang untuk pesanan yang sama serta validasi bentuk cache.

## 3. [P2] Catatan PO lebih dari satu baris terpotong

Lokasi: `src/components/PurchaseUnitView.tsx:208`.

Form menawarkan catatan pengadaan atau instruksi pengiriman, tetapi payload hanya memasukkan baris pertama sebagai `desc`. Tidak ada field lain yang menyimpan teks lengkap.

Reproduksi: catatan `Instruksi utama` diikuti baris `Kirim ke gedung B lantai 2` menghasilkan submit sukses. Payload hanya menyimpan baris pertama; instruksi pengiriman tidak ada.

Perbaikan: sediakan field catatan lengkap dalam tipe data, validasi, penyimpanan, rincian PO, serta dokumen yang membutuhkannya.

## 4. [P2] Tombol Buat PO Restok tidak membawa pilihan barang

Lokasi: `src/components/InventoryView.tsx:228`, `src/components/PurchaseUnitView.tsx:70`, `src/App.tsx:1179`.

Callback hanya berpindah ke menu pengadaan dan menampilkan pesan menyiapkan draf. Data SKU dan jumlah rekomendasi tidak diteruskan ke form. Form baru memakai item awal NVIDIA H100 sebanyak 2 unit.

Reproduksi: rekomendasi UPS `UPS-3KVA-RT` sebanyak 17 unit menjalankan navigasi ke pengadaan, sedangkan initializer form tetap berisi NVIDIA H100 sebanyak 2 unit. Ini pemeriksaan callback dan initializer, bukan interaksi browser.

Perbaikan: teruskan draf berisi SKU, jumlah, serta informasi yang benar-benar tersedia; jangan mengganti harga/vendor yang belum diketahui dengan data buatan.

## 5. [P2] Cache JSON dengan bentuk salah membuat halaman inventori gagal

Lokasi: `src/lib/storageUtils.ts:5`, `src/components/InventoryView.tsx:49`.

`loadStoredData` menerima semua JSON non-null tanpa memeriksa bentuknya. Inventori langsung menjalankan `.map()` pada hasil tersebut.

Reproduksi: cache inventori `{}` menyebabkan callback perhitungan item melempar `storedItems.map is not a function`. Halaman dapat masuk ke ErrorBoundary dan tetap gagal saat dibuka lagi selama cache belum dipulihkan.

Perbaikan: validasi daftar dan record ketika membaca cache. Pertahankan data yang tidak dapat dibaca untuk pemulihan; jangan menimpa data diam-diam.

## 6. [P2] Notifikasi error memakai judul keberhasilan transaksi

Lokasi: `src/App.tsx:860`, `src/components/InteractiveToaster.tsx:149`.

Judul otomatis ditentukan dari kata pada pesan tanpa mempertimbangkan tipe error. Judul tersebut mengalahkan judul bawaan komponen notifikasi.

Reproduksi: pesan error `Stok tidak berubah...` mendapat judul `Stok Berkurang`. Pesan error `Nominal pembayaran tidak valid.` mendapat judul `Pembayaran Lunas`. Tipe notifikasi tetap error, sehingga judul dan isi saling bertentangan.

Perbaikan: tentukan judul berdasarkan hasil operasi terlebih dahulu; gunakan kata pada pesan hanya bila sesuai hasilnya.

## Hasil dan batas pemeriksaan

- 42 tes regresi/API/helper yang tersedia lulus. Keenam skenario di atas belum dicakup oleh suite tersebut.
- Skrip reproduksi tambahan lulus dengan delapan observasi yang mengonfirmasi enam masalah. Dua pasangan observasi masing-masing menguji jumlah/harga dan dua jenis judul error.
- Skrip: `output/audit/bug-lanjutan-2026-10-22.mjs`.
- Hasil: `output/audit/bug-lanjutan-2026-10-22.json`.
- Tidak ada perubahan data Firebase, konfigurasi, deployment, atau permintaan Gemini dalam pemeriksaan ini.
- Pengujian browser dari awal sampai akhir belum dilakukan; daftar ini bukan jaminan seluruh aplikasi sudah diperiksa.

Jalankan reproduksi dari folder project dengan Node.js dan tsx yang sudah tersedia:

```powershell
node --import tsx output/audit/bug-lanjutan-2026-10-22.mjs
```

Prioritas awal: perbaiki tipe input angka dan kepastian hasil create PO, kemudian catatan, pemindahan draf restok, validasi cache, serta judul notifikasi.
