# Crosscheck bug Inventora — 22 Oktober 2026

**Pembaruan:** perbaikan kode untuk temuan 1–4 tercatat dalam [laporan perbaikan](perbaikan-1-4-2026-10-22.md). Daftar di bawah mempertahankan bukti kondisi sebelum perbaikan. Aktivasi produksi memerlukan konfigurasi server dan deploy aturan yang dijelaskan dalam laporan tersebut.

Pemeriksaan menemukan **8 masalah yang perlu diperbaiki**. Kode aplikasi tidak diubah dalam audit ini. Temuan berasal dari pembacaan kode, eksekusi callback asli dengan dependensi tiruan, dan pengujian aturan Firestore pada emulator lokal terpisah.

P1 berarti perlu didahulukan karena menyangkut validasi transaksi atau penggunaan layanan berbayar. P2 berarti memengaruhi kebenaran data, pembatasan informasi, atau fungsi yang dijanjikan antarmuka.

## 1. [P1] Status MATCHED dapat disimpan walaupun jumlah barang tidak sesuai

**Lokasi:** `firestore.rules:28`, `src/components/ProcurementView.tsx:257`, `src/components/ThreeWayMatchModal.tsx:45`.

Aturan penerimaan memeriksa kesamaan label status, tetapi tidak memvalidasi isi GRN terhadap rincian PO. Validasi callback penyimpanan juga hanya memeriksa label dan ID PO. Perhitungan selisih pada modal dapat dilewati dengan menulis langsung melalui Firebase SDK menggunakan akun gudang yang sah.

**Reproduksi:** pada emulator, Warehouse Manager membuat PO berisi 10 unit; Finance Manager menyetujuinya. Warehouse Manager menyimpan GRN berisi `orderedQty: 10`, `receivedQty: 0`, `condition: SHORTAGE`, tetapi memberi label `MATCHED`. Write diterima. Finance Manager kemudian berhasil menyimpan tahap pembayaran simulasi hingga PO berstatus `Selesai`.

Ada masalah terkait pada modal: PO tanpa rincian barang diberi satu item buatan berjumlah 10 dipesan dan 10 diterima. Rincian yang tidak tersedia seharusnya menghentikan pencocokan, bukan menghasilkan penerimaan yang dianggap sesuai.

**Perbaikan:** validasi SKU, jumlah, kondisi, kelengkapan penerimaan, dan keterkaitannya dengan PO pada batas penyimpanan yang dipercaya. Jangan menerima status MATCHED hanya berdasarkan nilai kiriman klien. Hapus fallback jumlah 10 dan minta pengguna melengkapi rincian PO.

## 2. [P1] Endpoint AI dapat menggunakan layanan tanpa autentikasi

**Lokasi:** `server.ts:227`, `server.ts:260`, `server.ts:294`, `server.ts:338`, `server.ts:393`.

Endpoint analyst, copilot, risiko PO, perkiraan stok, dan ekstraksi invoice memakai pembatasan permintaan berdasarkan IP, tetapi tidak memverifikasi Firebase ID token atau peran pengguna. Permintaan frontend juga tidak membawa token autentikasi.

**Reproduksi:** registrasi route server dijalankan dengan Express dan layanan AI tiruan. Permintaan Copilot tanpa header Authorization diterima dengan HTTP 200 dan memanggil layanan AI tiruan satu kali. Tidak ada permintaan AI berbayar yang benar-benar dikirim.

**Dampak:** jika server dapat diakses pihak lain dan API key aktif, pihak yang belum login dapat memakai kuota layanan. Temuan ini tidak membuktikan akses ke data Firestore; konteks AI berasal dari payload pemanggil.

**Perbaikan:** kirim ID token dari frontend, verifikasi di server, lalu terapkan izin per endpoint dan pembatasan penggunaan per pengguna.

## 3. [P2] Notifikasi pembayaran bercampur antar akun dan peran

**Lokasi:** `src/App.tsx:801`, `src/App.tsx:964`, `src/App.tsx:1164`, `src/components/ProcurementView.tsx:279`.

Semua notifikasi memakai kunci `inventora_notifications` tanpa UID, mode demo, atau filter izin. Logout tidak menghapus notifikasi tersebut. NotificationCenter ditampilkan pada header tanpa pembatasan peran, termasuk bagi HR yang tidak berhak membaca PO.

