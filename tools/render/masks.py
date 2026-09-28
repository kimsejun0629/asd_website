# 기체 마스크 생성: tools/render에서 python3 masks.py — svgs.json 입력, 서버 불필요.
import json,re
from playwright.sync_api import sync_playwright
A=json.load(open('svgs.json'))
KEYS=['787','737','a320','a330','a350','g6500','ah6']
def span(d):
    xs=[abs(float(v)) for v in re.findall(r'-?\d*\.?\d+',d)[0::2]]
    return max(xs) if xs else 0
def classify(ac,key):
    items=[];seen_xo=False
    for it in ac['items']:
        if it['cls']=='xo':seen_xo=True
        items.append((it,seen_xo))
    cats={}
    if key=='ah6':
        for it,ins in items:
            c=it['cls'];d=it['d'] or ''
            if c=='xk':cats.setdefault('fus',[]).append(('p',d))
            elif c=='xa' and it['tag']=='circle':cats.setdefault('hub',[]).append(('c',it['c']))
            elif c=='xa' and d.startswith('M0.25'):cats.setdefault('boom',[]).append(('p',d))
            elif c=='xa' and d.startswith('M0.95'):cats.setdefault('stab',[]).append(('p',d))
            elif c=='xa' and d.startswith('M1.3'):cats.setdefault('skid',[]).append(('p',d))
            elif c=='xl' and d.startswith('M-.34'):cats.setdefault('trotor',[]).append(('l',d,.16))
            elif c=='xl':cats.setdefault('tube',[]).append(('l',d,.075))
            elif c=='xb':cats.setdefault('blade',[]).append(('l',d,.11))
        return cats
    af=[(it,ins) for it,ins in items if it['cls'] in('xa','xw') and not ins]
    wings=[it for it,_ in af if it['d'].startswith('M0 ') and ' L' in it['d'][:14] and 'C' not in it['d']]
    big=max(span(w['d']) for w in wings)
    for it,_ in af:
        d=it['d']
        if d.startswith('M0 0C'):cats.setdefault('fus',[]).append(('p',d))
        elif 'Q' in d:cats.setdefault('eng',[]).append(('p',d))
        elif d.startswith('M0 ') and 'C' in d:cats.setdefault('fin',[]).append(('p',d))
        elif it in wings and span(d)<big*0.6:cats.setdefault('stab',[]).append(('p',d))
        else:cats.setdefault('wing',[]).append(('p',d))
    return cats
meta={}
with sync_playwright() as p:
    b=p.chromium.launch(channel="chrome");pg=b.new_page(viewport={'width':1400,'height':1400},device_scale_factor=1)
    for ac,key in zip(A,KEYS):
        x,y,w,h=map(float,ac['vb'].split());S=1100/max(w,h);W=round(w*S);H=round(h*S)
        cats=classify(ac,key);meta[key]={'vb':[x,y,w,h],'W':W,'H':H,'cats':list(cats)}
        for cat,els in cats.items():
            body=''
            for e in els:
                if e[0]=='p':body+=f'<path d="{e[1]}" fill="#fff"/>'
                elif e[0]=='c':body+=f'<circle cx="{e[1]["cx"]}" cy="{e[1]["cy"]}" r="{e[1]["r"]}" fill="#fff"/>'
                else:body+=f'<path d="{e[1]}" fill="none" stroke="#fff" stroke-width="{e[2]}" stroke-linecap="round"/>'
            pg.set_content(f'<html><body style="margin:0;background:transparent"><svg id="s" xmlns="http://www.w3.org/2000/svg" viewBox="{ac["vb"]}" width="{W}" height="{H}" style="display:block">{body}</svg></body></html>')
            pg.locator('#s').screenshot(path=f'm_{key}_{cat}.png',omit_background=True)
        print(key,W,H,list(cats))
    b.close()
json.dump(meta,open('meta.json','w'))
