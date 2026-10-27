"""쇼릴 움직임 분석(빠름, 표본 1 · 480px 축소판):
- 프레임 간 차이(평균 절대차) 곡선 → 튐(의도하지 않은 점프) · 컷 위치 · 정지 구간을 찾음
- 필름 스트립(간격 k프레임) 콘택트 시트
python3 tools/reel/motion.py --start 0 --end 900 --out _out/reel/motion [--lang en] [--only s2] [--strip 6]
"""
import argparse, asyncio, os, base64, time
import numpy as np
from PIL import Image, ImageDraw
from playwright.async_api import async_playwright
ap=argparse.ArgumentParser()
ap.add_argument('--start',type=int,default=0);ap.add_argument('--end',type=int,default=900)
ap.add_argument('--lang',default='ko');ap.add_argument('--only',default='')
ap.add_argument('--out',default='_out/reel/motion');ap.add_argument('--strip',type=int,default=6,help='시트 간격(프레임), 0이면 생략')
ap.add_argument('--tag',default='')
a=ap.parse_args();os.makedirs(a.out,exist_ok=True)
URL=f'http://[::1]:8768/dev/reel/index.html?cap=1&lang={a.lang}'+(f'&only={a.only}' if a.only else '')
TW,TH=480,270
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-angle=metal','--enable-gpu','--ignore-gpu-blocklist'])
        pg=await b.new_page(viewport={'width':1920,'height':1080})
        await pg.goto(URL);await pg.wait_for_function('window.reel&&(window.reel.ready||window.reel.error)',timeout=180000)
        err=await pg.evaluate('window.reel.error||null')
        if err: raise SystemExit(err)
        se=await pg.evaluate('window.reel.sceneErrors||[]')
        if se: print('SCENE ERRORS:\n'+'\n'.join(se))
        fr=[];t=time.time()
        for f in range(a.start,a.end):
            b64=await pg.evaluate(f'reel.thumb({f},{TW})');fr.append(np.frombuffer(base64.b64decode(b64),np.uint8).reshape(TH,TW,4)[...,:3])
        print(f'{len(fr)} thumbs {time.time()-t:.1f}s');await b.close()
    F=np.stack(fr).astype(np.float32)
    d=np.abs(np.diff(F,axis=0)).mean(axis=(1,2,3))       # f → f+1
    tag=f'{a.tag}{a.lang}_{a.start}-{a.end}'
    np.savetxt(os.path.join(a.out,f'diff_{tag}.csv'),np.c_[np.arange(a.start,a.end-1),d],fmt='%d,%.3f',header='frame,meanabs(f->f+1)')
    med=np.median(d)+1e-3
    spikes=[(a.start+i,float(v)) for i,v in enumerate(d) if v>max(8,6*med) and v>1.8*max(d[max(0,i-3):i].max() if i>0 else 0, d[i+1:i+4].max() if i+1<len(d) else 0)]
    still=[];run=0
    for i,v in enumerate(d):
        run=run+1 if v<.05 else 0
        if run==30: still.append(a.start+i-29)
    print('spikes (cut/jump) f->f+1:',', '.join(f'{f}:{v:.1f}' for f,v in spikes) or 'none')
    print('still runs >=0.5s start at:',still or 'none')
    # 곡선 그림
    Wp,Hp=1800,300;im=Image.new('RGB',(Wp,Hp+30),(20,20,20));dr=ImageDraw.Draw(im);mx=max(d.max(),1)
    for i in range(len(d)-1):
        x0=i*Wp/len(d);x1=(i+1)*Wp/len(d);dr.line([(x0,Hp-d[i]/mx*Hp),(x1,Hp-d[i+1]/mx*Hp)],fill=(194,166,115))
    for f in range(a.start - a.start%60 + 60, a.end, 60):
        x=(f-a.start)*Wp/len(d);dr.line([(x,0),(x,Hp)],fill=(60,60,60));dr.text((x+2,Hp+4),f'{f}',fill=(150,150,150))
    for f,v in spikes:
        x=(f-a.start)*Wp/len(d);dr.text((x,4),'|',fill=(255,80,80))
    im.save(os.path.join(a.out,f'diff_{tag}.png'))
    if a.strip:
        idx=list(range(0,len(fr),a.strip));cols=10;rows=(len(idx)+cols-1)//cols;tw,th=240,135
        sh=Image.new('RGB',(cols*tw,rows*(th+14)),(12,12,12));dd=ImageDraw.Draw(sh)
        for k,i in enumerate(idx):
            x=(k%cols)*tw;y=(k//cols)*(th+14);sh.paste(Image.fromarray(fr[i]).resize((tw,th)),(x,y));dd.text((x+3,y+th+1),str(a.start+i),fill=(170,170,170))
        sh.save(os.path.join(a.out,f'strip_{tag}.png'));print('strip',os.path.join(a.out,f'strip_{tag}.png'))
asyncio.run(main())
