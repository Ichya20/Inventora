# Kelompokkan method pendek agar deklarasi dan penandanya tidak terpisah halaman.
def code(source):
    formatted = reflow(source)
    CODE_BLOCKS.append({'source': source, 'formatted': formatted})
    lines = formatted.splitlines()
    if source.startswith('export class ') and len(lines) > 13:
        starts = [i for i, line in enumerate(lines)
            if re.match(r'^  (?:public|private|protected) (?:constructor\(|\w+\()', line)]
        # Constructor bersama atribut awal dan method pertama menjadi satu pembuka.
        cuts = starts[2:] if starts and 'constructor' in lines[starts[0]] else starts[1:]
        chunks = [lines[a:b] for a, b in zip([0] + cuts, cuts + [len(lines)])]
        together = [True] * len(chunks)
    elif len(lines) <= 13:
        chunks = [lines]
        together = [True]
    else:
        chunks = [lines[:4], lines[4:-3], lines[-3:]]
        together = [True, False, True]
    for i, chunk in enumerate(chunks):
        if not chunk:
            continue
        para = p(style='Code Block', align=WD_ALIGN_PARAGRAPH.LEFT,
            before=0, after=6 if i == len(chunks)-1 else 0)
        para.paragraph_format.keep_together = together[i]
        font(para.add_run('\n'.join(chunk)), family='Consolas', bold=False)
    return para
