"""Insert reviewed UML models into the retained Inventora documents."""
from __future__ import annotations

import json
import math
import shutil
import subprocess
import sys
from pathlib import Path
from copy import deepcopy

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Inches, Pt, RGBColor
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.text.paragraph import Paragraph
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

sys.stdout.reconfigure(encoding='utf-8')
ROOT = Path('D:/Inventora')
SOURCE = Path('D:/MATERI KULIAH SEMESTER 5 IF TEL-U/Implementasi dan Pengujian Perangkat Lunak')
TMP = ROOT / 'tmp/uml-docs-2026-10-28'
ASSETS = TMP / 'figures'
OUT = ROOT / 'output/docx/uml-2026-10-28'
BACKUP = OUT / 'backup-asli'
for folder in (TMP, ASSETS, OUT, BACKUP):
    folder.mkdir(parents=True, exist_ok=True)
POPPLER = Path('C:/Users/ICHYA ULUMIDDIN/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/poppler/Library/bin/pdftoppm.exe')
pdfmetrics.registerFont(TTFont('TNR', 'C:/Windows/Fonts/times.ttf'))
pdfmetrics.registerFont(TTFont('TNRB', 'C:/Windows/Fonts/timesbd.ttf'))
WIDTH = 473


def wrap(text, max_width, size=12, font='TNR'):
    result = []
    for part in text.split('\n'):
        line = ''
        for word in part.split():
            trial = (line + ' ' + word).strip()
            if line and pdfmetrics.stringWidth(trial, font, size) > max_width:
                result.append(line)
                line = word
            else:
                line = trial
        result.append(line)
    return result


def center_text(c, text, x, y, max_width, size=12, bold=False):
    font = 'TNRB' if bold else 'TNR'
    c.setFont(font, size)
    lines = wrap(text, max_width, size, font)
    leading = size * 1.12
    baseline = y + (len(lines) - 1) * leading / 2 - size * .34
    for line in lines:
        c.drawCentredString(x, baseline, line)
        baseline -= leading


def actor(c, x, top, label):
    c.circle(x, top - 7, 6, stroke=1, fill=0)
    c.line(x, top - 13, x, top - 33)
    c.line(x - 13, top - 22, x + 13, top - 22)
    c.line(x, top - 33, x - 12, top - 48)
    c.line(x, top - 33, x + 12, top - 48)
    lines = wrap(label, 88)
    for i, line in enumerate(lines):
        c.setFont('TNR', 12)
        c.drawCentredString(x, top - 63 - 14 * i, line)
    return (x, top - 22)


def arrow(c, x1, y1, x2, y2, dashed=False):
    if dashed:
        c.setDash(3, 3)
    c.line(x1, y1, x2, y2)
    c.setDash()
    length = math.hypot(x2 - x1, y2 - y1)
    ux, uy = (x2-x1)/length, (y2-y1)/length
    for sign in (-1, 1):
        c.line(x2, y2, x2-ux*6-uy*3*sign, y2-uy*6+ux*3*sign)


def png(pdf):
    prefix = pdf.with_suffix('')
    subprocess.run([str(POPPLER), '-singlefile', '-r', '210', '-png', str(pdf), str(prefix)], check=True, capture_output=True)
    return prefix.with_suffix('.png')


