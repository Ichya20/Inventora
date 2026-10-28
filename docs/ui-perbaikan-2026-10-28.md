# Perbaikan antarmuka Inventora

28 Oktober 2026

## Penerimaan dan rincian PO

- Modal penerimaan menggunakan lebar hingga 1040 px. Di layar kecil, baris barang menjadi susunan vertikal sehingga nama, SKU, jumlah, kondisi dan hasil pemeriksaan tetap dapat dibaca.
- Rincian barang ditempatkan sebelum data surat jalan. Langkah promosi alur dan tombol simulasi selisih dihapus dari pemeriksaan barang. Tombol isi sesuai pesanan tetap tersedia untuk petugas yang berwenang.
- Tombol simpan tetap terlihat di footer. Isian wajib memakai validasi formulir dan petunjuk yang jelas, sehingga pengguna tidak menemui tombol nonaktif tanpa alasan. Status penyimpanan mencegah klik ganda dan penutupan selama permintaan berlangsung.
- Jumlah pecahan tidak lagi dipotong dengan parseInt. Nilai tersebut ditolak, sesuai validasi penerimaan pada server.
- Detail dan tinjauan PO kini menampilkan produk, SKU, jumlah, harga dan subtotal. Catatan, anggaran contoh dan analisis risiko ditempatkan dalam bagian yang dapat dibuka bila diperlukan.
- Form pembuatan PO memberi ruang tersendiri bagi nama barang dan kontrol nominal. Pemilihan barang kustom, tombol kembali selama pengiriman, serta label tindakan diperbaiki.
- Tombol Cetak PO dan Aktivitas menutup dialog detail dahulu agar tampilan berikutnya dapat dijangkau.

## Navigasi dan tindakan

- Notifikasi PO membuka ID pesanan terkait. Hasil cache kosong tidak dianggap bukti bahwa pesanan telah hilang; sistem menunggu konfirmasi pembacaan sebelum menampilkan pesan tidak tersedia.
- Ctrl+K tidak lagi ditangani oleh dua listener. Rangkaian pintasan G/N berakhir setelah 1,2 detik dan mengabaikan tombol yang ditahan atau sedang dipakai pada formulir.
- Salin teks asisten menunggu hasil clipboard. Penolakan izin menampilkan pesan gagal.
- Analisis menolak permintaan ganda dan menampilkan hasil kosong/gagal sebagai error.
- Perubahan add-on berada dalam draf sampai disimpan. Batal mempertahankan konfigurasi sebelumnya; kegagalan penyimpanan tidak menampilkan keberhasilan.

## Teks dan tata letak menu

Judul, label, dan keterangan pada Dashboard, Inventori, Keuangan, SDM, Analitik, Langganan, POS dan Pengaturan dipersingkat. Informasi bantuan panjang menggunakan pengungkapan bertahap. Keterangan data lokal, contoh, pembayaran simulasi, izin dan kegagalan tetap tersedia. Ringkasan Inventori dan Keuangan mengambil hitungan dari data yang ditampilkan. Logo dan Plus Jakarta Sans dipertahankan.

Komponen dialog, tombol dan token yang sudah ada digunakan kembali. Katalog publik 21st untuk pola dialog diperiksa; CLI meminta login, sehingga tidak ada pengambilan komponen privat, generasi berbayar, atau pengunggahan sumber project.

## Verifikasi

- 80 pengujian aplikasi lulus, termasuk regresi penyimpanan penerimaan, validasi jumlah, notifikasi PO, pintasan, clipboard, analitik, add-on dan POS.
- TypeScript dan build produksi lulus. Peringatan ukuran beberapa bundle di atas 500 kB masih ada.
- Render server memeriksa tampilan penerimaan dan detail produk, mode baca saja, penanganan data rincian rusak, serta menu dalam bahasa Indonesia dan Inggris.
- Pemeriksaan HTTP build: health 200; endpoint yang diuji menolak pembuatan PO dan restock anonim dengan 401.

Interaksi dan tata letak langsung di browser belum diverifikasi dalam sesi ini. Tidak ada perubahan konfigurasi, rules, kredensial, deployment, atau data Firebase.
