# Evaluasi Class Diagram Inventora

Paket tugas 21 Oktober 2026: 11 kelas rancangan, 15 interface data, 20 relasi, laporan PDF dan DOCX.

`kerangka.ts` adalah kerangka perancangan. Method sengaja melempar `Belum diimplementasikan`; berkas ini belum dihubungkan ke React. Login aplikasi tetap memakai `src/firebase.ts`, komponen Login, dan App.

## Pemeriksaan

Jalankan dari folder proyek:

```powershell
npx tsc --noEmit
node --import tsx --test tests/regressions.test.ts
npx tsc -p docs/tubes-class-diagram/tsconfig.json
```

Hasil sesi penyusunan: pemeriksaan tipe aplikasi lulus, 15 regresi lulus, kerangka lulus strict. `database/firestore/hasil-uji.json` berisi bukti terdahulu 18 skenario emulator dan tidak dijalankan ulang untuk laporan ini.

Login Google dengan akun asli belum diverifikasi pada sesi ini. Kebijakan alat menolak akses browser lokal. Provider Google, authorized domains, custom claim, dan rules cloud perlu diperiksa saat demonstrasi. Mode demo bukan bukti login Google.

## Berkas model

- `Inventora_Class_Diagram.puml`: sumber UML lengkap, seluruh anggota dan 20 relasi.
- `model.json`: metadata deklarasi serta hash sumber.
- `data-models.ts`: salinan tipe SDM dan langganan dari komponen sumber.
- `susun-model.mjs`: membentuk ulang berkas model dari AST TypeScript.
- `gambar-diagram.py`: empat tampilan ringkas untuk laporan, dengan anggota lengkap pada lampiran.
- `format_laporan.py`: pembentuk DOCX berdasarkan dokumen acuan.
- `ekspor_laporan.ps1`: ekspor baca-saja melalui Microsoft Word.

Laporan akhir berada di `output/pdf/Inventora_Evaluasi_Class_Diagram_dan_Login.pdf` dan `output/docx/Inventora_Evaluasi_Class_Diagram_dan_Login.docx`.
