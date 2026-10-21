# Perbaikan lanjutan dan pengujian lokal - 21 Oktober 2026

Lanjutan dari [laporan 20 Oktober](pengujian-lokal-2026-10-20.md). Lima area perbaikan lokal yang masih terbuka sudah ditangani: periode payroll, siklus billing, akurasi ringkasan, kejelasan simulasi dan pemuatan modul. Logo tetap dipertahankan. Hasil ini berlaku untuk kode lokal dan skenario demo yang diuji; tidak menyatakan semua kemungkinan bug atau integrasi produksi sudah teruji.

## Perubahan

1. **Payroll per periode.** Bulan aktif mengikuti Asia/Jakarta dan dapat dipilih. Status direktori, filter, modal dan PDF merujuk pada riwayat karyawan untuk bulan tersebut. Pencatatan ulang pada karyawan/bulan yang sama diblokir. Penyimpanan harus berhasil sebelum pesan sukses. Slip arsip mempertahankan komponen lama, sementara slip tanpa catatan diberi label draf. Nilai potongan nol tidak lagi digantikan nilai perkiraan.
2. **Billing konsisten.** Paket aktif, siklus, tanggal awal, status perpanjangan dan invoice disimpan dalam satu record `inventora_subscription_v2`. Pengaturan lama dimigrasikan tanpa mengubah nominal invoice historis. Toggle harga hanya mengubah perbandingan. Konfirmasi memulai siklus penuh dari tanggal bisnis saat ini; tahunan dihitung 12 kali harga bulanan tahunan. Tanggal akhir bulan, tahun kabisat dan jeda siklus tercakup tes.
3. **Ringkasan berdasarkan catatan.** Dashboard menghitung nilai PO, PO aktif, approval tertunda, jumlah pegawai dan penanda stok dari data yang tersedia sesuai izin modul. Data belum tersedia ditampilkan sebagai tanda pisah dengan penjelasan. Total inventori tidak lagi ditambah angka 1.104. Grafik/valuasi/kuota contoh ditandai sebagai contoh. Estimasi restok tidak lagi diklaim berasal dari model konsumsi 30 hari yang terlatih.
4. **Aksi dan dokumen jujur.** Pembayaran, payroll dan langganan menjelaskan status simulasi. Klaim tanda tangan kriptografis, verifikasi kartu/bank dan meterai elektronik dihapus dari alur yang diperbaiki. Form kartu hanya meminta label uji/empat digit terakhir tanpa CVV. Rekap invoice benar-benar menghasilkan JSON. Form kebutuhan menyimpan draf lokal dan tidak mengklaim mengirim pesan ke tim penjualan. Invoice membungkus deskripsi panjang agar tidak menimpa kolom lain.
5. **Pemuatan bertahap.** Inventori dipindahkan dari root ke modul lazy. Akses Firestore untuk ringkasan, procurement dan replay memuat dependensi saat dibutuhkan. Import chart di root dihapus. Header ponsel dipadatkan agar judul panjang tidak meluber; kontrol periode dan tab payroll dapat tersusun vertikal.

## Hasil pemeriksaan

| Pemeriksaan | Hasil |
| --- | --- |
| `npm test` | 15 lulus, 0 gagal |
| `npm run lint` | Lulus (`tsc --noEmit`) |
| `npm run build` | Lulus, 18,02 detik untuk Vite pada pemeriksaan akhir |
| `git diff --check` | Tidak ada error whitespace; Git hanya memberi pemberitahuan normalisasi LF/CRLF |
| Console browser pada pemeriksaan akhir | Tidak ada log error tercatat |
| Aturan Firestore | 5 tes emulator sudah lulus pada 20 Oktober; aturan tidak diubah dalam perbaikan lanjutan ini dan tesnya tidak diulang |

Bundle JavaScript utama turun dari **1.719,95 kB / gzip 476,88 kB** pada laporan sebelumnya menjadi **560,68 kB / gzip 171,06 kB**. Penurunan ukuran utama sekitar 67% sebelum gzip dan 64% setelah gzip. Ini pengukuran ukuran file, bukan pengukuran waktu muat. Vite masih memperingatkan chunk di atas 500 kB: root sekitar 561 kB dan chunk SDK Firestore yang dimuat terpisah sekitar 714 kB. Peringatan tidak disembunyikan.

## Pengujian browser

Mode Super Admin demo di `http://localhost:3000/dashboard`.

