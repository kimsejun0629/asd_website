import asyncio,os
from pathlib import Path
from playwright.async_api import async_playwright
# 메인 항공기체 스트립 캡처 · 카드 수(서버 8768). 캡처는 <repo>/_out/aero3d/(OUT으로 바꿈)
BASE=os.environ.get('BASE','http://[::1]:8768/web/').rstrip('/')+'/'   # 기준본과 비교: BASE=http://[::1]:8768/_archive/pre-refactor-v60/ (끝 / 없어도 됨)
OUT=Path(os.environ.get('OUT') or Path(__file__).resolve().parents[2]/'_out'/'aero3d');OUT.mkdir(parents=True,exist_ok=True)
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch();pg=await b.new_page(viewport={'width':1920,'height':1080})
    await pg.goto(BASE+'index.html',wait_until='load',timeout=90000);await pg.wait_for_timeout(1500)
    await pg.evaluate("window.KA_LENIS&&KA_LENIS.destroy()")
    y=await pg.evaluate("(()=>{let e=document.getElementById('aero'),y=0;while(e){y+=e.offsetTop;e=e.offsetParent}return y})()")
    for k,f in enumerate([.02,.5]):
      pin=await pg.evaluate("document.querySelector('.pk-pin[data-for=aero]').offsetHeight")
      await pg.evaluate(f"scrollTo(0,{y}+{pin}*{f})");await pg.wait_for_timeout(3500)
      await pg.screenshot(path=str(OUT/f'strip_{k}.png'),clip={'x':0,'y':520,'width':1920,'height':560})
    n=await pg.evaluate("document.querySelectorAll('#aero .fl-track>.fl:not([aria-hidden])').length");print('cards',n)
    await b.close()
asyncio.run(main())
