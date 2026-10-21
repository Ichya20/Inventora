# Hasil pengujian lokal Inventora

Tanggal: 20 Oktober 2026. Lingkungan: Windows, Node 24, browser localhost:3000, mode demo, emulator Firestore dengan project `demo-inventora`.

Pengujian lanjutan terhadap 16 perbaikan sebelumnya selesai. Hasil ini membuktikan skenario yang tercantum di bawah, bukan jaminan bahwa seluruh produk bebas bug atau siap produksi. Tidak ada deployment, perubahan logo, transfer bank, atau penulisan ke proyek Firebase asli.

## Pemeriksaan otomatis

| Pemeriksaan | Hasil |
| --- | --- |
| `npm test` | 10 lulus, 0 gagal |
| `npm run test:rules` | 5 lulus, 0 gagal, menggunakan emulator Firestore |
| `npm run lint` | Lulus (`tsc --noEmit`) |
| `npm run build` | Lulus, dengan peringatan ukuran bundle dan pola import Firebase |
| `git diff --check` | Lulus setelah whitespace diperbaiki |

Tes regresi mencakup izin modul dan aksi, urutan status PO, pencegahan bayar ulang, nominal PPN/diskon/PPh, migrasi skema pembayaran lama, antrean offline gagal/berhasil, pemulihan data antrean rusak, validasi invoice, komponen payroll historis, cadangan/reset, dan kegagalan penulisan storage.

Tes aturan Firestore mencakup penolakan akses anonim/HR/koleksi tak dikenal, pembuatan PO oleh Warehouse, persetujuan Finance, larangan mengubah nominal atau melompati status, penerimaan oleh Warehouse, kesesuaian GRN, dan pembayaran tepat nominal oleh Finance. Penolakan izin yang sengaja diuji menghasilkan log PERMISSION_DENIED yang diharapkan.

## Pemeriksaan browser

| Skenario | Hasil teramati |
| --- | --- |
| PO baru tersimpan | PO demo muncul kembali setelah reload |
| Tanggal pengiriman | Isian `2026-11-02` tersimpan dan tampil di detail PO |
| Persetujuan | Super Admin dan Finance berhasil menyetujui PO pending |
| Penerimaan sebelum persetujuan | Tombol konfirmasi GRN tidak aktif |
| Selisih penerimaan | Status berubah ke Selisih Penerimaan; tombol bayar tidak tersedia |
| Rekonsiliasi penerimaan | Penerimaan lengkap mengubah status ke Barang Diterima dan membuka pembayaran |
| Simulasi pembayaran | Subtotal Rp100.000.000 + PPN Rp11.000.000 = Rp111.000.000; PPN tidak dikenakan dua kali |
| Setelah pembayaran | Status Selesai dan riwayat transaksi tetap ada setelah reload; tombol bayar ulang tidak tersedia |
| Parser tanpa layanan AI | Pesan error eksplisit; tombol Apply tetap nonaktif dan tidak ada hasil invoice buatan |
| Riwayat langganan | Invoice baru paket Business Rp1.800.000 tetap ada setelah reload; invoice lama Enterprise tetap Rp4.760.000 |
| HR melalui shortcut | Akses PO/Finance ditolak melalui dashboard, command palette, dan hotkey |
| Warehouse | Modul Finance ditolak, tombol persetujuan PO tidak tersedia |
| Finance | Pembuatan PO ditolak; persetujuan tersedia; konfirmasi penerimaan tidak aktif |
| PDF payroll lama | Total tunjangan Rp6.000.000 dan BPJS Rp1.140.000 ditampilkan sebagai agregat arsip, tanpa pecahan buatan |
| PDF payroll baru dari riwayat | Tunjangan jabatan Rp3.200.000, transport Rp1.400.000, BPJS TK Rp660.000, BPJS kesehatan Rp220.000; take-home pay Rp25.670.000 sesuai perhitungan |
| Tampilan PDF | Kedua slip dirender dan diperiksa; tidak ditemukan teks terpotong atau tabel bertumpuk pada sampel tersebut |
| Console browser terakhir | Tidak ada log error/warning yang tercatat pada pemeriksaan terakhir |

