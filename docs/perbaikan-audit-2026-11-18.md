# Perbaikan audit Inventora — 18 November 2026

Seluruh 11 temuan audit awal dan 8 temuan pemeriksaan lanjutan sudah ditangani. Masalah input angka POS dan akses penyimpanan notifikasi juga diperbaiki. Perubahan disimpan langsung di `D:\Inventora`. Pengaturan Firebase, custom claims akun utama, dan deployment aktif tidak diubah.

## Perubahan

| Temuan | Perilaku setelah perbaikan |
| --- | --- |
| POS demo bercampur dengan data operasional | Demo mempunyai key stok, struk, dan lock transaksi tersendiri. Inventory dan dashboard membaca lingkup yang sama dengan POS. Data operasional lama tetap berada pada key semula dan tidak disalin ke demo. |
| GRN dengan SKU berulang | Nama barang dipulihkan mengikuti urutan baris yang divalidasi, sehingga GRN lama bisa dibuka dan dikoreksi. SKU baru hasil impor juga mendapat suffix unik per baris. |
| Respons ekstraksi invoice lama | Mengganti teks, menutup modal, atau melepas komponen membatalkan dan menandai request lama sebagai tidak berlaku. Respons/error lama tidak dapat mengganti hasil request baru. |
| Bonus payroll pecahan | Pencatatan baru mewajibkan nominal rupiah bulat, tidak negatif, dan dalam batas angka aman. Bonus kosong atau tidak valid ditolak sebelum penyimpanan. Arsip lama tetap utuh; PDF mempertahankan pecahan arsip tersebut. |
| Backend disajikan sebagai berkas publik | Hasil backend dipindahkan ke `build/server.cjs`, sedangkan frontend tetap di `dist`. Server hanya menyajikan aset frontend yang diperlukan dan rute aplikasi. Berkas backend lama yang tertinggal dalam direktori publik juga ditolak. |
| Rumus pada ekspor CSV | Sel teks yang diawali penanda rumus dinetralkan. Ekspor PO memakai helper yang sama dengan modul lain. Karakter `#`, kutip, koma, Unicode, dan baris baru dipertahankan melalui unduhan Blob. |
| Quantity ekstraksi berbeda dari PO | Keduanya mewajibkan quantity berupa bilangan bulat positif dalam batas aman. Hasil ekstraksi yang tidak memenuhi aturan ditolak sebelum diterapkan. |
| Label pembayaran tidak valid | Handler memeriksa empat digit terakhir, nama setelah trim, email, format `MM/YY`, bulan valid, serta expiry. Bulan berjalan masih diterima. Tidak ada integrasi pembayaran nyata yang ditambahkan. |
| Cache PO rusak | Pembacaan memeriksa struktur sebelum memakai data. Menu menampilkan pesan pemulihan, unduh cadangan, dan baca ulang; bytes rusak tidak ditimpa fallback. Data Firestore yang terkonfirmasi tetap tampil meskipun cache opsional bermasalah. |
| Riwayat payroll rusak tertimpa | Data pegawai/riwayat divalidasi, pencatatan diblokir bila tidak terbaca, dan data asli dipertahankan. Data contoh tidak ditulis menggantikan riwayat rusak. |
| Halaman awal/login gagal saat storage ditolak | Preferensi bahasa menggunakan nilai bawaan ketika storage tidak tersedia. Demo login memberi pesan error terkontrol jika sesi tidak bisa disimpan. Login Google tetap dapat melanjutkan jika storage sama sekali tidak dapat dibaca; marker demo yang masih terbaca tetapi tidak bisa dihapus tidak diabaikan. |

## Perbaikan terkait

