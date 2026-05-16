"""Convert .docx to training HTML page — matching market dept style."""
import sys, os, json, zipfile, shutil, re, subprocess
import xml.etree.ElementTree as ET

W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
WP = 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing'
A = 'http://schemas.openxmlformats.org/drawingml/2006/main'
R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'

SKIP_PATTERNS = [
    r'^撰写\s*[：:].*', r'^适用部门\s*[：:].*',
    r'^目录$', r'^\d+$', r'^[一二三四五六七八九十]{1,2}[、，]\s*$',
]

def load_rels(path):
    rels = {}
    for rel in ET.parse(path).getroot():
        rid, target = rel.get('Id'), rel.get('Target')
        if rid and target: rels[rid] = target
    return rels

def para_text(para):
    return ''.join(t.text or '' for t in para.iter(f'{{{W}}}t'))

def para_style(para):
    pp = para.find(f'{{{W}}}pPr')
    if pp is not None:
        ps = pp.find(f'{{{W}}}pStyle')
        if ps is not None: return ps.get(f'{{{W}}}val', '')
    return ''

def image_rids(para):
    rids = []
    for el in para.iter(f'{{{WP}}}inline'), para.iter(f'{{{WP}}}anchor'):
        for e in el:
            for blip in e.iter(f'{{{A}}}blip'):
                emb = blip.get(f'{{{R}}}embed')
                if emb and emb not in rids: rids.append(emb)
    for im in para.iter('{urn:schemas-microsoft-com:vml}imagedata'):
        rid = im.get(f'{{{R}}}id')
        if rid and rid not in rids: rids.append(rid)
    return rids

def emf_to_png(path):
    out = path.rsplit('.', 1)[0] + '.png'
    try:
        subprocess.run(['magick', path, out], check=True, capture_output=True)
        return out
    except:
        try:
            subprocess.run(['convert', path, out], check=True, capture_output=True)
            return out
        except:
            return None

def clean_text(text):
    text = re.sub(r'\s+', ' ', text).strip()
    if not text: return text
    half = len(text) // 2
    if half > 3 and text[:half] == text[half:]:
        text = text[:half].strip()
    for pat in SKIP_PATTERNS:
        if re.match(pat, text): return ''
    return text

def parse_table(elem):
    rows = []
    for tr in elem.iter(f'{{{W}}}tr'):
        cells = []
        for tc in tr.iter(f'{{{W}}}tc'):
            txts = [clean_text(para_text(p)) for p in tc.iter(f'{{{W}}}p') if clean_text(para_text(p))]
            cells.append('<td>' + ' '.join(txts) + '</td>')
        if cells: rows.append('<tr>' + ''.join(cells) + '</tr>')
    return '<table>' + ''.join(rows) + '</table>' if rows else ''

