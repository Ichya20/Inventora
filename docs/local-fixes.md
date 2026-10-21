# Perbaikan lokal dan konfigurasi Firebase

Kode perbaikan berada di proyek ini. File `firestore.rules` harus diterapkan ke proyek Firebase oleh administrator agar proteksi database aktif di hosting. Mengubah file lokal tidak mengubah aturan yang sedang terpasang.

## Peran akun

Login Google membaca custom claim Firebase Auth bernama `role`. Nilai yang didukung:

| Peran | Aksi pengadaan |
| --- | --- |
| Super Admin | Membuat, menyetujui/menolak, menerima, mencatat simulasi pembayaran |
| Warehouse Manager | Membuat PO dan mencatat penerimaan |
| Finance Manager | Menyetujui/menolak dan mencatat simulasi pembayaran |
| HR Manager | Modul SDM, tanpa akses dokumen pengadaan |

Administrator menetapkan claim melalui Firebase Admin SDK dalam lingkungan server tepercaya. Pertahankan custom claims lain saat memperbarui claim `role`. Jangan menaruh service-account key atau Firebase Admin SDK dalam bundle browser. Setelah claim diubah, pengguna masuk kembali untuk memuat peran terbaru. Akun tanpa claim yang valid tidak mendapat akses modul.

Aturan saat ini ditujukan untuk satu workspace perusahaan pada satu proyek Firebase. Pemisahan organisasi/tenant belum diimplementasikan.

Mode demo hanya menyimpan PO secara lokal dan tidak membaca, membuat, atau memperbarui PO di Firestore. Peran demo di sessionStorage tidak menjadi dasar izin database.

## Penyimpanan dan koneksi

- PO cloud disimpan setelah server mengonfirmasi transaksi. Kegagalan tidak ditampilkan sebagai keberhasilan.
- Persetujuan/penolakan offline diikat ke UID pengguna dan dikirim saat koneksi pulih. Antrean hanya dihapus setelah server mengonfirmasi. Konflik atau kegagalan mempertahankan data antrean.
- Antrean lama tanpa UID tidak dikirim otomatis. Ekspor cadangan lokal sebelum memulihkannya secara manual.
- Pembuatan PO cloud, penerimaan dan pembayaran membutuhkan koneksi. Formulir pembuatan PO tetap tersedia saat penyimpanan gagal.
- Cadangan JSON mencakup semua kunci `inventora_` pada browser, termasuk data HR v2, riwayat payroll, langganan dan antrean. Ini bukan ekspor seluruh database cloud atau kredensial Firebase.
- Reset menghapus data lokal Inventora, termasuk antrean, serta mempertahankan preferensi bahasa dan tema. Reset tidak menghapus dokumen Firestore.

Pembayaran vendor, pencairan payroll dan perubahan langganan masih berupa simulasi. Tidak ada integrasi transfer bank baru dalam perbaikan ini.

## Payroll, billing dan ringkasan

Payroll menggunakan bulan aktif `YYYY-MM` dalam zona waktu Asia/Jakarta. Riwayat sukses untuk kombinasi karyawan dan bulan menjadi sumber status serta ekspor PDF; pencatatan kedua untuk periode yang sama diblokir. Riwayat lama berlabel bulan Inggris/Indonesia tetap dibaca. Komponen arsip tidak dipecah menggunakan perkiraan. Slip tanpa catatan sukses ditandai draf dan tidak menciptakan tanggal transfer.

Langganan memakai satu record `inventora_subscription_v2` berisi paket, siklus, tanggal awal, status perpanjangan dan invoice. Record ini mengambil data lama saat pertama kali dibuka tanpa mengubah invoice historis. Toggle bulanan/tahunan hanya membandingkan harga; konfirmasi memulai siklus penuh baru. Total tahunan adalah 12 kali harga bulanan tahunan. Jeda disimpan dan mempertahankan akhir siklus sampai diaktifkan kembali. Tidak ada prorata atau tagihan nyata.

Ringkasan dashboard memakai catatan yang tersedia dan izin modul akun. Data yang belum dimuat ditampilkan sebagai tanda pisah, sedangkan daftar kosong yang sudah tersedia dihitung nol. Valuasi, kuota dan grafik contoh diberi label; itu bukan pengukuran layanan produksi. Ekspor rekap langganan menghasilkan JSON. Form kebutuhan hanya menyimpan draf browser dan tidak mengirim pesan. Label metode pembayaran uji tidak menyimpan nomor kartu lengkap atau CVV.

Laporan terbaru: [pengujian lokal 21 Oktober 2026](pengujian-lokal-2026-10-21.md).

## Invoice dan Google Calendar

Parser memerlukan `GEMINI_API_KEY` di server. Ketiadaan layanan, kegagalan ekstraksi, atau jumlah yang tidak konsisten menghasilkan pesan error tanpa data invoice buatan. Dokumen dengan diskon atau pemotongan yang belum didukung perlu diisi manual.

Token OAuth Google hanya disimpan di memori. Setelah reload atau token kedaluwarsa, ekspor Calendar meminta otorisasi ulang pada akun yang sama. Pembatalan popup tidak dianggap ekspor berhasil.

## Pemeriksaan

```powershell
npm test
npm run lint
npm run build
```

Untuk memeriksa aturan database tanpa mengakses proyek asli, gunakan Java 21+ dan emulator Firebase:

```powershell
npm exec --yes --package firebase-tools -- firebase emulators:start --only firestore --project demo-inventora
# Jalankan di terminal kedua:
npm run test:rules
```

Pengujian browser memakai mode demo di localhost. Otorisasi Google dan deployment aturan Firebase perlu diverifikasi pada konfigurasi hosting yang sebenarnya.