USECASES = [
    ('UC-01', 'Masuk dengan Google', 'Seluruh pengguna', 'Akun Google tersedia dan domain aplikasi diizinkan.', 'Pilih Masuk dengan Google; setujui otorisasi; sistem membaca identitas serta klaim role sebelum membuka modul yang diizinkan.', 'Popup ditutup, otorisasi gagal, atau role belum ditetapkan: akses operasional tidak diberikan.', 'RF-SEC-01/02; RNF-01/02'),
    ('UC-02', 'Memantau dashboard dan notifikasi', 'Seluruh pengguna sesuai izin', 'Sesi dan role sudah terverifikasi.', 'Buka ringkasan; baca metrik sesuai sumber; pilih tahap PO atau notifikasi; buka rincian yang diizinkan.', 'Data belum tersedia ditampilkan sebagai belum tersedia, bukan angka nol.', 'RF-PRC-01; RNF-02/08'),
    ('UC-03', 'Mengubah bahasa dan tema', 'Seluruh pengguna', 'Aplikasi dapat dibuka.', 'Pilih bahasa Indonesia/Inggris atau tema; sistem menerapkan dan menyimpan preferensi browser.', 'Kegagalan penyimpanan browser tidak memberi hak akses tambahan.', 'RF-SEC-03/04'),
    ('UC-04', 'Keluar dari aplikasi', 'Seluruh pengguna', 'Sesi Google atau sesi demo sedang aktif.', 'Pilih Keluar; sistem mengakhiri sesi dan membersihkan konteks sesi; pengguna kembali ke halaman masuk.', 'Sesi demo tetap dibedakan dari autentikasi Firebase.', 'RF-SEC-01/02; RNF-01'),
    ('UC-05', 'Memantau dan menggunakan stok', 'Warehouse Manager, Super Admin', 'Data inventori lokal valid.', 'Cari SKU dan tinjau stok; pilih Deploy; sistem memvalidasi sisa stok lalu menyimpan pengurangan satu unit.', 'SKU tidak dikenal, stok habis atau simpan gagal: pengurangan ditolak.', 'RF-INV-01/02/03/06'),
    ('UC-06', 'Menyusun draf restock', 'Warehouse Manager, Super Admin', 'SKU tersedia dan pengguna berhak membuat PO.', 'Tinjau perkiraan restock; pilih draf; sistem meneruskan SKU dan jumlah ke formulir PO untuk dilengkapi.', 'Prakiraan tidak otomatis menjadi pesanan atau persetujuan pembelian.', 'RF-INV-04; RF-PRC-01'),
    ('UC-07', 'Membuat purchase order', 'Warehouse Manager, Super Admin', 'Vendor, departemen, rincian barang dan tanggal kirim terisi.', 'Isi barang, jumlah, harga, diskon dan pajak; tinjau total; kirim; server memvalidasi lalu membuat PO berstatus Pending Approval.', 'Data tidak valid, ID konflik atau simpan cloud gagal: formulir tidak dinyatakan berhasil. Mode demo menyimpan lokal.', 'RF-PRC-01; RF-POS-01/02 parsial'),
    ('UC-08', 'Memantau dan mengekspor PO', 'Warehouse Manager, Finance Manager, Super Admin', 'Pengguna mempunyai akses pengadaan.', 'Cari dan saring PO pada tabel atau Kanban; buka panel rincian; unduh ekspor yang tersedia.', 'Data PO yang tidak dapat dimuat tidak dianggap sebagai pesanan kosong.', 'RF-PRC-01/02/06'),
    ('UC-09', 'Menyetujui atau menolak PO', 'Finance Manager, Super Admin', 'PO masih berstatus Pending Approval.', 'Tinjau rincian dan pilih keputusan; sistem memvalidasi role serta status terbaru lalu menyimpan transisi.', 'Transisi tidak sah ditolak; persetujuan/penolakan offline dapat masuk antrean untuk sinkronisasi terverifikasi.', 'RF-PRC-04; RF-SEC-09'),
    ('UC-10', 'Mencatat penerimaan barang', 'Warehouse Manager, Super Admin', 'PO disetujui atau penerimaannya perlu diperbaiki.', 'Isi GRN, surat jalan, tanggal, jumlah dan kondisi; server membandingkan dengan PO; simpan hasil dan identitas verifikator.', 'Selisih menghasilkan Selisih Penerimaan. Perbandingan invoice harga bertoleransi 1% tetap merupakan target lanjutan.', 'RF-PRC-03; RNF-04'),
    ('UC-11', 'Membayar PO secara simulasi', 'Finance Manager, Super Admin', 'Barang Diterima, hasil MATCHED dan verifikasi penerimaan valid.', 'Pilih metode demo; sistem menghitung nominal dari PO; simpan paymentInfo dan status Selesai; tampilkan bukti.', 'PO telah dibayar, nilai berubah atau simpan gagal: bukti sukses tidak diterbitkan. Tidak ada transfer dana bank.', 'RF-FIN-03; RF-POS-04/05/06/07 simulasi'),
    ('UC-12', 'Mengelola invoice keuangan', 'Finance Manager, Super Admin', 'Modul keuangan dapat diakses.', 'Tinjau ledger lokal; tandai lunas secara lokal; unduh invoice/bukti atau draf pengingat untuk ditinjau dan dikirim pengguna.', 'Draf email bukan bukti pengiriman. Kegagalan simpan tidak mengubah status invoice.', 'RF-FIN-01/03/04'),
    ('UC-13', 'Menggunakan analisis AI', 'Seluruh pengguna sesuai izin', 'Konteks sesuai role tersedia dan server AI dapat dihubungi.', 'Kirim pertanyaan, konteks risiko atau prakiraan; server memverifikasi akses, menerapkan batas permintaan dan memanggil Gemini; tampilkan hasil atau error yang jelas.', 'Layanan tidak tersedia tidak boleh diklaim sebagai analisis Gemini yang berhasil.', 'RF-AI-01/02/03; RF-INV-04'),
    ('UC-14', 'Mengatur langganan demo', 'Finance Manager, Super Admin', 'Modul billing dapat diakses.', 'Pilih paket, periode dan add-on; simpan konfigurasi lokal; tinjau biaya dan unduh invoice langganan demo.', 'Perubahan paket lokal tidak membuat kontrak atau tagihan penyedia cloud.', 'RF-BIL-01 s.d. 06'),
    ('UC-15', 'Mengelola data dan payroll karyawan', 'HR Manager, Super Admin', 'Modul SDM dan penyimpanan browser tersedia.', 'Cari atau ubah data pegawai; lihat profil; jalankan payroll simulasi untuk periode yang belum diproses; simpan snapshot lokal.', 'Data atau nominal tidak valid dan pemrosesan ganda ditolak. Payroll tidak mencairkan dana bank.', 'RF-HR-01/03'),
    ('UC-16', 'Menjadwalkan onboarding', 'HR Manager, Super Admin', 'Pegawai dipilih dan otorisasi Google Calendar tersedia.', 'Pilih jadwalkan onboarding; dapatkan token Google; kirim event; tampilkan konfirmasi hanya setelah respons API berhasil.', 'Token kedaluwarsa memerlukan otorisasi ulang; gagal API tidak dianggap jadwal berhasil.', 'RF-HR-02'),
    ('UC-17', 'Mencadangkan dan mereset data lokal', 'Super Admin', 'Pengguna berada di Pengaturan.', 'Unduh cadangan JSON data browser; untuk reset, lakukan konfirmasi; sistem membersihkan data lokal dengan mempertahankan preferensi.', 'Cadangan browser bukan cadangan Firestore. Reset tidak menghapus koleksi cloud.', 'RF-SEC-07/08'),
    ('UC-18', 'Checkout penjualan POS tunai', 'Super Admin, Warehouse Manager, Finance Manager', 'Katalog dan stok lokal valid; harga jual diisi atau ditinjau kasir.', 'Pilih SKU; isi harga jual dan jumlah; atur diskon serta pajak; masukkan tunai; sistem memvalidasi ulang, menyimpan transaksi dan pengurangan stok dalam satu snapshot lalu menerbitkan struk.', 'Stok kurang, tunai kurang, harga tidak valid, simpan gagal atau permintaan ulang tidak boleh menghasilkan penjualan ganda.', 'RF-POS-01/02/03/08/09; RF-INV-03'),
    ('UC-19', 'Melihat riwayat dan mencetak ulang struk', 'Super Admin, Warehouse Manager, Finance Manager', 'Transaksi POS sudah tersimpan.', 'Buka riwayat penjualan; pilih transaksi; cetak atau unduh struk berdasarkan snapshot transaksi yang tersimpan.', 'Cetak ulang tidak mengurangi stok lagi. Transaksi penjualan dipisahkan dari dokumen PO.', 'RF-POS-08/09; RNF-04'),
]

CASE_GROUPS = [
    dict(slug='uc-akses', title='Inventora Akses dan pemantauan', ids=[1, 2, 3, 4, 13, 17],
         left=[('Pengguna', [1, 2, 3, 4, 13], .65)],
         right=[('Firebase Auth / Google', [1, 4], .85), ('Gemini', [13], .32), ('Super Admin', [17], .13)],
         text='Pengguna mencakup empat role yang terverifikasi. Analisis AI mengikuti izin konteks masing-masing role. Pencadangan dan reset hanya tersedia bagi Super Admin.'),
    dict(slug='uc-persediaan', title='Inventora Persediaan dan pengajuan', ids=[5, 6, 7],
         left=[('Warehouse Manager atau Super Admin', [5, 6, 7], .65)], right=[],
         text='Warehouse Manager dan Super Admin mengelola stok serta mengajukan PO. Draf restock hanya membawa SKU dan jumlah; vendor serta harga tetap diperiksa sebelum pengajuan.'),
    dict(slug='uc-procurement', title='Inventora Pemrosesan PO', ids=[8, 9, 10, 11],
         left=[('Warehouse Manager atau Super Admin', [8, 10], .65)],
         right=[('Finance Manager atau Super Admin', [8, 9, 11], .65)],
         text='Gudang mencatat penerimaan; finance memutuskan persetujuan dan pembayaran. Pembayaran pada aplikasi merupakan simulasi. Hasil penerimaan yang berselisih menghalangi pelunasan.'),
    dict(slug='uc-keuangan', title='Inventora Keuangan dan langganan', ids=[12, 14],
         left=[('Finance Manager atau Super Admin', [12, 14], .65)], right=[],
         text='Invoice keuangan dan konfigurasi langganan memakai penyimpanan browser. Draf pengingat harus dikirim melalui aplikasi email; perubahan paket tidak menagih layanan cloud.'),
    dict(slug='uc-sdm', title='Inventora Sumber daya manusia', ids=[15, 16],
         left=[('HR Manager atau Super Admin', [15, 16], .65)],
         right=[('Google Calendar', [16], .42)],
         text='Data pegawai dan payroll simulasi disimpan lokal. Jadwal onboarding dibuat pada Google Calendar setelah pengguna memberikan otorisasi dan API mengonfirmasi keberhasilan.'),
    dict(slug='uc-pos', title='Inventora POS Penjualan', ids=[18, 19],
         left=[('Operator POS', [18, 19], .65)], right=[],
         text='Operator POS adalah Super Admin, Warehouse Manager atau Finance Manager. Checkout tunai memakai stok yang sama dengan modul inventori. Transaksi, kembalian dan struk dicatat lokal; POS belum disinkronkan ke Firestore.'),
]