# ---- Shared CSS (adapted from market dept style.css) ----
SHARED_CSS = '''\
*{margin:0;padding:0;box-sizing:border-box}
html{scroll-behavior:smooth}
body{font-family:"Microsoft YaHei","PingFang SC","Helvetica Neue",Helvetica,Arial,sans-serif;background:#f5f7fa;color:#333;line-height:1.7;padding:2rem 1rem}
.container{max-width:1000px;margin:0 auto;background:#fff;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,0.06);padding:2.5rem 3rem}
h1{text-align:center;font-size:2.2rem;color:#1a2b4c;margin-bottom:1rem;border-bottom:3px solid #2d6ee0;padding-bottom:0.8rem}
.toc{background:#f8fafd;border:1px solid #e2e8f0;border-radius:8px;padding:1.2rem 1.8rem;margin:1.5rem 0 2rem}
.toc h3{margin-top:0;color:#1e3a6f}
.toc ol{margin-left:1.5rem}
.toc li{margin-bottom:0.3rem}
.toc a{text-decoration:none;color:#2d6ee0;font-weight:500}.toc a:hover{text-decoration:underline}
h2{font-size:1.6rem;color:#1e3a6f;margin:2.5rem 0 1.2rem;padding-left:0.5rem;border-left:6px solid #2d6ee0}
h3{font-size:1.3rem;color:#2c3e50;margin:1.8rem 0 0.8rem}
p,li{font-size:1rem;margin-bottom:0.6rem}
ul,ol{margin-left:1.8rem;margin-bottom:1.2rem}li{margin-bottom:0.3rem}
strong,b{color:#c44536;font-weight:700}
table{width:100%;border-collapse:collapse;margin:1.5rem 0;font-size:0.95rem;box-shadow:0 2px 8px rgba(0,0,0,0.05)}
th{background:#2d6ee0;color:#fff;padding:12px 8px;text-align:center;font-weight:600}
td{border:1px solid #e2e8f0;padding:10px 8px;vertical-align:top;background:#fff}
tr:nth-child(even) td{background:#f8fafd}
.screenshot-img{display:block;max-width:100%;height:auto;margin:1.8rem auto 0.5rem;border:2px solid #d0d7de;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.08);background:#f0f4ff}
.caption{text-align:center;font-size:0.9rem;color:#5a6b7a;margin-bottom:1.2rem;font-weight:500}
.note-box{background:#e3f2fd;border-left:6px solid #1565c0;padding:1rem 1.5rem;margin:1.2rem 0;border-radius:0 6px 6px 0;font-weight:500}
.highlight-box{background:#fff3e0;border-left:6px solid #e65100;padding:1rem 1.5rem;margin:1.2rem 0;border-radius:0 6px 6px 0;font-weight:500}
.search-box{margin:1rem 0 1.5rem}
.search-box input{width:100%;padding:0.7rem 1rem;border:2px solid #e2e8f0;border-radius:8px;font-size:1rem;transition:0.2s;font-family:inherit}
.search-box input:focus{outline:none;border-color:#2d6ee0;box-shadow:0 0 0 3px rgba(45,110,224,0.1)}
.search-result-count{text-align:center;font-size:0.85rem;color:#64748b;margin-top:0.3rem}
.footer{text-align:center;color:#94a3b8;font-size:0.85rem;margin-top:3rem;border-top:1px solid #e2e8f0;padding-top:1.5rem}
.back-link{display:inline-block;color:#2d6ee0;text-decoration:none;font-size:0.95rem;margin-bottom:1rem}
.back-link:hover{text-decoration:underline}
@media(max-width:640px){.container{padding:1.5rem}h1{font-size:1.6rem}}
@media print{.search-box,.toc{display:none!important}.container{box-shadow:none;padding:1rem}body{background:#fff;padding:0}.screenshot-img{border:1px solid #ccc;box-shadow:none}h2{border-left:none;padding-left:0}}
'''

