"""Local-only link, anchor, metadata, and release-content validation; no network."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parents[1]
class Document(HTMLParser):
    def __init__(self,text):
        super().__init__();self.links=[];self.ids=[];self.h1=0;self.metas={};self.canon=[];self.scripts=[];self.feed(text)
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if 'id' in a:self.ids.append(a['id'])
        if tag=='h1':self.h1+=1
        if tag=='meta':self.metas[a.get('property',a.get('name',''))]=a.get('content','')
        if tag=='link' and a.get('rel')=='canonical':self.canon.append(a['href'])
        if tag=='script' and 'src' in a:self.scripts.append(a['src'])
        if tag in ['a','link'] and 'href' in a:self.links.append(a['href'])
        if tag in ['img','script'] and 'src' in a:self.links.append(a['src'])
docs={p:Document(p.read_text(encoding='utf-8')) for p in ROOT.rglob('*.html') if '.git' not in p.parts and 'tests' not in p.parts and 'proposals' not in p.parts and not p.name.startswith('google')}
errors=[]
for p,d in docs.items():
    if len(d.ids)!=len(set(d.ids)):errors.append(f'{p.name}: duplicate id')
    if d.h1!=1 and p.name!='komorebi.html':errors.append(f'{p.name}: expected one H1, found {d.h1}')
    for link in d.links:
        u=urlsplit(link)
        if u.scheme or u.netloc:continue
        target=(p.parent/unquote(u.path)).resolve() if u.path else p
        if target.is_dir():target=target/'index.html'
        if not target.is_relative_to(ROOT):errors.append(f'{p.name}: escaped root {link}');continue
        if not target.exists():errors.append(f'{p.name}: missing {link}')
        elif u.fragment and target in docs and unquote(u.fragment) not in docs[target].ids:errors.append(f'{p.name}: missing anchor {link}')
    if p.parent==ROOT:
        if len(d.canon)!=1:errors.append(f'{p.name}: canonical count {len(d.canon)}')
        if not d.metas.get('og:image','').endswith('/assets/ogp.png'):errors.append(f'{p.name}: no OGP')
        for s in ['site-config.js','contact-context.js','app.js','analytics.js']:
            if d.scripts.count(s)!=1:errors.append(f'{p.name}: script {s} count {d.scripts.count(s)}')
for loc in ET.parse(ROOT/'sitemap.xml').iter('{http://www.sitemaps.org/schemas/sitemap/0.9}loc'):
    target=ROOT/(loc.text.rstrip('/').split('/')[-1] if '.html' in loc.text else 'index.html')
    if not target.exists():errors.append(f'sitemap missing: {target}')
    if target in docs and 'noindex' in docs[target].metas.get('robots',''):errors.append(f'noindex in sitemap: {target}')
if errors:
    print('\n'.join(errors));raise SystemExit(1)
print(f'PASS: {len(docs)} HTML pages; local links, anchors, scripts, metadata and sitemap')
