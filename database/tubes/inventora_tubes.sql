-- INVENTORA - Tugas Kelompok Basis Data
-- Target: MySQL 8.0.16 atau lebih baru (CHECK harus ditegakkan).
-- 14 tabel, tepat 5 baris contoh per tabel. Seluruh data bersifat fiktif.
-- Jalankan SEKALI pada schema baru. Tidak menghapus database yang sudah ada.
-- Ini rancangan relasional untuk tugas; aplikasi saat ini belum dimigrasikan.

CREATE DATABASE IF NOT EXISTS inventora_tubes
  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE inventora_tubes;
SET SESSION sql_mode =
  'STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- TABEL 01: departemen
CREATE TABLE departemen (
  KodeDepartemen CHAR(5) PRIMARY KEY,
  NamaDepartemen VARCHAR(80) NOT NULL UNIQUE,
  Lokasi VARCHAR(80) NOT NULL
) ENGINE=InnoDB;

-- TABEL 02: pegawai
CREATE TABLE pegawai (
  KodePegawai CHAR(6) PRIMARY KEY,
  KodeDepartemen CHAR(5) NOT NULL,
  NamaPegawai VARCHAR(100) NOT NULL,
  Email VARCHAR(120) NOT NULL UNIQUE,
  Jabatan VARCHAR(80) NOT NULL,
  TanggalMasuk DATE NOT NULL,
  StatusPegawai ENUM('AKTIF', 'CUTI', 'NONAKTIF') NOT NULL DEFAULT 'AKTIF',
  GajiPokok DECIMAL(15,2) NOT NULL,
  NamaBank VARCHAR(50) NOT NULL,
  NoRekening VARCHAR(34) NOT NULL,
  CONSTRAINT ck_pegawai_gaji CHECK (GajiPokok >= 0),
  CONSTRAINT fk_pegawai_departemen FOREIGN KEY (KodeDepartemen)
    REFERENCES departemen(KodeDepartemen) ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB;

-- TABEL 03: pengguna
CREATE TABLE pengguna (
  KodePengguna CHAR(6) PRIMARY KEY,
  KodePegawai CHAR(6) NOT NULL UNIQUE,
  Username VARCHAR(50) NOT NULL UNIQUE,
  AuthUID VARCHAR(128) NOT NULL UNIQUE,
  Peran ENUM('SUPER_ADMIN', 'WAREHOUSE_MANAGER',
             'FINANCE_MANAGER', 'HR_MANAGER') NOT NULL,
  Aktif BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT ck_pengguna_aktif CHECK (Aktif IN (0, 1)),
  CONSTRAINT fk_pengguna_pegawai FOREIGN KEY (KodePegawai)
    REFERENCES pegawai(KodePegawai) ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB;

-- TABEL 04: supplier
CREATE TABLE supplier (
  KodeSupplier CHAR(6) PRIMARY KEY,
  NamaSupplier VARCHAR(120) NOT NULL,
  Email VARCHAR(120) NOT NULL UNIQUE,
  Telepon VARCHAR(20) NOT NULL,
  Alamat VARCHAR(255) NOT NULL
) ENGINE=InnoDB;

-- TABEL 05: kategori_produk
CREATE TABLE kategori_produk (
  KodeKategori CHAR(6) PRIMARY KEY,
  NamaKategori VARCHAR(60) NOT NULL UNIQUE,
  Keterangan VARCHAR(160) NOT NULL
) ENGINE=InnoDB;

-- TABEL 06: produk
CREATE TABLE produk (
  KodeProduk CHAR(6) PRIMARY KEY,
  KodeKategori CHAR(6) NOT NULL,
  SKU VARCHAR(40) NOT NULL UNIQUE,
  NamaProduk VARCHAR(120) NOT NULL,
  Satuan VARCHAR(20) NOT NULL,
  HargaSatuan DECIMAL(15,2) NOT NULL,
  StokMin INT UNSIGNED NOT NULL DEFAULT 0,
  Stok INT UNSIGNED NOT NULL DEFAULT 0,
  CONSTRAINT ck_produk_harga CHECK (HargaSatuan >= 0),
  CONSTRAINT fk_produk_kategori FOREIGN KEY (KodeKategori)
    REFERENCES kategori_produk(KodeKategori) ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB;

-- TABEL 07: purchase_order
CREATE TABLE purchase_order (
  KodePO CHAR(7) PRIMARY KEY,
  KodeSupplier CHAR(6) NOT NULL,
  KodeDepartemen CHAR(5) NOT NULL,
  DibuatOleh CHAR(6) NOT NULL,
  TanggalPO DATE NOT NULL,
  TanggalKirim DATE NOT NULL,
  StatusPO ENUM('MENUNGGU', 'DISETUJUI', 'DITOLAK',
                'DITERIMA', 'SELESAI') NOT NULL DEFAULT 'MENUNGGU',
  Subtotal DECIMAL(15,2) NOT NULL,
  Diskon DECIMAL(15,2) NOT NULL DEFAULT 0,
  Pajak DECIMAL(15,2) NOT NULL DEFAULT 0,
  Potongan DECIMAL(15,2) NOT NULL DEFAULT 0,
  Total DECIMAL(15,2) GENERATED ALWAYS AS
    (Subtotal - Diskon + Pajak - Potongan) STORED,
  CONSTRAINT ck_po_tanggal CHECK (TanggalKirim >= TanggalPO),
  CONSTRAINT ck_po_nominal CHECK
    (Subtotal >= 0 AND Diskon >= 0 AND Diskon <= Subtotal AND Pajak >= 0
     AND Potongan >= 0 AND Potongan <= Subtotal - Diskon + Pajak),
  CONSTRAINT fk_po_supplier FOREIGN KEY (KodeSupplier)
    REFERENCES supplier(KodeSupplier) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_po_departemen FOREIGN KEY (KodeDepartemen)
    REFERENCES departemen(KodeDepartemen) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_po_pembuat FOREIGN KEY (DibuatOleh)
    REFERENCES pengguna(KodePengguna) ON UPDATE RESTRICT ON DELETE RESTRICT,
  INDEX idx_po_tanggal_status (TanggalPO, StatusPO)
) ENGINE=InnoDB;

-- TABEL 08: detail_purchase_order
CREATE TABLE detail_purchase_order (
  KodePO CHAR(7) NOT NULL,
  KodeProduk CHAR(6) NOT NULL,
  Quantity INT UNSIGNED NOT NULL,
  HargaSatuan DECIMAL(15,2) NOT NULL,
  Subtotal DECIMAL(15,2) GENERATED ALWAYS AS (Quantity * HargaSatuan) STORED,
  PRIMARY KEY (KodePO, KodeProduk),
  CONSTRAINT ck_detail_po_qty CHECK (Quantity > 0),
  CONSTRAINT ck_detail_po_harga CHECK (HargaSatuan >= 0),
  CONSTRAINT fk_detail_po_header FOREIGN KEY (KodePO)
    REFERENCES purchase_order(KodePO) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_detail_po_produk FOREIGN KEY (KodeProduk)
    REFERENCES produk(KodeProduk) ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB;

-- TABEL 09: persetujuan_po
CREATE TABLE persetujuan_po (
  KodePersetujuan CHAR(7) PRIMARY KEY,
  KodePO CHAR(7) NOT NULL UNIQUE,
  DisetujuiOleh CHAR(6) NOT NULL,
  TanggalPersetujuan DATETIME NOT NULL,
  Keputusan ENUM('DISETUJUI', 'DITOLAK') NOT NULL,
  Catatan VARCHAR(160) NOT NULL,
  CONSTRAINT fk_persetujuan_po FOREIGN KEY (KodePO)
    REFERENCES purchase_order(KodePO) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_persetujuan_pengguna FOREIGN KEY (DisetujuiOleh)
    REFERENCES pengguna(KodePengguna) ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB;

-- TABEL 10: penerimaan_barang
-- Satu PO memiliki paling banyak satu dokumen penerimaan dalam lingkup tugas.
CREATE TABLE penerimaan_barang (
  KodePO CHAR(7) PRIMARY KEY,
  KodeTerima CHAR(7) NOT NULL UNIQUE,
  DiterimaOleh CHAR(6) NOT NULL,
  TanggalTerima DATE NOT NULL,
  NoSuratJalan VARCHAR(40) NOT NULL UNIQUE,
  StatusTerima ENUM('SESUAI', 'SELISIH') NOT NULL,
  CONSTRAINT fk_penerimaan_po FOREIGN KEY (KodePO)
    REFERENCES purchase_order(KodePO) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_penerimaan_pengguna FOREIGN KEY (DiterimaOleh)
    REFERENCES pengguna(KodePengguna) ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB;

-- TABEL 11: detail_penerimaan
-- FK gabungan memastikan produk yang diterima termasuk dalam PO yang sama.
CREATE TABLE detail_penerimaan (
  KodePO CHAR(7) NOT NULL,
  KodeProduk CHAR(6) NOT NULL,
  QtyDiterima INT UNSIGNED NOT NULL,
  Kondisi ENUM('BAIK', 'RUSAK') NOT NULL,
  Catatan VARCHAR(160) NOT NULL,
  PRIMARY KEY (KodePO, KodeProduk),
  CONSTRAINT ck_detail_terima_qty CHECK (QtyDiterima > 0),
  CONSTRAINT fk_detail_terima_header FOREIGN KEY (KodePO)
    REFERENCES penerimaan_barang(KodePO) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_detail_terima_item FOREIGN KEY (KodePO, KodeProduk)
    REFERENCES detail_purchase_order(KodePO, KodeProduk)
    ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB;

-- TABEL 12: pembayaran_po
-- FK menuju penerimaan_barang: pembayaran tidak boleh tanpa catatan penerimaan.
CREATE TABLE pembayaran_po (
  KodeBayar CHAR(7) PRIMARY KEY,
  KodePO CHAR(7) NOT NULL UNIQUE,
  DibayarOleh CHAR(6) NOT NULL,
  TanggalBayar DATETIME NOT NULL,
  MetodeBayar ENUM('TRANSFER_SIMULASI', 'VA_SIMULASI', 'QRIS_SIMULASI') NOT NULL,
  Nominal DECIMAL(15,2) NOT NULL,
  Referensi VARCHAR(60) NOT NULL UNIQUE,
  StatusBayar ENUM('SIMULASI_BERHASIL', 'SIMULASI_GAGAL') NOT NULL,
  CONSTRAINT ck_pembayaran_nominal CHECK (Nominal > 0),
  CONSTRAINT fk_pembayaran_penerimaan FOREIGN KEY (KodePO)
    REFERENCES penerimaan_barang(KodePO) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_pembayaran_pengguna FOREIGN KEY (DibayarOleh)
    REFERENCES pengguna(KodePengguna) ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB;

-- TABEL 13: payroll
-- Komponen merupakan snapshot per periode, bukan salinan dinamis master pegawai.
CREATE TABLE payroll (
  KodePayroll CHAR(7) PRIMARY KEY,
  KodePegawai CHAR(6) NOT NULL,
  DicatatOleh CHAR(6) NOT NULL,
  Periode DATE NOT NULL,
  TanggalCatat DATETIME NOT NULL,
  GajiPokok DECIMAL(15,2) NOT NULL,
  TunjanganJabatan DECIMAL(15,2) NOT NULL DEFAULT 0,
  TunjanganTransport DECIMAL(15,2) NOT NULL DEFAULT 0,
  Bonus DECIMAL(15,2) NOT NULL DEFAULT 0,
  BPJSKesehatan DECIMAL(15,2) NOT NULL DEFAULT 0,
  BPJSKetenagakerjaan DECIMAL(15,2) NOT NULL DEFAULT 0,
  PPh21 DECIMAL(15,2) NOT NULL DEFAULT 0,
  GajiBersih DECIMAL(15,2) GENERATED ALWAYS AS
    (GajiPokok + TunjanganJabatan + TunjanganTransport + Bonus
     - BPJSKesehatan - BPJSKetenagakerjaan - PPh21) STORED,
  UNIQUE KEY uq_payroll_pegawai_periode (KodePegawai, Periode),
  CONSTRAINT ck_payroll_periode CHECK (DAYOFMONTH(Periode) = 1),
  CONSTRAINT ck_payroll_nominal CHECK
    (GajiPokok >= 0 AND TunjanganJabatan >= 0 AND TunjanganTransport >= 0
     AND Bonus >= 0 AND BPJSKesehatan >= 0 AND BPJSKetenagakerjaan >= 0
     AND PPh21 >= 0 AND GajiBersih >= 0),
  CONSTRAINT fk_payroll_pegawai FOREIGN KEY (KodePegawai)
    REFERENCES pegawai(KodePegawai) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_payroll_pencatat FOREIGN KEY (DicatatOleh)
    REFERENCES pengguna(KodePengguna) ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB;

-- TABEL 14: anggaran_departemen
CREATE TABLE anggaran_departemen (
  KodeAnggaran CHAR(7) PRIMARY KEY,
  KodeDepartemen CHAR(5) NOT NULL,
  Tahun SMALLINT UNSIGNED NOT NULL,
  Kuartal TINYINT UNSIGNED NOT NULL,
  NominalAnggaran DECIMAL(15,2) NOT NULL,
  UNIQUE KEY uq_anggaran_periode (KodeDepartemen, Tahun, Kuartal),
  CONSTRAINT ck_anggaran_tahun CHECK (Tahun BETWEEN 2000 AND 2100),
  CONSTRAINT ck_anggaran_kuartal CHECK (Kuartal BETWEEN 1 AND 4),
  CONSTRAINT ck_anggaran_nominal CHECK (NominalAnggaran > 0),
  CONSTRAINT fk_anggaran_departemen FOREIGN KEY (KodeDepartemen)
    REFERENCES departemen(KodeDepartemen) ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB;

-- INSERT DATA CONTOH
-- Urutan mengikuti dependensi foreign key. Total 14 x 5 = 70 baris.
START TRANSACTION;

INSERT INTO departemen (KodeDepartemen, NamaDepartemen, Lokasi) VALUES
  ('DPT01', 'Engineering dan IT', 'Lantai 1'),
  ('DPT02', 'Operasional', 'Lantai 2'),
  ('DPT03', 'Keuangan', 'Lantai 3'),
  ('DPT04', 'Sumber Daya Manusia', 'Lantai 4'),
  ('DPT05', 'Pergudangan', 'Gedung Gudang');

INSERT INTO pegawai
  (KodePegawai, KodeDepartemen, NamaPegawai, Email, Jabatan, TanggalMasuk,
   StatusPegawai, GajiPokok, NamaBank, NoRekening) VALUES
  ('EMP001', 'DPT01', 'Budi Santoso', 'budi@example.test', 'IT Manager',
   '2023-01-10', 'AKTIF', 28500000, 'Bank Contoh A', 'DEMO-REK-001'),
  ('EMP002', 'DPT02', 'Andi Wijaya', 'andi@example.test', 'Operations Manager',
   '2023-03-15', 'AKTIF', 22000000, 'Bank Contoh B', 'DEMO-REK-002'),
  ('EMP003', 'DPT03', 'Siti Rahmawati', 'siti@example.test', 'Finance Manager',
   '2023-05-01', 'AKTIF', 24000000, 'Bank Contoh A', 'DEMO-REK-003'),
  ('EMP004', 'DPT04', 'Rina Kusuma', 'rina@example.test', 'HR Manager',
   '2024-02-05', 'AKTIF', 18000000, 'Bank Contoh C', 'DEMO-REK-004'),
  ('EMP005', 'DPT05', 'Joko Anwar', 'joko@example.test', 'Warehouse Supervisor',
   '2024-06-10', 'AKTIF', 16000000, 'Bank Contoh B', 'DEMO-REK-005');

INSERT INTO pengguna
  (KodePengguna, KodePegawai, Username, AuthUID, Peran, Aktif) VALUES
  ('USR001', 'EMP001', 'admin.demo', 'demo-auth-001', 'SUPER_ADMIN', TRUE),
  ('USR002', 'EMP002', 'gudang.demo', 'demo-auth-002', 'WAREHOUSE_MANAGER', TRUE),
  ('USR003', 'EMP003', 'finance.demo', 'demo-auth-003', 'FINANCE_MANAGER', TRUE),
  ('USR004', 'EMP004', 'hr.demo', 'demo-auth-004', 'HR_MANAGER', TRUE),
  ('USR005', 'EMP005', 'gudang2.demo', 'demo-auth-005', 'WAREHOUSE_MANAGER', TRUE);

INSERT INTO supplier (KodeSupplier, NamaSupplier, Email, Telepon, Alamat) VALUES
  ('SUP001', 'PT Contoh Komputasi', 'komputasi@example.test', 'DEMO-TEL-001',
   'Alamat contoh supplier 1, Jakarta'),
  ('SUP002', 'PT Contoh Server', 'server@example.test', 'DEMO-TEL-002',
   'Alamat contoh supplier 2, Bandung'),
  ('SUP003', 'PT Contoh Storage', 'storage@example.test', 'DEMO-TEL-003',
   'Alamat contoh supplier 3, Surabaya'),
  ('SUP004', 'PT Contoh Jaringan', 'jaringan@example.test', 'DEMO-TEL-004',
   'Alamat contoh supplier 4, Semarang'),
  ('SUP005', 'PT Contoh Daya', 'daya@example.test', 'DEMO-TEL-005',
   'Alamat contoh supplier 5, Yogyakarta');

INSERT INTO kategori_produk (KodeKategori, NamaKategori, Keterangan) VALUES
  ('KAT001', 'GPU', 'Perangkat komputasi grafis dan AI'),
  ('KAT002', 'Server', 'Perangkat server perusahaan'),
  ('KAT003', 'Storage', 'Media penyimpanan data'),
  ('KAT004', 'Networking', 'Perangkat jaringan'),
  ('KAT005', 'Power', 'Perangkat pendukung daya');

INSERT INTO produk
  (KodeProduk, KodeKategori, SKU, NamaProduk, Satuan, HargaSatuan, StokMin, Stok)
VALUES
  ('PRD001', 'KAT001', 'NV-H100-TC', 'GPU H100', 'Unit', 250000000, 10, 142),
  ('PRD002', 'KAT002', 'RS-W1-PRO', 'Rack Server', 'Unit', 50000000, 10, 58),
  ('PRD003', 'KAT003', 'STR-NVME-8TB', 'NVMe 8TB', 'Unit', 12000000, 15, 8),
  ('PRD004', 'KAT004', 'SW-10GBE-L3', 'Switch 10GbE', 'Unit', 8500000, 15, 86),
  ('PRD005', 'KAT005', 'UPS-3KVA-RT', 'UPS 3kVA', 'Unit', 6500000, 10, 45);

INSERT INTO purchase_order
  (KodePO, KodeSupplier, KodeDepartemen, DibuatOleh, TanggalPO, TanggalKirim,
   StatusPO, Subtotal, Diskon, Pajak, Potongan) VALUES
  ('PO00001', 'SUP001', 'DPT01', 'USR002', '2026-10-01', '2026-10-06',
   'SELESAI', 500000000, 0, 55000000, 0),
  ('PO00002', 'SUP002', 'DPT02', 'USR002', '2026-10-02', '2026-10-07',
   'SELESAI', 150000000, 5000000, 15950000, 1500000),
  ('PO00003', 'SUP003', 'DPT03', 'USR002', '2026-10-03', '2026-10-08',
   'SELESAI', 60000000, 0, 6600000, 0),
  ('PO00004', 'SUP004', 'DPT04', 'USR005', '2026-10-04', '2026-10-09',
   'SELESAI', 34000000, 1000000, 3630000, 0),
  ('PO00005', 'SUP005', 'DPT05', 'USR005', '2026-10-05', '2026-10-10',
   'SELESAI', 39000000, 0, 4290000, 0);

INSERT INTO detail_purchase_order
  (KodePO, KodeProduk, Quantity, HargaSatuan) VALUES
  ('PO00001', 'PRD001', 2, 250000000),
  ('PO00002', 'PRD002', 3, 50000000),
  ('PO00003', 'PRD003', 5, 12000000),
  ('PO00004', 'PRD004', 4, 8500000),
  ('PO00005', 'PRD005', 6, 6500000);

INSERT INTO persetujuan_po
  (KodePersetujuan, KodePO, DisetujuiOleh, TanggalPersetujuan, Keputusan, Catatan)
VALUES
  ('APV0001', 'PO00001', 'USR001', '2026-10-02 09:00:00',
   'DISETUJUI', 'Sesuai kebutuhan Engineering'),
  ('APV0002', 'PO00002', 'USR003', '2026-10-03 09:15:00',
   'DISETUJUI', 'Sesuai anggaran Operasional'),
  ('APV0003', 'PO00003', 'USR003', '2026-10-04 09:30:00',
   'DISETUJUI', 'Dokumen pengadaan lengkap'),
  ('APV0004', 'PO00004', 'USR001', '2026-10-05 09:45:00',
   'DISETUJUI', 'Perangkat jaringan disetujui'),
  ('APV0005', 'PO00005', 'USR003', '2026-10-06 10:00:00',
   'DISETUJUI', 'Pengadaan daya gudang disetujui');

INSERT INTO penerimaan_barang
  (KodePO, KodeTerima, DiterimaOleh, TanggalTerima, NoSuratJalan, StatusTerima)
VALUES
  ('PO00001', 'GRN0001', 'USR002', '2026-10-06', 'SJ-DEMO-001', 'SESUAI'),
  ('PO00002', 'GRN0002', 'USR002', '2026-10-07', 'SJ-DEMO-002', 'SESUAI'),
  ('PO00003', 'GRN0003', 'USR005', '2026-10-08', 'SJ-DEMO-003', 'SESUAI'),
  ('PO00004', 'GRN0004', 'USR005', '2026-10-09', 'SJ-DEMO-004', 'SESUAI'),
  ('PO00005', 'GRN0005', 'USR005', '2026-10-10', 'SJ-DEMO-005', 'SESUAI');

INSERT INTO detail_penerimaan
  (KodePO, KodeProduk, QtyDiterima, Kondisi, Catatan) VALUES
  ('PO00001', 'PRD001', 2, 'BAIK', 'Jumlah sesuai PO'),
  ('PO00002', 'PRD002', 3, 'BAIK', 'Jumlah sesuai PO'),
  ('PO00003', 'PRD003', 5, 'BAIK', 'Jumlah sesuai PO'),
  ('PO00004', 'PRD004', 4, 'BAIK', 'Jumlah sesuai PO'),
  ('PO00005', 'PRD005', 6, 'BAIK', 'Jumlah sesuai PO');

INSERT INTO pembayaran_po
  (KodeBayar, KodePO, DibayarOleh, TanggalBayar, MetodeBayar, Nominal,
   Referensi, StatusBayar) VALUES
  ('PAY0001', 'PO00001', 'USR003', '2026-10-07 13:00:00', 'TRANSFER_SIMULASI',
   555000000, 'SIM-BAYAR-001', 'SIMULASI_BERHASIL'),
  ('PAY0002', 'PO00002', 'USR003', '2026-10-08 13:00:00', 'VA_SIMULASI',
   159450000, 'SIM-BAYAR-002', 'SIMULASI_BERHASIL'),
  ('PAY0003', 'PO00003', 'USR003', '2026-10-09 13:00:00', 'TRANSFER_SIMULASI',
   66600000, 'SIM-BAYAR-003', 'SIMULASI_BERHASIL'),
  ('PAY0004', 'PO00004', 'USR001', '2026-10-10 13:00:00', 'QRIS_SIMULASI',
   36630000, 'SIM-BAYAR-004', 'SIMULASI_BERHASIL'),
  ('PAY0005', 'PO00005', 'USR003', '2026-10-11 13:00:00', 'VA_SIMULASI',
   43290000, 'SIM-BAYAR-005', 'SIMULASI_BERHASIL');

INSERT INTO payroll
  (KodePayroll, KodePegawai, DicatatOleh, Periode, TanggalCatat, GajiPokok,
   TunjanganJabatan, TunjanganTransport, Bonus, BPJSKesehatan,
   BPJSKetenagakerjaan, PPh21) VALUES
  ('PAYR001', 'EMP001', 'USR004', '2026-10-01', '2026-10-20 10:00:00',
   28500000, 4500000, 1500000, 2500000, 285000, 855000, 1850000),
  ('PAYR002', 'EMP002', 'USR004', '2026-10-01', '2026-10-20 10:10:00',
   22000000, 3200000, 1400000, 1200000, 220000, 660000, 1250000),
  ('PAYR003', 'EMP003', 'USR004', '2026-10-01', '2026-10-20 10:20:00',
   24000000, 3800000, 1200000, 1500000, 240000, 720000, 1420000),
  ('PAYR004', 'EMP004', 'USR001', '2026-10-01', '2026-10-20 10:30:00',
   18000000, 2000000, 1000000, 500000, 180000, 540000, 800000),
  ('PAYR005', 'EMP005', 'USR004', '2026-10-01', '2026-10-20 10:40:00',
   16000000, 1500000, 1000000, 750000, 160000, 480000, 700000);

INSERT INTO anggaran_departemen
  (KodeAnggaran, KodeDepartemen, Tahun, Kuartal, NominalAnggaran) VALUES
  ('BGT0001', 'DPT01', 2026, 4, 1000000000),
  ('BGT0002', 'DPT02', 2026, 4, 300000000),
  ('BGT0003', 'DPT03', 2026, 4, 150000000),
  ('BGT0004', 'DPT04', 2026, 4, 100000000),
  ('BGT0005', 'DPT05', 2026, 4, 120000000);

COMMIT;
