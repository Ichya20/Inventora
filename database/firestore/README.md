# Inventora — Basis Data Firebase Cloud Firestore

Paket ini mengikuti implementasi Inventora: **satu koleksi Firestore aktif, `purchaseOrders`, dengan lima dokumen contoh**. Item, penerimaan (`grn`), dan pembayaran simulasi (`paymentInfo`) tertanam dalam dokumen PO. Data contoh bersifat fiktif.

Firebase Authentication menangani akun dan custom claim `role`. Inventori, pegawai, payroll, beberapa invoice, dan billing masih menggunakan penyimpanan browser. Anggaran departemen berasal dari array pada kode. `activities` tercantum pada blueprint, tetapi belum digunakan oleh pemanggilan SDK dan tidak diizinkan oleh rules. Paket ini tidak mengubah aplikasi atau menambahkan koleksi cloud.

## Berkas

- `contoh-data.mjs`: lima spesifikasi PO, pembentuk dokumen awal/akhir, dan patch penerimaan/pembayaran; tidak membuka koneksi.
- `contoh-dokumen.json`: seluruh lima dokumen akhir lengkap.
- `uji-firestore.mjs`: pengisian data serta 18 pemeriksaan pada emulator lokal terpisah.
- `hasil-uji.json`: bukti pengujian, agregat, dan hash sumber data/rules.
- `format_laporan_firebase.py`: pembuat DOCX berdasarkan referensi format pengguna.
- `ekspor_laporan.ps1`: ekspor DOCX baca-saja melalui Microsoft Word lokal.
- `../../output/pdf/Inventora_Tugas_Basis_Data_Firebase.pdf`: laporan pengumpulan versi Firebase.
- `../../output/docx/Inventora_Tugas_Basis_Data_Firebase.docx`: versi Word yang dapat diedit.

Laporan terdiri atas 23 halaman. Format: Times New Roman 12 untuk teks, Consolas 12 untuk kode, teks hitam, dan spasi 1,5. Logo dan identitas anggota mengikuti referensi. Laporan Firebase ini menggantikan versi MySQL untuk dokumentasi implementasi aktual. Semua halaman telah diperiksa secara visual; sembilan blok kode lengkap dan daftar isi diverifikasi pada hasil ekspor.

## Menjalankan pengisian dan pemeriksaan

Gunakan dependensi proyek yang sudah terpasang, Node.js, Java 21, dan JAR emulator yang tersedia di `.firebase-emulators`. Jalankan dari `D:/Inventora`. Contoh perintah PowerShell untuk instance emulator tugas yang baru:

```powershell
& 'C:/Java/jdk-21/bin/java.exe' `
  '-Djdk.net.unixdomain.tmpdir=D:/Inventora/.firebase-emulators' `
  -jar '.firebase-emulators/cloud-firestore-emulator-v1.22.0.jar' `
  --host 127.0.0.1 --port 8085 --websocket_port 9155 `
  --project_id demo-inventora-tubes `
  --single_project_mode true --single_project_mode_error true `
  --rules 'D:/Inventora/firestore.rules'
```

Pada terminal kedua:

```powershell
node database/firestore/uji-firestore.mjs
```

Skrip mengunci project ID `demo-inventora-tubes` serta koneksi emulator `127.0.0.1:8085`. Tidak menggunakan `firebase-applet-config.json` atau kredensial produksi. Identitas dan peran mock hanya berlaku pada emulator.

Lima PO dibuat sebagai `Pending Approval` dengan transaksi yang menolak document ID yang sudah ada. PO 2–4 disetujui, PO 5 ditolak, PO 3–4 diterima, dan PO 4 dicatat sebagai dibayar secara simulasi. Lima status akhir adalah `Pending Approval`, `Disetujui`, `Barang Diterima`, `Selesai`, dan `Ditolak`.

Mengulang skrip pada emulator yang sama akan dihentikan untuk mencegah penimpaan. Gunakan instance emulator tugas baru. Setelah selesai, hentikan hanya proses emulator tugas menggunakan Ctrl+C pada terminalnya. Paket tidak memuat perintah untuk menghapus data cloud.

## Hasil yang sudah diverifikasi

Pengujian 21 Oktober 2026 memuat `firestore.rules` asli. Semua **18 pemeriksaan lulus**, termasuk delapan skenario penolakan hak akses, nominal, alur, penghapusan, dan koleksi yang belum diizinkan. Pesan `permission-denied` pada skenario negatif adalah hasil yang diharapkan.

- Jumlah akhir: 5 dokumen pada `purchaseOrders`.
- Total seluruh PO: Rp1.625.040.000; mencakup satu PO ditolak, bukan total belanja terealisasi.
- Pembayaran simulasi yang tercatat: Rp93.240.000 pada PO keempat.
- Tanggal penerimaan/pembayaran pada fixture adalah tanggal skenario, bukan waktu transaksi nyata.

Pengujian ini memverifikasi data contoh dan skenario yang disebutkan. Rules belum memvalidasi seluruh bentuk array item, penjumlahan subtotal detail, format tanggal, dan isi penerimaan secara mendalam. Akun cloud memerlukan custom claim yang ditetapkan administrator, bukan identitas mock. Tidak ada deployment aturan atau perubahan data Firebase produksi.
