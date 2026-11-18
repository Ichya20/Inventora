# Pemeriksaan lanjutan Inventora — 18 November 2026

**Status setelah perbaikan:** delapan temuan di bawah sudah diperbaiki, perlindungan sesi request GRN juga ditambahkan. Masalah input nol POS dan akses storage notifikasi diperbaiki pada tahap yang sama. Suite terbaru **160/160 lulus**. Uraian di bawah dipertahankan sebagai bukti kondisi sebelum perbaikan; lihat [laporan perbaikan](D:/Inventora/docs/perbaikan-audit-2026-11-18.md) untuk keadaan terbaru dan batas pemeriksaan.

Pemeriksaan ulang menemukan 8 detail terverifikasi dan 1 kandidat yang masih memerlukan pengujian sesi Firebase/browser. Kode aplikasi tidak diubah pada pemeriksaan ini.

`npm test` dijalankan kembali: **138 lulus, 0 gagal**. Temuan tambahan berikut belum tercakup oleh suite tersebut. Pengujian tambahan mengeksekusi fungsi kode saat ini melalui VM, React SSR, penyimpanan dalam memori, serta respons/asinkron tiruan; tidak memakai data atau akun Firebase sungguhan.

## Temuan yang dapat terjadi lewat alur formulir biasa

1. **P2 — Nomor kartu lengkap disimpan oleh simulasi pembayaran vendor.** Input nomor kartu disalin langsung ke `accountReference`, riwayat transaksi browser, dan patch `paymentInfo.reference/accountOrCard` pada PO. Probe memakai nomor kartu sintetis; patch keluar diperiksa tetapi tidak dikirim ke Firestore. Nilai yang disimpan seharusnya berupa label/empat digit terakhir. Sumber: [PaymentGatewayModal.tsx](D:/Inventora/src/components/PaymentGatewayModal.tsx:131), [procurement.ts](D:/Inventora/src/lib/procurement.ts:55).

2. **P2 — Perubahan paket Billing dari tab kedua menghilangkan invoice tab pertama.** Buka Billing di A dan B. A mengganti paket dan menyimpan invoice baru. B yang masih memegang state lama mengganti paket, lalu menyimpan daftar invoice tanpa catatan A. Kedua handler menampilkan sukses. Ini riwayat simulasi lokal, bukan transaksi provider pembayaran. Sumber: [BillingSubscriptionView.tsx](D:/Inventora/src/components/BillingSubscriptionView.tsx:214).

3. **P3 — Form pembayaran vendor belum memvalidasi isian kartu.** Nomor kartu/CVV kosong, nama berisi spasi, dan expiry `99/99` tetap menghasilkan `SUCCESS` yang diterima handler Procurement. Form ini berbeda dari label pembayaran langganan yang sudah divalidasi pada perbaikan sebelumnya. Tidak ada dana yang ditransfer. Sumber: [PaymentGatewayModal.tsx](D:/Inventora/src/components/PaymentGatewayModal.tsx:105).

## Temuan yang membutuhkan data tersimpan sudah tidak valid

4. **P2 bersyarat — Billing menimpa cache JSON rusak dengan data contoh.** Subscription atau label pembayaran dengan JSON terpotong dibaca sebagai fallback, lalu efek mount menulis fallback ke key yang sama. Bytes lama hilang sebelum pemulihan. Belum ditemukan input normal pembentuk JSON terpotong. Sumber: [BillingSubscriptionView.tsx](D:/Inventora/src/components/BillingSubscriptionView.tsx:181).

5. **P2 bersyarat — Finance/Billing gagal dirender jika bentuk cache tidak sesuai.** Contoh: `{}` untuk daftar invoice atau subscription, dan `[null]` untuk invoice. Exception muncul saat iterasi/akses properti, sebelum antarmuka pemulihan tersedia. Sumber: [FinanceView.tsx](D:/Inventora/src/components/FinanceView.tsx:32), [BillingSubscriptionView.tsx](D:/Inventora/src/components/BillingSubscriptionView.tsx:160).

