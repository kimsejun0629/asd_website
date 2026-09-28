# 한진그룹체를 겹치지 않는 unicode-range 3조각으로 나눔 → web/fonts/*-{base,site-TAG,rest-TAG}.woff2 + web/css/fonts.css
#  base: 한글 음절을 뺀 전부(라틴 · 숫자 · 기호 · 자모 · 전각) / site: web/ 원문(주석 제외)에 쓰인 음절 / rest: 나머지 음절
#  글리프 윤곽 · 폭 · 커닝 · 기능 · hhea/OS2/head 메트릭 그대로(아래 옵션). 겹치면 Firefox가 rest까지 받으므로 겹치지 않게 적음
#  문구 · media.json · history.json에 새 음절이 생기면 TAG를 올려 다시 돌리고(캐시), 옛 site/rest 파일은 게시에서 null로 지움
#  사용: python3 tools/fonts/mkfonts.py k2      (원본: assets/HanjinGroupSans-{Light,Bold}.woff2)
#       python3 tools/fonts/mkfonts.py --check  (만들지 않고 비교: 쓰인 음절 = 현재 site 조각이면 0 · site에 없는 음절이 있으면 1 · 안 쓰는 site 음절만 있으면 3 · 사용법 오류 2)
#  다른 스크립트는 import해서 syl() · used()만 쓸 수 있음(가져오기만으로는 아무것도 만들지 않고, fontTools도 필요 없음 — 글꼴을 읽는 함수 안에서만 불러옴)
import os,re,sys
ROOT=os.path.normpath(os.path.join(os.path.dirname(__file__),'../..'));WEB=f'{ROOT}/web';SRC=f'{ROOT}/assets'
def syl(t):   # 원문 한 덩어리에서 화면 글로 셀 한글 음절(주석 · fonts.load(...) 제외)
    t=re.sub(r'/\*.*?\*/','',t,flags=re.S);t=re.sub(r'<!--.*?-->','',t,flags=re.S);t=re.sub(r'(^|[\s;{}()])//[^\n]*','\\1',t)
    t=re.sub(r'fonts\.load\([^)]*\)','',t)   # 뉴스룸 검색창이 rest 조각을 미리 받으려고 넣은 음절('가힣')은 화면 글이 아님 — site에 넣으면 rest를 받지 않음
    return {ord(c) for c in t if '가'<=c<='힣'}
def used():
    s=set()
    for dp,dn,fn in os.walk(WEB):
        if dp.startswith(f'{WEB}/video'):continue
        for f in fn:
            if not f.endswith(('.html','.js','.json','.css')):continue
            s|=syl(open(os.path.join(dp,f),encoding='utf8').read())
    return s
def rng(cps):
    cps=sorted(cps);out=[];a=b=cps[0]
    for c in cps[1:]:
        if c==b+1:b=c;continue
        out.append((a,b));a=b=c
    out.append((a,b));return ','.join(f'U+{x:X}' if x==y else f'U+{x:X}-{y:X}' for x,y in out)
def face(fn,wt,ur,W=200):   # @font-face 한 규칙 — unicode-range는 쉼표 뒤에서만 줄을 나눔(한 줄 ≤ W자, 값은 그대로)
    L=[f'@font-face{{font-family:"HanjinGroupSans";src:url("../fonts/{fn}") format("woff2");font-weight:{wt};font-display:swap;'];cur='  unicode-range:'
    U=ur.split(',')
    for i,u in enumerate(U):
        t=u+(',' if i<len(U)-1 else '}')
        if len(cur)+len(t)>W and not cur.endswith(':'):L.append(cur);cur='  '
        cur+=t
    return '\n'.join(L+[cur])
def cut(src,unis,out):
    from fontTools.ttLib import TTFont;from fontTools import subset
    o=subset.Options();o.flavor='woff2';o.layout_features=['*'];o.layout_scripts=['*'];o.name_IDs=['*'];o.name_languages=['*'];o.name_legacy=True
    o.notdef_outline=o.notdef_glyph=True;o.glyph_names=False;o.hinting=True;o.legacy_kern=True;o.drop_tables=[]
    o.prune_unicode_ranges=o.prune_codepage_ranges=False;o.recalc_bounds=o.recalc_timestamp=o.recalc_average_width=o.recalc_max_context=False
    f=TTFont(src,recalcBBoxes=False,recalcTimestamp=False);s=subset.Subsetter(o);s.populate(unicodes=unis);s.subset(f);f.flavor='woff2';f.save(out)
    assert set(TTFont(out).getBestCmap())==set(unis),out
    return os.path.getsize(out)