def usecase_diagram(group):
    count = len(group['ids'])
    height = max(300, 90 + count * 64)
    pdf = ASSETS / (group['slug'] + '.pdf')
    c = canvas.Canvas(str(pdf), pagesize=(WIDTH, height))
    c.setStrokeColorRGB(0, 0, 0)
    c.setFillColorRGB(0, 0, 0)
    c.setLineWidth(.8)
    c.rect(108, 20, 258, height - 40)
    center_text(c, group['title'], 237, height - 37, 242, 12, True)
    ys = [height - 86 - i * 64 for i in range(count)]
    if count <= 3:
        ys = [height - 100 - i * 72 for i in range(count)]
    node_y = dict(zip(group['ids'], ys))
    # Associations are drawn first so the ellipse itself masks any line under its label.
    for side in ['left', 'right']:
        for label, ids, factor in group[side]:
            x = 47 if side == 'left' else 426
            top = min(height - 70, max(115, height * factor + 30))
            origin = actor(c, x, top, label)
            edge_x = 126 if side == 'left' else 348
            for number in ids:
                corridor = 101 if side == 'left' else 373
                c.line(origin[0] + (13 if side == 'left' else -13), origin[1], corridor, origin[1])
                c.line(corridor, origin[1], corridor, node_y[number])
                c.line(corridor, node_y[number], edge_x, node_y[number])
    for number, y in node_y.items():
        case = USECASES[number - 1]
        c.setFillColorRGB(1, 1, 1)
        c.ellipse(126, y - 27, 348, y + 27, stroke=1, fill=1)
        c.setFillColorRGB(0, 0, 0)
        center_text(c, f'{case[0]}\n{case[1]}', 237, y, 185, 12)
    c.save()
    source = ['@startuml', 'left to right direction', 'skinparam monochrome true', f'rectangle "{group["title"]}" {{']
    source.extend(f'  usecase "{USECASES[n-1][0]}\\n{USECASES[n-1][1]}" as UC{n}' for n in group['ids'])
    source.append('}')
    for side in ('left', 'right'):
        for index, (label, ids, _) in enumerate(group[side]):
            name=f'{side}{index}'
            source.append(f'actor "{label}" as {name}')
            source.extend(f'{name} -- UC{n}' for n in ids)
    source.append('@enduml')
    (ROOT/'docs/uml-2026-10-28'/f'{group["slug"]}.puml').write_text('\n'.join(source), encoding='utf-8')
    return png(pdf)


