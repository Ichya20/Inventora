from pathlib import Path
import subprocess
import json
import sys
from PIL import Image,ImageOps,ImageDraw
from pypdf import PdfReader
sys.stdout.reconfigure(encoding='utf-8')
root=Path('D:/Inventora/tmp/uml-docs-2026-10-28/qa')
poppler=Path('C:/Users/ICHYA ULUMIDDIN/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/poppler/Library/bin')
results={}
for kind in sys.argv[1:] or ('skpl','dppl'):
    pdf=root/(kind+'.pdf')
    out=root/kind
    out.mkdir(exist_ok=True)
    reader=PdfReader(str(pdf))
    rendered=list(out.glob('page-*.png'))
    if len(rendered) != len(reader.pages) or any(p.stat().st_mtime < pdf.stat().st_mtime for p in rendered):
        for page_png in rendered:
            page_png.unlink()
        subprocess.run([str(poppler/'pdftoppm.exe'),'-r','120','-png',str(pdf),str(out/'page')],check=True,capture_output=True)
    text_path=out/'pages.txt'
    pages=[page.extract_text(extraction_mode='layout') for page in reader.pages]
    text_path.write_text('\f'.join(pages),encoding='utf-8')
    results[kind]=[]
    for number,text in enumerate(pages,1):
        headings=[line.strip() for line in text.splitlines() if line.strip().startswith(('5.','Gambar','6.','1. Pendahuluan'))]
        results[kind].append({'page':number,'words':len(text.split()),'headings':headings})
    files=sorted(out.glob('page-*.png'))
    for start in range(0,len(files),4):
        sheet=Image.new('RGB',(1460,2110),'#e4e4e4')
        draw=ImageDraw.Draw(sheet)
        for index,path in enumerate(files[start:start+4]):
            image=Image.open(path).convert('RGB')
            image.thumbnail((710,1010))
            x=15+(index%2)*730;y=30+(index//2)*1055
            sheet.paste(image,(x,y))
            draw.text((x,y-20),path.stem,fill='black')
        sheet.save(out/f'contact-{start+1:02d}.jpg',quality=90)
    print(kind,'PAGES',len(files),json.dumps([p for p in results[kind] if p['headings']],ensure_ascii=False),flush=True)
(root/'page-map.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
