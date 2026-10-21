"""Bangun PDF tugas dari SQL kanonis dan hasil uji MySQL yang telah tersimpan."""
import hashlib
import json
import re
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph, Table, TableStyle
from pypdf import PdfReader

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
OUT = ROOT / 'output/pdf/Inventora_Tugas_Basis_Data_MySQL.pdf'
OUT.parent.mkdir(parents=True, exist_ok=True)
SQL = (HERE / 'inventora_tubes.sql').read_text(encoding='utf-8')
REPORT = json.loads((HERE / 'hasil-uji.json').read_text(encoding='utf-8'))
assert REPORT['sha256_sql'] == hashlib.sha256(SQL.encode()).hexdigest(), 'SQL berubah setelah uji'
assert len(REPORT['uji']) == 20 and all(t['lulus'] for t in REPORT['uji'])
CREATES = {m[1]: m[0] for m in re.finditer(r'CREATE TABLE (\w+) \([\s\S]+?\) ENGINE=InnoDB;', SQL)}
INSERTS = {m[1]: m[0] for m in re.finditer(r'INSERT INTO (\w+)\b[\s\S]+?;', SQL)}
assert len(CREATES) == len(INSERTS) == 14

for name, file in [('Body', 'arial.ttf'), ('Bold', 'arialbd.ttf'),
                   ('Italic', 'ariali.ttf'), ('Code', 'consola.ttf')]:
    pdfmetrics.registerFont(TTFont(name, 'C:/Windows/Fonts/' + file))
pdfmetrics.registerFontFamily('Body', normal='Body', bold='Bold', italic='Italic', boldItalic='Bold')
NAVY = colors.HexColor('#142E45')
BLUE = colors.HexColor('#206B8C')
INK = colors.HexColor('#25394A')
GRAY = colors.HexColor('#637585')
LIGHT = colors.HexColor('#EFF4F7')
LINE = colors.HexColor('#D6E0E7')
WHITE = colors.white
MARGIN = 42
TOTAL = 23
PAGE = 0
C = canvas.Canvas(str(OUT), pagesize=A4, pageCompression=1)
C.setTitle('Inventora - Tugas Kelompok Basis Data MySQL')
C.setAuthor('Kelompok TUBES Inventora')
C.setSubject('14 tabel, 70 data contoh, CREATE TABLE, INSERT, relasi dan verifikasi MySQL')
W, H = A4


def para(text, x, y, width, size=10, leading=14.5, color=INK, font='Body'):
    style = ParagraphStyle('p', fontName=font, fontSize=size, leading=leading,
                           textColor=color, alignment=TA_LEFT)
    p = Paragraph(text, style)
    _, height = p.wrap(width, H)
    if y - height < 43:
        raise ValueError(f'Teks melewati footer pada halaman {PAGE}: {text[:70]}')
    p.drawOn(C, x, y - height)
    return y - height


def page(section, wide=False):
    global PAGE, W, H
    PAGE += 1
    W, H = landscape(A4) if wide else A4
    C.setPageSize((W, H))
    C.setFillColor(BLUE)
    C.rect(MARGIN, H - 35, 22, 3, fill=1, stroke=0)
    C.setFont('Bold', 8)
    C.setFillColor(NAVY)
    C.drawString(MARGIN + 30, H - 35, 'INVENTORA / BASIS DATA')
    C.setFont('Body', 8)
    C.setFillColor(GRAY)
    C.drawRightString(W - MARGIN, H - 35, section)
    return H - 67


def endpage():
    C.setStrokeColor(LINE)
    C.line(MARGIN, 34, W - MARGIN, 34)
    C.setFont('Body', 7.5)
    C.setFillColor(GRAY)
    C.drawString(MARGIN, 21, 'MySQL 8.0.16+  |  Data contoh fiktif  |  21 Oktober 2026')
    C.drawRightString(W - MARGIN, 21, f'{PAGE:02d} / {TOTAL:02d}')
    C.showPage()


def title(text, y, subtitle=None):
    y = para(text, MARGIN, y, W - 2 * MARGIN, 22, 27, NAVY, 'Bold') - 12
    if subtitle:
        y = para(subtitle, MARGIN, y, W - 2 * MARGIN, 10, 14.5, GRAY) - 17
    return y


