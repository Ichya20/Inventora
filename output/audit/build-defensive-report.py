from pathlib import Path
from xml.sax.saxutils import escape
import json
from reportlab.pdfgen import canvas
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

ROOT = Path(__file__).resolve().parents[2]
DATA = json.loads((ROOT/'output/defensive-programming/Inventora_Data_Uji_ERROR_3_Form.json').read_text(encoding='utf-8'))
OUT = ROOT/'output/pdf/Inventora_Data_Uji_ERROR_3_Form.pdf'
OUT.parent.mkdir(exist_ok=True, parents=True)
for name, filename in [('TNR','times.ttf'),('TNR-Bold','timesbd.ttf'),('TNR-Italic','timesi.ttf'),('TNR-BoldItalic','timesbi.ttf'),('Consolas','consola.ttf')]:
    pdfmetrics.registerFont(TTFont(name, str(Path('C:/Windows/Fonts')/filename)))
pdfmetrics.registerFontFamily('TNR', normal='TNR', bold='TNR-Bold', italic='TNR-Italic', boldItalic='TNR-BoldItalic')
base=ParagraphStyle('Body', fontName='TNR',fontSize=12,leading=18,textColor=colors.black,spaceAfter=8,alignment=TA_JUSTIFY)
left=ParagraphStyle('Left',parent=base,alignment=TA_LEFT,spaceAfter=0)
head=ParagraphStyle('Heading',parent=base,fontName='TNR-Bold',spaceBefore=10,spaceAfter=8,keepWithNext=True,alignment=TA_LEFT)
title=ParagraphStyle('Title',parent=base,fontName='TNR-Bold',alignment=TA_CENTER,spaceAfter=10,keepWithNext=True)
W=A4[0]-5*cm
story=[]

def p(text, style=base):
    return Paragraph(text,style)
def code(text):
    return '<font name="Consolas" size="11">'+escape(text)+'</font>'
def add(text,style=base):
    story.append(p(text,style))
