# Penanganan error Gemini

Tanggal: 22 Oktober 2026.

## Hasil pemeriksaan

- API key yang dipakai saat pemeriksaan diterima oleh endpoint daftar model.
- Permintaan generasi langsung ke `gemini-3.8-flash` dan `gemini-3.7-flash` mendapat HTTP 503 dengan keterangan model sedang mengalami permintaan tinggi.
- SDK juga menerima HTTP 504 `DEADLINE_EXCEEDED`. Sebelumnya error ini diklasifikasikan sebagai kegagalan umum sehingga model cadangan tidak dicoba.
- Uji singkat `gemini-3.1-flash-lite` juga berakhir dengan timeout. Model tersebut tidak dijadikan konfigurasi bawaan.

## Perbaikan kode

- Seluruh endpoint AI memakai penanganan permintaan yang sama di `server/ai.ts`.
- Model utama tetap `gemini-3.8-flash`, dengan satu cadangan `gemini-3.7-flash`. Keduanya dapat diatur lewat `GEMINI_MODEL` dan `GEMINI_FALLBACK_MODEL`; nilai `none` menonaktifkan cadangan.
- Cadangan dicoba untuk layanan sibuk, timeout, atau gangguan koneksi. Error kuota dan kredensial langsung dikembalikan kepada pengguna.
- Setiap percobaan dibatasi 15 detik dan pengulangan internal SDK dinonaktifkan. Batas tunggu HTTP frontend menjadi 35 detik untuk endpoint AI, sehingga mencakup dua percobaan server.
- Error sibuk, kuota, API key, model, koneksi, serta timeout dikembalikan dengan kode terpisah. Kartu restok, analisis PO, dan Copilot menampilkan pesan sesuai penyebabnya.
- Permintaan kartu restok yang sudah digantikan atau ditutup dibatalkan pada klien; hasil lama tidak menimpa hasil terbaru.
- Respons gagal tidak diganti dengan angka stok, harga, atau analisis buatan. Log aplikasi hanya mencatat kode kegagalan dan nama model.

## Verifikasi

- 15 tes AI/API lulus, termasuk pergantian model, dua model sibuk, timeout, pembatalan, error deadline SDK, kuota, kredensial, serta penolakan akses anonim.
- Pemeriksaan TypeScript lulus.
- Build frontend Vite dan bundle server esbuild berhasil. Peringatan ukuran chunk di atas 500 kB masih muncul.
- Pemeriksaan HTTP pada bundle server: kesehatan HTTP 200; permintaan restok tanpa login HTTP 401.
- `git diff --check` lulus. Tampilan browser belum diuji ulang.

## Menjalankan perubahan

Hentikan server lama dengan `Ctrl+C`, lalu jalankan dari `D:\Inventora`:

```powershell
npm run dev
```

Muat ulang halaman browser dan coba tombol penyegaran estimasi restok. Jika kedua model tetap sibuk atau timeout, analisis AI belum dapat digunakan sampai layanan merespons kembali. Perbaikan ini menangani kegagalan aplikasi dan tidak menjamin ketersediaan layanan Google.

Uji generasi langsung belum berhasil pada saat pemeriksaan. File `.env` pengguna serta konfigurasi/deployment Firebase tidak diubah.