def label(text, y):
    return para(text, MARGIN, y, W - 2 * MARGIN, 10, 14, BLUE, 'Bold') - 8


def code(text, y, size=8.5, leading=11.5):
    lines = text.strip('\n').splitlines()
    pad = 12
    width = W - 2 * MARGIN
    for line in lines:
        if pdfmetrics.stringWidth(line, 'Code', size) > width - 2 * pad:
            raise ValueError(f'Baris kode terlalu lebar pada halaman {PAGE}: {line}')
    height = len(lines) * leading + pad * 2
    if y - height < 47:
        raise ValueError(f'Kode terlalu tinggi pada halaman {PAGE}: {height}, y={y}')
    C.setFillColor(LIGHT)
    C.roundRect(MARGIN, y - height, width, height, 5, fill=1, stroke=0)
    C.setFillColor(INK)
    C.setFont('Code', size)
    base = y - pad - size
    for line in lines:
        C.drawString(MARGIN + pad, base, line)
        base -= leading
    return y - height - 16


def table(headers, rows, widths, y, size=9, leading=12, pad=7):
    def cell(text, bold=False):
        style = ParagraphStyle('cell', fontName='Bold' if bold else 'Body', fontSize=size,
                               leading=leading, textColor=WHITE if bold else INK)
        return Paragraph(escape(str(text)).replace('\n', '<br/>'), style)
    data = [[cell(h, True) for h in headers]]
    data += [[cell(c) for c in row] for row in rows]
    t = Table(data, colWidths=widths, hAlign='LEFT')
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), NAVY),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [WHITE, LIGHT]),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), pad),
        ('RIGHTPADDING', (0, 0), (-1, -1), pad),
        ('TOPPADDING', (0, 0), (-1, -1), pad),
        ('BOTTOMPADDING', (0, 0), (-1, -1), pad),
        ('LINEBELOW', (0, -1), (-1, -1), 0.5, LINE),
    ]))
    _, height = t.wrap(W - 2 * MARGIN, H)
    if y - height < 45:
        raise ValueError(f'Tabel terlalu tinggi pada halaman {PAGE}: {height}, y={y}')
    t.drawOn(C, MARGIN, y - height)
    return y - height - 16


# 01 - Identitas dan ringkasan.
y = page('TUGAS KELOMPOK')
y = para('RANCANGAN BASIS DATA RELASIONAL', MARGIN, y - 12, 510, 9, 13, BLUE, 'Bold')
y = para('Inventora', MARGIN, y - 20, 510, 39, 45, NAVY, 'Bold')
y = para('Sintaks SQL MySQL', MARGIN, y - 8, 510, 23, 30, NAVY, 'Bold')
y = para('CREATE seluruh tabel dan INSERT lima data untuk setiap tabel.', MARGIN, y - 15, 490, 12, 18) - 28
y = table(['TABEL', 'DATA CONTOH', 'FOREIGN KEY', 'TARGET'],
          [['14', '70 baris', '19 relasi', 'MySQL 8.0.16+']], [95, 137, 137, 142], y, 11, 15, 10)
y = para('Sistem inventori dan pengadaan internal dengan pegawai, akun pengguna, supplier, '
         'persetujuan, penerimaan barang, pembayaran simulasi, payroll, dan anggaran departemen.',
         MARGIN, y - 5, 511, 11, 16) - 28
y = table(['IDENTITAS', 'DIISI OLEH KELOMPOK'],
          [['Nama kelompok', '........................................................................'],
           ['Kelas / program studi', '........................................................................'],
           ['Anggota dan NIM', '........................................................................\n........................................................................\n........................................................................\n........................................................................\n........................................................................']],
          [140, 371], y, 10, 17, 9)
y = para('<b>Isi dokumen.</b> Rancangan dan lingkup (hlm. 2), relasi (3-4), persiapan SQL (5), '
         'CREATE dan INSERT lengkap (6-19), query verifikasi (20-22), serta hasil pengujian (23).',
         MARGIN, y - 10, 511, 10, 15)
para('Diuji pada MySQL Community Server 8.0.41. Seluruh 20 pemeriksaan lulus.',
     MARGIN, y - 21, 511, 9, 13, BLUE, 'Bold')
