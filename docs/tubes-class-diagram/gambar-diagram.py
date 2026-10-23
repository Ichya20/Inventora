"""Diagram ringkas untuk cetak; deklarasi lengkap ada pada sumber UML dan lampiran."""
from pathlib import Path
import json
import math
import subprocess
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from docx import Document

ROOT = Path(__file__).resolve().parents[2]
TMP = ROOT / 'tmp/class-report'
TMP.mkdir(parents=True, exist_ok=True)
DOC = Document(ROOT / 'tmp/doc-format/reference.docx')
S = DOC.sections[0]
W = (S.page_width - S.left_margin - S.right_margin) / 12700
H = 600
pdfmetrics.registerFont(TTFont('TNR', 'C:/Windows/Fonts/times.ttf'))
pdfmetrics.registerFont(TTFont('TNR-B', 'C:/Windows/Fonts/timesbd.ttf'))
POPPLER = 'C:/Users/ICHYA ULUMIDDIN/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/poppler/Library/bin/pdftoppm.exe'
GAP = 42
BW = (W - GAP - 6) / 2
BOXES = {}

def wrap(text, width):
    words = text.split(' ')
    lines = []
    line = ''
    for word in words:
        candidate = (line + ' ' + word).strip()
        if pdfmetrics.stringWidth(candidate, 'TNR', 12) > width:
            if line:
                lines.append(line)
            line = word
            if pdfmetrics.stringWidth(word, 'TNR', 12) > width:
                raise ValueError('Label terlalu panjang: ' + word)
        else:
            line = candidate
    if line:
        lines.append(line)
    return lines

def box(c, name, x, top, attrs=(), methods=(), width=BW, kind='class'):
    title = [name] if kind == 'class' else ['<<interface>>', name]
    aa = [line for a in attrs for line in wrap(a, width - 16)]
    mm = [line for a in methods for line in wrap(a, width - 16)]
    heights = [len(title) * 18 + 10]
    if aa: heights.append(len(aa) * 18 + 10)
    if mm: heights.append(len(mm) * 18 + 10)
    height = sum(heights)
    y = H - top - height
    if y < 3:
        raise ValueError(f'Kotak melampaui panel: {name} {y}')
    c.setLineWidth(.8)
    c.rect(x, y, width, height)
    cursor = H - top - 17
    c.setFont('TNR-B', 12)
    for text in title:
        c.drawCentredString(x + width / 2, cursor, text)
        cursor -= 18
    edge = H - top - heights[0]
    c.setFont('TNR', 12)
    for content, hh in zip([part for part in [aa, mm] if part], heights[1:]):
        c.line(x, edge, x + width, edge)
        cursor = edge - 17
        for text in content:
            c.drawString(x + 8, cursor, text)
            cursor -= 18
        edge -= hh
    BOXES[name] = (x, y, width, height)

def arrow(c, src, dst, kind='dependency', multiplicity=None):
    a = BOXES[src]; b = BOXES[dst]
    # Relasi sejajar dalam satu baris atau kolom agar jalurnya tidak menimpa kotak.
    if abs(a[0] - b[0]) < 1:
        start = (a[0] + a[2] / 2, a[1])
        end = (b[0] + b[2] / 2, b[1] + b[3])
    else:
        start = (a[0] + a[2], a[1] + a[3] / 2)
        end = (b[0], start[1])
        if kind == 'reverse':
            start = (a[0], a[1] + a[3] / 2)
            end = (b[0] + b[2], start[1])
    dx, dy = end[0] - start[0], end[1] - start[1]
    length = math.hypot(dx, dy)
    ux, uy = dx / length, dy / length
    if kind in ('dependency', 'reverse'): c.setDash(3, 3)
    c.line(*start, *end)
    c.setDash()
    if kind == 'composition':
        p = c.beginPath(); p.moveTo(*start)
        for s,t in [(5,3),(10,0),(5,-3),(0,0)]:
            p.lineTo(start[0] + ux*s - uy*t, start[1] + uy*s + ux*t)
        c.drawPath(p, fill=1, stroke=1)
    else:
        for sign in (-1, 1):
            c.line(end[0], end[1], end[0] - ux*7 - uy*4*sign, end[1] - uy*7 + ux*4*sign)
    if multiplicity:
        c.setFont('TNR', 12)
        if abs(dx) > abs(dy):
            c.drawCentredString((start[0]+end[0])/2, start[1]+7, multiplicity)
        else:
            c.drawString(start[0]+7, (start[1]+end[1])/2-4, multiplicity)

