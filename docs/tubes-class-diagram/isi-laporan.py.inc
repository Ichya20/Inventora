BOOKMARKS = []
CHAPTERS = [
    ('1. Pendahuluan', 'bab1'),
    ('2. Evaluasi model awal', 'bab2'),
    ('3. Rancangan Class Diagram', 'bab3'),
    ('4. Atribut dan operasi kelas', 'bab4'),
    ('5. Kerangka kode TypeScript', 'bab5'),
    ('6. Alur dan status login', 'bab6'),
    ('7. Hasil pemeriksaan', 'bab7'),
    ('8. Pemenuhan tugas dan kesimpulan', 'bab8'),
    ('Lampiran A. Deklarasi tipe data', 'lampiranA'),
    ('Lampiran B. Kerangka kelas', 'lampiranB'),
    ('Lampiran C. Berkas dan cara pemeriksaan', 'lampiranC'),
]

p('Inventora Sistem Enterprise Resource Planning\ndan Pengadaan', 'Title', bold=True,
  align=WD_ALIGN_PARAGRAPH.CENTER, before=6, after=8)
p('TUGAS KELOMPOK', bold=True, align=WD_ALIGN_PARAGRAPH.CENTER, after=6)
p('Evaluasi Class Diagram dan Kerangka Kode\nserta Pemeriksaan Login', bold=True,
  align=WD_ALIGN_PARAGRAPH.CENTER, after=12)
DOC._element.body.insert(len(DOC._element.body) - 1, LOGO_P)
from docx.text.paragraph import Paragraph as DocxParagraph
logo_para = DocxParagraph(LOGO_P, DOC._body)
logo_para.paragraph_format.line_spacing = 1.5
logo_para.paragraph_format.space_after = Pt(174)
logo_para.paragraph_format.space_before = Pt(0)
p('Anggota Kelompok', bold=True, align=WD_ALIGN_PARAGRAPH.CENTER, after=6)
for i, member in enumerate(MEMBERS, 1):
    para = p(f'{i}.  {member}', bold=True, align=WD_ALIGN_PARAGRAPH.LEFT, after=0)
    para.paragraph_format.left_indent = Cm(3.2)
p('FAKULTAS INFORMATIKA', bold=True, align=WD_ALIGN_PARAGRAPH.CENTER, before=55, after=6)
p('TELKOM UNIVERSITY PURWOKERTO', bold=True, align=WD_ALIGN_PARAGRAPH.CENTER, after=6)
p('2026', bold=True, align=WD_ALIGN_PARAGRAPH.CENTER, after=0)

heading('Daftar isi', newpage=True)
for title, mark in CHAPTERS:
    para = p(title + '\t' + str(PAGE_MAP.get(mark, '')),
             align=WD_ALIGN_PARAGRAPH.LEFT, after=4)
    para.paragraph_format.tab_stops.add_tab_stop(WIDTH,
        WD_TAB_ALIGNMENT.RIGHT, WD_TAB_LEADER.DOTS)

heading(CHAPTERS[0][0], bookmark='bab1', newpage=True)
p('Model awal Inventora sudah menggambarkan hubungan data pengadaan, tetapi belum memenuhi isi '
  'Class Diagram UML karena belum memuat tipe atribut, visibilitas, dan operasi. Laporan ini '
  'mengevaluasi model tersebut dan menyusun rancangan kelas berdasarkan kode Inventora. '
  'Hasilnya berupa 11 kerangka kelas, 15 interface data, dan 20 relasi yang dicantumkan secara eksplisit.')
heading('1.1 Tujuan dan lingkup', 2)
p('Evaluasi mencakup pengadaan, penerimaan barang, pembayaran, sesi pengguna, serta layanan '
  'inventori, SDM dan payroll, keuangan, dan langganan. Setiap atribut mempunyai tipe data; '
  'operasi mempunyai parameter, tipe hasil, dan access modifier. Kerangka kode dibuat tanpa '
  'implementasi isi method sebagaimana diminta pada tugas.')