endpage()

# 02 - Domain, lingkup, dan keputusan desain.
y = page('RANCANGAN')
y = title('Lingkup dan keputusan desain', y,
          'Rancangan mengikuti domain Inventora dan disiapkan sebagai artefak TUBES.')
y = table(['MODUL', 'TABEL'], [
    ['Organisasi dan akses', 'departemen, pegawai, pengguna'],
    ['Master inventori', 'supplier, kategori_produk, produk'],
    ['Pengadaan', 'purchase_order, detail_purchase_order, persetujuan_po'],
    ['Penerimaan dan pembayaran', 'penerimaan_barang, detail_penerimaan, pembayaran_po'],
    ['SDM dan perencanaan', 'payroll, anggaran_departemen'],
], [155, 356], y, 9.5, 14, 9)
y = label('Integritas di tingkat database', y - 3)
y = para('Primary key mengidentifikasi setiap baris. Foreign key menjaga referensi induk dan '
         'detail, termasuk FK gabungan untuk memastikan produk penerimaan terdapat pada PO yang sama. '
         'UNIQUE mencegah username, payroll pegawai-periode, serta anggaran departemen-periode yang ganda. '
         'CHECK membatasi tanggal dan nominal di dalam satu baris.', MARGIN, y, 511) - 16
y = para('Nilai uang memakai <b>DECIMAL(15,2)</b>. Subtotal detail, total PO, dan gaji bersih '
         'dihitung melalui generated columns. Harga transaksi serta komponen payroll merupakan '
         'snapshot historis sehingga perubahan master tidak mengubah riwayat.', MARGIN, y, 511) - 20
y = label('Asumsi dan batas lingkup', y)
for text in [
    '<b>Inventori satu lokasi.</b> Stok pada produk adalah snapshot akhir. INSERT penerimaan '
    'tidak otomatis memperbarui stok; aplikasi memerlukan mutasi dan transaksi stok tersendiri.',
    '<b>Satu alur penuh per PO.</b> Maksimal satu keputusan persetujuan, satu penerimaan, dan '
    'satu pembayaran penuh. Cicilan, penerimaan parsial berulang, dan riwayat percobaan pembayaran belum dimodelkan.',
    '<b>Aturan antartabel.</b> Hak akses peran, transisi status, kesamaan total header-detail, '
    'jumlah bayar/terima, dan urutan tanggal antartabel memerlukan validasi aplikasi '
    'dalam transaksi atau prosedur/trigger tambahan. Data contoh telah diperiksa dengan query.',
    '<b>Identitas dan keuangan.</b> AuthUID memetakan identitas eksternal, bukan password. '
    'Kontak dan pembayaran bersifat fiktif. Pajak, BPJS, serta PPh21 adalah nominal ilustrasi.',
]:
    y = para(text, MARGIN, y, 511, 9.5, 13.5) - 10
y = para('Aplikasi yang ada masih menggunakan Firebase. Paket ini menyediakan rancangan relasional '
         'untuk tugas dan tidak mengalihkan koneksi aplikasi. Tema inventori/pengadaan perlu sesuai '
         'proposal yang disetujui dosen; jumlah tabel tidak menjamin nilai tertentu.',
         MARGIN, y - 4, 511, 9, 13, GRAY)
endpage()

# 03 - Diagram relasi utama, lanskap.
y = page('RELASI UTAMA', wide=True)
y = title('Peta relasi Inventora', y,
          'Panah dari induk ke anak. Label menyatakan jumlah anak per satu induk. '
          'FK pelaku transaksi dan departemen PO dirinci pada halaman berikutnya.')
OX, OY = MARGIN + 4, 62
NODE_W, NODE_H = 148, 48
nodes = {
    'departemen': (0, 320, 'PK KodeDepartemen'),
    'pegawai': (190, 320, 'PK KodePegawai'),
    'pengguna': (380, 320, 'PK KodePengguna'),
    'payroll': (570, 320, 'PK KodePayroll'),
    'anggaran_departemen': (0, 230, 'PK KodeAnggaran'),
    'persetujuan_po': (190, 230, 'PK KodePersetujuan'),
    'supplier': (0, 140, 'PK KodeSupplier'),
    'purchase_order': (190, 140, 'PK KodePO'),
    'penerimaan_barang': (380, 140, 'PK KodePO; UQ KodeTerima'),
    'pembayaran_po': (570, 140, 'PK KodeBayar; UQ KodePO'),
    'kategori_produk': (0, 25, 'PK KodeKategori'),
    'produk': (190, 25, 'PK KodeProduk'),
    'detail_purchase_order': (380, 25, 'PK KodePO + KodeProduk'),
    'detail_penerimaan': (570, 25, 'PK KodePO + KodeProduk'),
}


