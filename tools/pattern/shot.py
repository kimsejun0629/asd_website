"""2D 패턴 확인(서버 8768). 패턴 요소(::before)만 흰색 · 불투명으로 드러내 캡처.
  [OLD=1] python3 tools/pattern/shot.py [chromium|firefox|webkit] W H DPR out_dir [page …]   # 탭은 careers.html#process처럼
각 페이지에서 .pat-v · .pat-w · .gf · .hx-ph.none 요소의 ::before 상자를 JSON으로, 그 상자를 PNG로 남긴다.
요소 캡처(locator.screenshot)는 가짜 빈 띠 · 어긋남을 만들어, ::before 윗변을 뷰포트 위에 두고 뷰포트를 찍어 잘라 낸다.
뷰포트보다 긴 상자는 잘린다(boxes.json의 truncated)."""
import asyncio, json, math, os, re, sys
from io import BytesIO
from pathlib import Path
from PIL import Image
from playwright.async_api import async_playwright

BR, W, H, DPR, OUT = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), float(sys.argv[4]), Path(sys.argv[5])
PAGES = sys.argv[6:] or ['index.html']
BASE = os.environ.get('BASE', 'http://[::1]:8768/web/').rstrip('/') + '/'   # 기준본과 비교: BASE=http://[::1]:8768/_archive/pre-refactor-v60/ (끝 / 없어도 됨)
SEL = '.pat-v,.pat-w,.gf,.hx-ph.none'
REVEAL = """
*,*::before,*::after{transition:none!important;animation:none!important}
body{background:#000!important}
.pat-v,.pat-w,.gf,.hx-ph.none{background:#000!important;color:transparent!important}
.pat-v>*,.pat-w>*,.gf>*,.hx-ph.none>*{visibility:hidden!important}
/* 패턴 구역 안에 든 패턴 요소(채용 #process의 .cta.pat-w · 연혁 카드)는 다시 보이게 */
.pat-v .pat-w,.pat-v .hx-ph.none,.pat-v .hx-stage,.pat-v .hx-track,.pat-v .hx-card{visibility:visible!important}
.pat-v::before,.pat-w::before,.gf::before,.hx-ph.none::before{background:#fff!important;opacity:1!important;visibility:visible!important;
  -webkit-mask-image:var(--pm)!important;mask-image:var(--pm)!important}
"""
# OLD=1: 바꾸기 전(pattern.webp를 1080px · 560px로 반복) 모습
if os.environ.get('OLD'):
    REVEAL += """
.pat-v::before,.pat-w::before,.gf::before{-webkit-mask:url("/web/img/pattern.webp") 0 0/1080px auto repeat!important;mask:url("/web/img/pattern.webp") 0 0/1080px auto repeat!important}
.hx-ph.none::before{-webkit-mask:url("/web/img/pattern.webp") 0 0/560px auto repeat!important;mask:url("/web/img/pattern.webp") 0 0/560px auto repeat!important}
"""


async def main():
    OUT.mkdir(parents=True, exist_ok=True)
    rep = {}
    async with async_playwright() as p:
        b = await getattr(p, BR).launch()
        ctx = await b.new_context(viewport={'width': W, 'height': H}, device_scale_factor=DPR)
        for f in PAGES:
            pg = await ctx.new_page(); rep[f] = els = []
            try:
                await pg.goto(BASE + f, wait_until='load', timeout=90000)
                await pg.wait_for_timeout(1500)
                await pg.evaluate("window.KA_LENIS&&KA_LENIS.destroy()")
                # 원래 마스크 첫 층(패턴)만 남기고 자르기 층 제거 → 패턴 자체 비교
                await pg.evaluate("""(sel)=>{for(const e of document.querySelectorAll(sel)){const s=getComputedStyle(e,'::before');
                    e.style.setProperty('--pm',(s.webkitMaskImage||s.maskImage).split(/,\\s*(?=url|linear|none)/)[0])}}""", SEL)
                await pg.add_style_tag(content=REVEAL)
                # 고정 · 붙박이 요소(머리글 등)가 캡처를 가리지 않게
                await pg.evaluate("""(sel)=>{for(const e of document.querySelectorAll('body *')){const q=getComputedStyle(e).position;
                    if((q==='fixed'||q==='sticky')&&!e.matches(sel)&&!e.querySelector(sel))e.style.setProperty('visibility','hidden','important')}}""", SEL)
                await pg.wait_for_timeout(500)
                boxes = await pg.evaluate("""(sel)=>[...document.querySelectorAll(sel)].map((e,i)=>{e.dataset.pi=i;const s=getComputedStyle(e,'::before');
                    return {i,cls:e.className,id:e.id,disp:s.display,bl:parseFloat(s.left),bt:parseFloat(s.top),bw:parseFloat(s.width),bh:parseFloat(s.height),
                      mask:(s.maskImage||s.webkitMaskImage).slice(0,120),size:s.maskSize||s.webkitMaskSize,rep:s.maskRepeat||s.webkitMaskRepeat}})""", SEL)
                for e in boxes:
                    els.append(e)
                    if e['disp'] == 'none' or not e['bw'] == e['bw'] or e['bw'] < 2 or e['bh'] < 2:
                        continue
                    try:
                        await pg.evaluate(f"""()=>{{const r=document.querySelector('[data-pi="{e['i']}"]').getBoundingClientRect();
                            window.scrollTo(0,scrollY+r.top+{e['bt']}-8)}}""")
                        await pg.wait_for_timeout(350)
                        r = await pg.evaluate(f"""()=>{{const r=document.querySelector('[data-pi="{e['i']}"]').getBoundingClientRect();return [r.x,r.y]}}""")
                        im = Image.open(BytesIO(await pg.screenshot())).convert('RGB')
                        X, Y = (r[0] + e['bl']) * DPR, (r[1] + e['bt']) * DPR
                        box = (max(0, math.floor(X)), max(0, math.floor(Y)),
                               min(im.width, math.ceil(X + e['bw'] * DPR)), min(im.height, math.ceil(Y + e['bh'] * DPR)))
                        name = re.sub(r'[^\w-]', '_', f)
                        im.crop(box).save(OUT / f'{name}_{e["i"]}.png')
                        e.update(dev=[X, Y, e['bw'] * DPR, e['bh'] * DPR], truncated=Y + e['bh'] * DPR > im.height + .5)
                    except Exception as x:
                        e['error'] = str(x)[:200]
            except Exception as x:
                rep[f + ':error'] = str(x)[:200]
            finally:
                await pg.close()
        await b.close()
    (OUT / 'boxes.json').write_text(json.dumps(rep, ensure_ascii=False, indent=1))

asyncio.run(main())