p('Inventora menggunakan React dengan komponen fungsi, interface TypeScript, Firebase Authentication, '
  'dan Cloud Firestore. Kelas layanan dalam laporan merupakan usulan pembagian tanggung jawab. '
  'Kelas tersebut belum dihubungkan ke komponen React. Login aplikasi tetap memakai implementasi yang sudah ada.')
heading('1.2 Dasar pemeriksaan', 2)
p('Sumber utama adalah src/types.ts, src/firebase.ts, komponen Login, App, ProcurementView, '
  'PurchaseUnitView, HRView, InventoryView, FinanceView, BillingSubscriptionView, modul authorization, '
  'procurement, dan purchaseOrderStore, serta firestore.rules. Dokumen DPPL yang diberikan menjadi '
  'acuan format dan pembanding model awal. Laporan basis data Firebase sebelumnya dipakai untuk '
  'mencocokkan bentuk dokumen serta bukti pengujian emulator.')
p('Pemeriksaan dilakukan pada 21 Oktober 2026. Hasil pemeriksaan kode dibedakan dari pengujian '
  'interaksi layar dan login menggunakan akun Google asli.')

heading(CHAPTERS[1][0], bookmark='bab2')
heading('2.1 Kelengkapan diagram awal', 2)
p('Gambar 2 pada dokumen DPPL merupakan model hubungan entitas atau ERD konseptual. Model itu '
  'menampilkan Product, User, Role, PurchaseOrder, POLineItem, GoodsReceiptNote, PaymentTransaction, '
  'serta beberapa target pengembangan. Hubungan tersebut membantu membaca domain, tetapi belum '
  'menyatakan struktur kelas beserta perilakunya.')
table(['Aspek', 'Temuan dan keputusan'], [
    ['Jenis model', 'ERD belum dapat disebut Class Diagram lengkap. Rancangan baru membedakan interface data dari kelas berperilaku.'],
    ['Atribut', 'Tipe, atribut opsional, dan visibilitas belum lengkap. Deklarasi pada Lampiran A dan B melengkapinya.'],
    ['Method', 'Operasi dan tanda visibilitas belum tersedia. Kerangka kelas menuliskan public dan private secara eksplisit.'],
    ['Relasi', 'PO dengan item, GRN, dan paymentInfo merupakan komposisi data tertanam. Riwayat PaymentTransaction dibedakan dari paymentInfo.'],
    ['Fitur target', 'SaleTransaction, SaleLine, dan AuditEvent pada model awal belum menjadi implementasi POS atau audit cloud yang terkonfirmasi.'],
    ['Pewarisan', 'Peran tidak dijadikan subclass pengguna. Peran adalah nilai Role yang diperiksa oleh kebijakan otorisasi.'],
], [3.2, 13.5])
heading('2.2 Konsistensi struktur dan tipe', 2)
p('PurchaseOrder.status masih bertipe POStatus | string. Union tersebut menerima string di luar '
  'daftar status resmi, sehingga pembatasan tipe belum kuat. color juga menerima string bebas, '
  'sedangkan lineItems masih any[]. Rancangan mempertahankan bentuk aktual agar laporan tidak '
  'menggambarkan perubahan yang belum dilakukan. Perbaikan berikutnya adalah membatasi status '
  'dan mengganti lineItems dengan tipe yang dinyatakan.')
p('items dan lineItems menyimpan representasi rincian barang yang bertumpang tindih. Rumus subtotal '
  'dan totalPrice perlu dipusatkan pada satu bentuk data, kemudian format lama dimigrasikan. '
  'Jumlah uang memakai number dengan konvensi rupiah bilangan bulat; tanggal pada tipe saat ini '
  'memakai string. Validasi nilai dan format tetap diperlukan ketika data masuk.')
p('Atribut items bersifat opsional untuk kompatibilitas data lama. Karena itu kardinalitas pada '
  'model aktual ditulis 0..*. Formulir pembuatan PO baru mewajibkan sedikitnya satu item. '
  'Kardinalitas rancangan bisnis dapat diperketat menjadi 1..* setelah data lama dimigrasikan.')