def arrow(points, text, tx, ty):
    points = [(OX + x, OY + yy) for x, yy in points]
    C.setStrokeColor(GRAY)
    C.setLineWidth(0.8)
    p = C.beginPath()
    p.moveTo(*points[0])
    for pt in points[1:]:
        p.lineTo(*pt)
    C.drawPath(p)
    x0, y0 = points[-2]
    x1, y1 = points[-1]
    import math
    theta = math.atan2(y1 - y0, x1 - x0)
    for d in [-0.45, 0.45]:
        C.line(x1, y1, x1 - 6 * math.cos(theta + d), y1 - 6 * math.sin(theta + d))
    C.setFont('Body', 7.5)
    C.setFillColor(GRAY)
    C.drawCentredString(OX + tx, OY + ty, text)


for a, b, text in [
    ('departemen', 'pegawai', '1:N'), ('pegawai', 'pengguna', '1:0..1'),
    ('pengguna', 'payroll', '1:N'), ('supplier', 'purchase_order', '1:N'),
    ('purchase_order', 'penerimaan_barang', '1:0..1'),
    ('penerimaan_barang', 'pembayaran_po', '1:0..1'),
    ('kategori_produk', 'produk', '1:N'), ('produk', 'detail_purchase_order', '1:N'),
    ('detail_purchase_order', 'detail_penerimaan', '1:0..1'),
]:
    x, yy, _ = nodes[a]
    xx, yyy, _ = nodes[b]
    arrow([(x + NODE_W, yy + 24), (xx, yyy + 24)], text, (x + NODE_W + xx) / 2, yy + 35)
arrow([(74, 320), (74, 278)], '1:N', 92, 296)
arrow([(264, 188), (264, 230)], '1:0..1', 289, 208)
arrow([(264, 320), (264, 305), (644, 305), (644, 320)], 'pegawai : payroll = 1:N', 453, 294)
arrow([(264, 140), (264, 101), (454, 101), (454, 73)], 'PO : detail = 1:N', 350, 105)
arrow([(454, 140), (454, 121), (644, 121), (644, 73)], 'terima : detail = 1:N', 557, 125)
for name, (x, yy, key) in nodes.items():
    xx, yyy = OX + x, OY + yy
    C.setFillColor(LIGHT)
    C.setStrokeColor(LINE)
    C.roundRect(xx, yyy, NODE_W, NODE_H, 4, fill=1, stroke=1)
    C.setFillColor(NAVY)
    C.setFont('Bold', 8.1)
    C.drawString(xx + 9, yyy + 29, name)
    C.setFillColor(GRAY)
    C.setFont('Body', 7.5)
    C.drawString(xx + 9, yyy + 13, key)
para('PK = primary key; UQ = unique key; 0..1 = opsional, paling banyak satu. '
     'Diagram ini merangkum relasi utama dan bukan representasi seluruh kolom.',
     MARGIN, 62, W - 2 * MARGIN, 8.5, 12, GRAY)
endpage()

# 04 - Seluruh 19 FK, termasuk composite key.
y = page('DAFTAR FOREIGN KEY')
y = title('Referensi antartabel', y,
          'Seluruh FK memakai ON UPDATE RESTRICT dan ON DELETE RESTRICT.')
