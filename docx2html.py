"""Convert .docx to clean Apple-style HTML training page."""
import sys, os, json, zipfile, shutil, re, subprocess
import xml.etree.ElementTree as ET

NS = {
    'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
    'wp': 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing',
    'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
    'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
    'pic': 'http://schemas.openxmlformats.org/drawingml/2006/picture',
    'v': 'urn:schemas-microsoft-com:vml',
    'r2': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
}

W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
WP = 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing'
A = 'http://schemas.openxmlformats.org/drawingml/2006/main'
R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
R2 = R

def load_rels(rels_path):
    """Load relationship mappings from .rels file."""
    tree = ET.parse(rels_path)
    rels = {}
    for rel in tree.getroot():
        rid = rel.get('Id')
        target = rel.get('Target')
        if rid and target:
            rels[rid] = target
    return rels

def extract_text_from_para(para):
    """Extract plain text from a paragraph element."""
    texts = []
    for t in para.iter(f'{{{W}}}t'):
        if t.text:
            texts.append(t.text)
    return ''.join(texts)

def get_para_style(para):
    """Get paragraph style name."""
    pPr = para.find(f'{{{W}}}pPr')
    if pPr is not None:
        pStyle = pPr.find(f'{{{W}}}pStyle')
        if pStyle is not None:
            return pStyle.get(f'{{{W}}}val', '')
    return ''

def get_image_rids(para):
    """Extract all image rIds from a paragraph (including VML images)."""
    rids = []

    # Standard drawing images (wp:inline)
    for inline in para.iter(f'{{{WP}}}inline'):
        for blip in inline.iter(f'{{{A}}}blip'):
            embed = blip.get(f'{{{R}}}embed')
            if embed and embed not in rids:
                rids.append(embed)

    # Anchored images
    for anchor in para.iter(f'{{{WP}}}anchor'):
        for blip in anchor.iter(f'{{{A}}}blip'):
            embed = blip.get(f'{{{R}}}embed')
            if embed and embed not in rids:
                rids.append(embed)

    # VML images (legacy format, often in .emf)
    for imagedata in para.iter('{urn:schemas-microsoft-com:vml}imagedata'):
        rid = imagedata.get(f'{{{R2}}}id')
        if rid and rid not in rids:
            rids.append(rid)

    return rids

def convert_emf_to_png(emf_path):
    """Convert .emf to .png using ImageMagick."""
    png_path = emf_path.rsplit('.', 1)[0] + '.png'
    try:
        subprocess.run(['magick', emf_path, png_path], check=True, capture_output=True)
        return png_path
    except:
        try:
            subprocess.run(['convert', emf_path, png_path], check=True, capture_output=True)
            return png_path
        except:
            return None

def get_heading_level(style_name):
    """Map paragraph style to heading level."""
    style_lower = (style_name or '').lower()
    if 'heading1' in style_lower or '1' in style_lower and 'heading' in style_lower:
        return 1
    if 'heading2' in style_lower or '2' in style_lower and 'heading' in style_lower:
        return 2
    if 'heading3' in style_lower:
        return 3
    return 0

def is_toc_item(text):
    """Detect if text is a table-of-contents line."""
    return bool(re.match(r'^[\d\.\s]+$', text.strip()))

def parse_table(table_elem, rels, image_map):
    """Parse a table element to HTML."""
    rows_html = []
    for row in table_elem.iter(f'{{{W}}}tr'):
        cells_html = []
        for cell in row.iter(f'{{{W}}}tc'):
            cell_texts = []
            for para in cell.iter(f'{{{W}}}p'):
                t = extract_text_from_para(para).strip()
                if t:
                    cell_texts.append(t)
            cells_html.append('<td>' + ' '.join(cell_texts) + '</td>')
        if cells_html:
            rows_html.append('<tr>' + ''.join(cells_html) + '</tr>')
    if rows_html:
        return '<table>' + ''.join(rows_html) + '</table>'
    return ''

SKIP_PATTERNS = [
    r'^撰写\s*[：:].*',
    r'^适用部门\s*[：:].*',
    r'^目录$',
    r'^\d+$',
    r'^[一二三四五六七八九十]{1,2}[、，]\s*$',
]

