import asyncio,os
from pathlib import Path
from playwright.async_api import async_playwright
# 3D 대체 경로: WebGL 없음 · three.js 차단 · 모바일 높이 변화 · 회전 중 탭(서버 8768). 캡처는 <repo>/_out/aero3d/(OUT으로 바꿈)
BASE=os.environ.get('BASE','http://[::1]:8768/web/').rstrip('/')+'/'   # 기준본과 비교: BASE=http://[::1]:8768/_archive/pre-refactor-v60/ (끝 / 없어도 됨)
OUT=Path(os.environ.get('OUT') or Path(__file__).resolve().parents[2]/'_out'/'aero3d');OUT.mkdir(parents=True,exist_ok=True)
async def main():
  async with async_playwright() as p:
    # 1) 휴대폰 · WebGL 없음
    b=await p.chromium.launch(args=['--disable-webgl','--disable-3d-apis'])
    ctx=await b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True);pg=await ctx.new_page()
    await pg.goto(BASE+'aero.html',wait_until='load',timeout=90000);await pg.wait_for_timeout(2500)
    r=await pg.evaluate("(()=>{const s=document.getElementById('a3d');const pl=[...s.querySelectorAll('.pl')].map(e=>getComputedStyle(e).position);const r=s.querySelector('.a3-chs').getBoundingClientRect();return {cls:s.className,h:s.offsetHeight,pl:[...new Set(pl)],chsL:Math.round(r.left),chsR:Math.round(r.right)}})()")
    print('noGL mobile',r)
    y=await pg.evaluate("document.getElementById('a3d').offsetTop");await pg.evaluate(f"scrollTo(0,{y+200})");await pg.wait_for_timeout(800);await pg.screenshot(path=str(OUT/'fb_nogl_m.png'))
    await b.close()
    # 2) three.js 차단
    b=await p.chromium.launch(args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    pg=await b.new_page(viewport={'width':1512,'height':683})
    await pg.route('**/three.module.min.js',lambda r:r.abort())
    await pg.goto(BASE+'aero.html',wait_until='load',timeout=90000);await pg.wait_for_timeout(3000)
    c1=await pg.evaluate("document.getElementById('a3d').className");await pg.wait_for_timeout(8000)
    c2=await pg.evaluate("[document.getElementById('a3d').className,document.getElementById('a3d').offsetHeight]")
    print('CDN blocked: after 3s',c1,'after 11s',c2)
    await b.close()
    # 3) 모바일 높이 변화(주소창)에도 같은 기종
    b=await p.chromium.launch(args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    ctx=await b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True);pg=await ctx.new_page()
    await pg.goto(BASE+'aero.html',wait_until='load',timeout=90000);await pg.wait_for_timeout(2500)
    y=await pg.evaluate("(()=>{const A=window.A3D;if(A.scrollYAt)return A.scrollYAt(A.C[3]+2.2);const s=document.getElementById('a3d');const r=s.getBoundingClientRect();return scrollY+r.top+(r.height-innerHeight)*(A.C[3]+2.2)/A.TOT})()")
    await pg.evaluate(f"scrollTo(0,{y})");await pg.wait_for_timeout(1500)
    w1=await pg.evaluate("JSON.stringify(A3D.where())")
    await pg.set_viewport_size({'width':390,'height':764});await pg.wait_for_timeout(1500)
    w2=await pg.evaluate("JSON.stringify(A3D.where())")
    print('resize',w1,'->',w2)
    # 회전 중 목록 탭이 건너뛰지 않음
    y=await pg.evaluate("(()=>{const A=window.A3D;if(A.scrollYAt)return A.scrollYAt(A.C[0]+.9);const s=document.getElementById('a3d');const r=s.getBoundingClientRect();return scrollY+r.top+(r.height-innerHeight)*(A.C[0]+.9)/A.TOT})()")
    await pg.evaluate(f"scrollTo(0,{y})");await pg.wait_for_timeout(1500);s0=await pg.evaluate("scrollY");await pg.touchscreen.tap(195,700);await pg.wait_for_timeout(1500);s1=await pg.evaluate("scrollY")
    print('tap during spin: scroll',s0,'->',s1)
    await b.close()
asyncio.run(main())
