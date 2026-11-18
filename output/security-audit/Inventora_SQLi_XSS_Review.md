# Pemeriksaan SQL injection dan XSS Inventora

Tanggal: 18 November 2026.

## Kesimpulan

Tidak ditemukan jalur SQL injection pada runtime yang diperiksa. Percobaan XSS lokal pada komponen teks AI, rincian barang PO, serta HTML struk POS tidak menghasilkan elemen atau atribut yang dapat menjalankan skrip. Hasil ini belum membuktikan seluruh website atau deployment aman.

Dua masalah lain ditemukan: konfigurasi static production dapat menyajikan bundle backend dan source map, serta ekspor CSV mempertahankan awalan formula pada teks pengguna. Source aplikasi belum diubah dalam audit ini.

## SQL injection dan batas login

- Runtime memakai Firebase Authentication dan Firestore, tanpa driver atau query SQL. File di `database/tubes` adalah berkas tugas terpisah dan tidak diimpor aplikasi.
- Login menggunakan Google Auth melalui Firebase. API memeriksa Bearer token dan role hasil verifikasi; role yang dikirim dalam body tidak dijadikan sumber izin.
- Akses Firestore server memakai koleksi tetap `purchaseOrders` dan ID dokumen yang diperiksa. Objek operator tidak diterima pada field yang mewajibkan string.
- Teks `' OR 1=1 --` dapat tetap menjadi nama vendor literal. Menerima teks tersebut pada kolom teks tidak membuktikan SQL injection; aplikasi tidak menjalankannya sebagai query.
- Pengujian API memakai verifier pengganti di memori, sehingga tidak membuktikan konfigurasi akun atau validitas token pada Firebase production.

Kode terkait: `server/auth.ts:8`, `server/firebaseAdmin.ts:16`, `src/lib/purchaseOrderValidation.ts:14`, `src/firebase.ts:42`.

## Percobaan XSS lokal

Data percobaan mencakup tag script, gambar dengan event handler, SVG dengan event handler, penutup tag, HTML yang sudah ditulis sebagai entity, dan nama biasa dengan apostrof.

Pemeriksaan menjalankan komponen asli dengan React server rendering. Untuk POS, data melewati checkout, penyimpanan tiruan di memori, pembacaan ulang, dan generator HTML struk bahasa Indonesia serta Inggris. String HTML pada lima field angka juga ditolak sebelum struk dibaca.

- 33 pemeriksaan lokal lulus.
- 24 hasil HTML diperiksa kembali dengan HTMLParser; tidak ditemukan elemen atau atribut eksekusi hasil sisipan.
- 15 tes API dan POS yang sudah ada juga lulus.
- Hasil tersebut bukan uji eksekusi JavaScript di browser. Fokus, pop-up, DOM sesudah interaksi, dan konfigurasi deployment belum diperiksa.

React menampilkan teks sebagai text node. Struk yang memakai `iframe.srcdoc` melakukan escaping pada ID transaksi, nama kasir, nama barang, dan SKU. Angka struk diperiksa ketika transaksi dibuat atau dimuat ulang. Pilihan bahasa aplikasi dibatasi ke `en` atau `id`.

Kode terkait: `src/components/CleanAiText.tsx`, `src/components/PurchaseOrderItems.tsx`, `src/lib/saleReceipt.ts:6`, `src/lib/saleReceipt.ts:43`, `src/lib/commerce.ts:35`, `src/App.tsx:350`.

## Temuan yang perlu diperbaiki

### 1. Bundle backend berada di direktori publik production

Build menulis `dist/server.cjs` dan `dist/server.cjs.map`, sedangkan startup production menyajikan seluruh `dist` melalui `express.static`.

Probe menjalankan fungsi startup asli yang diekstrak dari source, dengan aplikasi Express kosong dan listener dialihkan ke port sementara di `127.0.0.1`. Middleware static production tetap sama. Hasilnya:

| Request | HTTP | Ukuran respons |
| --- | --- | ---: |
| `/server.cjs` | 200 | 34973 byte |
| `/server.cjs.map` | 200 | 62505 byte |

Ukuran respons sama dengan berkas backend pada disk. Ini membuktikan paparan artefak pada konfigurasi production lokal yang diperiksa, belum pada situs yang dideploy. Tidak ada bukti private key ikut terbuka. Perbaikannya: tempatkan output server di luar direktori static frontend, atau blokir akses ke artefak backend.

Kode terkait: `package.json:8`, `server.ts:404`.

### 2. Awalan formula pada ekspor CSV belum dinetralkan

Catatan PO `=1+1` lolos sebagai teks dan diekspor menjadi sel `"=1+1"`. Pengujian menjalankan handler ekspor pengadaan asli melalui AST serta fungsi ekspor CSV bersama. Tanda kutip CSV tidak mengubah sel tersebut menjadi teks aman bagi aplikasi spreadsheet yang menafsirkan awalan formula.

Yang terbukti adalah awalan formula tetap ada di hasil ekspor; Excel atau aplikasi spreadsheet lain belum dijalankan. Temuan ini bukan SQL injection atau XSS di browser. Perbaikannya: netralkan awalan formula pada field teks saat ekspor, dengan tetap mempertahankan nilai angka yang memang sah.

Kode terkait: `src/components/ProcurementView.tsx:383`, `src/lib/exportUtils.ts:21`.

### 3. CSP belum diatur pada source server

Header server mencakup `nosniff`, Referrer Policy, dan `X-XSS-Protection`, tetapi belum memuat Content Security Policy. Header `X-XSS-Protection` sudah usang dan tidak dapat dijadikan bukti perlindungan XSS pada browser modern. CSP dapat menjadi lapisan tambahan setelah kebutuhan script, style, Firebase, dan animasi dipetakan. Ketiadaan CSP sendiri bukan bukti bahwa XSS berhasil.

Header yang mungkin ditambahkan oleh platform deployment belum diperiksa.

## Cakupan dan cara mengulang

Audit tidak membuka browser, mengubah data Firebase, mengakses akun pengguna, atau mengirim request ke situs production. Probe HTTP hanya memakai listener sementara pada loopback, lalu menutupnya. Penyimpanan POS yang dipakai probe berada di memori proses dan terpisah dari browser pengguna.

Jalankan dari `D:\Inventora`:

```powershell
node --import tsx output/audit/probe-xss.tsx
node --import tsx output/audit/probe-production-static.ts
node --import tsx output/audit/probe-csv-injection.ts
node --import tsx --test tests/api.test.ts tests/pos.test.ts
```

Hasil terperinci tersimpan di `xss-probe.json`, `xss-parser-probe.json`, `production-static-probe.json`, dan `csv-probe.json` dalam direktori laporan ini. Pemeriksaan rules lokal tidak memastikan rules yang sama sudah terpasang pada Firebase production. Dependency CVE, otorisasi lintas akun pada deployment, dan pengujian browser menyeluruh berada di luar pemeriksaan ini.
