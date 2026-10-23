# Perombakan UI/UX Inventora

23 Oktober 2026

Tampilan ruang kerja diperbarui dengan sidebar abu-abu kebiruan, permukaan kerja putih, aksen biru, dan mode gelap. Logo empat kotak Inventora tetap memakai bentuk, posisi kotak, dan opacity yang sama. Font Plus Jakarta Sans dipertahankan.

## Perubahan

- Dashboard menampilkan nilai PO tercatat, PO aktif, stok yang perlu ditinjau, dan jumlah anggota tim sesuai izin akun. Angka nol dibedakan dari data yang belum tersedia.
- Panel pengadaan menampilkan distribusi tahap PO. Tahap dapat dipilih untuk menyaring daftar pesanan terbaru. Status penerimaan berselisih ikut dihitung pada pemeriksaan; status lain tetap dicatat sebagai kategori lain.
- Daftar tindak lanjut mengarah ke modul terkait. Pantauan stok menampilkan item berdasarkan stok tersimpan dan batas minimumnya. Aktivitas memakai notifikasi yang benar-benar tercatat.
- Sumber data ditulis di dashboard: PO live dari Firestore, PO demo dari sesi demo, sedangkan stok dan SDM mengikuti data modul di browser.
- Navigasi memakai tombol dengan penanda halaman aktif. Indikator aktif bergerak saat berpindah modul. Halaman, dialog, dan drawer menggunakan transisi singkat. Preferensi pengurangan gerakan dihormati.
- Navigasi mobile menyembunyikan kontrol di luar layar, mengelola fokus, dan menonaktifkan halaman di belakang panel saat terbuka. Panel notifikasi dibatasi terhadap tepi viewport.
- Tombol, kartu, tabel, pagination, dan dialog memakai komponen bersama. Tombol pengurutan dapat digunakan dengan keyboard dan menyampaikan arah urutan. Dialog bersama, pencarian modul, dan asisten memakai dialog native untuk fokus dan Escape.
- Notifikasi dan kontrol tabel mengikuti bahasa aktif. Pencarian modul hanya menawarkan modul yang diizinkan bagi peran akun.
- Loading menampilkan “Menyiapkan ruang kerja” tanpa persentase atau klaim sinkronisasi dari timer. Teks teknis seperti klaim 60 FPS dan promosi fitur pada asisten disederhanakan.
- Identitas di pengaturan menampilkan akun yang masuk sebagai informasi baca saja. Tombol simpan profil dan preferensi email yang belum terhubung dihapus. Foto baru diakui tersimpan setelah browser berhasil menyimpannya.
- Form PO menerima harga dalam kelipatan satu rupiah, termasuk Rp125.000. Label metadata dan input baris barang diberi hubungan serta nama kontrol yang jelas.

## Acuan

Skill 21st UI Build, UI/UX Pro Max, dan Design Taste dipakai sebagai panduan. Komposisi mengikuti pilihan `framed-sheet`, dengan warna dan font Inventora. [Katalog publik 21st](https://21st.dev/community/components?search=animated%20tabs) menjadi referensi sidebar dan interaksi; implementasi memakai React, Tailwind, Lucide, dan Motion yang sudah tersedia. Tidak ada komponen yang diklaim diunduh atau dihasilkan oleh layanan 21st.

Keputusan desain tersimpan di `.21st/design.json` dan `.taste-skill/direction.json`.

## Verifikasi

- TypeScript: lulus.
- Pengujian aplikasi: 58 lulus, 0 gagal. Empat pengujian baru mencakup agregasi tahap, filter pesanan, data kosong dibanding belum tersedia, dan pembatasan informasi dashboard bagi SDM.
- Build Vite dan server esbuild: berhasil. Vite masih memberi peringatan ukuran sejumlah bundle di atas 500 kB.
- HTTP lokal pada hasil build: health 200, permintaan anonim untuk pembuatan PO dan perkiraan restok ditolak 401, aset yang dirujuk tersedia.
- Struktur logo sidebar diperiksa terhadap empat rect aslinya.

Pemeriksaan visual dan interaksi langsung di browser belum dapat dilakukan karena akses browser ditolak dalam sesi ini. Perilaku dialog native, navigasi mobile, zoom, dan layout akhir masih memerlukan pemeriksaan browser pada 320, 375, 768, dan 1280 px, termasuk mode gelap dan pengurangan gerakan. Pemeriksaan dari kode dan render server tidak menggantikan pemeriksaan tersebut.

Review hosted 21st yang dapat mengekspor sumber proyek ditolak oleh sistem persetujuan. Tidak dicoba ulang melalui jalur lain; pemeriksaan kode dilakukan lokal. Firebase, kredensial, rules, deployment, dan data cloud tidak diubah dalam perombakan UI ini. Perubahan lain yang sudah ada di working tree dipertahankan.

## Penyempurnaan dashboard

Empat penyempurnaan berikut diterapkan setelah perombakan awal:

- Tab tahap PO memakai indikator aktif bergerak. Tab dapat dipilih dengan tombol panah, Home, dan End. Grafik batang distribusi menggunakan jumlah PO yang tersedia dan filter yang sama dengan tab. Label menjelaskan bahwa distribusi dihitung dari seluruh PO, bukan hanya daftar yang sedang difilter.
- Baris pesanan membuka panel detail di sisi layar. Rincian memuat vendor, barang, jumlah, harga, diskon, pajak, catatan, penerimaan, dan pembayaran yang tersimpan. Data yang tidak tersedia ditandai kosong; rincian keuangan tidak direka. Panel mengikuti pembaruan data PO dan menutup jika pesanan sudah tidak tersedia.
- Tooltip menjelaskan sumber angka dan cara membaca distribusi. Kontrol mendukung pointer, fokus keyboard, tap, Escape, dan penutupan dari luar. Efek hover dibatasi pada kontrol yang dapat digunakan. Transisi tab, grafik, dan panel mengikuti preferensi pengurangan gerakan.
- Tipografi tetap memakai Plus Jakarta Sans dengan bobot 400, 500, 600, dan 700. Judul, label, dan isi dibedakan lewat ukuran serta jarak yang konsisten; label navigasi tidak diberi kapitalisasi otomatis atau jarak huruf berlebihan. Angka memakai tabular figures. Logo tidak diubah.

Acuan interaksi berasal dari katalog publik 21st untuk [animated tabs](https://21st.dev/community/components?search=animated%20tabs), [sheet](https://21st.dev/community/components?search=sheet), dan [tooltip](https://21st.dev/community/components?search=tooltip). Komponen diimplementasikan lokal memakai dependensi yang sudah ada; tidak ada komponen katalog yang diunduh atau dipasang.

Verifikasi setelah penyempurnaan: 62 pengujian aplikasi lulus, 0 gagal; TypeScript, build Vite, dan bundle server berhasil. Pengujian tambahan mencakup filter status lain, jumlah dan persentase grafik, pembatasan data berdasarkan peran, serta rincian PO termasuk format lama. Pemeriksaan HTTP hasil build kembali menghasilkan health 200, penolakan anonim 401 pada dua endpoint, dan dua aset rujukan tersedia. Peringatan bundle Vite di atas 500 kB masih ada.

Pemeriksaan visual dan interaksi langsung di browser tetap belum terverifikasi karena akses browser sesi ini ditolak. Pengujian lokal tersebut tidak membuktikan perilaku fokus, transisi, dan layout pada seluruh ukuran layar. Tidak ada server pengembangan permanen yang dijalankan untuk penyempurnaan ini.