heading('2.3 Kenormalan dan batas penyimpanan', 2)
p('Penilaian kenormalan Class Diagram mencakup tanggung jawab, enkapsulasi, jenis relasi, '
  'kardinalitas, dan konsistensi tipe. Bentuk normal relasional tidak diterapkan langsung pada '
  'dokumen Firestore. Penanaman items, grn, dan paymentInfo di dalam satu PO mengikuti kebutuhan '
  'pembacaan dan transaksi pengadaan.')
p('Koleksi Firestore yang aktif pada alur yang diperiksa adalah purchaseOrders. Inventori, SDM, '
  'payroll, invoice keuangan, dan langganan menggunakan penyimpanan browser atau data konfigurasi. '
  'Interface tidak otomatis menjadi koleksi. activities pada blueprint belum menjadi audit cloud '
  'yang aktif dan aturan saat ini menolak akses yang tidak dinyatakan.')
p('Relasi Employee dengan PayrollDisbursementRecord adalah asosiasi riwayat, sehingga penghapusan '
  'pegawai tidak seharusnya menghapus bukti gaji. EmployeeSalary menjadi bagian Employee. '
  'Tidak ada foreign key bawaan Firestore; referensi poId dan identitas item harus divalidasi '
  'oleh aplikasi serta Security Rules sesuai operasi yang diizinkan.')

heading(CHAPTERS[2][0], bookmark='bab3')
heading('3.1 Notasi dan pembacaan', 2)
p('Tanda + berarti public, - berarti private, dan # berarti protected. Interface TypeScript '
  'mempunyai anggota yang dapat dibaca secara publik; kata public tidak dituliskan di dalam '
  'interface karena sintaks TypeScript tidak mengizinkannya. Tanda ? menunjukkan atribut atau '
  'parameter opsional. Tidak ada protected maupun pewarisan yang dipaksakan pada rancangan ini.')
p('Empat gambar berikut merupakan tampilan ringkas dari model yang sama. Beberapa anggota '
  'ditampilkan untuk memperlihatkan tanggung jawab; seluruh atribut dan tanda tangan method '
  'tersedia pada Lampiran A dan B. Sumber PlantUML memuat semua anggota dan 20 relasi.')

for fig in json.loads((TMP / 'figures.json').read_text(encoding='utf-8')):
    heading(fig['heading'], 2, newpage=True)
    para = p(align=WD_ALIGN_PARAGRAPH.CENTER, after=5, keep=True)
    para.add_run().add_picture(str(TMP / fig['png']), width=Pt(WIDTH_PT))
    p(fig['caption'], align=WD_ALIGN_PARAGRAPH.CENTER, after=6)
    p(fig['note'])

heading('3.6 Relasi dan kardinalitas', 2, newpage=True)
table(['Relasi', 'Jenis', 'Kardinalitas'], [
    ['PurchaseOrder ke POLineItem', 'Komposisi', '1 ke 0..*'],
    ['PurchaseOrder ke GoodsReceiptNote', 'Komposisi', '1 ke 0..1'],
    ['PurchaseOrder ke PaymentInfo', 'Komposisi', '1 ke 0..1'],
    ['GoodsReceiptNote ke GoodsReceiptItem', 'Komposisi', '1 ke 0..*'],
    ['PurchaseOrder ke PaymentTransaction', 'Asosiasi logis riwayat lokal', '1 ke 0..*'],
    ['Employee ke EmployeeSalary', 'Komposisi', '1 ke 1'],
    ['Employee ke PayrollDisbursementRecord', 'Asosiasi historis', '1 ke 0..*'],
    ['SubscriptionRecord ke SubscriptionInvoice', 'Komposisi', '1 ke 0..*'],
    ['PurchaseOrderModel ke PurchaseOrder', 'Asosiasi objek data', '1 ke 1'],
    ['GoodsReceiptModel ke GoodsReceiptNote', 'Asosiasi objek data', '1 ke 1'],
], [8.1, 5.5, 3.1])
p('PaymentTransaction memuat poId sebagai penghubung riwayat pembayaran yang disimpan lokal. '
  'Dokumen PO sendiri mempunyai paling banyak satu map paymentInfo, sehingga relasi 1 ke 0..* '
  'pada riwayat tidak berarti aplikasi mendukung angsuran atau beberapa pembayaran pada satu PO. '
  'Aturan alur saat ini mencegah pembayaran ulang.')