**Reproduksi:** initializer asli memuat notifikasi pembayaran Rp111.000.000 yang tersimpan sebelumnya meskipun konteks pengguna diganti menjadi UID lain dengan peran HR Manager. Tampilan notifikasi memang membaca nominal dari metadata tersebut.

**Dampak:** pada browser yang dipakai bergantian, akun berikutnya dapat melihat nomor dan nominal PO dari sesi sebelumnya. Ini merupakan pencampuran cache lokal, bukan pembacaan Firestore oleh HR.

**Perbaikan:** pisahkan notifikasi menurut UID dan mode sesi, muat ulang ketika identitas berubah, serta saring konten berdasarkan izin. Bersihkan state sesi saat logout.

## 4. [P2] Kegagalan AI menghasilkan angka bisnis tetap yang tampak aktual

**Lokasi:** `server.ts:137`, `server.ts:148`, `server.ts:265`, `src/components/AiCopilotDrawer.tsx:112`.

Fallback analyst dan Copilot mengabaikan konteks data dan mengembalikan angka tetap. Kegagalan jaringan pada drawer juga menampilkan angka contoh sebagai jawaban asisten. Respons tidak diberi penanda data contoh atau layanan gagal.

**Reproduksi:** konteks dengan 0 PO, 0 persetujuan tertunda, dan 0 unit infrastruktur tetap menghasilkan HTTP 200 dengan jawaban 45 PO, 12 menunggu persetujuan, dan nominal sekitar Rp1,45 miliar ketika API key tidak tersedia.

**Dampak:** pengguna dapat menganggap angka contoh sebagai kondisi operasional. Fallback risiko PO juga membuat klaim verifikasi harga dan persentase selisih anggaran tanpa data pembanding yang memadai.

**Perbaikan:** tampilkan keadaan layanan tidak tersedia. Jika ada ringkasan lokal, hitung hanya dari data yang tersedia dan nyatakan keterbatasannya. Jangan mengisi fakta bisnis yang tidak tercatat.

## 5. [P2] Struktur item PO yang salah diterima database dan menyebabkan error modal

**Lokasi:** `firestore.rules:12`, `src/components/ThreeWayMatchModal.tsx:26`.

Aturan create memeriksa nominal dan status, tetapi tidak memeriksa bahwa `items` atau `lineItems` merupakan daftar dengan struktur yang benar. Modal mengandalkan properti `length`, lalu memanggil `.map()` tanpa pemeriksaan array.

**Reproduksi:** Warehouse Manager berhasil membuat PO dengan `items: "invalid string"` pada emulator. Ketika data tersebut diberikan ke fungsi asli `getInitialItems`, eksekusi gagal dengan `source.map is not a function`.

**Dampak:** data yang masuk melalui klien lain atau integrasi dapat membuat modal penerimaan gagal dibuka. Ini tidak membuktikan form PO normal menghasilkan string tersebut.

**Perbaikan:** validasi bentuk data pada penyimpanan dan pembacaan; gunakan `Array.isArray`, pemeriksaan isi item, serta pesan kesalahan untuk dokumen lama yang tidak valid.

## 6. [P2] Inventori dan invoice lokal menampilkan sukses meskipun penyimpanan gagal

**Lokasi:** `src/lib/storageUtils.ts:17`, `src/components/InventoryView.tsx:49`, `src/components/InventoryView.tsx:145`, `src/components/FinanceView.tsx:35`, `src/components/FinanceView.tsx:107`.

Handler mengubah state dan menampilkan sukses. Penyimpanan berlangsung melalui effect dengan `saveStoredData` dalam mode opsional; error localStorage hanya dicatat ke console.

**Reproduksi:** dengan localStorage yang melempar error kuota, handler deploy menampilkan stok 0 dan pesan sukses, tetapi data tersimpan masih 1. Handler invoice menampilkan `Lunas`, tetapi data tersimpan tetap `Pending`. Menjalankan effect asli tidak meneruskan kegagalan tersebut kepada pengguna.

**Dampak:** perubahan pada modul simulasi lokal dapat hilang setelah reload tanpa peringatan yang terlihat.

**Perbaikan:** pastikan penyimpanan berhasil sebelum menampilkan sukses, teruskan error untuk operasi penting, dan pulihkan state atau tandai perubahan yang belum tersimpan.