def across(c, src, dst, kind='dependency', source_fraction=.5):
    a=BOXES[src]; b=BOXES[dst]
    start=(a[0]+a[2], a[1]+a[3]*source_fraction)
    end=(b[0], b[1]+b[3]/2)
    dx,dy=end[0]-start[0],end[1]-start[1]
    length=math.hypot(dx,dy); ux,uy=dx/length,dy/length
    if kind=='dependency': c.setDash(3,3)
    c.line(*start,*end); c.setDash()
    if kind=='composition':
        p=c.beginPath(); p.moveTo(*start)
        for s,t in [(5,3),(10,0),(5,-3),(0,0)]:
            p.lineTo(start[0]+ux*s-uy*t,start[1]+uy*s+ux*t)
        c.drawPath(p,fill=1,stroke=1)
    elif kind=='dependency':
        for sign in (-1,1):
            c.line(*end,end[0]-ux*7-uy*4*sign,end[1]-uy*7+ux*4*sign)

figures = []
def panel(num, heading, caption, note, draw):
    BOXES.clear()
    pdf = TMP / f'diagram-{num}.pdf'
    c = canvas.Canvas(str(pdf), pagesize=(W,H))
    c.setFillColorRGB(0,0,0); c.setStrokeColorRGB(0,0,0)
    draw(c)
    c.save()
    from pypdf import PdfReader, PdfWriter
    from pypdf.generic import RectangleObject
    reader = PdfReader(str(pdf))
    reader.pages[0].mediabox = RectangleObject([0, min(b[1] for b in BOXES.values()) - 3, W, H])
    writer = PdfWriter()
    writer.add_page(reader.pages[0])
    with pdf.open('wb') as stream:
        writer.write(stream)
    prefix = TMP / f'diagram-{num}'
    subprocess.run([POPPLER, '-r','180','-png','-singlefile',str(pdf),str(prefix)],check=True,capture_output=True)
    figures.append(dict(heading=heading, caption=caption,note=note,png=prefix.name+'.png'))

L = 3; R = W - BW - 3
def session(c):
    box(c,'AuthService',L,3,
        ['- auth: Auth','- provider: GoogleAuthProvider','- cachedAccessToken: string | null'],
        ['+ signIn(): Promise<UserSession | null>','+ signOut(): Promise<void>'])
    box(c,'UserSession',R,3,
        ['+ uid: string','+ role: Role | null','+ isDemo: boolean'],kind='interface')
    box(c,'LoginController',L,330,
        ['- session: UserSession | null','- authService: AuthService','- policy: AuthorizationPolicy'],
        ['+ loginWithGoogle(): Promise<UserSession | null>','+ canEnterDashboard(): boolean'])
    box(c,'AuthorizationPolicy',R,330,(),
        ['+ isRole(value): value is Role','+ canAccessMenu(role, menu): boolean','+ canPerformPoAction(role, action): boolean'])
    arrow(c,'AuthService','UserSession')
    # Arah dependency LoginController ke AuthService, jalur vertikal ke atas.
    a=BOXES['LoginController']; b=BOXES['AuthService']
    x=a[0]+a[2]/2; y1=a[1]+a[3]; y2=b[1]
    c.setDash(3,3);c.line(x,y1,x,y2);c.setDash()
    c.line(x,y2,x-4,y2-7);c.line(x,y2,x+4,y2-7)
    arrow(c,'LoginController','AuthorizationPolicy')

panel(1,'3.2 Sesi dan akses pengguna','Gambar 1. Kelas sesi dan kebijakan akses',
      'Sesi berasal dari Firebase Authentication. Role adalah nilai custom claim; interface UserSession merapikan data yang dipakai aplikasi.',session)

def procurement(c):
    box(c,'PurchaseOrder',L,3,['+ id: string','+ total: number','+ items?: POLineItem[]','+ grn?: GoodsReceiptNote','+ paymentInfo?: PaymentInfo'],kind='interface')
    box(c,'POLineItem',R,3,['+ id: string','+ qty: number','+ unitPrice: number','+ subtotal: number'],kind='interface')
    box(c,'GoodsReceiptNote',L,220,['+ poId: string','+ items: GoodsReceiptItem[]','+ status: string union'],kind='interface')
    box(c,'PaymentInfo',R,220,['+ txId: string','+ amount: number','+ paidAt: string'],kind='interface')
    box(c,'GoodsReceiptItem',L,418,['+ orderedQty: number','+ receivedQty: number'],kind='interface')
    box(c,'PaymentTransaction',R,396,['+ poId: string','+ totalPaid: number','+ timestamp: string'],kind='interface')
    arrow(c,'PurchaseOrder','POLineItem','composition','0..*')
    arrow(c,'PurchaseOrder','GoodsReceiptNote','composition','0..1')
    arrow(c,'GoodsReceiptNote','GoodsReceiptItem','composition','0..*')
    across(c,'PurchaseOrder','PaymentInfo','composition',.30)
    across(c,'PurchaseOrder','PaymentTransaction','association',.10)

