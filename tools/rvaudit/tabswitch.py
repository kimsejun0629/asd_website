"""하위 화면 전환(아래 Next 링크) 뒤 등장 순서 확인: python3 tabswitch.py W H"""
import asyncio,sys,os
from playwright.async_api import async_playwright
W=int(sys.argv[1]);H=int(sys.argv[2])
BASE=os.environ.get('BASE','http://[::1]:8768/web/').rstrip('/')+'/'   # 기준본과 비교: BASE=http://[::1]:8768/_archive/pre-refactor-v60/ (끝 / 없어도 됨)
Q="""()=>[...document.querySelectorAll('main>section:not([hidden]) [data-rv].in')].filter(e=>e.getClientRects().length&&e.getBoundingClientRect().top<innerHeight).map(e=>[Math.round(e.getBoundingClientRect().top),(e.className||'').replace(/ ?(in|rv-end)/g,'').slice(0,12),(e.textContent||'').trim().slice(0,10),parseFloat(e.style.getPropertyValue('--d'))||0])"""
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch()
    for start in ['company.html#greeting','newsroom.html#news','careers.html#jobs']:
      pg=await b.new_page(viewport={'width':W,'height':H})
      await pg.goto(BASE+start,wait_until='load');await pg.wait_for_timeout(2500)
      await pg.evaluate("window.KA_LENIS&&KA_LENIS.destroy()")
      for k in range(2):
        await pg.evaluate("document.querySelector('.subnext .nx').click()");await pg.wait_for_timeout(1200)
        r=await pg.evaluate(Q);h=await pg.evaluate("location.hash")
        ds=[x[3] for x in r];bad=[(r[i-1][2],r[i][2]) for i in range(1,len(r)) if ds[i]<ds[i-1]-.05 and r[i][0]>=r[i-1][0]-4]
        print(start,'→',h,'순서 뒤바뀜' if bad else 'OK',bad[:3]);[print('   ',x) for x in r[:8]]
      await pg.close()
    await b.close()
asyncio.run(main())
