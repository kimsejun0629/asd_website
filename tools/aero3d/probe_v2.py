# 면 방향 검사: probe_v2.py 787,737,… — 루트에서 실행, gltest 서버 8768.
import asyncio,sys,json
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    pg=await b.new_page();await pg.goto('http://[::1]:8768/dev/gltest.html',wait_until='load')
    for t in sys.argv[1].split(','):
      r=await pg.evaluate('''async(t)=>{const THREE=await import('three');const {build}=await import('/web/js/a3d-craft.js');const A=build(t);const out={};
        const partOf=m=>Object.entries(A.parts).find(([k,v])=>v.includes(m))?.[0]||'';
        A.group.traverse(m=>{if(!m.isMesh)return;const g=m.geometry;const p=g.attributes.position;g.computeBoundingBox();const c=new THREE.Vector3();g.boundingBox.getCenter(c);
          const idx=g.index?g.index.array:null;const n=idx?idx.length:p.count;let V=0;const a=new THREE.Vector3(),b=new THREE.Vector3(),d=new THREE.Vector3();
          for(let i=0;i<n;i+=3){const i0=idx?idx[i]:i,i1=idx?idx[i+1]:i+1,i2=idx?idx[i+2]:i+2;a.fromBufferAttribute(p,i0).sub(c);b.fromBufferAttribute(p,i1).sub(c);d.fromBufferAttribute(p,i2).sub(c);V+=a.dot(b.cross(d))}
          const key=g.type+':'+p.count+(partOf(m)?'['+partOf(m)+']':'')+(m.material.side?'s'+m.material.side:'');const sgn=Math.abs(V)<1e-6?'0':(V>0?'+':'-');out[key]=(out[key]||'')+sgn});
        return out}''',t)
      neg={k:v for k,v in r.items() if '-' in v}
      print(t,'NEG:',neg)
    await b.close()
asyncio.run(main())
