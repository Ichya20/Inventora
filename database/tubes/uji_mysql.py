"""Uji pada instance MySQL sementara, loopback port 33308; bukan server aplikasi.

Jalankan --import hanya sekali pada instance uji dengan schema yang belum ada.
Tidak membaca kredensial dan tidak menghapus database apa pun.
"""
import argparse
import hashlib
import json
import re
import subprocess
from datetime import datetime
from pathlib import Path

HERE = Path(__file__).resolve().parent
MYSQL = Path('C:/Program Files/MySQL/MySQL Server 8.0/bin/mysql.exe')
ARGS = [str(MYSQL), '--no-defaults', '--protocol=TCP', '--host=127.0.0.1',
        '--port=33308', '--user=root', '--default-character-set=utf8mb4',
        '--batch', '--raw', '--skip-column-names']
RESULTS = []


def run(sql, schema=True):
    return subprocess.run(ARGS, input=('USE inventora_tubes;\n' if schema else '') + sql,
                          text=True, encoding='utf-8', capture_output=True, timeout=30)


def query(sql, schema=True):
    result = run(sql, schema)
    if result.returncode:
        raise RuntimeError(result.stderr)
    return [line.split('\t') for line in result.stdout.strip().splitlines()]


def record(name, condition, detail):
    RESULTS.append({'uji': name, 'lulus': bool(condition), 'hasil': detail})
    if not condition:
        raise AssertionError(f'{name}: {detail}')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--import', dest='import_schema', action='store_true')
    options = parser.parse_args()
    source = (HERE / 'inventora_tubes.sql').read_text(encoding='utf-8')
    version = query('SELECT VERSION();', False)[0][0]
    if options.import_schema:
        existing = query("SELECT COUNT(*) FROM information_schema.schemata "
                         "WHERE schema_name='inventora_tubes';", False)[0][0]
        if existing != '0':
            raise RuntimeError('Schema sudah ada. Gunakan instance uji baru atau tanpa --import.')
        result = run(source, False)
        record('CREATE dan INSERT lengkap', result.returncode == 0,
               result.stderr.strip() or 'SQL dieksekusi tanpa error')
    names = re.findall(r'CREATE TABLE (\w+)', source)
    counts = {name: int(query(f'SELECT COUNT(*) FROM {name};')[0][0]) for name in names}
    record('Jumlah tabel dan data', len(counts) == 14 and all(n == 5 for n in counts.values()),
           f'{len(counts)} tabel, {sum(counts.values())} baris; masing-masing 5')
    fks = query("SELECT table_name, constraint_name, referenced_table_name "
                "FROM information_schema.referential_constraints "
                "WHERE constraint_schema='inventora_tubes' ORDER BY table_name, constraint_name;")
    record('Relasi foreign key', len(fks) == 19, f'{len(fks)} constraint foreign key')
    totals = query('SELECT (SELECT SUM(Total) FROM purchase_order), '
                   '(SELECT SUM(Nominal) FROM pembayaran_po), '
                   '(SELECT SUM(GajiBersih) FROM payroll), (SELECT SUM(Stok) FROM produk);')[0]
    record('Agregat nilai contoh', totals == ['860970000.00', '860970000.00', '125690000.00', '339'],
           'PO, pembayaran, payroll, stok: ' + ', '.join(totals))
    imbalance = query('SELECT po.KodePO FROM purchase_order po '
                      'LEFT JOIN detail_purchase_order d ON d.KodePO=po.KodePO '
                      'GROUP BY po.KodePO, po.Subtotal '
                      'HAVING po.Subtotal <> COALESCE(SUM(d.Subtotal),0);')
    record('Subtotal header sama dengan detail', not imbalance, f'{len(imbalance)} ketidaksesuaian')
    bad_payment = query("SELECT b.KodeBayar FROM pembayaran_po b "
                        "JOIN purchase_order po ON po.KodePO=b.KodePO "
                        "JOIN penerimaan_barang r ON r.KodePO=b.KodePO "
                        "WHERE b.Nominal<>po.Total OR r.StatusTerima<>'SESUAI';")
    record('Pembayaran penuh dan penerimaan', not bad_payment, f'{len(bad_payment)} ketidaksesuaian')
    bad_receipt = query("SELECT d.KodePO FROM detail_purchase_order d "
                        "LEFT JOIN detail_penerimaan r ON r.KodePO=d.KodePO AND r.KodeProduk=d.KodeProduk "
                        "WHERE r.KodeProduk IS NULL OR r.QtyDiterima<>d.Quantity OR r.Kondisi<>'BAIK';")
    record('Isi penerimaan sama dengan pesanan', not bad_receipt, f'{len(bad_receipt)} ketidaksesuaian')
    chronology = query('SELECT po.KodePO FROM purchase_order po '
                       'JOIN persetujuan_po a ON a.KodePO=po.KodePO '
                       'JOIN penerimaan_barang r ON r.KodePO=po.KodePO '
                       'JOIN pembayaran_po b ON b.KodePO=po.KodePO '
                       'WHERE DATE(a.TanggalPersetujuan)<po.TanggalPO '
                       'OR r.TanggalTerima<DATE(a.TanggalPersetujuan) '
                       'OR DATE(b.TanggalBayar)<r.TanggalTerima;')
    record('Urutan tanggal transaksi contoh', not chronology, f'{len(chronology)} ketidaksesuaian')
    actors = query("SELECT po.KodePO FROM purchase_order po "
                   "JOIN pengguna c ON c.KodePengguna=po.DibuatOleh "
                   "JOIN persetujuan_po a ON a.KodePO=po.KodePO "
                   "JOIN pengguna u ON u.KodePengguna=a.DisetujuiOleh "
                   "JOIN penerimaan_barang r ON r.KodePO=po.KodePO "
                   "JOIN pengguna w ON w.KodePengguna=r.DiterimaOleh "
                   "JOIN pembayaran_po b ON b.KodePO=po.KodePO "
                   "JOIN pengguna f ON f.KodePengguna=b.DibayarOleh "
                   "WHERE c.Peran NOT IN ('WAREHOUSE_MANAGER','SUPER_ADMIN') "
                   "OR w.Peran NOT IN ('WAREHOUSE_MANAGER','SUPER_ADMIN') "
                   "OR u.Peran NOT IN ('FINANCE_MANAGER','SUPER_ADMIN') "
                   "OR f.Peran NOT IN ('FINANCE_MANAGER','SUPER_ADMIN');")
    hr = query("SELECT p.KodePayroll FROM payroll p JOIN pengguna u ON u.KodePengguna=p.DicatatOleh "
               "WHERE u.Peran NOT IN ('HR_MANAGER','SUPER_ADMIN');")
    record('Peran pelaku pada data contoh', not actors and not hr,
           f'{len(actors) + len(hr)} ketidaksesuaian; bukan enforcement role oleh FK')
    low_stock = query('SELECT KodeProduk FROM produk WHERE Stok<StokMin;')
    record('Deteksi stok minimum', low_stock == [['PRD003']], str(low_stock))
    negatives = [
        ('Produk dengan kategori tidak ada', "UPDATE produk SET KodeKategori='KAT999' WHERE KodeProduk='PRD001';", 1452),
        ('Harga produk negatif', "UPDATE produk SET HargaSatuan=-1 WHERE KodeProduk='PRD001';", 3819),
        ('Quantity pesanan nol', "UPDATE detail_purchase_order SET Quantity=0 WHERE KodePO='PO00001';", 3819),
        ('Payroll pegawai-periode ganda', "INSERT INTO payroll (KodePayroll,KodePegawai,DicatatOleh,Periode,TanggalCatat,GajiPokok) VALUES ('PAYR999','EMP001','USR004','2026-10-01','2026-10-20',1);", 1062),
        ('Periode payroll bukan tanggal satu', "UPDATE payroll SET Periode='2026-10-02' WHERE KodePayroll='PAYR001';", 3819),
        ('Penerimaan produk di luar PO', "INSERT INTO detail_penerimaan VALUES ('PO00001','PRD002',1,'BAIK','Uji invalid');", 1452),
        ('Pembayaran kedua untuk PO sama', "INSERT INTO pembayaran_po VALUES ('PAY0999','PO00001','USR003','2026-10-12','VA_SIMULASI',1,'SIM-UJI-999','SIMULASI_BERHASIL');", 1062),
        ('Tanggal kirim sebelum PO', "UPDATE purchase_order SET TanggalKirim='2026-09-01' WHERE KodePO='PO00001';", 3819),
    ]
    for name, sql, code in negatives:
        # Koneksi ditutup saat error; transaksi yang belum COMMIT di-rollback MySQL.
        result = run('START TRANSACTION;\n' + sql + '\nROLLBACK;')
        record(name, result.returncode != 0 and f'ERROR {code} ' in result.stderr,
               f'Ditolak dengan ERROR {code}' if result.returncode else 'Tidak ditolak')
    after = {name: int(query(f'SELECT COUNT(*) FROM {name};')[0][0]) for name in names}
    record('Data tetap utuh setelah uji negatif', after == counts, '14 tabel tetap berisi masing-masing 5 baris')
    verification = run((HERE / 'verifikasi.sql').read_text(encoding='utf-8'))
    record('Semua query verifikasi', verification.returncode == 0,
           verification.stderr.strip() or '8 bagian query berhasil dijalankan')
    (HERE / 'hasil-query.txt').write_text(verification.stdout, encoding='utf-8')
    report = {'tanggal_uji': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
              'server': 'MySQL Community Server ' + version,
              'lingkungan': 'Instance sementara, 127.0.0.1:33308, terpisah dari aplikasi',
              'sha256_sql': hashlib.sha256(source.encode()).hexdigest(),
              'jumlah_tabel': len(counts), 'jumlah_baris': sum(counts.values()),
              'jumlah_fk': len(fks), 'baris_per_tabel': counts,
              'foreign_keys': fks, 'uji': RESULTS}
    (HERE / 'hasil-uji.json').write_text(json.dumps(report, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    print(json.dumps(report, indent=2, ensure_ascii=False))


if __name__ == '__main__':
    main()