- Request integrasi Google diikat ke akun dan sesi. Penyelesaian request lama tidak dapat menghapus token/request akun baru. Login dasar tetap terpisah dari izin Sheets/Calendar.
- Checkout yang menunggu Web Lock dibatalkan ketika sesi POS berakhir. Transaksi yang sudah disimpan tetap tersimpan.
- Harga tidak valid dalam cache inventori menghasilkan keadaan pemulihan, tanpa menimpa data asli. Produk lama tanpa harga tetap didukung.
- Mutasi PO demo membaca ulang catatan terbaru sebelum commit agar perubahan tab lain tidak terhapus oleh state lama.
- Jika pembayaran PO sudah dikonfirmasi server tetapi riwayat browser gagal disimpan, UI memberikan peringatan khusus tanpa meminta transaksi server diulang.
- Service worker memakai cache versi baru, mengambil HTML terbaru dari jaringan, dan tidak menyimpan backend/source map/API. Cache aplikasi lain pada origin yang sama tidak dihapus. Fallback offline menghasilkan respons yang valid.
- Label `AES Local Persistence` diganti menjadi `Browser storage` karena data tersebut tidak dienkripsi AES oleh aplikasi.
- `npm start` menjalankan backend produksi dari lokasi build baru, dan script `clean` memakai Node agar dapat berjalan di Windows.

## Hasil verifikasi

- `npm test`: **160 lulus, 0 gagal**, termasuk 67 kasus tambahan dari baseline 93 tes.
- `npm run lint`: lulus.
- `npm run build`: lulus. Vite masih memberi peringatan beberapa chunk melebihi 500 kB; ini bukan kegagalan build.
- Uji hasil build pada server loopback sementara: 11 URL diperiksa; frontend, service worker, dan WASM splash mengembalikan 200; `/server.cjs`, `/server.cjs.map`, dan `/build/server.cjs` mengembalikan 404.
- Tes middleware juga menempatkan berkas backend contoh dalam direktori frontend untuk memastikan berkas lama tetap tidak dapat diunduh.
- Suite menguji penolakan role `User`, akses endpoint berdasarkan token/role, penyimpanan gagal, data rusak, request tertunda, dan input tidak valid.

Bukti pemeriksaan produksi: [production-after-fixes.json](../output/bug-audit/production-after-fixes.json).

Pengujian ini memakai fungsi aplikasi, React server rendering, React DOM melalui jsdom, mock penyimpanan/API, Web Locks Node, dan HTTP lokal. Interaksi browser nyata, login Google dengan akun sungguhan, layanan Firebase aktif, serta deployment belum diverifikasi dalam pengerjaan ini. Kelulusan tes tidak menyatakan aplikasi bebas dari semua bug yang belum ditemukan.

## Perbaikan pemeriksaan lanjutan