relations = [
    ('pegawai.KodeDepartemen', 'departemen.KodeDepartemen'),
    ('pengguna.KodePegawai [UQ]', 'pegawai.KodePegawai'),
    ('produk.KodeKategori', 'kategori_produk.KodeKategori'),
    ('purchase_order.KodeSupplier', 'supplier.KodeSupplier'),
    ('purchase_order.KodeDepartemen', 'departemen.KodeDepartemen'),
    ('purchase_order.DibuatOleh', 'pengguna.KodePengguna'),
    ('detail_purchase_order.KodePO', 'purchase_order.KodePO'),
    ('detail_purchase_order.KodeProduk', 'produk.KodeProduk'),
    ('persetujuan_po.KodePO [UQ]', 'purchase_order.KodePO'),
    ('persetujuan_po.DisetujuiOleh', 'pengguna.KodePengguna'),
    ('penerimaan_barang.KodePO [PK]', 'purchase_order.KodePO'),
    ('penerimaan_barang.DiterimaOleh', 'pengguna.KodePengguna'),
    ('detail_penerimaan.KodePO', 'penerimaan_barang.KodePO'),
    ('detail_penerimaan.(KodePO, KodeProduk)', 'detail_purchase_order.(KodePO, KodeProduk)'),
    ('pembayaran_po.KodePO [UQ]', 'penerimaan_barang.KodePO'),
    ('pembayaran_po.DibayarOleh', 'pengguna.KodePengguna'),
    ('payroll.KodePegawai', 'pegawai.KodePegawai'),
    ('payroll.DicatatOleh', 'pengguna.KodePengguna'),
    ('anggaran_departemen.KodeDepartemen', 'departemen.KodeDepartemen'),
]
y = table(['NO.', 'KOLOM ANAK / FOREIGN KEY', 'KOLOM INDUK / REFERENSI'],
          [[i, a, b] for i, (a, b) in enumerate(relations, 1)], [30, 245, 236], y, 8.2, 11.3, 6)
para('Satu FK gabungan pada detail_penerimaan mencakup dua kolom. Karena itu jumlah '
     'constraint FK adalah 19, meskipun jumlah pasangan kolom referensi adalah 20. '
     'Tanda [UQ] atau [PK] pada kolom FK membatasi setiap induk menjadi paling banyak satu baris anak.',
     MARGIN, y - 2, 511, 9.5, 14)
endpage()

# 05 - Persiapan dan urutan eksekusi yang benar.
y = page('PERSIAPAN SQL')
y = title('Membuat schema MySQL', y,
          'Gunakan server MySQL 8.0.16+ dan schema inventora_tubes yang belum terisi.')
prep = SQL[SQL.index('CREATE DATABASE'):SQL.index('-- TABEL 01')].strip()
y = code(prep, y)
y = label('Urutan eksekusi', y + 1)
for n, text in enumerate([
    'Jalankan persiapan di atas, lalu seluruh blok <b>CREATE TABLE</b> pada halaman 6-19 sesuai urutan.',
    'Setelah semua tabel terbentuk, jalankan <b>START TRANSACTION;</b>.',
    'Jalankan seluruh blok <b>INSERT</b> pada halaman 6-19 sesuai urutan, lalu <b>COMMIT;</b>.',
    'Jalankan query verifikasi pada halaman 20-22. Setiap tabel harus berisi tepat lima baris.',
], 1):
    y = para(f'<b>{n}.</b> {text}', MARGIN, y, 511, 10, 15) - 10
y = code('START TRANSACTION;\n-- Jalankan seluruh INSERT sesuai urutan dependensi.\nCOMMIT;', y - 2)
y = para('Pada dokumen, CREATE dan INSERT dikelompokkan per tabel agar mudah dibaca. '
         'File <b>inventora_tubes.sql</b> sudah disusun untuk eksekusi sekaligus: seluruh CREATE '
         'lebih dahulu, kemudian satu transaksi INSERT.', MARGIN, y, 511) - 16
y = label('Melalui MySQL Workbench', y)
y = para('Buka koneksi server, pilih <b>File &gt; Open SQL Script</b>, buka inventora_tubes.sql, '
         'lalu jalankan seluruh skrip dengan tombol petir untuk semua pernyataan. '
         'Setelah selesai, buka dan jalankan verifikasi.sql.', MARGIN, y, 511) - 16
para('File tidak berisi DROP. Jangan jalankan berulang pada schema yang telah terisi dan '
     'jangan gunakan --force. Bila terjadi error, hentikan dan periksa error pertama. '
     'DDL MySQL melakukan commit implisit; transaksi INSERT tidak membatalkan CREATE TABLE.',
     MARGIN, y, 511, 9, 13, GRAY)
endpage()