def table(rows,widths,header=True):
    cells=[[v if isinstance(v,Paragraph) else p(str(v),left) for v in row] for row in rows]
    t=Table(cells,colWidths=widths,repeatRows=1 if header else 0,hAlign='LEFT')
    t.setStyle(TableStyle([
        ('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),7),('RIGHTPADDING',(0,0),(-1,-1),7),
        ('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7),
        ('GRID',(0,0),(-1,-1),0.5,colors.black),
    ]))
    story.append(t);story.append(Spacer(1,10))

add('DATA UJI ERROR UNTUK 3 FORM<br/>APLIKASI INVENTORA',title)
add('Tugas Kelompok - Implementasi dan Pengujian Perangkat Lunak',title)
add('18 November 2026',title)
add('1. Form dan kesalahan yang diperiksa',head)
add('PO baru, penerimaan barang, dan kasir penjualan mengolah jumlah barang serta nilai transaksi. Jumlah pecahan, penerimaan tanpa nama petugas, atau pembayaran yang kurang tidak boleh lolos hanya karena kolomnya terisi. Data latihan dibuat terpisah dari transaksi pengguna.')
add('Materi <i>Defensive Programming</i> meminta pemeriksaan masukan dari form, jaringan, dan penyimpanan (halaman 2-3 dan 12-16). Pada Inventora, jumlah 1,5 unit tetap salah meskipun subtotalnya benar. Pemeriksaan harus mencakup batas jumlah, kelengkapan identitas, dan kecocokan rincian dengan total.')
add('Inventora memakai Firebase/Firestore. Contoh SQL pada materi tidak dijadikan query aplikasi. Data uji mengikuti validator PO, GRN, dan POS; XSS serta otorisasi menyeluruh belum diperiksa.')
table([
    ['<b>Form yang dipilih</b>','<b>Bagian aplikasi</b>','<b>Kasus ERROR</b>'],
    ['PO baru','Pengadaan / PO Baru','12'],
    ['Penerimaan barang (GRN)','Pemeriksaan barang dari PO','12'],
    ['Kasir penjualan (POS)','Keranjang dan pembayaran tunai','12'],
],[W*.35,W*.45,W*.20])
add('2. Keterangan data uji',head)
add('Setiap kasus memakai data awal yang valid, lalu mengubah satu bagian yang hendak diperiksa. Pada uji jumlah pecahan PO, subtotal dan total ikut dihitung ulang agar penolakan benar-benar menunjukkan aturan jumlah bulat. Angka rupiah ditulis tanpa pemisah ribuan; '+code('""')+' berarti teks kosong.')
add('Kolom <b>Form</b> menandai masukan yang dapat dicoba melalui tampilan aplikasi. <b>Payload/validator</b> menandai data yang dikirim langsung ke fungsi pemeriksaan, seperti kondisi barang di luar pilihan dropdown. Hasil pada laporan ini diperoleh dari validator lokal; tampilan browser belum diuji.')

forms=[
 ('PO','3. Form PO baru',[
   ('Identitas','PO-2026-IT-UJI001; status Pending Approval; departemen IT Infrastructure.'),
   ('Vendor dan tanggal','Dell EMC Indonesia; tanggal PO 2026-11-18; kirim 2026-11-25.'),
   ('Barang','RS-W1-PRO / Rack Server Web Infrastructure; jumlah 10; harga Rp100000; subtotal Rp1000000.'),
   ('Perhitungan','Diskon Rp0; pajak contoh Rp110000; PPh Rp0; total Rp1110000.'),
   ('Catatan','Kirim ke gudang utama.'),
 ],'PO memerlukan vendor, tanggal yang valid, dan 1-200 baris barang. Jumlah 0 atau 1,5 unit ditolak. Subtotal juga harus sesuai dengan jumlah dikalikan harga. Karena validator masih menerima selisih Rp1, kasus PO-E09 dan PO-E10 memakai selisih Rp2. Catatan dibatasi 10000 karakter.'),
 ('GRN','4. Form penerimaan barang (GRN)',[
   ('PO acuan','PO-2026-IT-UJI001 sudah berstatus Disetujui; satu baris RS-W1-PRO dengan jumlah dipesan 10.'),
   ('Dokumen penerimaan','ID/nomor GRN-UJI-001; surat jalan SJ-UJI-001; tanggal 2026-11-18.'),
   ('Penerima dan barang','Petugas Gudang; receivedQty=10; orderedQty=10; condition=GOOD; status=MATCHED.'),
   ('Hak akses dan catatan','Role Warehouse Manager; catatan pemeriksaan kosong (opsional).'),
 ],'GRN mencatat siapa yang menerima barang, surat jalan, jumlah, dan kondisinya. Nama berisi tiga spasi tetap kosong setelah spasinya dibuang. Jumlah negatif atau pecahan ditolak. Nama penerima dan surat jalan dibatasi 500 karakter; catatan pemeriksaan 4000 karakter. Kondisi yang diterima: GOOD, EXCELLENT, DAMAGED, dan SHORTAGE.'),
 ('POS','5. Form kasir penjualan (POS)',[
   ('Katalog uji','RS-W1-PRO / Rack Server Web Infrastructure; stok awal 5 unit; harga Rp100000.'),
   ('Keranjang','1 SKU; quantity=2; unitPrice=100000; discountPercent=10; taxRate=11.'),
   ('Perhitungan','Subtotal Rp200000; diskon Rp20000; pajak Rp19800; total Rp199800.'),
   ('Pembayaran dan kasir','amountPaid=200000; kembalian Rp200; role Warehouse Manager; requestId=POS-UJI-001.'),
 ],'Dengan dua barang seharga Rp100000, diskon 10%, dan PPN simulasi 11%, totalnya Rp199800. Pembayaran Rp199799 ditolak karena kurang Rp1. Jumlah harus bulat, positif, dan tidak melebihi stok; harga juga harus rupiah bulat positif. Diskon dibatasi 0-100%. SKU harus terdaftar dan tidak boleh muncul dua kali dalam payload keranjang.'),
]

for form,heading,baseline,rules in forms:
    story.append(PageBreak())
    add(heading,head)
    add('<b>Data dasar valid (baseline)</b>',head)
    table([[f'<b>{escape(k)}</b>',escape(v)] for k,v in baseline],[W*.27,W*.73],header=False)
    add(rules)
    add('<b>Data uji ERROR</b>',head)
    form_discussion = {
        'PO': 'PO-E06 memakai jumlah 1,5 dengan total yang sudah dihitung ulang. Penolakannya menunjukkan bahwa kecocokan total saja belum cukup: jumlah barang juga harus bulat. PO-E09 dan PO-E10 memeriksa perubahan nominal yang tidak sesuai rincian.',
        'GRN': 'GRN-E02 memeriksa nama berisi tiga spasi; GRN-E05 dan GRN-E06 memeriksa jumlah negatif serta pecahan. GRN-E12 memeriksa kecocokan status dengan jumlah barang yang benar-benar diterima.',
        'POS': 'POS-E05 menguji penjualan 6 unit saat stok latihan hanya 5. POS-E10 memeriksa kekurangan pembayaran Rp1. Keduanya harus ditolak sebelum transaksi tersimpan atau stok berkurang.',
    }
    add(form_discussion[form])
    rows=[['<b>ID / jalur</b>','<b>Data yang salah</b>','<b>Hasil yang diharapkan</b>']]
    for row in DATA['results']:
        if row['form']!=form: continue
        route='Form' if row['path']=='Form' else ('Form / payload' if row['path']=='Form/payload' else 'Payload / validator')
        data_text=escape(row['input'])
        if row['id']=='GRN-E08': data_text='items[0].receivedQty=<br/>9007199254740992'
        rows.append([f'<b>{row["id"]}</b><br/>{escape(route)}',data_text,escape(row['expected'])])
    table(rows,[W*.18,W*.44,W*.38])
    if form=='GRN':
        add('Jika pesanan berjumlah 10 unit tetapi yang datang 9, petugas tetap boleh mencatat penerimaannya sebagai '+code('DISCREPANCY')+' / Selisih Penerimaan. Validator juga menerima jumlah 0 dan 11 dengan status tersebut. Barang rusak dapat dicatat. Pada GRN-E12, data ditolak karena jumlah 9 dipasangkan dengan status '+code('MATCHED')+' yang menyatakan penerimaan sesuai pesanan.')
    if form=='POS':
        add('POS pada kode saat ini menyimpan penjualan dan stok di browser, belum ke Firestore. Stok 5 unit di atas hanya dipakai oleh skrip uji; nilainya tidak otomatis menjadi stok di website. Selama pemeriksaan, penyimpanan browser diganti dengan data tiruan di memori.')

story.append(PageBreak())
add('6. Hasil pemeriksaan',head)
add('Data salah dinyatakan tertahan jika pemeriksaan menolaknya sebelum penyimpanan. Untuk POS, skrip juga memeriksa bahwa stok latihan dan daftar penjualan tidak berubah. PO dan GRN diperiksa melalui fungsi validasinya tanpa menjalankan proses simpan.')
table([
    ['<b>Pemeriksaan lokal</b>','<b>Hasil</b>'],
    ['Baseline PO, GRN, dan POS','Ketiganya diterima. Total POS Rp199800 dan kembalian Rp200 terverifikasi.'],
    ['Data ERROR','36 dari 36 ditolak: PO 12, GRN 12, POS 12.'],
    ['Kontrol pembanding GRN','Jumlah diterima 0, 9, dan 11 dengan status DISCREPANCY diterima sebagai Selisih Penerimaan.'],
    ['Keutuhan data contoh','Input tidak diubah oleh validator; pada penolakan POS, stok dan transaksi tiruan tidak berubah.'],
],[W*.39,W*.61])
add('7. Arti hasil dan bagian yang belum diuji',head)
add('Hasil 36 penolakan berasal dari fungsi lokal. Keterbacaan pesan, fokus pada kolom yang salah, dan keutuhan isian setelah penolakan belum diperiksa di browser. API langsung, rules Firestore, dan database Firebase juga belum diuji. Respons lengkap validator tersedia pada CSV dan JSON.')
add('Catatan kosong diperbolehkan karena opsional. Harga nol pada PO masih dapat diterima jika total PO positif; POS mewajibkan harga positif. Tanggal kirim sebelum tanggal PO belum ditolak validator saat ini, sehingga tidak dicatat sebagai kasus yang berhasil ditahan.')
add('8. Sumber dan berkas pendamping',head)
add('Materi: <i># CAK3BAB3 #9 - DEFENSIVE PROGRAMMING - INT_compressed.pdf</i>, halaman 2-3, 12-16, 28-32. Dasar validasi pada kode Inventora:')
add('<br/>'.join(escape(path) for path in ['PO: src/lib/purchaseOrderValidation.ts.',
             'GRN: src/lib/goodsReceipt.ts.',
             'POS: src/lib/commerce.ts.']))
add('CSV memuat 36 kasus dan respons validator. JSON berisi baseline dan payload lengkap; Markdown tersedia untuk penyuntingan. Skrip pemeriksaan: '+code('output/audit/prepare-defensive-form-data.ts')+'.')

def footer(c,doc):
    c.saveState();c.setFillColor(colors.black);c.setFont('TNR',12)
    c.drawString(2.5*cm,1.35*cm,'Inventora - Data uji ERROR')
    c.drawRightString(A4[0]-2.5*cm,1.35*cm,str(doc.page))
    c.restoreState()

doc=SimpleDocTemplate(str(OUT),pagesize=A4,rightMargin=2.5*cm,leftMargin=2.5*cm,topMargin=2.1*cm,bottomMargin=2.1*cm,
  title='Data Uji ERROR untuk 3 Form Inventora',author='Kelompok Inventora',subject='Defensive Programming - 36 data uji tidak valid')
doc.build(story,onFirstPage=footer,onLaterPages=footer)
print(OUT)
