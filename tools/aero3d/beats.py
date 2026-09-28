import asyncio,sys,json
from playwright.async_api import async_playwright
from PIL import Image
# 사용: beats.py url "i:phase" ... out W H   (phase: spin | pK = K번째 부위 멈춤 | arr)
url=sys.argv[1];specs=sys.argv[2].split(',');out=sys.argv[3];W,H=int(sys.argv[4]),int(sys.argv[5]);cols=int(sys.argv[6]) if len(sys.argv)>6 else 2
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    pg=await b.new_page(viewport={'width':W,'height':H});errs=[];pg.on('pageerror',lambda e:errs.append('ERR '+str(e)));pg.on('console',lambda m:errs.append(m.text) if m.type=='error' else None)
    await pg.goto(url,wait_until='load',timeout=90000);await pg.wait_for_timeout(1500)
    await pg.evaluate("window.KA_LENIS&&KA_LENIS.destroy()")
    ims=[]
    for k,sp in enumerate(specs):
      i,ph=sp.split(':');i=int(i)
      y=await pg.evaluate(f'''(()=>{{const A=window.A3D;const ARR=.3,SPIN=1.6,PART=1.0;const C=A.C,TOT=A.TOT;const ph="{ph}";let v=C[{i}];
        if(ph==='arr')v+=ARR*.6;else if(ph==='spin')v+=ARR+SPIN*.45;else if(ph.startsWith('p'))v+=ARR+SPIN+(+ph.slice(1)+.8)*PART;
        if(A.scrollYAt)return A.scrollYAt(v);const s=document.getElementById('a3d');const r=s.getBoundingClientRect();const span=r.height-innerHeight;return scrollY+r.top+span*v/TOT}})()''')
      await pg.evaluate(f"window.scrollTo(0,{y})");await pg.wait_for_timeout(2400)
      f=f'{out}_{k}.png';await pg.screenshot(path=f);ims.append(Image.open(f))
    print(errs[:6]);await b.close()
  rows=(len(ims)+cols-1)//cols;sc=cols*1.0;w2=int(W/sc*1.0);h2=int(H/sc)
  c=Image.new('RGB',(w2*cols,h2*rows))
  for k,im in enumerate(ims):c.paste(im.resize((w2,h2)),((k%cols)*w2,(k//cols)*h2))
  c.save(out+'.png')
asyncio.run(main())