SEQUENCES = [
    dict(slug='sd-01-login', title='5.2 Autentikasi Google dan pemeriksaan role', uc='UC-01 dan UC-04',
         participants=['Pengguna', 'Login / Dashboard', 'Firebase Auth', 'Otorisasi UI'],
         steps=[(0,1,'Pilih Masuk Google'), (1,2,'signInWithPopup()'), (2,1,'Identitas dan sesi',True), (1,2,'getIdTokenResult()'), (2,1,'Klaim role',True), (1,3,'Periksa role dan menu'), (3,1,'Izin atau penolakan',True), (1,0,'Dashboard sesuai izin',True), (0,1,'Pilih Keluar'), (1,2,'signOut()'), (1,0,'Halaman masuk',True)],
         text='Login memakai akun Google, bukan form ID dan kata sandi aplikasi. Dashboard membaca custom claim role; akun tanpa role yang dikenal tidak memperoleh akses modul. Sesi demo menggunakan jalur lokal terpisah.',
         sources='src/App.tsx; src/firebase.ts; src/lib/authorization.ts'),
    dict(slug='sd-02-dashboard', title='5.3 Ringkasan dashboard dan rincian PO', uc='UC-02 dan UC-08',
         participants=['Pengguna', 'OverviewView', 'Ringkasan data', 'Firestore / lokal'],
         steps=[(0,1,'Buka dashboard'), (1,2,'Minta data sesuai role'), (2,3,'onSnapshot PO / baca lokal'), (3,2,'Data atau belum tersedia',True), (2,1,'Metrik dan daftar PO',True), (0,1,'Pilih tahap PO'), (1,1,'Saring daftar terbaru'), (0,1,'Pilih satu pesanan'), (1,0,'Buka panel detail PO',True), (3,2,'Perubahan data PO',True), (2,1,'Perbarui rincian aktif',True)],
         text='PO live berasal dari Firestore; stok, SDM dan notifikasi mengikuti penyimpanan yang dipakai masing-masing modul. Panel detail menggunakan pesanan terbaru dan menutup jika pesanan tidak lagi tersedia. Informasi dibatasi berdasarkan role.',
         sources='src/components/OverviewView.tsx; src/components/ProcurementOverview.tsx; src/lib/useWorkspaceSummary.ts'),
    dict(slug='sd-03-pos', title='5.4 Checkout POS tunai dan struk', uc='UC-18 dan UC-19',
         participants=['Operator POS', 'PosView', 'commerce.ts', 'saleReceipt.ts'],
         steps=[(0,1,'Isi SKU, harga, jumlah\ndan pembayaran'), (1,2,'checkoutSale(requestId)'), (2,2,'Kunci dan validasi ulang'), (2,2,'Commit penjualan dan stok'), (2,1,'Transaksi dan kembalian',True), (1,0,'Ringkasan struk tersimpan',True), (0,1,'Pilih Cetak / Unduh PDF'), (1,3,'Buat struk dari transaksi'), (3,0,'PDF atau cetak',True), (0,1,'Pilih transaksi riwayat'), (1,3,'Cetak ulang snapshot')],
         text='Kasir mengisi atau meninjau harga jual. checkoutSale memakai Web Locks dan satu snapshot inventora_commerce_v1 untuk menyimpan penjualan, stok serta mutasi. ID permintaan mencegah checkout ganda. Struk memakai transaksi tersimpan; cetak ulang tidak mengurangi stok. POS ini memakai browser lokal, bukan Firestore.',
         sources='src/components/PosView.tsx; src/lib/commerce.ts; src/lib/saleReceipt.ts'),
    dict(slug='sd-04-po-create', title='5.5 Pembuatan purchase order', uc='UC-06 dan UC-07',
         participants=['Gudang / Admin', 'Form PO', 'Express API', 'Firestore Admin'],
         steps=[(0,1,'Isi vendor dan barang'), (1,1,'Hitung total dan validasi'), (0,1,'Kirim pengajuan PO'), (1,2,'POST /api/purchase-orders'), (2,2,'Verifikasi token dan role'), (2,2,'Validasi nilai serta item'), (2,3,'Transaksi baca ID PO'), (3,2,'PO belum ada / retry sama',True), (2,3,'Create PO Pending Approval'), (3,2,'Commit berhasil',True), (2,1,'201 dan PO tersimpan',True), (1,0,'Konfirmasi pengajuan',True)],
         text='Pembuatan PO live memakai server dan Firebase Admin. ID dan digest permintaan diperiksa agar retry yang sama tidak membuat pesanan kedua. Kegagalan jaringan atau validasi tidak menghasilkan konfirmasi sukses. Mode demo menyimpan PO di browser.',
         sources='src/components/PurchaseUnitView.tsx; src/lib/apiClient.ts; server.ts; server/firebaseAdmin.ts'),
    dict(slug='sd-05-approval', title='5.6 Persetujuan dan penolakan PO', uc='UC-09',
         participants=['Finance / Admin', 'ProcurementView', 'Store transisi PO', 'Firestore'],
         steps=[(0,1,'Pilih setuju atau tolak'), (1,2,'persistPoTransition()'), (2,2,'Baca klaim role'), (2,3,'runTransaction dan get PO'), (3,2,'Status PO terbaru',True), (2,2,'assertPoTransition()'), (2,3,'Update Disetujui / Ditolak'), (3,2,'Commit berhasil',True), (2,1,'Konfirmasi simpan',True), (1,0,'Status dan notifikasi',True)],
         text='Hanya Finance Manager atau Super Admin dapat mengambil keputusan atas PO Pending Approval. Untuk antrean offline, replay hanya menghapus mutasi setelah penyimpanan berhasil; mutationId membantu mencegah penerapan ulang. Transisi tidak sah ditolak.',
         sources='src/components/ProcurementView.tsx; src/lib/purchaseOrderStore.ts; src/lib/procurement.ts'),
    dict(slug='sd-06-receipt', title='5.7 Penerimaan barang dan verifikasi GRN', uc='UC-10',
         participants=['Gudang / Admin', 'Pemeriksaan GRN', 'Express / Admin', 'Firestore'],
         steps=[(0,1,'Isi GRN, qty dan kondisi'), (1,1,'Pratinjau hasil pencocokan'), (0,1,'Simpan penerimaan'), (1,2,'POST PO/{id}/receipt'), (2,2,'Verifikasi token dan role'), (2,3,'Transaksi baca PO terbaru'), (3,2,'Rincian pesanan',True), (2,2,'Validasi item dan kondisi'), (2,3,'Simpan GRN dan verifikator'), (3,2,'Commit berhasil',True), (2,1,'MATCHED / DISCREPANCY',True), (1,0,'Tampilkan status penerimaan',True)],
         text='Server membandingkan seluruh item dan jumlah dengan PO serta memvalidasi kondisi, tanggal dan identitas penerima. Hasil menentukan Barang Diterima atau Selisih Penerimaan. Kode saat ini belum membandingkan harga invoice pemasok dengan toleransi 1%.',
         sources='src/components/ThreeWayMatchModal.tsx; src/lib/goodsReceipt.ts; server/firebaseAdmin.ts'),
    dict(slug='sd-07-payment', title='5.8 Pembayaran PO secara simulasi', uc='UC-11',
         participants=['Finance / Admin', 'PaymentGateway', 'Store transisi PO', 'Firestore'],
         steps=[(0,1,'Pilih kanal pembayaran demo'), (1,1,'Gunakan total PO tersimpan'), (0,1,'Konfirmasi simulasi'), (1,2,'onPaymentSuccess(tx)'), (2,3,'Baca PO dalam transaksi'), (3,2,'PO dan verifikasi GRN',True), (2,2,'Cek role, match, total'), (2,3,'Simpan paymentInfo + Selesai'), (3,2,'Commit berhasil',True), (2,1,'Pembayaran tercatat',True), (1,0,'Bukti simulasi tersedia',True)],
         text='Modal mensimulasikan proses pembayaran dan tidak menghubungi bank. Keberhasilan baru ditampilkan setelah callback simpan selesai. Transaksi memeriksa total, status dan verifikasi GRN terbaru; PO yang telah dibayar tidak diproses lagi.',
         sources='src/components/PaymentGatewayModal.tsx; src/components/ProcurementView.tsx; src/lib/purchaseOrderStore.ts'),
    dict(slug='sd-08-inventory', title='5.9 Deploy inventori dan draf restock', uc='UC-05 dan UC-06',
         participants=['Gudang / Admin', 'InventoryView', 'Store inventori', 'PurchaseUnitView'],
         steps=[(0,1,'Cari SKU dan tinjau stok'), (1,2,'Baca inventori terbaru'), (2,1,'Data stok',True), (0,1,'Pilih Deploy'), (1,2,'Validasi dan kurangi satu'), (2,2,'Simpan snapshot lokal'), (2,1,'Stok setelah simpan',True), (1,0,'Perbarui tabel dan ringkasan',True), (0,1,'Pilih draf restock'), (1,3,'Teruskan SKU dan qty'), (3,0,'Form PO untuk dilengkapi',True)],
         text='Deploy dan POS menggunakan sumber inventori yang sama. Deploy hanya mengurangi stok ketika penyimpanan berhasil. Prakiraan restock memberi saran; tombol draf tidak otomatis membuat PO atau mengubah stok.',
         sources='src/components/InventoryView.tsx; src/lib/commerce.ts; src/components/RestockForecastCard.tsx'),
    dict(slug='sd-09-ai', title='5.10 Permintaan analisis AI', uc='UC-13',
         participants=['Pengguna', 'Komponen AI', 'Express API', 'Gemini'],
         steps=[(0,1,'Kirim pertanyaan / analisis'), (1,2,'POST konteks sesuai izin'), (2,2,'Verifikasi token dan role'), (2,2,'Terapkan batas permintaan'), (2,3,'generateAiContent()'), (3,2,'Hasil atau gangguan layanan',True), (2,1,'Respons hasil / kode error',True), (1,0,'Tampilkan hasil atau error',True)],
         text='Komponen copilot, analitik, risiko PO, parser teks dan prakiraan memakai endpoint sesuai fungsinya. API key disimpan pada server. Respons gagal tidak menjadi persetujuan PO atau bukti bahwa analisis model berhasil.',
         sources='src/components/AiCopilotDrawer.tsx; server.ts; server/ai.ts; server/auth.ts'),
    dict(slug='sd-10-hr', title='5.11 Onboarding melalui Google Calendar', uc='UC-15 dan UC-16',
         participants=['HR / Admin', 'HRView', 'Otorisasi Google', 'Google Calendar'],
         steps=[(0,1,'Pilih pegawai dan jadwal'), (1,2,'getAccessToken()'), (2,2,'Periksa token / otorisasi ulang'), (2,1,'Access token atau batal',True), (1,3,'POST calendars/primary/events'), (3,1,'201 / respons gagal',True), (1,0,'Konfirmasi hanya jika sukses',True)],
         text='Akun memerlukan scope calendar.events. Pada respons 401, aplikasi dapat memperbarui otorisasi lalu mencoba sekali lagi. Tanpa token atau saat API gagal, jadwal tidak dinyatakan berhasil; data pegawai tetap tersimpan lokal.',
         sources='src/components/HRView.tsx; src/firebase.ts'),
    dict(slug='sd-11-local', title='5.12 Invoice dan konfigurasi langganan lokal', uc='UC-12, UC-14 dan UC-17',
         participants=['Pengguna berizin', 'Finance / Billing', 'localStorage', 'Pembuat dokumen'],
         steps=[(0,1,'Pilih invoice / konfigurasi'), (1,2,'Baca data tersimpan'), (2,1,'Record lokal',True), (0,1,'Tandai lunas / simpan paket'), (1,2,'Simpan perubahan lokal'), (2,1,'Berhasil atau gagal',True), (1,0,'Konfirmasi setelah simpan',True), (0,1,'Unduh invoice / draf'), (1,3,'Bangun dari record tersimpan'), (3,0,'Berkas PDF atau EML',True)],
         text='Keuangan dan billing tidak memakai settlement bank atau penagihan cloud nyata. Draf EML harus diperiksa dan dikirim pengguna. Backup pada Pengaturan membaca data browser; reset lokal memerlukan konfirmasi dan tidak menghapus Firestore.',
         sources='src/components/FinanceView.tsx; src/components/BillingSubscriptionView.tsx; src/lib/storageUtils.ts'),
]