6. **P2 bersyarat — Dashboard gagal sebelum menu pemulihan PO dapat dibuka.** Cache PO demo `[null]` diterima sebagai array oleh hook ringkasan; perhitungan kemudian mengakses `po.status` dan melempar exception pada parent Dashboard. Recovery menu PO yang telah dibuat belum melindungi parent ini. Cache HR `[null]` juga keliru dihitung sebagai satu pegawai. Sumber: [useWorkspaceSummary.ts](D:/Inventora/src/lib/useWorkspaceSummary.ts:36), [workspaceSummary.ts](D:/Inventora/src/lib/workspaceSummary.ts:6).

7. **P2 bersyarat — Pembuatan PO demo menggabungkan record baru dengan baris cache rusak.** Jika cache sudah berisi `[{}]`, formulir PO membaca array tanpa memvalidasi tiap baris, menambah PO valid, dan melaporkan sukses. Menu Procurement lalu menolak seluruh daftar karena masih mengandung `{}`. Sumber: [PurchaseUnitView.tsx](D:/Inventora/src/components/PurchaseUnitView.tsx:262).

8. **P3 bersyarat — Antrean lama tanpa pemilik terlihat oleh akun staf lain.** `visibleQueue` memasukkan semua item tanpa `ownerId`, sehingga akun HR yang tidak memiliki akses PO masih dapat melihat nomor PO dan deskripsi lama di Network & Synchronization Status. Item tersebut tidak dikirim otomatis; ini masalah isolasi tampilan. Membutuhkan antrean dari versi lama; enqueue baru sudah memasang pemilik. Sumber: [useNetworkStatus.ts](D:/Inventora/src/lib/useNetworkStatus.ts:89), [App.tsx](D:/Inventora/src/App.tsx:704).

## Kandidat, belum dinyatakan sebagai bug produksi terverifikasi

Penyimpanan GRN yang dimulai oleh akun A dapat memanggil `authenticatedPost` setelah akun telah berganti menjadi B ketika `getIdTokenResult()` A masih menunggu. Pada mock, helper HTTP mengambil akun B sehingga atribusi request berubah. Lifecycle Firebase/browser lintas akun belum diuji. Server tetap memverifikasi token dan izin B; ini tidak membuktikan bypass izin. Sumber: [purchaseOrderStore.ts](D:/Inventora/src/lib/purchaseOrderStore.ts:13).

Dispatch stok yang telah dimulai sebelum sesi berakhir juga dapat selesai setelah menunggu Web Lock. Kebutuhan pembatalan dispatch, dukungan penjualan dengan diskon 100%, serta arti konfigurasi `stockMin: 0` memerlukan aturan produk yang tegas; ketiganya tidak dihitung sebagai bug terkonfirmasi di atas.

## Bukti dan batas pemeriksaan

- [second-finance.json](D:/Inventora/output/bug-audit/second-finance.json)
- [second-po.json](D:/Inventora/output/bug-audit/second-po.json)
- [second-pos.json](D:/Inventora/output/bug-audit/second-pos.json)
- [second-session.json](D:/Inventora/output/bug-audit/second-session.json)

Probe dapat dijalankan dari workspace dengan `npx tsx output/audit/second-finance.tsx`, `npx tsx output/audit/second-po.ts`, `npx tsx output/audit/second-pos.ts`, dan `npx tsx output/audit/second-session.ts`. Probe sengaja membuktikan kondisi yang masih bermasalah; bukan tes kelulusan pascaperbaikan.

Tidak ada pemeriksaan browser nyata, deployment aktif, atau layanan Firebase pada tahap ini. Pemisahan POS demo/live dan perlindungan checkout yang diperbaiki sebelumnya tetap sesuai pada review lanjutan. Hasil ini tidak membatalkan perbaikan 11 kasus sebelumnya, tetapi menunjukkan jalur serupa pada modul lain serta interaksi antar-tab yang belum tertutup.
