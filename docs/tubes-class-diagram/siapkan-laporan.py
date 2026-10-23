"""Menyusun builder laporan dari komponen format acuan yang telah diverifikasi."""
from pathlib import Path

root = Path(__file__).resolve().parents[2]
here = Path(__file__).resolve().parent
old = (root / 'database/firestore/format_laporan_firebase.py').read_text(encoding='utf-8')
prefix = old[:old.index('BOOKMARKS = []')]
prefix = prefix.replace("TMP = ROOT / 'tmp/firebase-report'", "TMP = ROOT / 'tmp/class-report'")
prefix = prefix.replace("Inventora_Tugas_Basis_Data_Firebase.docx", "Inventora_Evaluasi_Class_Diagram_dan_Login.docx")
start = prefix.index('DATA_SOURCE =')
end = prefix.index('PAGE_MAP =')
prefix = prefix[:start] + "MODEL = json.loads((HERE / 'model.json').read_text(encoding='utf-8'))\n" + prefix[end:]
suffix = old[old.index('# Header dan footer'):]
suffix = suffix.replace('Firebase Firestore  |  21 Oktober 2026', 'Class Diagram  |  21 Oktober 2026')
suffix = suffix.replace('Inventora Perancangan dan Implementasi Basis Data Firebase Cloud Firestore', 'Inventora Evaluasi Class Diagram dan Login')
suffix = suffix.replace('Struktur koleksi dan lima dokumen contoh Inventora', 'Evaluasi model kelas atribut operasi kerangka TypeScript dan status login')
suffix = suffix.replace("    assert all(po['id'] in text for po in json.loads((HERE / 'contoh-dokumen.json').read_text(encoding='utf-8'))['documents'])", "    assert all(c['name'] in text for c in MODEL['classes'])")
builder = prefix + (here / 'kode-laporan.py.inc').read_text(encoding='utf-8') + '\n' + (here / 'isi-laporan.py.inc').read_text(encoding='utf-8') + '\n' + suffix
(here / 'format_laporan.py').write_text(builder, encoding='utf-8')
exporter = (root / 'database/firestore/ekspor_laporan.ps1').read_text(encoding='utf-8')
exporter = exporter.replace('firebase-report', 'class-report').replace('Inventora_Tugas_Basis_Data_Firebase', 'Inventora_Evaluasi_Class_Diagram_dan_Login')
(here / 'ekspor_laporan.ps1').write_text(exporter, encoding='utf-8')
print('Builder dan exporter siap')