| Temuan | Perilaku setelah perbaikan |
| --- | --- |
| Angka nol sulit diganti saat mengetik | POS, PO, GRN, dan bonus HR memakai input angka dengan teks edit tersendiri. Nol dikosongkan saat fokus; penghapusan tidak menyisipkan nol selama pengguna mengetik. Angka desimal tidak langsung ditulis ulang oleh konversi perhitungan. Saat keluar dari kolom, nilai tampilan mengikuti nilai formulir. |
| Nomor kartu lengkap tersimpan pada pembayaran vendor | Simulasi hanya meminta empat digit terakhir, nama, dan masa berlaku; CVV tidak diminta. Referensi riwayat dan patch PO berbentuk tersamarkan. |
| Isian kartu vendor belum diperiksa | Empat digit, nama setelah trim, bulan/tahun, dan masa berlaku diperiksa sebelum proses dimulai. Rekening transfer wajib dipilih. |
| Tab Billing lama menghapus invoice tab lain | Perubahan subscription memakai Web Lock bersama, membaca penyimpanan terbaru sebelum commit, serta mempertahankan riwayat invoice terbaru. Pause/resume juga memakai record terbaru. |
| Billing mengganti JSON rusak dengan data contoh | Tidak ada penulisan fallback saat mount. Data yang gagal dibaca tetap tersimpan, dengan pilihan unduh cadangan dan baca ulang. |
| Finance/Billing gagal pada struktur cache salah | Semua record terkait diperiksa sebelum dirender atau dimutasi. Kesalahan menampilkan pemulihan tanpa mengganti bytes lama. |
| Dashboard gagal pada cache PO/HR tidak valid | Ringkasan memvalidasi baris sebelum menghitung; data tidak valid ditampilkan sebagai tidak tersedia. Cache `[null]` tidak dianggap satu pegawai. |
| PO demo menambahkan record ke cache berisi baris rusak | Pembacaan memakai validator yang sama dengan Procurement. Pembuatan ditolak sebelum write dan tidak melaporkan sukses. |
| Antrean lama terlihat oleh akun lain | Item tanpa pemilik dipertahankan dalam penyimpanan, tetapi tidak ditampilkan atau dikirim sebagai antrean akun lain. Hanya sesi dengan izin aksi PO yang menerima antrean aktif. |
| Request GRN berpotensi memakai akun baru setelah await | Helper API menerima identitas akun yang diharapkan; handler memeriksa ulang sesi sesudah claims tersedia. Pergantian akun membatalkan request lama. |
| Dashboard gagal saat objek localStorage ditolak browser | Pembacaan notifikasi menangani kegagalan akses objek penyimpanan. Notifikasi tetap bekerja dalam memori pada sesi aktif dan tidak dibawa ke akun berikutnya. |

Tes DOM menjalankan formulir POS dan fungsi checkout asli: diskon 25% dari Rp1.000, tunai Rp1.000 menghasilkan total Rp750, kembalian Rp250, stok 5 menjadi 4, dan satu pergerakan stok. Diskon 101/-1, quantity 1,5, serta harga kosong tidak menghasilkan transaksi. Tes juga memeriksa penghapusan angka, penggantian nol, pecahan, serta batas native input.

## Dependensi

Vite diperbarui dari 6.4.4 ke 6.4.6 dan body-parser dari 1.20.8 ke 1.20.9 melalui pembaruan yang masih mengikuti rentang versi project. Patch dependensi XML terkait juga diperbarui. Pemeriksaan setelah pembaruan masih mencatat **16 peringatan npm audit: 8 high dan 8 moderate**, termasuk temuan turunan Firebase/gRPC, uuid, dan picomatch. Ini daftar advisory dependensi, bukan bukti bahwa seluruh jalurnya dapat dieksploitasi pada Inventora.

Untuk sebagian temuan, saran otomatis npm berupa penurunan Firebase ke 9.14.0 atau perubahan mayor Firebase Admin. Perubahan tersebut tidak dipaksakan tanpa migrasi dan pengujian integrasi Firebase. Versi picomatch terbaru yang tersedia saat pemeriksaan masih termasuk rentang advisory. Karena itu status keamanan dependensi belum bersih dan aplikasi tidak dinyatakan bebas bug atau kerentanan. Hasil lengkap: [dependencies-after-fixes.json](../output/bug-audit/dependencies-after-fixes.json).

## Menjalankan versi terbaru

Untuk pengembangan, hentikan proses dev lama pada terminalnya, lalu jalankan:

```powershell
npm run dev
```

Untuk menjalankan build produksi:

```powershell
npm run build
npm start
```

Frontend berada di `dist`; backend berada di `build/server.cjs`. Jangan memakai perintah lama `node dist/server.cjs`. Refresh halaman setelah server diperbarui agar kode aplikasi dan service worker terbaru dimuat.

Skrip `output/audit/recheck-*.ts`, `probe-*.ts`, dan `second-*.ts(x)` lama merupakan bukti kondisi sebelum perbaikan; beberapa assertion memang mengharapkan bug lama terjadi. Untuk memverifikasi keadaan setelah perbaikan gunakan `npm test` dan, setelah build, `npx tsx output/audit/verify-production-fixes.ts`.