# 06-19 - Semua CREATE dan semua INSERT, tanpa pengurangan.
DESCRIPTIONS = {
    'departemen': ('Unit organisasi', 'PK KodeDepartemen; NamaDepartemen unik. Induk pegawai, PO, dan anggaran.'),
    'pegawai': ('Data induk pegawai', 'PK KodePegawai; FK departemen. GajiPokok di master dapat berubah tanpa mengubah payroll lama.'),
    'pengguna': ('Akun dan peran pengguna', 'PK KodePengguna; FK pegawai unik. Empat peran; lima akun contoh. AuthUID untuk identitas eksternal.'),
    'supplier': ('Pemasok barang', 'PK KodeSupplier; Email unik. Kontak contoh, bukan data pemasok nyata.'),
    'kategori_produk': ('Pengelompokan produk', 'PK KodeKategori; NamaKategori unik. Menjadi referensi master produk.'),
    'produk': ('Master inventori', 'PK KodeProduk; FK kategori; SKU unik. StokMin dan Stok berupa bilangan nonnegatif.'),
    'purchase_order': ('Header pengadaan', 'PK KodePO; FK supplier, departemen, pembuat. Total = Subtotal - Diskon + Pajak - Potongan.'),
    'detail_purchase_order': ('Rincian item pengadaan', 'PK gabungan KodePO + KodeProduk. HargaSatuan menyimpan harga historis; Subtotal = Quantity x HargaSatuan.'),
    'persetujuan_po': ('Keputusan pengadaan', 'PK KodePersetujuan; KodePO unik. Maksimal satu keputusan persetujuan/penolakan per PO.'),
    'penerimaan_barang': ('Dokumen penerimaan', 'PK sekaligus FK KodePO; KodeTerima unik. Maksimal satu dokumen penerimaan untuk setiap PO.'),
    'detail_penerimaan': ('Rincian barang diterima', 'PK gabungan KodePO + KodeProduk. FK gabungan mengacu item dari PO yang sama.'),
    'pembayaran_po': ('Pembayaran pengadaan', 'PK KodeBayar; KodePO unik dan mengacu penerimaan. Semua transaksi contoh bersifat simulasi.'),
    'payroll': ('Riwayat gaji per periode', 'PK KodePayroll; unik per pegawai-periode. Komponen historis dan GajiBersih otomatis; periode memakai tanggal satu.'),
    'anggaran_departemen': ('Anggaran per kuartal', 'PK KodeAnggaran; unik per departemen-tahun-kuartal. Sisa anggaran dihitung melalui query, bukan disimpan ulang.'),
}
for i, name in enumerate(CREATES, 1):
    y = page(f'TABEL {i:02d} / 14')
    purpose, note = DESCRIPTIONS[name]
    y = title(name, y, purpose)
    y = para(note, MARGIN, y, 511, 9.5, 13.5) - 15
    y = label('CREATE TABLE', y)
    y = code(CREATES[name], y)
    y = label('INSERT - 5 DATA CONTOH', y)
    y = code(INSERTS[name], y)
    endpage()

# 20-22 - Delapan query verifikasi, persis seperti file sumber.
verification = (HERE / 'verifikasi.sql').read_text(encoding='utf-8')
parts = re.split(r'(?m)^-- (?=\d+\.)', verification)[1:]
assert len(parts) == 8
query_parts = []
for part in parts:
    comment, body = part.split('\n', 1)
    query_parts.append((comment.strip(), body.strip()))
