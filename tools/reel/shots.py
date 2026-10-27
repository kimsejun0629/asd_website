"""쇼릴 스틸 확인: 지정 프레임을 PNG로 저장 + 선택적으로 콘택트 시트.
python3 tools/reel/shots.py --frames 0,60,120 --out _out/reel/shots [--lang en] [--samples 8] [--sheet]
"""
import argparse, asyncio, os, time, json
from playwright.async_api import async_playwright
ap=argparse.ArgumentParser()
ap.add_argument('--frames',default='0')
ap.add_argument('--every',type=int,default=0,help='0..899 사이 간격(프레임)')
ap.add_argument('--out',default='_out/reel/shots')
ap.add_argument('--lang',default='ko')
ap.add_argument('--samples',default='1',help="숫자 또는 'auto'(blur.js 표)")
ap.add_argument('--shutter',type=float,default=.5)
ap.add_argument('--sheet',action='store_true')
ap.add_argument('--cols',type=int,default=5)
ap.add_argument('--tag',default='')
ap.add_argument('--only',default='',help='장면 id(쉼표) — 그 장면만 불러옴')
a=ap.parse_args()
URL=f'http://[::1]:8768/dev/reel/index.html?cap=1&lang={a.lang}'+(f'&only={a.only}' if a.only else '')
os.makedirs(a.out,exist_ok=True)
frames=list(range(0,900,a.every)) if a.every else [int(x) for x in a.frames.split(',') if x!='']
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-angle=metal','--enable-gpu','--ignore-gpu-blocklist','--disable-background-timer-throttling'])
        pg=await b.new_page(viewport={'width':1920,'height':1080},device_scale_factor=1)
        logs=[];pg.on('console',lambda m:logs.append(m.type+': '+m.text));pg.on('pageerror',lambda e:logs.append('pageerror: '+str(e)))
        await pg.goto(URL)
        try:
            await pg.wait_for_function('window.reel&&(window.reel.ready||window.reel.error)',timeout=120000)
        except Exception as e:
            print('\n'.join(logs));raise
        err=await pg.evaluate('window.reel.error||null')
        if err: print('\n'.join(logs)); raise SystemExit('reel error: '+err)
        se=await pg.evaluate('window.reel.sceneErrors||[]')
        if se: print('SCENE ERRORS:\n'+'\n'.join(se))
        el=await pg.query_selector('#out'); paths=[]
        t=time.time()
        for f in frames:
            smp="'auto'" if a.samples=='auto' else int(a.samples)
            await pg.evaluate(f'reel.frame({f},{{samples:{smp},shutter:{a.shutter}}})')
            pth=os.path.join(a.out,f'{a.tag}{a.lang}_f{f:03d}.png');await el.screenshot(path=pth);paths.append(pth)
        print(f'{len(frames)} frames {time.time()-t:.1f}s')
        for l in logs:
            if 'error' in l.lower() or 'warn' in l.lower(): print(l)
        await b.close()
    if a.sheet:
        from PIL import Image, ImageDraw
        tw,th=384,216;cols=a.cols;rows=(len(paths)+cols-1)//cols
        sh=Image.new('RGB',(cols*tw,rows*(th+18)),(17,17,17));d=ImageDraw.Draw(sh)
        for i,pth in enumerate(paths):
            im=Image.open(pth).convert('RGB').resize((tw,th),Image.LANCZOS);x=(i%cols)*tw;y=(i//cols)*(th+18)
            sh.paste(im,(x,y));d.text((x+4,y+th+2),os.path.basename(pth),fill=(180,180,180))
        sp=os.path.join(a.out,f'{a.tag}{a.lang}_sheet.png');sh.save(sp);print('sheet',sp)
asyncio.run(main())