Data uji lokal yang ditambahkan: PO `PO-2026-IT-324994c7-ef7` (Selesai), PO `PO-2026-IT-541d9c45-fba` (Disetujui), invoice `INV-SUB-2026-5423`, serta payroll demo `TRX-PAY-202610-6980`. Data ini hanya untuk pengujian demo pada browser ini.

## Temuan tambahan dan batas pengujian

Catatan historis: perbaikan lanjutan untuk periode payroll, billing, ringkasan, label simulasi dan bundle dicatat dalam [laporan 21 Oktober 2026](pengujian-lokal-2026-10-21.md). Temuan di bawah menggambarkan keadaan pada 20 Oktober.

1. **Periode payroll masih statis pada sebagian UI dan ekspor langsung dari direktori.** `src/components/HRView.tsx` masih memakai September 2026 untuk label periode dan ekspor langsung karyawan, sedangkan record baru di riwayat menggunakan bulan berjalan. Akibatnya, pada 20 Oktober 2026 tampilan masih menyebut September. PDF yang diunduh dari riwayat memakai periode record yang benar. Temuan ini belum diperbaiki dalam rangkaian 16 perbaikan sebelumnya; perlu penyelarasan periode aktif, status pembayaran per periode, dan sumber ekspor langsung agar konsisten.
2. **Sebagian angka/tanggal dan klaim di UI masih data contoh.** Ringkasan dashboard, tanggal siklus billing, serta keterangan seputar settlement/tanda tangan digital belum membuktikan adanya layanan operasional terkait. Pembayaran vendor, payroll dan langganan masih simulasi.
3. **Peringatan build:** bundle utama sekitar 1,72 MB sebelum gzip; import Firebase statis dan dinamis bercampur. Build berhasil, tetapi optimasi pemuatan masih layak dikerjakan.
4. **Firebase produksi:** aturan lokal sudah diuji di emulator, belum diterapkan ke proyek asli. Custom claim `role` harus dikonfigurasi administrator; dokumen konfigurasi ada di `local-fixes.md`.
5. **Google OAuth/Calendar:** alur token diperbaiki di kode, tetapi popup, pembatalan pengguna, expiry, retry 401, dan penulisan Calendar asli belum diuji dengan akun nyata.
6. **Parser sukses:** jalur kegagalan layanan dan validasi hasil diuji. Ekstraksi sukses melalui Gemini belum diuji karena API key tidak dikonfigurasi di lingkungan lokal ini.
7. **Offline:** keberhasilan/kegagalan replay dan retensi antrean diuji pada helper regresi. Pemutusan jaringan browser dengan sesi Firebase nyata belum diuji end-to-end.

Label paket aktif yang sebelumnya selalu menyebut Enterprise sudah diperbaiki menjadi Active Subscription dan diverifikasi di browser untuk paket Business.

## Bukti lokal

- `qa/payment-simulation.jpg`: hasil simulasi pembayaran Rp111.000.000.
- `qa/payroll-legacy.pdf` dan `qa/payroll-legacy.png`: slip historis beserta render pemeriksaannya.
- `qa/payroll-exact.pdf` dan `qa/payroll-exact.png`: slip record baru beserta render pemeriksaannya.

## Catatan emulator Windows

Pada Java 21 di perangkat ini, koneksi internal emulator memerlukan direktori socket pendek. Konfigurasi per proses yang berhasil:

```powershell
$env:JAVA_TOOL_OPTIONS = '-Djdk.net.unixdomain.tmpdir=D:\Inventora\.firebase-emulators'
```

Tidak ada pengaturan Java global yang diubah.
