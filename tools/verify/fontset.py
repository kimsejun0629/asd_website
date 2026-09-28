# 글꼴 조각 불변 검사: web/ 원문(주석 제외)에 쓰인 한글 음절이 site 조각 안에 모두 있는지
#  mkfonts.py의 used()와 같은 규칙(주석 · fonts.load(...) 제외)으로 모은다. 빠진 음절이 있으면 그 글자는 rest 조각을 불러오게 된다
#  사용: python3 tools/verify/fontset.py [web 폴더]   → 0 = 통과(추가 음절 없음), 1 = site 조각에 없는 음절 있음
import os,re,sys,glob
from fontTools.ttLib import TTFont
ROOT=os.path.normpath(os.path.join(os.path.dirname(__file__),'../..'))
WEB=os.path.abspath(sys.argv[1]) if len(sys.argv)>1 else f'{ROOT}/web'
def used(web):
    s={}
    for dp,dn,fn in os.walk(web):
        if dp.startswith(f'{web}/video'):continue
        for f in fn:
            if not f.endswith(('.html','.js','.json','.css')):continue
            p=os.path.join(dp,f);t=open(p,encoding='utf8').read()
            t=re.sub(r'/\*.*?\*/','',t,flags=re.S);t=re.sub(r'<!--.*?-->','',t,flags=re.S);t=re.sub(r'(^|[\s;{}()])//[^\n]*','\\1',t)
            t=re.sub(r'fonts\.load\([^)]*\)','',t)
            for c in t:
                if '가'<=c<='힣':s.setdefault(ord(c),set()).add(os.path.relpath(p,web))
    return s
u=used(WEB)
site=[f for f in glob.glob(f'{WEB}/fonts/HanjinGroupSans-*-site-*.woff2')]
cm=None
for f in site:
    c={x for x in TTFont(f).getBestCmap() if 0xAC00<=x<=0xD7A3}
    cm=c if cm is None else cm&c
extra={k:v for k,v in u.items() if k not in cm}
print(f'쓰인 음절 {len(u)} · site 조각 {len(cm)} · 조각에 없는 음절 {len(extra)} · 더는 안 쓰는 조각 음절 {len(cm-set(u))}')
for k,v in sorted(extra.items()):print(' ',chr(k),sorted(v)[:4])
sys.exit(1 if extra else 0)