def build(TAG):
    from fontTools.ttLib import TTFont
    site=used();css=[]
    for w,wt in [('Light',300),('Bold',700)]:
        src=f'{SRC}/HanjinGroupSans-{w}.woff2';full=set(TTFont(src).getBestCmap());hang={c for c in full if 0xAC00<=c<=0xD7A3}
        for nm,u in [('base',full-hang),(f'site-{TAG}',hang&site),(f'rest-{TAG}',hang-site)]:
            fn=f'HanjinGroupSans-{w}-{nm}.woff2';n=cut(src,u,f'{WEB}/fonts/{fn}');print(fn,len(u),'자',n,'B')
            css.append(face(fn,wt,rng(u)))
    open(f'{WEB}/css/fonts.css','w').write('/* 한진그룹체 unicode-range 조각(tools/fonts/mkfonts.py가 만듦 · 손으로 고치지 않음) */\n'+'\n'.join(css)+'\n')
    print('site 음절',len(site),'· css/fonts.css',os.path.getsize(f'{WEB}/css/fonts.css'),'B')
def check():   # 다시 만들 필요가 있는지만 봄: fonts.css가 가리키는 site · rest 조각의 cmap · unicode-range를 지금 원문과 비교
    from fontTools.ttLib import TTFont
    site=used();bad=set();spare=set()   # bad: 쓰는데 site에 없음(그 글자만 rest를 받음) · spare: site에 있는데 안 씀(무해)
    css=re.findall(r'url\("\.\./fonts/(HanjinGroupSans-(\w+)-(site|rest)-([-.\w]+)\.woff2)"\)[^}]*unicode-range:([^}]*)\}',open(f'{WEB}/css/fonts.css',encoding='utf8').read())
    if len(css)!=4:print('fonts.css에서 site · rest 조각 4개를 찾지 못함:',[c[0] for c in css]);return 1
    for fn,w,kind,tag,ur in css:
        ur=re.sub(r'\s','',ur)   # 줄을 나눈 unicode-range(face())도 한 줄로 모아 비교
        hang={c for c in TTFont(f'{SRC}/HanjinGroupSans-{w}.woff2').getBestCmap() if 0xAC00<=c<=0xD7A3}
        want=hang&site if kind=='site' else hang-site
        got={c for c in TTFont(f'{WEB}/fonts/{fn}').getBestCmap() if 0xAC00<=c<=0xD7A3}
        miss,extra=want-got,got-want
        if kind=='site':bad|=miss;spare|=extra
        print(f'{fn}: {len(got)}자 · 있어야 할 {len(want)}자 · 빠짐 {len(miss)} · 남음 {len(extra)} · unicode-range {"같음" if ur==rng(want) else "다름"}',
              ''.join(map(chr,sorted(miss)))[:40],''.join(map(chr,sorted(extra)))[:40])
    r=1 if bad else 3 if spare else 0
    print('쓰인 음절',len(site),'→',['통과(다시 만들 필요 없음)',f'site에 없는 음절 {len(bad)}개 {"".join(map(chr,sorted(bad)))[:40]} — 원인(옮긴 주석 · 문구)을 먼저 보고, 새 음절이면 새 TAG로 다시 만듦',
          f'안 쓰는 site 음절 {len(spare)}개 {"".join(map(chr,sorted(spare)))[:40]} — 화면에는 영향 없음, 다음에 다시 만들 때 빠짐'][min(r,2)])
    return r
if __name__=='__main__':
    if len(sys.argv)!=2 or sys.argv[1] in('-h','--help'):print('사용: python3 tools/fonts/mkfonts.py <TAG>(다시 만듦) | --check(비교만)');sys.exit(2)
    if sys.argv[1]=='--check':sys.exit(check())
    build(sys.argv[1])
