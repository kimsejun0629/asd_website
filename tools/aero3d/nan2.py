# 기체 좌표 유효성 검사: nan2.py 787 — 루트에서 실행, gltest 서버 8768.
import asyncio,sys
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    pg=await b.new_page();await pg.goto('http://[::1]:8768/dev/gltest.html',wait_until='load')
    r=await pg.evaluate('''async(t)=>{const {build}=await import('/web/js/a3d-craft.js');const A=build(t);const out=[];
      A.group.traverse(m=>{if(!m.isMesh)return;const a=m.geometry.attributes.position.array;let bad=0;for(const v of a)if(!isFinite(v))bad++;if(bad)out.push({part:Object.entries(A.parts).find(([k,v])=>v.includes(m))?.[0]||'-',n:a.length/3,bad,type:m.geometry.type})});return out}''',sys.argv[1])
    print(r);await b.close()
asyncio.run(main())
