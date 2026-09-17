import json, re
from docx import Document

W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'

def get_numpr(p):
    numPr = p._p.find(f'.//{W}numPr')
    if numPr is None:
        return None
    numId_el = numPr.find(f'{W}numId')
    return numId_el.get(f'{W}val') if numId_el is not None else None

def get_num_formats(path):
    """Map numId -> 'decimal' | 'lowerLetter' by reading numbering.xml's level-0 format."""
    import zipfile
    with zipfile.ZipFile(path) as z:
        xml = z.read('word/numbering.xml').decode('utf-8')
    num_to_abs = dict(re.findall(r'<w:num w:numId="(\d+)"[^>]*>.*?<w:abstractNumId w:val="(\d+)"', xml, re.S))
    abs_fmt = {}
    for absid, block in re.findall(r'<w:abstractNum w:abstractNumId="(\d+)"[^>]*>(.*?)</w:abstractNum>', xml, re.S):
        lvl0 = re.search(r'<w:lvl w:ilvl="0"[^>]*>(.*?)</w:lvl>', block, re.S)
        if not lvl0:
            continue
        fmt = re.search(r'<w:numFmt w:val="([a-zA-Z]+)"', lvl0.group(1))
        abs_fmt[absid] = fmt.group(1) if fmt else 'decimal'
    return {numid: abs_fmt.get(absid, 'decimal') for numid, absid in num_to_abs.items()}

def letter(n):
    return chr(ord('a') + n - 1)

def para_content(p):
    """Return pdfmake-style text: either a plain string or list of {text, bold} runs."""
    runs = [(r.text, bool(r.bold)) for r in p.runs if r.text]
    if not runs:
        return None
    if all(b for _, b in runs):
        return {'text': ''.join(t for t, _ in runs), 'bold': True}
    if not any(b for _, b in runs):
        return {'text': ''.join(t for t, _ in runs)}
    return {'text': [{'text': t, 'bold': b} for t, b in runs]}

def convert(path):
    doc = Document(path)
    formats = get_num_formats(path)
    content = []
    counters = {}
    last_numid = None

    for p in doc.paragraphs:
        numId = get_numpr(p)
        text_content = para_content(p)

        if numId is None:
            last_numid = None
            if text_content is None:
                continue  # blank spacer paragraph — spacing handled via margins instead
            item = dict(text_content)
            item['margin'] = [0, 0, 0, 10]
            content.append(item)
            continue

        fmt = formats.get(numId, 'decimal')
        if fmt == 'lowerLetter':
            if numId != last_numid:
                counters[numId] = 0
            counters[numId] += 1
            prefix = f'({letter(counters[numId])}) '
            indent = 28
        else:
            counters[numId] = counters.get(numId, 0) + 1
            prefix = f'{counters[numId]}. '
            indent = 0

        last_numid = numId

        if text_content is None:
            continue
        if isinstance(text_content['text'], str):
            body = [{'text': prefix}, {'text': text_content['text'], **({'bold': True} if text_content.get('bold') else {})}]
        else:
            body = [{'text': prefix}] + text_content['text']
        content.append({'text': body, 'margin': [indent, 0, 0, 8]})

    return content

for src in ['Engagement_Letter_Limited_Company_TEMPLATE.docx', 'Engagement_Letter_2026_TEMPLATE.docx']:
    out = convert(src)
    outname = src.replace('_TEMPLATE.docx', '_content.json')
    with open(outname, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    print(src, '->', outname, f'({len(out)} blocks)')