table(['Pemakai', 'Ketergantungan'], [
    ['LoginController', 'AuthService dan AuthorizationPolicy'],
    ['AuthService', 'UserSession'],
    ['ProcurementService', 'PurchaseOrderRepository dan AuthorizationPolicy'],
    ['InventoryService', 'InventoryItem'],
    ['PayrollService', 'Employee dan PayrollDisbursementRecord'],
    ['FinanceService', 'InvoiceRecord'],
    ['BillingService', 'SubscriptionRecord'],
], [6.0, 10.7])
p('Ketergantungan menunjukkan pemakaian tipe atau layanan dan tidak menyatakan jumlah objek yang '
  'disimpan. Referensi SDK seperti Auth, Firestore, GoogleAuthProvider, Unsubscribe, dan Storage '
  'adalah tipe eksternal. DepartmentBudget merupakan tipe data pendukung perhitungan anggaran; '
  'model tidak mengarang relasi foreign key yang belum tersedia pada kode.')

heading(CHAPTERS[3][0], bookmark='bab4')
heading('4.1 Enkapsulasi dan tipe atribut', 2)
p('Data internal kelas dibuat private. Referensi auth, db, storage, repository, policy, dan data '
  'pada constructor memakai readonly agar referensinya tidak diganti setelah objek dibentuk. '
  'Readonly tersebut bersifat dangkal; nilai bertingkat masih memerlukan salinan atau pembatasan '
  'tambahan apabila kelas benar-benar diimplementasikan. Operasi yang dipakai pemanggil diberi public.')
p('AuthService menyimpan provider dan token Google pada memori. LoginController menyimpan sesi. '
  'Repository memusatkan akses Firestore. ProcurementService memusatkan tindakan alur pengadaan; '
  'PurchaseOrderModel menangani aturan pada satu objek. Otorisasi antarlayanan dan pembatasan di '
  'Firestore tetap harus berlaku ketika kerangka diimplementasikan.')
table(['Kelompok tipe', 'Isi dan ketentuan'], [
    ['Sesi', 'UserSession menyimpan uid, email, displayName, role, dan isDemo. Tidak menyimpan kata sandi Google.'],
    ['Pengadaan', 'PurchaseOrder, POLineItem, GoodsReceiptNote, GoodsReceiptItem, PaymentInfo, PaymentTransaction, DepartmentBudget.'],
    ['SDM', 'Employee, EmployeeSalary, PayrollDisbursementRecord. Riwayat payroll menyimpan komponen gaji pada periode pembayaran.'],
    ['Modul lokal', 'InventoryItem, InvoiceRecord, SubscriptionInvoice, SubscriptionRecord. Nama tipe merapikan bentuk objek pada komponen.'],
], [4.0, 12.7])
heading('4.2 Kontrak operasi', 2)
table(['Kelas', 'Kontrak utama'], [
    ['AuthService', 'signIn menghasilkan sesi atau null jika dibatalkan; observe menghasilkan fungsi berhenti berlangganan; signOut mengakhiri sesi.'],
    ['AuthorizationPolicy', 'Memeriksa Role, akses menu, dan tindakan PO. Hasil boolean atau type predicate.'],
    ['LoginController', 'Mengatur login dan logout serta keputusan masuk dashboard dari sesi yang tersedia.'],
    ['PurchaseOrderModel dan GoodsReceiptModel', 'Mengakses data, menghitung total, menyatakan transisi, dan memeriksa selisih penerimaan.'],
    ['PurchaseOrderRepository', 'Membuat, membaca, mendengarkan perubahan, dan menyimpan transisi PO secara asinkron.'],
    ['ProcurementService', 'Menjalankan create, approve, reject, receive, dan pay dengan identitas peran.'],
    ['Layanan lokal', 'Inventori mengubah stok; payroll mencatat per pegawai dan periode; keuangan mencatat invoice; billing mengubah paket dan perpanjangan.'],
], [5.4, 11.3])
p('Tanda tangan lengkap mencantumkan Promise untuk operasi asinkron, null atau undefined untuk '
  'hasil yang tidak tersedia, serta tipe input yang dinyatakan. Akses private pada mapUser '
  'membatasi pemetaan objek Firebase menjadi sesi internal. public constructor menunjukkan '
  'dependensi yang harus disediakan saat membentuk kelas.')