def convert(docx_path, out_dir, title):
    os.makedirs(out_dir, exist_ok=True)
    img_dir = os.path.join(out_dir, 'images')
    os.makedirs(img_dir, exist_ok=True)

    wd = os.path.join('/tmp', 'dx_tmp_' + os.path.basename(docx_path)[:10])
    if os.path.exists(wd): shutil.rmtree(wd)
    os.makedirs(wd)
    with zipfile.ZipFile(docx_path, 'r') as z: z.extractall(wd)

    rels = load_rels(os.path.join(wd, 'word', '_rels', 'document.xml.rels'))
    img_map = {}
    media = os.path.join(wd, 'word', 'media')
    if os.path.exists(media):
        for rid, target in rels.items():
            if 'media/' in target:
                fn = os.path.basename(target)
                src = os.path.join(media, fn)
                if os.path.exists(src):
                    if fn.lower().endswith('.emf'):
                        p = emf_to_png(src)
                        if p:
                            nn = fn.rsplit('.', 1)[0] + '.png'
                            shutil.copy(p, os.path.join(img_dir, nn))
                            img_map[rid] = nn
                    else:
                        shutil.copy(src, os.path.join(img_dir, fn))
                        img_map[rid] = fn

    tree = ET.parse(os.path.join(wd, 'word', 'document.xml'))
    body = tree.getroot().find(f'{{{W}}}body')

    blocks, sec_count = [], 0
    for elem in body:
        tag = elem.tag.split('}')[-1] if '}' in elem.tag else elem.tag
        if tag == 'p':
            text = clean_text(para_text(elem))
            rids = image_rids(elem)
            imgs = [img_map[r] for r in rids if r in img_map]
            if imgs: blocks.append({'t': 'img', 'imgs': imgs})
            if not text: continue
            # Detect headings
            hl = 0
            if re.match(r'^[一二三四五六七八九十]、', text): hl = 2
            elif re.match(r'^\d+[\.\、)]\s*', text) and len(text) < 80: hl = 3
            if hl:
                sec_count += 1
                sec_id = f'sec{sec_count}'
                blocks.append({'t': 'h', 'l': hl, 'text': text, 'id': sec_id})
            else:
                blocks.append({'t': 'p', 'text': text})
        elif tag == 'tbl':
            th = parse_table(elem)
            if th: blocks.append({'t': 'table', 'html': th})

    # Build TOC from headings
    toc_items = [(b['text'], b['id']) for b in blocks if b['t'] == 'h' and b['l'] == 2]
    toc_html = ''
    if toc_items:
        toc_html = '<div class="toc"><h3>📑 目录</h3><ol>' + \
            ''.join(f'<li><a href="#{i}">{t}</a></li>' for t, i in toc_items) + '</ol></div>'

    # Generate HTML
    parts = [f'''<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title}</title>
<link rel="stylesheet" href="css/style.css">
</head>
<body>
<div class="container">
<a href="../" class="back-link">← 返回培训文档目录</a>
<h1>{title}</h1>
{toc_html}
<div class="search-box">
<input type="text" id="searchInput" placeholder="🔍 搜索操作步骤…">
<div class="search-result-count" id="searchCount"></div>
</div>
''']

    for b in blocks:
        if b['t'] == 'h':
            tag = 'h2' if b['l'] == 2 else 'h3'
            parts.append(f'<{tag} id="{b["id"]}">{b["text"]}</{tag}>')
        elif b['t'] == 'p':
            parts.append(f'<p>{b["text"]}</p>')
        elif b['t'] == 'img':
            for im in b['imgs']:
                parts.append(f'<img src="images/{im}" alt="操作截图" class="screenshot-img" loading="lazy">')
                parts.append('<p class="caption">▲ 操作截图</p>')
        elif b['t'] == 'table':
            parts.append(b['html'])

    parts.append('''<div class="footer">
<p>市场部内部培训专用 · 请以最新系统实际界面为准</p>
</div>
</div>
<script>
(function(){
var q=document.getElementById("searchInput"),c=document.getElementById("searchCount"),
hs=document.querySelectorAll("h2,h3"),ps=document.querySelectorAll("p,li,table,img");
q.addEventListener("input",function(){
var s=this.value.trim().toLowerCase(),n=0;
ps.forEach(function(el){if(!s||el.textContent.toLowerCase().indexOf(s)!==-1){el.style.display="";n++}else{el.style.display="none"}});
hs.forEach(function(h){h.style.display=""});
c.textContent=s?"找到 "+n+" 处匹配":"";
})})();
</script>
</body>
</html>''')

    html = '\n'.join(parts)
    # Write HTML
    with open(os.path.join(out_dir, 'index.html'), 'w', encoding='utf-8') as f:
        f.write(html)
    # Write shared CSS
    os.makedirs(os.path.join(out_dir, 'css'), exist_ok=True)
    with open(os.path.join(out_dir, 'css', 'style.css'), 'w', encoding='utf-8') as f:
        f.write(SHARED_CSS)

    shutil.rmtree(wd)
    print(f'Done: {title}  |  {len(toc_items)} sections  |  {sum(1 for b in blocks if b["t"]=="img")} images')

if __name__ == '__main__':
    assert len(sys.argv) >= 4, 'Usage: python3 docx2html.py <docx> <out_dir> <title>'
    convert(sys.argv[1], sys.argv[2], sys.argv[3])
