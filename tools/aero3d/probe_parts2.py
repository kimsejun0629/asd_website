# 부위 경계 · 법선 검사: probe_parts2.py 787 — 루트에서 실행, gltest 서버 8768.
import asyncio,sys
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    pg=await b.new_page();await pg.goto('http://[::1]:8768/dev/gltest.html',wait_until='load')
    r=await pg.evaluate('''async(t)=>{const THREE=await import('three');const {build}=await import('/web/js/a3d-craft.js');const A=build(t);const out={};
      for(const [k,v] of Object.entries(A.parts)){out[k]=v.map(m=>{m.geometry.computeBoundingBox();const bb=m.geometry.boundingBox;const n=m.geometry.attributes.normal;let nx=0,ny=0,nz=0;for(let i=0;i<n.count;i++){nx+=n.getX(i);ny+=n.getY(i);nz+=n.getZ(i)}
        return {min:bb.min.toArray().map(x=>+x.toFixed(2)),max:bb.max.toArray().map(x=>+x.toFixed(2)),avgN:[nx/n.count,ny/n.count,nz/n.count].map(x=>+x.toFixed(2)),inGroup:!!m.parent}})}
      return out}''',sys.argv[1])
    for k,v in r.items():print(k,v)
    await b.close()
asyncio.run(main())
