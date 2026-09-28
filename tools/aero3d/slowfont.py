import asyncio,os
from playwright.async_api import async_playwright
# 글꼴이 늦게 오면(Bold-base 9초 지연) 3D 기체를 글꼴 도착 뒤 다시 만드는지(서버 8768)
BASE=os.environ.get('BASE','http://[::1]:8768/web/').rstrip('/')+'/'   # 기준본과 비교: BASE=http://[::1]:8768/_archive/pre-refactor-v60/ (끝 / 없어도 됨)
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    pg=await b.new_page(viewport={'width':1512,'height':683});logs=[];pg.on('console',lambda m:logs.append(m.type+' '+m.text[:200]) if m.type in('warning','error') and 'GPU' not in m.text else None);pg.on('pageerror',lambda e:logs.append('PAGEERR '+str(e)[:300]))
    async def slow(route):
      await asyncio.sleep(9);await route.continue_()
    await pg.route('**/HanjinGroupSans-Bold-base.woff2',slow)   # 3D 로고타입(KOREAN)이 쓰는 조각
    await pg.add_init_script("window.__t0=performance.now();document.fonts&&document.fonts.addEventListener('loadingdone',e=>{(window.__fl=window.__fl||[]).push([Math.round(performance.now()),e.fontfaces.map(f=>f.family+f.weight+f.status).join(',')])})")
    await pg.goto(BASE+'aero.html',wait_until='commit',timeout=90000)
    await pg.wait_for_timeout(3000)
    await pg.evaluate("window.KA_LENIS&&KA_LENIS.destroy()")
    await pg.evaluate("(()=>{const s=document.getElementById('a3d');scrollTo(0,s.offsetTop+200)})()");await pg.wait_for_timeout(3500)
    a=await pg.evaluate("(()=>{window.__m0=A3D.models.get(0);return {built:!!window.__m0,m0font:window.__m0&&window.__m0.font,where:A3D.where(),font:document.fonts.check('700 200px \"HanjinGroupSans\"')}})()")
    await pg.wait_for_timeout(9000)
    await pg.evaluate("(()=>{const s=document.getElementById('a3d');scrollTo(0,s.getBoundingClientRect().top+scrollY+200)})()");await pg.wait_for_timeout(4000)
    c=await pg.evaluate("(()=>{const m=A3D.models.get(0);return {font:document.fonts.check('700 200px \"HanjinGroupSans\"'),rebuilt:!!m&&m!==window.__m0,has:!!m,mfont:m&&m.font,size:A3D.models.size,keys:[...A3D.models.keys()]}})()")
    c['fl']=await pg.evaluate('window.__fl');c['faces']=await pg.evaluate("[...document.fonts].map(f=>f.family+' '+f.weight+' '+f.status)");print('before font',a,'after font',c,logs[:5]);await b.close()
asyncio.run(main())