heading('4.3 Pemetaan ke implementasi sekarang', 2)
table(['Rancangan', 'Lokasi perilaku sekarang'], [
    ['AuthService', 'src/firebase.ts: googleSignIn, getAccessToken, logout; pengamatan token berada di App.'],
    ['AuthorizationPolicy', 'src/lib/authorization.ts: isRole, canAccessMenu, canPerformPoAction.'],
    ['LoginController', 'Komponen Login dan pengelolaan sesi pada App.'],
    ['Model dan layanan pengadaan', 'src/lib/procurement.ts dan komponen pengadaan/pembelian.'],
    ['PurchaseOrderRepository', 'src/lib/purchaseOrderStore.ts serta pembacaan/listener pada ProcurementView.'],
    ['Layanan lokal', 'InventoryView, HRView, FinanceView, BillingSubscriptionView, dan helper penyimpanan yang dipakai komponen.'],
], [5.6, 11.1])

heading(CHAPTERS[4][0], bookmark='bab5')
p('Kerangka disimpan pada docs/tubes-class-diagram/kerangka.ts. Setiap method berisi '
  'throw new Error dengan pesan Belum diimplementasikan. Penanda ini membuat kode dapat diperiksa '
  'oleh TypeScript tanpa mengarang perilaku method yang belum dibuat. Constructor hanya '
  'mendeklarasikan dependensi melalui parameter property.')
p('Kerangka mengimpor tipe inti dari src/types.ts. Deklarasi Employee, EmployeeSalary, '
  'PayrollDisbursementRecord, dan SubscriptionTier disalin ke data-models.ts dari kode komponen '
  'agar pemeriksaan kerangka tidak perlu memuat implementasi antarmuka. Skrip susun-model.mjs '
  'membentuk ulang salinan tipe dan sumber diagram dari deklarasi proyek.')
code("export class PurchaseOrderModel {\n  public constructor(\n    private readonly data: PurchaseOrder,\n  ) {}\n  public calculateTotal(): number {\n    throw new Error('Belum diimplementasikan');\n  }\n}")
p('Cuplikan di atas memperlihatkan pola deklarasi. Seluruh 11 kelas tercantum pada Lampiran B. '
  'Kerangka lulus pemeriksaan strict pada konfigurasi terpisah. Kelulusan kompilasi tidak '
  'berarti method telah diimplementasikan atau telah terintegrasi dengan React.')

heading(CHAPTERS[5][0], bookmark='bab6', newpage=True)
heading('6.1 Alur antarmuka dan kode', 2)
p('Pengguna menekan tombol masuk dengan Google pada halaman Login. handleGoogleLogin memanggil '
  'googleSignIn, yang menjalankan signInWithPopup dari Firebase Authentication. Setelah berhasil, '
  'aplikasi menuju dashboard. Pembatalan popup menghasilkan null; kesalahan domain dan popup '
  'ditampilkan melalui penanganan kesalahan yang tersedia.')
p('App mengamati perubahan melalui onIdTokenChanged, membaca getIdTokenResult, lalu memeriksa '
  'claims.role dengan isRole. Akun tanpa peran yang sah diarahkan ke tampilan akses belum '
  'ditetapkan. Empat peran yang dikenal adalah Super Admin, Warehouse Manager, Finance Manager, '
  'dan HR Manager. Peran berasal dari custom claim server, bukan pilihan bebas pengguna.')
heading('6.2 Hubungan autentikasi dan basis data', 2)
p('Firebase Authentication mengelola identitas pengguna. Firestore menerima permintaan dengan '
  'token autentikasi dan menerapkan firestore.rules pada purchaseOrders. Tindakan perubahan PO '
  'juga melewati persistPoTransition, yang memeriksa pengguna, peran, transisi, dan versi dokumen '
  'dalam transaksi. Penyembunyian menu di antarmuka tidak menggantikan aturan basis data.')