def sequence_diagram(data):
    # Every request/response receives its own vertical slot; labels do not share arrow baselines.
    n = len(data['steps'])
    slots = [50 if step[0] == step[1] else 34 for step in data['steps']]
    height = 129 + sum(slots)
    pdf = ASSETS / (data['slug'] + '.pdf')
    c = canvas.Canvas(str(pdf), pagesize=(WIDTH, height))
    xs = [51, 175, 299, 423]
    header_top = height - 8
    header_bottom = height - 62
    baseline_bottom = 16
    c.setLineWidth(.8)
    for i, (x, name) in enumerate(zip(xs, data['participants'])):
        if i == 0:
            actor(c, x, header_top - 1, name)
        else:
            c.setFillColorRGB(.96, .96, .96)
            c.rect(x - 48, header_bottom, 96, 54, fill=1, stroke=1)
            c.setFillColorRGB(0, 0, 0)
            center_text(c, name, x, header_bottom + 27, 88, 12, True)
        c.setDash(4, 3)
        c.line(x, header_bottom - 23, x, baseline_bottom)
        c.setDash()
    first_y = height - 130
    ys = []
    cursor = first_y
    for slot in slots:
        ys.append(cursor)
        cursor -= slot
    # Activation bars denote the scope of each participant's work in this interaction.
    for index, x in enumerate(xs):
        involved = [i for i, s in enumerate(data['steps']) if index in (s[0], s[1])]
        if not involved:
            continue
        top = ys[min(involved)] + 4
        bottom = ys[max(involved)] - 11
        c.setFillColorRGB(.92, .92, .92)
        c.rect(x-3, bottom, 6, top-bottom, fill=1, stroke=1)
        c.setFillColorRGB(0, 0, 0)
    for index, step in enumerate(data['steps']):
        a, b, label = step[:3]
        response = len(step) > 3 and step[3]
        y = ys[index]
        xa, xb = xs[a], xs[b]
        if a == b:
            elbow = xa + 43
            c.line(xa+3, y, elbow, y)
            c.line(elbow, y, elbow, y-12)
            arrow(c, elbow, y-12, xa+3, y-12, response)
            # Put self-call text fully in its lane, clear of the participant lifeline.
            lines = wrap(label, 106, 12)
            c.setFont('TNR', 12)
            for j,line in enumerate(lines):
                c.drawString(xa+10, y+7+(len(lines)-j-1)*13.44, line)
        else:
            start = xa + (3 if xb > xa else -3)
            end = xb + (-3 if xb > xa else 3)
            arrow(c, start, y, end, y, response)
            center_text(c, label, (xa+xb)/2, y+16, abs(xb-xa)-8, 12)
    c.save()
    puml = ['@startuml', 'skinparam monochrome true', 'hide footbox']
    for i, name in enumerate(data['participants']):
        puml.append(f'{"actor" if i == 0 else "participant"} "{name}" as P{i}')
    puml.extend(f'P{s[0]} {"-->" if len(s)>3 and s[3] else "->"} P{s[1]}: {s[2]}' for s in data['steps'])
    puml.append('@enduml')
    (ROOT/'docs/uml-2026-10-28'/f'{data["slug"]}.puml').write_text('\n'.join(puml), encoding='utf-8')
    return png(pdf)


def font(run, bold=None):
    run.font.name = 'Times New Roman'
    run.font.size = Pt(12)
    run.font.color.rgb = RGBColor(0, 0, 0)
    if bold is not None:
        run.bold = bold
    props = run._r.get_or_add_rPr()
    rfonts = props.get_or_add_rFonts()
    for attr in ('ascii', 'hAnsi', 'eastAsia', 'cs'):
        rfonts.set(qn(f'w:{attr}'), 'Times New Roman')
    color = props.find(qn('w:color'))
    if color is not None:
        for attr in ('themeColor', 'themeTint', 'themeShade'):
            color.attrib.pop(qn(f'w:{attr}'), None)


class Inserter:
    def __init__(self, doc, before):
        self.doc = doc
        self.before = before

    def p(self, text='', style='Normal', page_break=False, keep=False):
        p = self.doc.add_paragraph(style=style)
        self.before.addprevious(p._p)
        if text:
            font(p.add_run(text), style.startswith('Heading'))
        pf = p.paragraph_format
        pf.line_spacing = 1.5
        pf.space_after = Pt(6)
        pf.space_before = Pt(0)
        pf.keep_with_next = keep or style.startswith('Heading')
        pf.widow_control = True
        pf.page_break_before = page_break
        return p

    def image(self, path, caption, height_limit=515):
        from PIL import Image
        width, height = Image.open(path).size
        physical_width = min(473, height_limit / height * width)
        p = self.p(keep=True)
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.line_spacing = 1
        p.paragraph_format.space_after = Pt(3)
        shape = p.add_run().add_picture(str(path), width=Pt(physical_width))
        shape._inline.docPr.set('descr', caption)
        cp = self.p(caption, 'Caption')
        cp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        cp.paragraph_format.space_after = Pt(10)
        cp.paragraph_format.keep_with_next = False
        return cp

    def table(self, headers, rows, widths):
        table = self.doc.add_table(rows=1, cols=len(headers))
        self.before.addprevious(table._tbl)
        table.autofit = False
        for i, width in enumerate(widths):
            table.columns[i].width = Pt(width)
        for i, text in enumerate(headers):
            table.rows[0].cells[i].text = text
        for row in rows:
            cells = table.add_row().cells
            for i, text in enumerate(row):
                cells[i].text = str(text)
        for ri, row in enumerate(table.rows):
            trpr = row._tr.get_or_add_trPr()
            if ri == 0:
                trpr.append(OxmlElement('w:tblHeader'))
            else:
                trpr.append(OxmlElement('w:cantSplit'))
            for ci, cell in enumerate(row.cells):
                cell.width = Pt(widths[ci])
                cell.vertical_alignment = 1
                pr = cell._tc.get_or_add_tcPr()
                margins = OxmlElement('w:tcMar')
                for side in ('top', 'left', 'bottom', 'right'):
                    item = OxmlElement(f'w:{side}')
                    item.set(qn('w:w'), '90')
                    item.set(qn('w:type'), 'dxa')
                    margins.append(item)
                pr.append(margins)
                borders = OxmlElement('w:tcBorders')
                for side in ('top', 'left', 'bottom', 'right'):
                    edge = OxmlElement(f'w:{side}')
                    for attr,value in [('val','single'),('sz','4'),('color','D9D9D9')]:
                        edge.set(qn('w:'+attr),value)
                    borders.append(edge)
                pr.append(borders)
                if ri == 0:
                    shade = OxmlElement('w:shd')
                    shade.set(qn('w:fill'), 'EFEFEF')
                    pr.append(shade)
                for p in cell.paragraphs:
                    p.paragraph_format.line_spacing = 1.5
                    p.paragraph_format.space_after = Pt(3)
                    p.paragraph_format.space_before = Pt(0)
                    for r in p.runs:
                        font(r, ri == 0)
        self.p()
        return table