panel(2,'3.3 Data pengadaan dan penerimaan','Gambar 2. Struktur data pengadaan',
      'Belah ketupat hitam berada pada objek pemilik. Angka pada ujung bagian menunjukkan jumlah bagian per satu pemilik. Relasi paymentInfo dan riwayat pembayaran dilengkapi pada tabel relasi.',procurement)

def services(c):
    box(c,'PurchaseOrderModel',L,3,['- data: PurchaseOrder'],
        ['+ calculateTotal(): number','+ approve(role): void','+ recordPayment(info, role): void'])
    box(c,'GoodsReceiptModel',R,3,['- data: GoodsReceiptNote'],
        ['+ getData(): Readonly<GoodsReceiptNote>','+ hasDiscrepancy(): boolean'])
    box(c,'PurchaseOrderRepository',L,240,['- db: Firestore'],
        ['+ create(po): Promise<void>','+ findById(id): Promise<PurchaseOrder | null>','+ transition(...): Promise<void>'])
    box(c,'ProcurementService',R,240,['- repository: PurchaseOrderRepository','- policy: AuthorizationPolicy'],
        ['+ approve(id, role): Promise<void>','+ receive(...): Promise<void>','+ pay(...): Promise<void>'])
    box(c,'DepartmentBudget',L,454,['+ allocated: number','+ spent: number','+ committed: number'],width=W-6,kind='interface')
    arrow(c,'ProcurementService','PurchaseOrderRepository','reverse')

panel(3,'3.4 Model dan layanan pengadaan','Gambar 3. Pembagian tanggung jawab pengadaan',
      'Model menyatakan perilaku satu objek, layanan mengatur tindakan, dan repository mengakses Firestore. DepartmentBudget ditampilkan sebagai data pendukung; relasi identitasnya belum tersedia pada kode.',services)

def local(c):
    # Kotak data ringkas; seluruh atribut berada pada Lampiran A.
    box(c,'InventoryService',L,3,['- storage: Storage'],['+ list(): InventoryItem[]','+ deploy(sku, qty): void'])
    box(c,'InventoryItem',R,3,['+ stock: number'],kind='interface')
    box(c,'PayrollService',L,145,['- storage: Storage'],['+ listEmployees(): Employee[]','+ record(...): PayrollDisbursementRecord'])
    box(c,'Employee',R,91,['+ salary: EmployeeSalary'],kind='interface')
    box(c,'EmployeeSalary',R,179,['+ baseSalary: number'],kind='interface')
    box(c,'PayrollDisbursementRecord',R,267,['+ empId: string'],kind='interface')
    box(c,'FinanceService',L,310,['- storage: Storage'],['+ listInvoices(): InvoiceRecord[]'])
    box(c,'InvoiceRecord',R,355,['+ total: number'],kind='interface')
    box(c,'BillingService',L,434,['- storage: Storage'],['+ getSubscription(): SubscriptionRecord'])
    box(c,'SubscriptionRecord',R,443,['+ invoices: SubscriptionInvoice[]'],kind='interface')
    box(c,'SubscriptionInvoice',R,545,kind='interface')
    arrow(c,'InventoryService','InventoryItem')
    across(c,'PayrollService','Employee',source_fraction=.70)
    across(c,'PayrollService','PayrollDisbursementRecord',source_fraction=.20)
    across(c,'FinanceService','InvoiceRecord')
    across(c,'BillingService','SubscriptionRecord')
    arrow(c,'Employee','EmployeeSalary','composition')
    arrow(c,'SubscriptionRecord','SubscriptionInvoice','composition')

panel(4,'3.5 Layanan dan data modul lokal','Gambar 4. Layanan dengan penyimpanan browser',
      'Layanan lokal diusulkan untuk memisahkan logika dari komponen. Kotak SubscriptionInvoice adalah interface. Ketergantungan SDM, keuangan, dan langganan dibaca bersama tabel relasi agar garis tidak bertumpuk.',local)
(TMP/'figures.json').write_text(json.dumps(figures,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'figures':len(figures),'width_pt':W,'height_pt':H}))