p('ID token dipakai untuk identitas Firebase dan custom claim. OAuth access token Google dipakai '
  'untuk integrasi Google seperti Sheets dan Calendar; keduanya berbeda fungsi. Mode demo '
  'menggunakan inventora_demo_user di sessionStorage dan hanya mensimulasikan sesi lokal. '
  'Mode tersebut tidak membuktikan autentikasi Google atau izin Firestore cloud.')
heading('6.3 Status verifikasi login', 2)
table(['Lapisan', 'Status bukti'], [
    ['Antarmuka', 'Tombol dan handler login ada pada kode. Interaksi layar pada sesi ini belum diverifikasi.'],
    ['Kode autentikasi', 'Popup Google, pembatalan, logout, pembacaan token, dan pemeriksaan claim ditemukan pada sumber.'],
    ['Aturan akses', 'Pengujian regresi peran lulus. Bukti emulator terdahulu menunjukkan akses tanpa autentikasi dan peran HR ditolak.'],
    ['Login Google asli', 'Belum diverifikasi melalui interaksi akun pada sesi ini.'],
    ['Konfigurasi cloud', 'Provider Google, authorized domains, custom claim akun, dan rules yang terpasang perlu diperiksa pada lingkungan demonstrasi.'],
], [4.0, 12.7])
p('Akses browser untuk memeriksa halaman lokal ditolak oleh kebijakan alat pada sesi penyusunan '
  'laporan. Oleh karena itu laporan tidak menyatakan login Google telah lulus pengujian dari '
  'antarmuka sampai basis data cloud. Pemeriksaan kode, regresi lokal, dan emulator dicatat '
  'sesuai batas bukti masing-masing.')
heading('6.4 Skenario demonstrasi yang masih diperlukan', 2)
table(['No', 'Skenario dan hasil yang diharapkan'], [
    ['1', 'Masuk dengan akun Google yang mempunyai custom claim sah; dashboard dan menu sesuai peran.'],
    ['2', 'Muat ulang halaman; status autentikasi dipulihkan dan claim tetap diperiksa.'],
    ['3', 'Masuk dengan akun tanpa claim; halaman akses belum ditetapkan dan tidak mendapat data PO.'],
    ['4', 'Batalkan popup atau tolak akses; aplikasi tetap dapat digunakan dan pesan sesuai keadaan.'],
    ['5', 'Uji operasi PO dengan peran yang berhak, lalu peran yang dilarang; Firestore menegakkan aturan.'],
    ['6', 'Logout; sesi berakhir dan halaman yang memerlukan autentikasi tidak dapat diakses kembali tanpa login.'],
], [1.0, 15.7])

heading(CHAPTERS[6][0], bookmark='bab7', newpage=True)
heading('7.1 Pemeriksaan pada penyusunan laporan', 2)
table(['Pemeriksaan', 'Hasil', 'Makna'], [
    ['TypeScript aplikasi', 'Lulus', 'tsc --noEmit pada konfigurasi proyek.'],
    ['Regresi lokal', '15 lulus', 'Aturan bisnis dan helper yang disebutkan di bawah.'],
    ['TypeScript kerangka', 'Lulus', 'strict dan noEmit pada tsconfig khusus kerangka.'],
    ['Login Google asli', 'Belum diuji', 'Tidak ada bukti interaksi akun dan pembacaan cloud dari sesi ini.'],
], [5.0, 3.0, 8.7])
p('Lima belas regresi memeriksa tanggal bisnis Jakarta; pencegahan gaji ganda per pegawai dan '
  'periode; batas siklus langganan; langganan yang dijeda; ringkasan dashboard; hak akses peran; '
  'urutan PO dan pencegahan bayar ulang; nominal pembayaran; migrasi data pembayaran lama; '
  'antrean perubahan saat offline; pemulihan antrean rusak; konsistensi ekstraksi invoice; '
  'komponen riwayat slip gaji; backup dan reset; serta kegagalan penulisan penyimpanan lokal.')
heading('7.2 Bukti emulator dari tugas basis data sebelumnya', 2)
p('Berkas database/firestore/hasil-uji.json mencatat 18 pemeriksaan lulus pada 21 Oktober 2026 '
  'untuk project demo-inventora-tubes, endpoint 127.0.0.1:8085, dan lima dokumen purchaseOrders. '
  'Bukti tersebut berasal dari pengujian tugas basis data sebelumnya dan tidak dijalankan ulang '
  'dalam penyusunan laporan ini.')