def replace_section(doc, start_text, end_text):
    paragraphs = doc.paragraphs
    start = next(p._p for p in paragraphs if p.text == start_text and p.style.name == 'Heading 1')
    end = next(p._p for p in paragraphs if p.text == end_text and p.style.name == 'Heading 1')
    current = start.getnext()
    while current is not None and current is not end:
        next_node = current.getnext()
        current.getparent().remove(current)
        current = next_node
    return Inserter(doc, end)


def normalize_new_and_existing(doc, kind):
    # Preserve template geometry, cover logo, headers, footers and table structure.
    # Keep the retained style catalogue intact. Rewriting every latent Word style
    # causes PDF export to loop in this template; visible runs are formatted below.
    for i,p in enumerate(doc.paragraphs):
        if p.text.strip():
            p.paragraph_format.line_spacing=1.5
        for run in p.runs:
            if run.text:
                font(run)
        if i==1:
            p.style=doc.styles['Title']
            for r in p.runs:
                font(r,True)
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                for p in cell.paragraphs:
                    p.paragraph_format.line_spacing=1.5
                    for r in p.runs:
                        font(r)
    for section in doc.sections:
        for p in section.header.paragraphs:
            for r in p.runs:
                font(r)
        for p in section.footer.paragraphs:
            # Replace only the cached date; keep the PAGE field intact.
            for r in p.runs:
                if '29 September 2026' in r.text:
                    r.text=r.text.replace('29 September 2026','28 Oktober 2026')
                font(r)
    # Record the split between retained baseline and current diagrams explicitly.
    target = next(p for p in doc.paragraphs if p.text.startswith('1. Pendahuluan') and p.style.name == 'Heading 1')
    paragraph=doc.add_paragraph()
    target._p.addnext(paragraph._p)
    paragraph.paragraph_format.line_spacing=1.5
    font(paragraph.add_run('Pembaruan 28 Oktober 2026: diagram pada Bab 5 menggambarkan implementasi Inventora terkini, termasuk POS tunai lokal. Istilah baseline dan status fitur pada bagian lain tetap merujuk snapshot ZIP awal; kebutuhan target yang belum diterapkan tidak dinyatakan selesai.'))


def prepare_source(kind):
    name=f'{kind}_Inventora_Rapi (1).docx'
    original=SOURCE/name
    backup=BACKUP/name
    if not backup.exists():
        shutil.copy2(original,backup)
    return Document(backup), name


def build_skpl():
    doc,name=prepare_source('SKPL')
    ins=replace_section(doc,'5. Use case utama','6. Kebutuhan nonfungsional')
    ins.p('Model use case memisahkan tujuan pengguna dari rincian teknis penyimpanan. Aktor internal mengikuti empat role yang telah tersedia. Firebase Auth, Gemini dan Google Calendar ditampilkan sebagai sistem pendukung di luar batas Inventora. Purchase Staff belum menjadi role yang diterapkan.')
    ins.p('Login merupakan prasyarat untuk fungsi operasional, sehingga tidak ditarik sebagai relasi include pada setiap use case. Kelompok aktor yang ditulis dengan kata atau menunjukkan dua role yang memiliki kewenangan sama untuk tindakan tersebut.')
    for index,group in enumerate(CASE_GROUPS,1):
        ins.p(f'5.{index} {group["title"].replace("Inventora ","")}', 'Heading 2', page_break=True)
        ins.p(group['text'])
        ins.image(usecase_diagram(group), f'Gambar {index}. Use case {group["title"].replace("Inventora ","")}.')
    ins.p('5.7 Daftar use case dan ketertelusuran','Heading 2',page_break=True)
    ins.table(['ID','Tujuan dan aktor','Kebutuhan terkait'],[(a,b+'\n'+c,g) for a,b,c,d,e,f,g in USECASES],[53,255,165])
    ins.p('5.8 Skenario utama dan kegagalan','Heading 2',page_break=True)
    for code,title,actors,pre,main,alternative,links in USECASES:
        ins.p(f'{code} {title}','Heading 3')
        ins.p(f'Prakondisi: {pre} Alur: {main} Alternatif: {alternative}')
    # Clarify the earlier actor table instead of silently converting target role into an implemented role.
    for table in doc.tables:
        if table.cell(0,0).text=='Aktor':
            for row in table.rows:
                if row.cells[0].text=='Purchase Staff':
                    row.cells[1].text='Role target dalam master feature list; belum menjadi role pada implementasi. Pembuatan PO saat ini dilakukan Warehouse Manager atau Super Admin.'
    for p in doc.paragraphs:
        if p.text.startswith('Catatan baseline: tipe Role'):
            p.text='Kode terkini memakai empat role. Purchase Staff tetap dicatat sebagai kebutuhan target dan tidak digunakan sebagai aktor implementasi pada diagram Bab 5. Operator POS pada diagram adalah pengguna dengan role Super Admin, Warehouse Manager atau Finance Manager.'
        elif p.text.startswith('Form PurchaseUnitView adalah pembuatan Purchase Order'):
            p.text='PurchaseUnitView digunakan untuk pembuatan PO. Pembaruan 28 Oktober 2026 menambahkan PosView untuk checkout penjualan tunai, kembalian, pengurangan stok lokal, riwayat dan struk. Pembayaran non-tunai serta OCR foto/PDF untuk POS tetap merupakan target.'
        elif p.text.startswith('src/types.ts mencantumkan empat role, bukan lima.'):
            p.text='Kode terkini mencantumkan empat role. Aturan Firestore dalam kode telah menggunakan pemeriksaan role; create PO dan verifikasi GRN melalui Firebase Admin. Status deployment aturan ke cloud tidak diverifikasi dalam dokumen ini. Catatan allow true merujuk ZIP awal.'
    normalize_new_and_existing(doc,'SKPL')
    output=OUT/name
    doc.save(output)
    return output