for index, (start, stop, subtitle) in enumerate([
    (0, 3, 'Jumlah data, relasi transaksi, dan keseimbangan subtotal.'),
    (3, 6, 'Konsistensi pembayaran, penerimaan, dan riwayat payroll.'),
    (6, 8, 'Peringatan stok minimum dan anggaran terhadap komitmen PO.'),
], 1):
    y = page(f'QUERY VERIFIKASI {index} / 3')
    y = title(f'Verifikasi data ({index}/3)', y, subtitle + ' Jalankan setelah USE inventora_tubes;')
    for comment, body in query_parts[start:stop]:
        y = para(escape(comment), MARGIN, y, 511, 9.5, 13, BLUE, 'Bold') - 8
        y = code(body, y, 8, 10.4)
    if index == 1:
        para('Hasil: 14 tabel dengan masing-masing lima baris; lima PO memiliki pembayaran '
             'yang sama dengan totalnya; query ketidaksesuaian subtotal tidak mengembalikan baris.',
             MARGIN, y, 511, 9.5, 14)
    elif index == 2:
        para('Hasil: query ketidaksesuaian pembayaran dan penerimaan kosong. Payroll '
             'menghasilkan lima baris Oktober 2026 dengan total GajiBersih Rp125.690.000,00.',
             MARGIN, y, 511, 9.5, 14)
    else:
        y = table(['DEPARTEMEN', 'ANGGARAN Q4 2026', 'NILAI PO', 'SISA ANGGARAN'], [
            ['Engineering dan IT', '1.000.000.000', '555.000.000', '445.000.000'],
            ['Operasional', '300.000.000', '159.450.000', '140.550.000'],
            ['Keuangan', '150.000.000', '66.600.000', '83.400.000'],
            ['Sumber Daya Manusia', '100.000.000', '36.630.000', '63.370.000'],
            ['Pergudangan', '120.000.000', '43.290.000', '76.710.000'],
        ], [153, 130, 114, 114], y, 8.2, 11.5, 7)
        para('Semua angka tabel dalam rupiah. NilaiPO adalah komitmen PO selain yang ditolak '
             'pada kuartal yang sama, bukan hanya arus kas yang sudah dibayar. Produk di bawah '
             'minimum: PRD003 / NVMe 8TB, stok 8 dari batas minimum 15.', MARGIN, y, 511, 9, 13)
    endpage()

# 23 - Bukti uji, batas pembuktian, dan ringkasan data.
y = page('HASIL PENGUJIAN')
y = title('20 pemeriksaan lulus', y,
          'Dijalankan pada MySQL Community Server 8.0.41, 21 Oktober 2026, '
          'melalui instance sementara terpisah dari data aplikasi.')
rows = [[f'{i:02d}', item['uji'], 'LULUS'] for i, item in enumerate(REPORT['uji'], 1)]
y = table(['NO.', 'PEMERIKSAAN', 'HASIL'], rows, [33, 407, 71], y, 8.4, 11, 5.3)
y = para('<b>Delapan uji negatif:</b> pelanggaran FK ditolak dengan ERROR 1452, '
         'pelanggaran CHECK dengan ERROR 3819, dan duplikasi key dengan ERROR 1062. '
         'Percobaan dijalankan dalam transaksi yang dibatalkan; semua tabel tetap berisi lima baris.',
         MARGIN, y, 511, 9, 13) - 12
y = para('<b>Agregat contoh:</b> total PO dan pembayaran Rp860.970.000,00; payroll Oktober '
         'Rp125.690.000,00; jumlah stok 339 unit. Query subtotal, pembayaran, dan penerimaan '
         'tidak menemukan ketidaksesuaian.', MARGIN, y, 511, 9, 13) - 12
para('Pemeriksaan peran dan urutan tanggal membuktikan konsistensi data contoh. '
     'FK sendiri tidak menegakkan hak akses ataupun seluruh aturan proses bisnis. '
     'Sumber SQL, query, dan rincian hasil uji disertakan dalam paket database/tubes.',
     MARGIN, y, 511, 8.5, 12.5, GRAY)
endpage()

assert PAGE == TOTAL, (PAGE, TOTAL)
C.save()
reader = PdfReader(str(OUT))
assert len(reader.pages) == TOTAL
text = '\n'.join(p.extract_text() for p in reader.pages)
assert len(re.findall(r'CREATE TABLE \w+ \(', text)) == 14
assert len(re.findall(r'INSERT INTO \w+', text)) == 14
for name in CREATES:
    table_text = reader.pages[5 + list(CREATES).index(name)].extract_text()
    # Memastikan semua baris SQL ada pada PDF; spasi indentasi dapat dinormalisasi ekstraktor.
    for statement in [CREATES[name], INSERTS[name]]:
        for line in statement.splitlines():
            assert line.strip() in table_text, (name, line)
print(json.dumps({'pdf': str(OUT), 'pages': len(reader.pages),
                  'create_table': 14, 'insert': 14, 'checks_passed': 20}, indent=2))