p('Skenario meliputi pembuatan PO, persetujuan, penolakan, penerimaan, pembayaran, serta penolakan '
  'akses dan transisi yang dilarang. Identitas uji memakai mock emulator. Hasil ini mendukung '
  'pemeriksaan Security Rules lokal dan tidak menjadi bukti keberhasilan login Google pada cloud.')
heading('7.3 Batas pemeriksaan', 2)
p('Pemeriksaan belum membuktikan seluruh interaksi layar, kondisi perangkat, aksesibilitas, '
  'konfigurasi cloud, atau semua bentuk data tidak valid. Nilai status bebas, any[], duplikasi '
  'rincian barang, dan penyimpanan lokal lintas perangkat masih menjadi pekerjaan lanjutan. '
  'Pemeriksaan strict hanya diterapkan pada kerangka terpisah; aplikasi diperiksa dengan '
  'konfigurasi TypeScript proyek yang tersedia.')

heading(CHAPTERS[7][0], bookmark='bab8')
table(['Permintaan tugas', 'Pemenuhan'], [
    ['Evaluasi kelengkapan dan kenormalan', 'Bagian 2 menilai jenis model awal, tanggung jawab, konsistensi tipe, dan relasi.'],
    ['Class Diagram', 'Bagian 3 menyajikan diagram ringkas, kardinalitas, dan sumber PlantUML lengkap.'],
    ['Atribut dan access modifier', 'Lampiran A dan B mencantumkan seluruh atribut dalam lingkup model beserta tipe dan visibilitasnya.'],
    ['Method dan access modifier', 'Lampiran B memuat public atau private, parameter, dan tipe hasil untuk seluruh operasi kelas.'],
    ['Create code tanpa detail method', '11 kerangka kelas dibuat dan lulus pemeriksaan tipe strict; isi method belum diimplementasikan.'],
    ['Usahakan login berjalan', 'Implementasi login tersedia pada kode. Verifikasi Google asli dan konfigurasi cloud masih diperlukan.'],
    ['Laporan PDF', 'Disusun dengan sistematika dokumen acuan dan disertai salinan DOCX yang dapat diedit.'],
], [6.0, 10.7])
p('Rancangan memperbaiki kekurangan model awal dengan memisahkan data, kebijakan akses, layanan, '
  'dan penyimpanan. Hubungan dokumen mengikuti implementasi Firebase Inventora. Kerangka kelas '
  'menjadi hasil perancangan yang dapat diperiksa, sedangkan penerapan kelas ke komponen React '
  'dan verifikasi login Google asli belum dinyatakan selesai.')

heading(CHAPTERS[8][0], bookmark='lampiranA', newpage=True)
p('Deklarasi berikut memuat 15 interface data dalam lingkup diagram. Seluruh anggotanya public '
  'secara semantik TypeScript. Nama PaymentInfo diberikan untuk map PurchaseOrder.paymentInfo '
  'agar relasinya dapat ditampilkan sebagai tipe tersendiri. Tipe berakhiran ? bersifat opsional.')
heading('A.1 Alias yang dipakai model', 2)
code("export type Role = 'Super Admin'\n  | 'Warehouse Manager'\n  | 'Finance Manager' | 'HR Manager';\nexport type POStatus = 'Pending Approval'\n  | 'Disetujui' | 'Barang Diterima'\n  | 'Selisih Penerimaan' | 'Selesai' | 'Ditolak';\nexport type ThreeWayMatchStatus = 'MATCHED'\n  | 'DISCREPANCY' | 'PENDING_RECEIPT'\n  | 'PENDING_INVOICE';\nexport type SubscriptionTier =\n  'starter' | 'business' | 'enterprise';\nexport type BillingCycle = 'monthly' | 'annual';")
order = ['UserSession', 'PurchaseOrder', 'POLineItem', 'GoodsReceiptNote',
    'GoodsReceiptItem', 'PaymentInfo', 'PaymentTransaction', 'DepartmentBudget',
    'Employee', 'EmployeeSalary', 'PayrollDisbursementRecord', 'InventoryItem',
    'InvoiceRecord', 'SubscriptionInvoice', 'SubscriptionRecord']