def build_dppl():
    doc,name=prepare_source('DPPL')
    ins=replace_section(doc,'5. Rancangan alur dan interaksi','6. Antarmuka, API, dan dokumen keluaran')
    ins.p('Sequence diagram menjelaskan urutan pesan pada implementasi Inventora. Garis vertikal putus-putus adalah lifeline; balok tipis menandai aktivasi; panah utuh adalah permintaan dan panah putus-putus adalah respons. Label Gudang/Admin dan Finance/Admin merujuk role yang diizinkan, bukan role baru.')
    ins.p('5.1 Batas penyimpanan dan kondisi gagal','Heading 2')
    ins.p('PO live ditulis ke Firestore melalui API Firebase Admin untuk pembuatan dan penerimaan, serta transaksi klien untuk persetujuan dan pembayaran. POS, inventori, keuangan, billing dan SDM menggunakan data lokal sesuai implementasinya. Login, Calendar dan Gemini tetap memerlukan konfigurasi serta koneksi layanan masing-masing.')
    ins.p('Diagram menunjukkan alur berhasil. Pada kegagalan validasi, izin atau simpan, kontrol kembali kepada pemanggil dengan error; langkah sukses sesudah titik gagal tidak dijalankan. Pembayaran PO, payroll dan billing yang bertanda simulasi tidak mewakili perpindahan dana nyata.')
    for index,data in enumerate(SEQUENCES,3):
        ins.p(data['title'],'Heading 2',page_break=True)
        ins.p(f'Keterkaitan: {data["uc"]}. {data["text"]}')
        ins.image(sequence_diagram(data), f'Gambar {index}. Sequence {data["title"].split(" ",1)[1]}.', height_limit=510)
        p=ins.p('Komponen: '+data['sources'])
        p.paragraph_format.space_after=Pt(0)
    ins.p('5.13 Pemetaan implementasi','Heading 2',page_break=True)
    ins.table(['Sequence','Use case','Batas proses'],[
        ('SD-01','UC-01, UC-04','Autentikasi Google dan penutupan sesi.'),
        ('SD-02','UC-02, UC-08','Baca ringkasan sesuai role dan rincian PO.'),
        ('SD-03','UC-18, UC-19','Penjualan tunai lokal; bukan purchase order.'),
        ('SD-04','UC-06, UC-07','Pengajuan PO live melalui server; demo lokal.'),
        ('SD-05','UC-09','Keputusan finance atas status pending.'),
        ('SD-06','UC-10','Verifikasi GRN; invoice harga masih target.'),
        ('SD-07','UC-11','Pembayaran PO simulasi dengan gate penerimaan.'),
        ('SD-08','UC-05, UC-06','Deploy lokal dan penerusan draf restock.'),
        ('SD-09','UC-13','Analisis Gemini melalui API terotorisasi.'),
        ('SD-10','UC-15, UC-16','Onboarding Calendar; data SDM tetap lokal.'),
        ('SD-11','UC-12, UC-14, UC-17','Penyimpanan lokal dan keluaran dokumen.'),
    ],[67,98,308])
    updates = {
        '2.3 Rancangan perluasan untuk POS': '2.3 Implementasi POS tunai dan perluasan target',
        '3.1 Point of Sale (POS) & Checkout Engine': '3.1 Point of Sale dan checkout tunai',
    }
    for p in doc.paragraphs:
        if p.text in updates:
            p.text=updates[p.text]
        elif p.text.startswith('Master feature list menetapkan POS sebagai modul 1.'):
            p.text='Pembaruan POS tunai diterapkan melalui PosView, commerce.ts dan saleReceipt.ts. Operator memilih SKU dari inventori bersama, mengisi harga jual dan jumlah, mengatur diskon per barang serta PPN simulasi 0% atau 11%, lalu memasukkan uang tunai. Setelah validasi ulang, checkout menyimpan SaleTransaction beserta perubahan inventori dan mutasi dalam satu snapshot browser. Kanal pembayaran non-tunai penjualan, sinkronisasi cloud POS dan OCR foto/PDF tetap merupakan target lanjutan.'
        elif p.text.startswith('Baseline: Target UI terdiri dari pencarian SKU'):
            p.text='Implementasi 28 Oktober 2026: PosView menampilkan pencarian SKU, keranjang, harga jual, jumlah, diskon, pilihan PPN simulasi, tunai, kembalian dan riwayat. Role Super Admin, Warehouse Manager serta Finance Manager dapat memakai POS. HR Manager tidak diizinkan. Pembayaran non-tunai pada PaymentGatewayModal tetap merupakan simulasi pembayaran PO, bukan pembayaran penjualan POS.'
        elif p.text.startswith('Kontrak data dan proses: Input: SKU, qty, harga terverifikasi'):
            p.text='Kontrak POS: requestId, SKU, qty, harga jual yang ditinjau kasir, diskon, taxRate dan amountPaid diteruskan ke checkoutSale. Validasi menggunakan stok terbaru dan integer rupiah. SaleTransaction menyimpan snapshot items, subtotal, discount, tax, total, amountPaid, change, actor dan waktu. Web Locks mengurutkan perubahan; commit localStorage menyimpan inventori, sales dan movements sekaligus.'
        elif p.text.startswith('Penyelarasan target: Terapkan cash + change;'):
            p.text='Batas implementasi: checkout tunai, kembalian, pengurangan stok lokal, riwayat dan struk sudah ditambahkan. Database penjualan bersama, pembayaran bank nyata, QR dinamis dan parser foto/PDF belum menjadi alur POS ini. Browser memerlukan Web Locks pada HTTPS atau localhost; kegagalan validasi, kunci atau simpan tidak menerbitkan transaksi sukses.'
        elif p.text.startswith('Client: POSView'):
            p.text='Client: PosView mengelola keranjang, pencarian SKU, harga jual, diskon, pajak simulasi serta tunai dan kembalian dalam integer rupiah.'
        elif p.text.startswith('Domain: CheckoutService'):
            p.text='Domain: checkoutSale memvalidasi harga, jumlah, stok, diskon, pajak dan tunai dengan requestId untuk mencegah transaksi ganda.'
        elif p.text.startswith('Persistensi: SaleTransaction'):
            p.text='Persistensi: Web Locks mengurutkan perubahan. Satu commit inventora_commerce_v1 menyimpan SaleTransaction, inventori dan StockMovement di browser lokal.'
        elif p.text.startswith('Dokumen: ReceiptRenderer'):
            p.text='Dokumen: saleReceipt.ts membuat struk thermal 80 mm dan PDF dari snapshot transaksi tersimpan; cetak ulang tidak mengurangi stok.'
        elif p.text.startswith('Payment: cash dihitung lokal'):
            p.text='Pembayaran: POS menerima tunai. QRIS, VA, kartu dan transfer pada modul PO adalah simulasi terpisah; kanal non-tunai POS tetap target.'
        elif p.text.startswith('Gambar 2. ERD logis;'):
            p.text='Gambar 2. ERD konseptual pada baseline. POS terkini menyimpan SaleTransaction dengan items[] lokal; AuditEvent tetap target.'
        elif p.text.startswith('Batas: tidak ditemukan endpoint settlement bank'):
            p.text='Batas: API pada tabel berasal dari baseline. Kode terkini juga memuat POST /api/purchase-orders dan POST /api/purchase-orders/:id/receipt dengan pemeriksaan token serta role. POS memakai transaksi browser lokal. Settlement bank dan pengiriman email invoice belum menjadi API nyata.'
    for table in doc.tables:
        header=[c.text for c in table.rows[0].cells]
        if header[0]=='Entitas':
            for row in table.rows[1:]:
                if row.cells[0].text=='Product':
                    row.cells[1].text='id/SKU, name, desc, stock, stockMin dan unitPrice opsional; harga dalam integer rupiah.'
                    row.cells[2].text='Inventori dan POS berbagi snapshot commerce lokal.'
                    row.cells[3].text='Kasir meninjau atau mengisi harga jual. Harga katalog pengadaan adalah sumber terpisah.'
                elif row.cells[0].text=='SaleTransaction':
                    row.cells[1].text='id, requestId, actorId/name, waktu, items, subtotal, discount, taxRate, tax, total, amountPaid, change, method, scope.'
                    row.cells[2].text='checkoutSale pada src/lib/commerce.ts; transaksi penjualan tunai lokal.'
                    row.cells[3].text='Tersimpan dalam sales[] pada snapshot inventora_commerce_v1, bukan tabel SQL atau koleksi Firestore.'
                elif row.cells[0].text=='SaleLine':
                    row.cells[1].text='sku, name, quantity, unitPrice, discountPercent, gross, discount dan total.'
                    row.cells[2].text='items[] yang di-embed di SaleTransaction.'
                    row.cells[3].text='Harga dan rincian penjualan tetap tersimpan untuk struk ulang; bukan tabel fisik terpisah.'
        if header[0]=='Media':
            for row in table.rows[1:]:
                if row.cells[0].text=='Firestore':
                    row.cells[1].text='Koleksi purchaseOrders; create PO dan GRN melalui Firebase Admin; approval dan payment memakai runTransaction klien.'
                    row.cells[2].text='Rules dalam kode memakai role, transisi status dan pembatasan field; status deployment cloud belum diverifikasi. POS lokal tidak menjadi koleksi Firestore.'
                elif row.cells[0].text=='localStorage':
                    row.cells[1].text='inventora_commerce_v1 menyimpan version, inventory, sales dan movements. Key modul lain menyimpan PO demo, keuangan, SDM, payroll, preferensi dan billing.'
                    row.cells[2].text='Migrasi awal membaca inventora_inventory_v1 tanpa menghapusnya; setelah commit, snapshot commerce menjadi sumber inventori. Backup adalah cakupan browser lokal.'
        if header[0]=='Komponen':
            for row in table.rows[1:]:
                if row.cells[0].text=='App.tsx / Dashboard':
                    row.cells[1].text='Navigasi sesuai role, overview, login dan pemuatan modul POS.'
                    row.cells[2].text='authorization, firebase, commerce dan komponen workspace.'
        if header[0]=='Halaman / modal':
            for row in table.rows[1:]:
                if row.cells[0].text=='Checkout POS (target)':
                    row.cells[0].text='PosView (POS lokal)'
                    row.cells[1].text='Pencarian SKU, keranjang, harga jual, diskon, pajak simulasi, tunai/kembalian, riwayat, cetak/PDF.'
        if header[0]=='Dokumen':
            for row in table.rows[1:]:
                if row.cells[0].text=='Receipt POS thermal':
                    row.cells[2].text='Pembaruan: saleReceipt.ts, thermal 80 mm dari SaleTransaction tersimpan.'
                elif row.cells[0].text=='Receipt/invoice PDF':
                    row.cells[2].text='saleReceipt.ts untuk struk POS; pdfGenerator.ts untuk PO dan invoice.'
        if header[0]=='ID' and len(header)>2:
            for row in table.rows[1:]:
                if row.cells[0].text in ('RF-POS-01','RF-POS-02','RF-POS-03','RF-POS-08','RF-POS-09'):
                    if 'Belum ada alur kasir tunai' in row.cells[2].text or row.cells[0].text=='RF-POS-03':
                        row.cells[2].text='PosView.tsx; commerce.ts; saleReceipt.ts. Pembaruan 28 Oktober 2026: checkout tunai, kembalian dan struk lokal.'
                    elif row.cells[0].text in ('RF-POS-08','RF-POS-09'):
                        row.cells[2].text='src/lib/saleReceipt.ts: struk POS PDF dan cetak dari SaleTransaction tersimpan; dokumen PO tetap terpisah.'
                    else:
                        row.cells[2].text='src/components/PosView.tsx; src/lib/commerce.ts. Katalog SKU bersama, keranjang, diskon per item dan PPN simulasi.'
                    row.cells[3].text='Pembaruan lokal; integrasi pembayaran bank dan cloud POS belum tersedia.'
    for p in doc.paragraphs:
        if p.text.startswith('Firestore production rules harus membatasi'):
            p.text='Aturan dalam kode terkini membatasi akses purchaseOrders berdasarkan role, status dan field. Pembuatan PO serta pencatatan GRN dilakukan server Firebase Admin. Aturan allow true adalah kondisi ZIP awal; status deployment cloud belum diverifikasi dalam dokumen ini.'
    for table in doc.tables:
        if table.cell(0,0).text=='Risiko':
            for row in table.rows[1:]:
                if row.cells[0].text=='Database terbuka':
                    row.cells[1].text='ZIP awal memakai allow true. Kode terkini memakai rules berbasis role; deployment cloud belum diverifikasi.'
                    row.cells[2].text='Pertahankan default deny, izin role dan pengujian rules; deploy melalui prosedur proyek.'
    # Keep retained figures together with their captions in the final pagination.
    paragraphs=doc.paragraphs
    for index,p in enumerate(paragraphs):
        if p._p.xpath('.//w:drawing') and index+1<len(paragraphs):
            if paragraphs[index+1].text.startswith('Gambar '):
                p.paragraph_format.keep_with_next=True
    # Earlier diagrams remain explicitly marked baseline/conceptual.
    normalize_new_and_existing(doc,'DPPL')
    output=OUT/name
    doc.save(output)
    return output


if __name__=='__main__':
    skpl=build_skpl()
    dppl=build_dppl()
    info={'working_documents':[str(skpl),str(dppl)],'use_case_diagrams':len(CASE_GROUPS),'sequence_diagrams':len(SEQUENCES),'use_cases':len(USECASES),'original_backups':str(BACKUP)}
    (TMP/'manifest.json').write_text(json.dumps(info,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(info,ensure_ascii=False))
