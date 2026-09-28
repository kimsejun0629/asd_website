# 한 시점 캡처: shot.py URL out [W H] — 루트에서 실행, 로컬 서버 8768.
import asyncio,sys
from playwright.async_api import async_playwright
url,out=sys.argv[1],sys.argv[2];W=int(sys.argv[3]) if len(sys.argv)>3 else 1200;H=int(sys.argv[4]) if len(sys.argv)>4 else 700
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    pg=await b.new_page(viewport={'width':W,'height':H})
    logs=[];pg.on('console',lambda m:logs.append(m.type+': '+m.text));pg.on('pageerror',lambda e:logs.append('ERR '+str(e)))
    await pg.goto(url,wait_until='load',timeout=90000)
    try:await pg.wait_for_function('window.done',timeout=90000)
    except Exception as e:logs.append('timeout '+str(e)[:80])
    print(await pg.evaluate('window.done'))
    await pg.screenshot(path=out);print('\n'.join(logs[:20]));await b.close()
asyncio.run(main())