byname = {c['name']: c for c in MODEL['classes']}
for n, name in enumerate(order, 2):
    c = byname[name]
    heading(f'A.{n} {name}', 2)
    p('Sumber: ' + c['source'] + '.', after=3, keep=True)
    lines = [f'export interface {name} {{']
    for a in c['attrs']:
        t = 'PaymentInfo' if name == 'PurchaseOrder' and a['name'] == 'paymentInfo?' else a['type']
        lines.append('  ' + a['name'] + ': ' + t + ';')
    lines.append('}')
    code('\n'.join(lines))

heading(CHAPTERS[9][0], bookmark='lampiranB', newpage=True)
p('Kode lengkap yang dapat diperiksa berada pada kerangka.ts. Cuplikan per kelas berikut '
  'mempertahankan access modifier, parameter, tipe hasil, dan penanda method yang sama. '
  'Tipe Auth, GoogleAuthProvider, User, Firestore, Unsubscribe, dan Storage berasal dari SDK '
  'Firebase atau API browser. Tipe data domain dijelaskan pada Lampiran A.')
heading('B.1 Alias parameter dan listener', 2)
code("export type MutationSource =\n  'approval' | 'receipt' | 'payment';\nexport type PoAction =\n  'create' | 'approve' | 'receive' | 'pay';\nexport type SessionListener =\n  (session: UserSession | null) => void;\nexport type PurchaseOrderListener =\n  (orders: PurchaseOrder[]) => void;")
source = (HERE / 'kerangka.ts').read_text(encoding='utf-8')
blocks = re.findall(r'export class [\s\S]+?(?=\nexport class |\Z)', source)
assert len(blocks) == 11
for i, block in enumerate(blocks, 2):
    name = re.search(r'export class (\w+)', block).group(1)
    heading(f'B.{i} {name}', 2)
    code(block.strip())

heading(CHAPTERS[10][0], bookmark='lampiranC', newpage=True)
table(['Berkas', 'Kegunaan'], [
    ['docs/tubes-class-diagram/kerangka.ts', '11 kelas dan tipe lokal yang dapat diperiksa TypeScript.'],
    ['docs/tubes-class-diagram/data-models.ts', 'Salinan deklarasi SDM dan paket langganan dari komponen.'],
    ['docs/tubes-class-diagram/tsconfig.json', 'Konfigurasi pemeriksaan strict kerangka.'],
    ['docs/tubes-class-diagram/Inventora_Class_Diagram.puml', 'Sumber UML lengkap dengan seluruh anggota dan relasi.'],
    ['docs/tubes-class-diagram/model.json', 'Metadata deklarasi dan hash sumber yang membentuk diagram.'],
    ['docs/tubes-class-diagram/README.md', 'Petunjuk pemeriksaan dan batas implementasi.'],
    ['database/firestore/hasil-uji.json', 'Bukti 18 pemeriksaan emulator dari tugas basis data sebelumnya.'],
], [8.4, 8.3])
heading('C.1 Perintah pemeriksaan', 2)
p('Jalankan dari folder proyek dengan Node.js dan dependensi yang terpasang. Perintah tidak '
  'mengimplementasikan method dan tidak menjalankan login Google.')
code('node --import tsx --test tests/regressions.test.ts\nnpx tsc --noEmit\nnpx tsc -p docs/tubes-class-diagram/tsconfig.json')
heading('C.2 Pemutakhiran model', 2)
code('node docs/tubes-class-diagram/susun-model.mjs')
p('Perintah membentuk kembali model.json, data-models.ts, dan sumber PlantUML berdasarkan '
  'deklarasi yang dipilih. Jika sumber aplikasi berubah, hasil diagram dan laporan perlu '
  'diperiksa kembali. Dokumen ini menggambarkan keadaan kode pada tanggal pemeriksaan, '
  'bukan daftar fitur yang seluruhnya sudah dipindahkan ke cloud.')