## 7. [P2] Status stok tidak mengikuti jumlah stok

**Lokasi:** `src/components/InventoryView.tsx:145`, `src/components/InventoryView.tsx:268`, `src/lib/useWorkspaceSummary.ts:44`.

Deploy hanya mengurangi `stock`, tanpa memperbarui `status` dan `color`. Badge menampilkan dua field yang lama; dashboard menghitung stok rendah berdasarkan warna tersebut.

**Reproduksi:** callback deploy mengubah stok 1 menjadi 0, sementara label `Optimal` dan warna hijau tetap sama. Pada data awal, item WiFi memiliki stok 24 dengan status Optimal; pengurangan berulang juga tidak mengubah labelnya karena tidak ada perhitungan ulang status.

**Dampak:** barang yang habis dapat tetap tampak aman, dan jumlah item stok rendah pada dashboard menjadi keliru.

**Perbaikan:** hitung status dari jumlah stok dan batas minimum yang tersimpan, lalu gunakan aturan yang sama pada tabel dan dashboard.

## 8. [P2] Tombol pengingat email hanya menampilkan pesan terkirim

**Lokasi:** `src/components/FinanceView.tsx:97`, `src/components/FinanceView.tsx:537`.

`handleSendWarning` hanya menutup modal dan memunculkan toast. Tidak ada pengiriman email, request ke server, maupun antrean pengiriman.

**Reproduksi:** callback asli selesai dengan hanya fungsi penutup modal dan toast sebagai dependensi, lalu menampilkan “Email peringatan otomatis telah dikirim”.

**Dampak:** pengguna dapat mengira klien sudah menerima pengingat tagihan.

**Perbaikan:** hubungkan pengiriman melalui server dan tampilkan hasil sebenarnya. Jika fitur masih simulasi, ubah label aksi dan pesan agar menjelaskan simulasi tersebut.

## Hasil pemeriksaan

| Pemeriksaan | Hasil pada 22 Oktober 2026 |
| --- | --- |
| TypeScript `tsc --noEmit` | Lulus |
| Tes regresi lokal | 15 lulus, 0 gagal |
| Build frontend produksi | Lulus; Vite 6.4.4, 3.250 modul, 22,19 detik |
| Bundle server produksi | Lulus |
| Tes aturan Firestore yang sudah tersedia | 5 lulus, 0 gagal; dijalankan ulang pada emulator `127.0.0.1:8096` |
| Reproduksi tambahan | 10 observasi mengonfirmasi 8 masalah di atas; dua observasi merupakan pasangan masalah yang sama |

Peringatan build tentang chunk di atas 500 kB masih muncul, terutama chunk Firestore sekitar 714 kB sebelum gzip. Ini merupakan catatan kinerja, bukan kegagalan build.

Kelulusan tes yang sudah tersedia tidak membuktikan ketiadaan bug: suite tersebut belum mencakup skenario reproduksi tambahan di atas.

## Cakupan dan bukti

- Aturan diuji pada emulator baru dengan project ID demo. Tidak ada pembacaan atau perubahan Firebase produksi.
- Perilaku callback diperiksa langsung dari kode sumber menggunakan TypeScript AST dan VM, dengan state, storage, Express, serta layanan AI tiruan. Ini bukan pengujian interaksi browser dari awal sampai akhir.
- Login aktual, tampilan browser, pengiriman email, dan panggilan Gemini sungguhan belum diuji ulang pada audit ini.
- Emulator audit sudah dihentikan setelah pengujian.
- Skrip reproduksi: `output/audit/crosscheck-2026-10-22.mjs`.
- Hasil terstruktur: `output/audit/crosscheck-2026-10-22.json`.

Skrip memerlukan emulator pada `127.0.0.1:8096` dengan `firestore.rules` saat ini dan environment `FIRESTORE_EMULATOR_HOST=127.0.0.1:8096`. AI memakai mock; token dan peran Firebase hanya berlaku pada emulator. Skrip menambahkan dokumen audit baru di emulator dan tidak menghapus dokumen lain.

Urutan perbaikan yang disarankan: validasi penerimaan barang, autentikasi endpoint AI, pemisahan notifikasi, penghapusan angka fallback, validasi struktur PO, kepastian penyimpanan lokal, perhitungan status stok, lalu fungsi pengingat email.
