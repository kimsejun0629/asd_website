# 여러 시점 합성: multi.py URL "yaw=1;yaw=2" out W H — 루트에서 실행, 로컬 서버 8768.
import asyncio,sys
from playwright.async_api import async_playwright
from PIL import Image
base=sys.argv[1];views=sys.argv[2].split(';');out=sys.argv[3];W,H=int(sys.argv[4]),int(sys.argv[5])
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    pg=await b.new_page(viewport={'width':W,'height':H});errs=[];pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('console',lambda m:errs.append(m.text) if m.type=='error' else None)
    ims=[]
    for k,v in enumerate(views):
      await pg.goto(base+'&'+v,wait_until='load',timeout=90000)
      try:await pg.wait_for_function('window.done',timeout=90000)
      except Exception as e:errs.append('timeout')
      f=f'{out}_{k}.png';await pg.screenshot(path=f);ims.append(Image.open(f))
    print(errs[:5]);await b.close()
  cols=2 if len(ims)>1 else 1;rows=(len(ims)+cols-1)//cols
  c=Image.new('RGB',(W*cols//2,H*rows//2));
  for k,im in enumerate(ims):c.paste(im.resize((W//2,H//2)),((k%cols)*W//2,(k//cols)*H//2))
  c.save(out+'.png')
asyncio.run(main())
