# Inventora - Tugas Basis Data MySQL

Versi ini adalah alternatif relasional sebelumnya. Dokumentasi yang mengikuti implementasi Firebase aktual berada di [paket Firestore](../firestore/README.md).

Paket ini berisi rancangan relasional untuk tugas kelompok: **14 tabel, masing-masing 5 baris contoh (70 baris)**. Rancangan mengikuti domain Inventora: inventori, pengadaan, keuangan, pegawai, payroll, dan anggaran.

Ini merupakan rancangan SQL untuk tugas. Aplikasi Inventora yang ada masih menggunakan Firebase; menjalankan file ini tidak mengalihkan koneksi aplikasi ke MySQL.

## Isi paket

- `inventora_tubes.sql`: seluruh CREATE DATABASE, CREATE TABLE, dan INSERT.
- `verifikasi.sql`: delapan bagian query untuk memeriksa data dan relasi.
- `hasil-uji.json`: bukti 20 pemeriksaan yang lulus pada MySQL Community Server 8.0.41.
- `hasil-query.txt`: keluaran query verifikasi dari pengujian tersebut.
- `uji_mysql.py`: pemeriksaan ulang pada instance MySQL sementara di 127.0.0.1:33308.
- `format_laporan.py`: pembuat laporan Word dengan tata letak mengikuti dokumen referensi.
- `ekspor_laporan.ps1`: ekspor Word ke PDF dan pemeriksaan nomor halaman melalui Microsoft Word lokal.
- `hasil-verifikasi-format.json`: hasil pemeriksaan font, spasi, kelengkapan SQL, dan daftar isi.
- `../../output/pdf/Inventora_Tugas_Basis_Data_MySQL.pdf`: dokumen pengumpulan.
- `../../output/docx/Inventora_Tugas_Basis_Data_MySQL.docx`: versi Word yang dapat diedit.

Laporan terdiri atas 31 halaman. Teks menggunakan Times New Roman 12, kode SQL menggunakan Consolas 12, seluruh teks hitam, dan spasi baris 1,5. Sampul, logo, identitas anggota, margin, header/footer, dan susunan bagian mengikuti dokumen referensi. `build_pdf.py` merupakan pembuat versi tata letak lama; menjalankannya akan menimpa PDF dengan format sebelumnya.

## Menjalankan di MySQL Workbench

1. Gunakan **MySQL 8.0.16 atau lebih baru**. CHECK mulai ditegakkan pada versi ini. Paket telah diuji pada MySQL 8.0.41; belum diuji untuk MariaDB atau MySQL 5.7.
2. Buka koneksi server milikmu menggunakan kredensial yang sudah kamu atur.
3. Pastikan schema `inventora_tubes` belum ada atau masih kosong. File tidak berisi DROP dan tidak dirancang untuk dijalankan berulang pada schema yang telah terisi.
4. Pilih **File > Open SQL Script**, buka `inventora_tubes.sql`, lalu jalankan seluruh skrip dengan tombol petir untuk semua pernyataan.
5. Buka dan jalankan `verifikasi.sql`. Query jumlah data harus menampilkan 14 tabel dengan angka 5; query ketidaksesuaian pada bagian 3-5 harus kosong.

Jangan gunakan opsi `--force`. Bila terjadi error, hentikan eksekusi dan periksa error pertama. DDL MySQL melakukan commit implisit; transaksi pada file ini melindungi INSERT, bukan seluruh CREATE TABLE. Gunakan schema kosong untuk percobaan baru, tanpa menghapus data lain.

## Alternatif melalui PowerShell

Contoh berikut memakai instalasi MySQL standar pada Windows. Opsi `-p` meminta password secara interaktif; sesuaikan username dan lokasi program bila berbeda.

```powershell
& 'C:/Program Files/MySQL/MySQL Server 8.0/bin/mysql.exe' -u root -p --default-character-set=utf8mb4 --execute="SOURCE D:/Inventora/database/tubes/inventora_tubes.sql"
& 'C:/Program Files/MySQL/MySQL Server 8.0/bin/mysql.exe' -u root -p --default-character-set=utf8mb4 --execute="SOURCE D:/Inventora/database/tubes/verifikasi.sql"
```

## Aturan dan batas rancangan

- Semua tabel menggunakan InnoDB, primary key, dan tipe nilai uang DECIMAL. Ada 19 foreign key; penghapusan/perubahan key induk memakai RESTRICT.
- Lingkup inventori adalah satu lokasi. Setiap PO memiliki paling banyak satu keputusan persetujuan, satu penerimaan, dan satu pembayaran penuh. Cicilan, penerimaan parsial berulang, dan riwayat percobaan pembayaran belum dimodelkan.
- FK gabungan pada detail penerimaan memastikan produk benar-benar termasuk pada PO yang sama. FK pembayaran mensyaratkan keberadaan dokumen penerimaan.
- Subtotal detail PO, total PO, serta gaji bersih adalah generated columns. Jangan memasukkan nilai langsung ke kolom tersebut.
- Subtotal header terhadap jumlah detail, jumlah pembayaran terhadap total, jumlah penerimaan, urutan tanggal antartabel, hak akses peran, dan transisi status tetap memerlukan validasi aplikasi dalam transaksi atau prosedur/trigger tambahan. Query dan pengujian membuktikan konsistensi data contoh, bukan enforcement otomatis atas seluruh aturan bisnis.
- Harga pada detail PO dan komponen payroll menyimpan nilai historis. Perubahan harga produk/gaji master tidak mengubah transaksi lama.
- Stok pada produk merupakan snapshot akhir data contoh. INSERT penerimaan tidak otomatis menaikkan stok; implementasi aplikasi memerlukan pencatatan mutasi dan pembaruan stok secara transaksional.
- Pengguna memakai AuthUID untuk pemetaan identitas eksternal. Paket ini tidak menyediakan sistem login MySQL atau password pengguna aplikasi.
- Seluruh nama/kontak/referensi pembayaran adalah data contoh. Pajak, potongan, BPJS, dan PPh21 merupakan nominal ilustrasi, bukan perhitungan perpajakan produksi.
- Inventora dalam paket ini adalah sistem inventori/pengadaan internal, bukan contoh POS tiga tabel. Pastikan tema tersebut sesuai dengan proposal TUBES yang disetujui dosen. Kompleksitas tidak menjamin nilai tertentu.

## Hasil utama pengujian

Pengujian pada 21 Oktober 2026 menggunakan instance sementara terpisah, bukan server/data aplikasi. Semua 20 pemeriksaan lulus, termasuk delapan percobaan data tidak valid yang ditolak dengan error MySQL yang sesuai.

| Pemeriksaan | Hasil |
| --- | ---: |
| Tabel / baris / foreign key | 14 / 70 / 19 |
| Total PO dan pembayaran | Rp860.970.000,00 |
| Total payroll Oktober 2026 | Rp125.690.000,00 |
| Total unit stok contoh | 339 |
| Produk di bawah stok minimum | PRD003 - NVMe 8TB |

PDF memuat seluruh CREATE dan INSERT, diagram relasi utama, daftar FK lengkap, query verifikasi, serta ringkasan pengujian. Identitas kelima anggota dan logo telah disalin dari dokumen referensi.
