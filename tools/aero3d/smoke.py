import asyncio,json,os
from playwright.async_api import async_playwright
# 14쪽 모두 열어 끝까지 내리며 페이지 오류 · 콘솔 오류 · HTTP ≥400 · 깨진 이미지를 적음(서버 8768)
BASE=os.environ.get('BASE','http://[::1]:8768/web/').rstrip('/')+'/'   # 기준본과 비교: BASE=http://[::1]:8768/_archive/pre-refactor-v60/ (끝 / 없어도 됨)
PAGES=[f+s for f in ['index','aero','uav','mro','company','careers','newsroom'] for s in ('.html','-en.html')]
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    for f in PAGES:
      pg=await b.new_page(viewport={'width':1512,'height':683});errs=[];bad=[]
      pg.on('pageerror',lambda e:errs.append('ERR '+str(e)[:120]));pg.on('console',lambda m:errs.append(m.text[:120]) if m.type=='error' else None)
      pg.on('response',lambda r:bad.append(r.status.__str__()+' '+r.url[-50:]) if r.status>=400 else None)
      await pg.goto(BASE+f,wait_until='load',timeout=90000);await pg.wait_for_timeout(2500)
      await pg.evaluate("window.KA_LENIS&&KA_LENIS.destroy()")
      H=await pg.evaluate("document.documentElement.scrollHeight")
      for y in range(0,H,int(683*.8)):await pg.evaluate(f"window.scrollTo(0,{y})");await pg.wait_for_timeout(120)
      await pg.wait_for_timeout(1500)
      br=await pg.evaluate("[...document.images].filter(i=>i.complete&&i.naturalWidth===0&&i.getAttribute('src')).map(i=>i.getAttribute('src')).slice(0,5)")
      print(f,'H',H,'errs',errs[:3],'bad',bad[:3],'broken',br)
      await pg.close()
    await b.close()
asyncio.run(main())
