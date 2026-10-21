USE inventora_tubes;

-- 1. Harus 14 tabel, masing-masing JumlahData = 5 (total 70 baris).
SELECT 'departemen' AS NamaTabel, COUNT(*) AS JumlahData FROM departemen
UNION ALL SELECT 'pegawai', COUNT(*) FROM pegawai
UNION ALL SELECT 'pengguna', COUNT(*) FROM pengguna
UNION ALL SELECT 'supplier', COUNT(*) FROM supplier
UNION ALL SELECT 'kategori_produk', COUNT(*) FROM kategori_produk
UNION ALL SELECT 'produk', COUNT(*) FROM produk
UNION ALL SELECT 'purchase_order', COUNT(*) FROM purchase_order
UNION ALL SELECT 'detail_purchase_order', COUNT(*) FROM detail_purchase_order
UNION ALL SELECT 'persetujuan_po', COUNT(*) FROM persetujuan_po
UNION ALL SELECT 'penerimaan_barang', COUNT(*) FROM penerimaan_barang
UNION ALL SELECT 'detail_penerimaan', COUNT(*) FROM detail_penerimaan
UNION ALL SELECT 'pembayaran_po', COUNT(*) FROM pembayaran_po
UNION ALL SELECT 'payroll', COUNT(*) FROM payroll
UNION ALL SELECT 'anggaran_departemen', COUNT(*) FROM anggaran_departemen;

-- 2. Relasi header-detail dan supplier, total otomatis, nominal pembayaran.
SELECT po.KodePO, s.NamaSupplier, COUNT(d.KodeProduk) AS JumlahJenis,
       SUM(d.Quantity) AS JumlahUnit, po.Total, b.Nominal AS Dibayar
FROM purchase_order po
JOIN supplier s ON s.KodeSupplier = po.KodeSupplier
JOIN detail_purchase_order d ON d.KodePO = po.KodePO
JOIN pembayaran_po b ON b.KodePO = po.KodePO
GROUP BY po.KodePO, s.NamaSupplier, po.Total, b.Nominal
ORDER BY po.KodePO;

-- 3. Harus kosong: subtotal header berbeda dari jumlah detail.
SELECT po.KodePO
FROM purchase_order po
LEFT JOIN detail_purchase_order d ON d.KodePO = po.KodePO
GROUP BY po.KodePO, po.Subtotal
HAVING po.Subtotal <> COALESCE(SUM(d.Subtotal), 0);

-- 4. Harus kosong: pembayaran berbeda dari total atau penerimaan belum sesuai.
SELECT b.KodeBayar
FROM pembayaran_po b
JOIN purchase_order po ON po.KodePO = b.KodePO
JOIN penerimaan_barang r ON r.KodePO = b.KodePO
WHERE b.StatusBayar = 'SIMULASI_BERHASIL'
  AND (b.Nominal <> po.Total OR r.StatusTerima <> 'SESUAI');

-- 5. Harus kosong: catatan penerimaan berstatus SESUAI tetapi isi tidak sesuai.
SELECT d.KodePO, d.KodeProduk
FROM detail_purchase_order d
JOIN penerimaan_barang h ON h.KodePO = d.KodePO
LEFT JOIN detail_penerimaan r
  ON r.KodePO = d.KodePO AND r.KodeProduk = d.KodeProduk
WHERE h.StatusTerima = 'SESUAI'
  AND (r.KodeProduk IS NULL OR r.QtyDiterima <> d.Quantity OR r.Kondisi <> 'BAIK');

-- 6. Payroll per pegawai, periode dan nilai bersih yang dihasilkan otomatis.
SELECT p.KodePayroll, e.NamaPegawai, DATE_FORMAT(p.Periode, '%Y-%m') AS Periode,
       p.GajiBersih
FROM payroll p
JOIN pegawai e ON e.KodePegawai = p.KodePegawai
ORDER BY p.KodePayroll;

-- 7. Produk di bawah batas minimum: PRD003 / NVMe 8TB.
SELECT KodeProduk, NamaProduk, Stok, StokMin
FROM produk WHERE Stok < StokMin;

-- 8. Anggaran dibandingkan komitmen pengadaan pada kuartal yang sama.
SELECT a.KodeAnggaran, d.NamaDepartemen, a.Tahun, a.Kuartal,
       a.NominalAnggaran, COALESCE(SUM(po.Total), 0) AS NilaiPO,
       a.NominalAnggaran - COALESCE(SUM(po.Total), 0) AS SisaAnggaran
FROM anggaran_departemen a
JOIN departemen d ON d.KodeDepartemen = a.KodeDepartemen
LEFT JOIN purchase_order po
  ON po.KodeDepartemen = a.KodeDepartemen
  AND YEAR(po.TanggalPO) = a.Tahun AND QUARTER(po.TanggalPO) = a.Kuartal
  AND po.StatusPO <> 'DITOLAK'
GROUP BY a.KodeAnggaran, d.NamaDepartemen, a.Tahun, a.Kuartal, a.NominalAnggaran
ORDER BY a.KodeAnggaran;
