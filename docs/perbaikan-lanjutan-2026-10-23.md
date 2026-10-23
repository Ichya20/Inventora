# Perbaikan lanjutan Inventora

Tanggal penyelesaian: 23 Oktober 2026.

Enam temuan pada `docs/crosscheck-lanjutan-2026-10-22.md` telah diperbaiki langsung pada kode project.

## Perubahan

1. **Input angka PO.** Jumlah dan harga dikonversi menjadi angka saat diedit. Input kosong tetap kosong dan ditolak saat submit, bersama jumlah negatif, nol, atau pecahan. Subtotal payload dihitung dari nilai angka yang sama dengan form.
2. **Kepastian penyimpanan PO.** Konfirmasi server langsung membuka tampilan sukses, tanpa bergantung pada cache browser. Bila hasil permintaan belum diketahui, form mempertahankan ID dan payload yang sama untuk retry. Server mengembalikan PO yang sudah dibuat hanya bila akun serta isi permintaannya sama; status persetujuan yang telah berubah tetap dipertahankan. Form dikunci sampai permintaan tersebut terkonfirmasi atau mendapat penolakan validasi yang pasti. Mode demo tetap mensyaratkan penyimpanan lokal berhasil.
3. **Catatan lengkap.** Field `notes` menyimpan catatan sampai 10.000 karakter, termasuk baris lanjutan. Catatan diteruskan ke rincian PO, ekspor CSV, voucher cetak, dan PDF. PDF menambah halaman untuk catatan panjang.
4. **Draf restok.** Tombol restok meneruskan SKU, nama barang, dan jumlah rekomendasi ke form PO. Vendor dan harga yang belum diketahui dibiarkan kosong untuk diisi. Draf dibatasi pada sesi akun dan peran yang membuatnya, lalu dibersihkan saat navigasi baru atau logout.
5. **Cache inventori rusak.** Pembacaan memeriksa bentuk array, isi record, stok, serta SKU duplikat. Halaman menampilkan pesan pemulihan dan unduhan data tersimpan bila cache tidak valid. Data asli tidak ditimpa dengan contoh, dan tindakan stok maupun ekspor laporan dinonaktifkan pada kondisi tersebut. Ringkasan dashboard juga memeriksa isi inventori sebelum menghitungnya.
6. **Judul notifikasi.** Tipe error, warning, atau info menentukan judul sebelum pencocokan kata pada pesan. Kegagalan pembayaran dan pengeluaran stok tidak lagi mendapat judul keberhasilan transaksi.

Perbaikan terkait: voucher cetak kini memakai total akhir PO, diskon, PPN, dan pemotongan pajak yang tersimpan. PPN tidak ditambahkan kembali ke total yang sudah termasuk pajak.

## Hasil pemeriksaan

- 54 tes aplikasi lulus: regresi, API, validasi, AI dengan layanan tiruan, callback form, pemulihan cache, alur restok, dan keluaran PDF. Dua belas tes alur terbaru berada di `tests/workflowFixes.test.ts`.
- 9 tes Firestore emulator lulus pada project lokal `demo-inventora`, termasuk retry PO, pemisahan identitas akun, penolakan payload berbeda, persetujuan, penerimaan, dan pembayaran. Emulator dihentikan setelah tes.
- TypeScript `tsc --noEmit` lulus.
- Build frontend Vite dan bundle server esbuild berhasil. Vite masih memberi peringatan ukuran beberapa chunk di atas 500 kB; build tetap selesai.
- Pemeriksaan bundle melalui HTTP lokal: health 200, create PO tanpa login 401, restok tanpa login 401. Dua aset utama yang dirujuk HTML tersedia.
- `git diff --check` tidak menemukan kesalahan whitespace.

Pesan `PERMISSION_DENIED` dalam log emulator berasal dari skenario akses yang memang harus ditolak dan telah diperiksa oleh tes.

## Batas pemeriksaan

Pengujian memakai callback sumber, render React tanpa browser, PDF jsPDF, API lokal, dan emulator Firestore. Interaksi browser dari login sampai transaksi selesai serta pemeriksaan visual belum dilakukan. Hasil ini mengonfirmasi perbaikan temuan yang tercantum, bukan jaminan bahwa seluruh kemungkinan bug aplikasi telah habis.

ID retry dipertahankan selama form yang sama masih terbuka. Memuat ulang halaman atau meninggalkan form akan membuang draf tersebut; periksa daftar PO sebelum membuat ulang pesanan yang hasilnya belum diketahui.

Tidak ada konfigurasi Firebase, kredensial, deployment, data cloud, atau pengaturan layanan Gemini yang diubah dalam perbaikan lanjutan ini. Ketersediaan Gemini secara langsung belum diuji pada pemeriksaan ini.

Mulai ulang server pengembangan dan muat ulang halaman untuk memakai kode terbaru. Konfigurasi serta deployment Firebase tetap dikerjakan pemilik project.