def reformat_para(text):
    """Clean up paragraph text."""
    text = re.sub(r'\s+', ' ', text).strip()
    if not text:
        return text
    # Remove consecutive duplicate text (Word header/footer artifact)
    half = len(text) // 2
    if half > 3 and text[:half] == text[half:]:
        text = text[:half].strip()
    # Skip boilerplate lines
    for pat in SKIP_PATTERNS:
        if re.match(pat, text):
            return ''
    return text

def convert_docx(docx_path, output_dir, title):
    """Main conversion function."""
    os.makedirs(output_dir, exist_ok=True)
    img_dir = os.path.join(output_dir, 'images')
    os.makedirs(img_dir, exist_ok=True)

    # Unzip
    work_dir = os.path.join('/tmp', 'docx_convert_' + os.path.basename(docx_path).split('.')[0])
    if os.path.exists(work_dir):
        shutil.rmtree(work_dir)
    os.makedirs(work_dir)

    with zipfile.ZipFile(docx_path, 'r') as z:
        z.extractall(work_dir)

    # Load relationships
    rels_path = os.path.join(work_dir, 'word', '_rels', 'document.xml.rels')
    rels = load_rels(rels_path) if os.path.exists(rels_path) else {}

    # Build rId → image filename map
    image_map = {}
    media_dir = os.path.join(work_dir, 'word', 'media')
    if os.path.exists(media_dir):
        for rid, target in rels.items():
            if 'media/' in target:
                fname = os.path.basename(target)
                src = os.path.join(media_dir, fname)
                if os.path.exists(src):
                    # Handle .emf conversion
                    if fname.lower().endswith('.emf'):
                        png_path = convert_emf_to_png(src)
                        if png_path:
                            new_name = fname.rsplit('.', 1)[0] + '.png'
                            dst = os.path.join(img_dir, new_name)
                            shutil.copy(png_path, dst)
                            image_map[rid] = new_name
                    else:
                        # Optimize PNG with basic compression
                        dst = os.path.join(img_dir, fname)
                        shutil.copy(src, dst)
                        image_map[rid] = fname

    # Parse document
    doc_tree = ET.parse(os.path.join(work_dir, 'word', 'document.xml'))
    body = doc_tree.getroot().find(f'{{{W}}}body')

    # Build content blocks in order
    blocks = []  # List of {'type': 'text'|'image'|'heading', 'content': ...}
    img_counter = 0

    for elem in body:
        tag = elem.tag.split('}')[-1] if '}' in elem.tag else elem.tag

        if tag == 'p':
            text = extract_text_from_para(elem)
            rids = get_image_rids(elem)
            style = get_para_style(elem)
            hlevel = get_heading_level(style)

            # Skip empty paragraphs that only have images (handled below)
            imgs = []
            for rid in rids:
                if rid in image_map:
                    img_counter += 1
                    imgs.append(image_map[rid])

            if imgs:
                blocks.append({'type': 'image', 'images': imgs})

            text = reformat_para(text)
            if text:
                # Skip pure TOC items and page numbers
                if is_toc_item(text):
                    continue
                if re.match(r'^\d+$', text):  # standalone page numbers
                    continue
                if re.match(r'^[一二三四五六七八九十]、', text):  # Chinese numbered headers
                    hlevel = 2
                if re.match(r'^\d+[\.\、]', text) and len(text) < 80:  # numbered sub-headers
                    hlevel = 3

                if hlevel > 0:
                    blocks.append({'type': 'heading', 'level': hlevel, 'text': text})
                else:
                    blocks.append({'type': 'text', 'text': text})

        elif tag == 'tbl':
            table_html = parse_table(elem, rels, image_map)
            if table_html:
                blocks.append({'type': 'table', 'html': table_html})

    # Generate HTML
    html_parts = [f'''<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title}</title>
<style>
* {{ margin:0; padding:0; box-sizing:border-box }}
body {{
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  background: #fff; color: #1d1d1f; line-height: 1.8;
  -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;
}}
.container {{ max-width: 860px; margin: 0 auto; padding: 3rem 2rem 5rem }}
h1 {{
  font-size: 2.4rem; font-weight: 700; letter-spacing: -0.02em; color: #1d1d1f;
  margin-bottom: 0.4rem; line-height: 1.2;
}}
h2 {{
  font-size: 1.5rem; font-weight: 600; color: #1d1d1f;
  margin: 3rem 0 1rem; padding-bottom: 0.4rem;
  border-bottom: 1px solid #e5e5e7;
}}
h3 {{
  font-size: 1.15rem; font-weight: 600; color: #1d1d1f; margin: 2rem 0 0.6rem;
}}
p {{ margin-bottom: 0.8rem; font-size: 1rem; color: #333; }}
img {{
  display: block; max-width: 100%; height: auto;
  margin: 1.2rem 0; border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  border: 1px solid #f0f0f0;
}}
table {{
  width: 100%; border-collapse: collapse; margin: 1rem 0 1.5rem; font-size: 0.93rem;
}}
th, td {{
  padding: 0.7rem 1rem; text-align: left; border-bottom: 1px solid #e5e5e7;
}}
th {{ background: #f5f5f7; font-weight: 600; color: #1d1d1f; }}
tr:nth-child(even) td {{ background: #fafafa }}
ul, ol {{ margin: 0.5rem 0 0.8rem 1.5rem }}
li {{ margin-bottom: 0.3rem }}
.caption {{
  text-align: center; font-size: 0.85rem; color: #86868b; margin-top: -0.6rem; margin-bottom: 1.5rem;
}}
.footer {{
  margin-top: 4rem; padding-top: 2rem; border-top: 1px solid #e5e5e7;
  text-align: center; color: #86868b; font-size: 0.85rem;
}}
.back-link {{ display: inline-block; color: #0066cc; text-decoration: none; font-size: 0.95rem; margin-bottom: 2rem }}
.back-link:hover {{ text-decoration: underline }}
@media (max-width: 640px) {{
  .container {{ padding: 1.5rem 1rem }}
  h1 {{ font-size: 1.8rem }}
}}
@media (prefers-color-scheme: dark) {{
  body {{ background: #000; color: #f5f5f7 }}
  h1,h2,h3,th {{ color: #f5f5f7 }}
  p,li {{ color: #a1a1a6 }}
  h2 {{ border-color: #333 }}
  img {{ border-color: #333; box-shadow: 0 1px 3px rgba(255,255,255,0.05) }}
  th {{ background: #1c1c1e }}
  th,td {{ border-color: #333 }}
  tr:nth-child(even) td {{ background: #1c1c1e }}
  .footer {{ border-color: #333; color: #86868b }}
  .caption {{ color: #86868b }}
}}
</style>
</head>
<body>
<div class="container">
<a href="../" class="back-link">← 返回培训文档目录</a>
<h1>{title}</h1>
''']

    for block in blocks:
        if block['type'] == 'text':
            html_parts.append(f'<p>{block["text"]}</p>')
        elif block['type'] == 'heading':
            lvl = block['level']
            if lvl == 1:
                html_parts.append(f'<h2>{block["text"]}</h2>')
            elif lvl == 2:
                html_parts.append(f'<h2>{block["text"]}</h2>')
            else:
                html_parts.append(f'<h3>{block["text"]}</h3>')
        elif block['type'] == 'image':
            for img_file in block['images']:
                html_parts.append(f'<img src="images/{img_file}" alt="操作截图" loading="lazy">')
        elif block['type'] == 'table':
            html_parts.append(block['html'])

    html_parts.append('''<div class="footer">
<p>市场部内部培训专用 · 请以最新系统实际界面为准</p>
</div>
</div>
</body>
</html>''')

    html_content = '\n'.join(html_parts)

    out_path = os.path.join(output_dir, 'index.html')
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(html_content)

    # Cleanup
    shutil.rmtree(work_dir)

    print(f'Done: {title}')
    print(f'  Images: {img_counter}')
    print(f'  Output: {out_path}')
    return out_path

if __name__ == '__main__':
    if len(sys.argv) < 4:
        print('Usage: python3 docx2html.py <docx> <output_dir> <title>')
        sys.exit(1)
    convert_docx(sys.argv[1], sys.argv[2], sys.argv[3])
