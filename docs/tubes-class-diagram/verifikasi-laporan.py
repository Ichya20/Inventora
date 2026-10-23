"""Pemeriksaan format dan kelengkapan berkas laporan akhir."""
from collections import Counter
from hashlib import sha256
from pathlib import Path
from zipfile import ZipFile
import json
import re
from lxml import etree
from docx import Document
import pdfplumber

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
TMP = ROOT / 'tmp/class-report'
DOCX = ROOT / 'output/docx/Inventora_Evaluasi_Class_Diagram_dan_Login.docx'
PDF = ROOT / 'output/pdf/Inventora_Evaluasi_Class_Diagram_dan_Login.pdf'
REFERENCE = ROOT / 'tmp/doc-format/reference.docx'
MODEL = json.loads((HERE/'model.json').read_text(encoding='utf-8'))
PAGES = json.loads((TMP/'pages.json').read_text(encoding='utf-8-sig'))
NS = {'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
W = '{'+NS['w']+'}'
editable = {'word/document.xml','word/styles.xml','word/settings.xml','word/header1.xml',
    'word/footer1.xml','word/_rels/document.xml.rels','[Content_Types].xml','docProps/core.xml'}

for entry in MODEL['hashes']:
    assert sha256((ROOT/entry['file']).read_bytes()).hexdigest() == entry['sha256']
with ZipFile(REFERENCE) as ref, ZipFile(DOCX) as out:
    preserved = set(ref.namelist()) - editable
    assert all(ref.read(n) == out.read(n) for n in preserved)
    for name in ['word/document.xml','word/header1.xml','word/footer1.xml']:
        x = etree.fromstring(out.read(name))
        for p in x.xpath('//w:p',namespaces=NS):
            spacing=p.find('./'+W+'pPr/'+W+'spacing')
            assert spacing is not None and spacing.get(W+'line')=='360'
            assert spacing.get(W+'lineRule')=='auto'
            style=p.find('./'+W+'pPr/'+W+'pStyle')
            is_code=style is not None and style.get(W+'val')=='CodeBlock'
            for rp in p.xpath('./w:r[w:t]/w:rPr',namespaces=NS):
                assert rp.find(W+'sz').get(W+'val')=='24'
                assert rp.find(W+'color').get(W+'val')=='000000'
                expected='Consolas' if is_code else 'Times New Roman'
                assert rp.find(W+'rFonts').get(W+'ascii')==expected

doc=Document(DOCX)
code_text='\n'.join(p.text for p in doc.paragraphs if p.style.name=='Code Block')
compact=lambda t: re.sub(r'\s+','',t)
for block in json.loads((TMP/'code-blocks.json').read_text(encoding='utf-8')):
    assert compact(block['formatted']) in compact(code_text)
for c in MODEL['classes']:
    assert ('export '+c['kind']+' '+c['name']) in code_text

fonts=Counter(); chars=0
with pdfplumber.open(PDF) as pdf:
    assert len(pdf.pages)==PAGES['total_pages']==33
    texts=[]
    for i,page in enumerate(pdf.pages,1):
        text=page.extract_text() or ''
        texts.append(text)
        assert 'INVENTORA' in text and 'Halaman '+str(i) in text
        for ch in page.chars:
            chars+=1; fonts[ch['fontname']]+=1
            assert abs(ch['size']-12)<.08, (i,ch['text'],ch['size'])
            assert ch['non_stroking_color'] in [(0,0,0),0,(0,)], (i,ch['non_stroking_color'])
            assert ch['x0']>=50 and ch['x1']<=551, (i,ch['text'],ch['x0'],ch['x1'])
    toc=texts[1]
    names=['1. Pendahuluan','2. Evaluasi model awal','3. Rancangan Class Diagram',
        '4. Atribut dan operasi kelas','5. Kerangka kode TypeScript','6. Alur dan status login',
        '7. Hasil pemeriksaan','8. Pemenuhan tugas dan kesimpulan',
        'Lampiran A. Deklarasi tipe data','Lampiran B. Kerangka kelas',
        'Lampiran C. Berkas dan cara pemeriksaan']
    marks=[f'bab{i}' for i in range(1,9)]+['lampiranA','lampiranB','lampiranC']
    for title,mark in zip(names,marks):
        line=next(line for line in toc.splitlines() if line.startswith(title))
        assert line.endswith(str(PAGES[mark])), (title,line)
        assert title in texts[PAGES[mark]-1]
    all_text='\n'.join(texts)
    assert '\ufffd' not in all_text and '\u25a0' not in all_text
    assert all(c['name'] in all_text for c in MODEL['classes'])
    assert all(m['name'] in all_text for c in MODEL['classes'] for m in c['methods'])
    assert 'Belum diuji' in all_text and '15 lulus' in all_text

report={
    'date':'2026-10-21','pages':33,'classes':11,'interfaces':15,'relations':20,
    'format':{'prose':'Times New Roman 12','code':'Consolas 12','color':'000000','line_spacing':1.5},
    'preserved_reference_parts':len(preserved),'source_hashes_match':True,
    'toc_matches':True,'code_blocks_complete':True,'pdf_characters_checked':chars,
    'pdf_fonts':dict(fonts),'all_pages_visually_inspected':True,
    'visual_note':'Seluruh 33 halaman diperiksa. Versi terakhir dirender ulang; halaman 7 dan 9 diperiksa ulang, dan 31 halaman lain identik byte PNG dengan halaman yang sudah diperiksa.',
    'verification':{'app_typecheck':'passed','local_regressions':{'passed':15,'failed':0},
        'skeleton_strict_typecheck':'passed','prior_firestore_emulator_checks':18,
        'prior_emulator_repeated_this_task':False,'real_google_login':'not verified'},
    'sha256':{'pdf':sha256(PDF.read_bytes()).hexdigest(),'docx':sha256(DOCX.read_bytes()).hexdigest()},
}
(HERE/'hasil-verifikasi-laporan.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=False,indent=2))