| Skenario | Bukti hasil |
| --- | --- |
| Default periode | Oktober 2026 sesuai tanggal bisnis pengujian |
| Riwayat Agustus | Budi dan Siti tercatat; Budi memakai tunjangan agregat Rp6.000.000 dan BPJS Rp1.140.000 |
| Bulan tanpa catatan | November mula-mula 0/5; status tidak mengikuti pembayaran bulan lain |
| Payroll baru | Budi November Rp34.010.000 berhasil dicatat; tombol berubah menjadi Already Recorded dan dinonaktifkan |
| Persistensi payroll | Setelah reload, catatan November masih ada dan hanya 1/5 pegawai tercatat |
| PDF arsip dari UI | Unduhan Budi November mengandung periode, nominal Rp34.010.000 dan label simulasi yang sesuai arsip |
| PDF draf dari UI | Unduhan Siti Oktober mengandung DRAFT PAYSLIP - NOT RECORDED, periode Oktober 2026 dan nominal Rp28.120.000; tidak mencatat payroll |
| Toggle billing | Pilihan Monthly mengubah kartu perbandingan, tetapi paket aktif tetap Business Rp1.800.000/bulan tahunan dan tanggal akhir tetap 21 Oktober 2027 |
| Konfirmasi tahunan | Invoice baru Business Rp21.600.000, periode 21 Oktober 2026 sampai 21 Oktober 2027 |
| Invoice lama | Invoice `INV-SUB-2026-5423` tetap Rp1.800.000; tidak dihitung ulang secara retroaktif |
| Jeda billing | Status Resume simulated renewal dan tanggal akhir tetap ada setelah reload; lanjutkan perpanjangan berhasil |
| Label pembayaran | Form hanya empat digit terakhir, expiry, nama contoh dan email; tidak ada CVV/full card number atau badge Verified |
| Ekspor invoice | Berkas JSON benar-benar diunduh; berisi 5 invoice, nilai tahunan baru benar dan nominal lama tetap |
| Draf kebutuhan | Teks contoh tersimpan dan muncul saat dibuka lagi, tanpa klaim pesan terkirim |
| Inventori dan dashboard | Total inventori 867 unit; dashboard Rp112.110.000 nilai PO, 1 PO aktif, 0 approval tertunda, 4 SKU ditandai dan 5 pegawai |
| Data inventori belum dimuat | Dashboard semula menampilkan tanda pisah; setelah modul dibuka, jumlah SKU ditandai terisi |
| Responsif | Dashboard, payroll dan billing diperiksa pada 390 x 844; lebar dokumen payroll/billing 390 px tanpa overflow halaman. Tabel tetap dapat digeser di wadahnya |
| Bahasa | Teks utama payroll/billing diperiksa dalam bahasa Inggris dan Indonesia; preferensi akhir dikembalikan ke Inggris seperti awal pengujian |

Data tambahan hanya pada browser demo pengujian: payroll `TRX-PAY-202611-b18e4fed`, invoice `INV-SUB-2026-603b6f92`, dan draf kebutuhan berawalan QA. Paket akhir tetap Business tahunan dengan perpanjangan simulasi aktif. Tidak ada pembayaran atau pesan eksternal dikirim.

## Pemeriksaan PDF

Lima sampel QA dibuat dari generator aplikasi: slip komponen lengkap, slip agregat arsip, slip draf, invoice dan catatan simulasi pembayaran. Seluruhnya dirender dengan Poppler dan diperiksa secara visual. Sampel yang diperiksa tidak memiliki teks bertumpuk atau terpotong setelah perbaikan. Pemeriksaan teks tambahan memverifikasi nominal dan label pada dua slip yang benar-benar diunduh dari browser. Sampel berada di `docs/qa/` dengan penanda `20261021`; ini artefak uji, bukan dokumen transaksi asli.

Bukti tampilan:

- [Dashboard berdasarkan catatan](qa/dashboard-records-2026-10-21.jpg)
- [Payroll setelah reload](qa/payroll-period-2026-10-21.jpg)
- [Payroll ponsel](qa/payroll-mobile-2026-10-21.jpg)
- [Billing ponsel](qa/billing-mobile-2026-10-21.jpg)

## Batas yang tetap memerlukan konfigurasi asli

- Deployment aturan Firestore dan custom claim akun oleh administrator.
- Login Google, popup/pembatalan, token kedaluwarsa, retry 401 dan penulisan Google Calendar dengan akun asli.
- Ekstraksi invoice Gemini yang sukses dengan API key server yang valid.
- Pemutusan/pemulihan jaringan end-to-end dengan akun Firebase asli. Retensi dan replay antrean sudah tercakup tes helper, tetapi bukan pengganti pengujian sesi cloud nyata.
- Transfer bank, pemrosesan kartu, tanda tangan digital dan penerbitan faktur pajak resmi belum terintegrasi. Mode saat ini tetap simulasi.

Tidak ada deployment atau perubahan data Firebase produksi selama pengujian ini.
