"""쇼릴 렌더: dev/reel/index.html을 헤드리스 크롬(GPU)으로 한 프레임씩 그려 ffmpeg로 인코딩.

마스터(무손실 RGB, x264rgb qp0) → 웹용(H.264 High, bt709, yuv420p, faststart)
  python3 tools/reel/render.py --lang ko                       # 60fps, 8표본 모션 블러, 마스터 + 웹 1920 · 960
  python3 tools/reel/render.py --lang ko --preview             # 30fps, 블러 없음, 빠른 미리보기(_out/reel/preview-ko.mp4)
  python3 tools/reel/render.py --lang ko --start 300 --end 420 # 일부 구간만(웹용 생략)
병렬: 조각마다 별도 프로세스(Playwright 드라이버 하나를 나눠 쓰면 전송이 병목) → 무손실 조각을 이어 붙임.
서버: 저장소 루트에서 python3 -m http.server 8768 --bind ::1
"""
import argparse, asyncio, os, subprocess, sys, time, base64, json

ROOT=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ap=argparse.ArgumentParser()
ap.add_argument('--lang',default='ko')
ap.add_argument('--fps',type=int,default=60)
ap.add_argument('--samples',default='auto',help="'auto'(blur.js 표) 또는 숫자")
ap.add_argument('--shutter',type=float,default=.5,help='프레임 간격 대비 노출(0.5=180도)')
ap.add_argument('--start',type=int,default=0)
ap.add_argument('--end',type=int,default=900)
ap.add_argument('--preview',action='store_true')
ap.add_argument('--out',default=os.path.join(ROOT,'_out','reel'))
ap.add_argument('--name',default='')
ap.add_argument('--crf',type=float,default=20)
ap.add_argument('--no-web',action='store_true')
ap.add_argument('--jobs',type=int,default=6,help='병렬 프로세스 수')
ap.add_argument('--only',default='')
ap.add_argument('--worker',default='',help='(내부) 시작:끝 출력 프레임 번호')
ap.add_argument('--chunk',default='',help='(내부) 조각 파일')
a=ap.parse_args()
if a.preview: a.fps=30; a.samples='1'
SAMP=a.samples if a.samples=='auto' else int(a.samples)
SIM=60                       # 장면 시간 단위(프레임) = 60fps
step=SIM/a.fps               # 출력 1프레임당 장면 프레임
URL=f'http://[::1]:8768/dev/reel/index.html?cap=1&lang={a.lang}'+(f'&only={a.only}' if a.only else '')

GRAB='''()=>{window.__grab=(f,o)=>{reel.frame(f,o);const px=reel.pixels();const n=px.length/4,rgb=new Uint8Array(n*3);
  for(let i=0,j=0;i<px.length;i+=4,j+=3){rgb[j]=px[i];rgb[j+1]=px[i+1];rgb[j+2]=px[i+2]}
  let s='';const CH=0x8000;for(let i=0;i<rgb.length;i+=CH)s+=String.fromCharCode.apply(null,rgb.subarray(i,i+CH));return btoa(s)}}'''

async def worker():
    from playwright.async_api import async_playwright
    i0,i1=map(int,a.worker.split(':'))
    ff=subprocess.Popen(['ffmpeg','-y','-loglevel','error','-f','rawvideo','-pix_fmt','rgb24','-s','1920x1080','-framerate',str(a.fps),'-i','-',
        '-vf','vflip','-c:v','libx264rgb','-qp','0','-preset','ultrafast',a.chunk],stdin=subprocess.PIPE)   # readPixels는 아래→위 순서라 뒤집음
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-angle=metal','--enable-gpu','--ignore-gpu-blocklist','--disable-background-timer-throttling','--disable-renderer-backgrounding'])
        pg=await b.new_page(viewport={'width':1920,'height':1080},device_scale_factor=1)
        logs=[];pg.on('console',lambda m:logs.append(m.type+': '+m.text));pg.on('pageerror',lambda e:logs.append('pageerror: '+str(e)))
        await pg.goto(URL)
        await pg.wait_for_function('window.reel&&(window.reel.ready||window.reel.error)',timeout=180000)
        err=await pg.evaluate('window.reel.error||null')
        if err: print('\n'.join(logs),file=sys.stderr); raise SystemExit('reel error: '+err)
        se=await pg.evaluate('window.reel.sceneErrors||[]')
        if se: print('SCENE ERRORS:\n'+'\n'.join(se),file=sys.stderr)
        await pg.evaluate(GRAB)
        for i in range(i0,i1):
            b64=await pg.evaluate('([f,o])=>__grab(f,o)',[i*step,{'samples':SAMP,'shutter':a.shutter*step}])
            ff.stdin.write(base64.b64decode(b64))
            print(i,flush=True)                                    # 진행 보고(부모가 셈)
        for l in logs:
            if 'error' in l.lower(): print(l,file=sys.stderr)
        await b.close()
    ff.stdin.close();ff.wait()

def main():
    os.makedirs(a.out,exist_ok=True)
    t0=time.time()
    name=a.name or (('preview-' if a.preview else 'reel-')+a.lang+('' if (a.start,a.end)==(0,900) else f'-{a.start}-{a.end}'))
    master=os.path.join(a.out,name+('.mp4' if a.preview else '-master.mkv'))
    n0=int(round(a.start/step)); n1=int(round(a.end/step)); total=n1-n0
    J=max(1,min(a.jobs,total)); size=(total+J-1)//J
    tmp=os.path.join(a.out,'_chunks',name);os.makedirs(tmp,exist_ok=True)
    procs=[];paths=[]
    for k in range(J):
        i0=n0+k*size;i1=min(n1,i0+size)
        if i0>=i1:break
        pth=os.path.join(tmp,f'c{k:02d}.mkv');paths.append(pth)
        cmd=[sys.executable,__file__,'--worker',f'{i0}:{i1}','--chunk',pth,'--lang',a.lang,'--fps',str(a.fps),'--samples',str(a.samples),'--shutter',str(a.shutter)]
        if a.only: cmd+=['--only',a.only]
        procs.append(subprocess.Popen(cmd,stdout=subprocess.PIPE,text=True))
    done=0;import selectors;sel=selectors.DefaultSelector()
    for pr in procs: sel.register(pr.stdout,selectors.EVENT_READ)
    alive=len(procs);last=0
    while alive:
        for key,_ in sel.select(timeout=1):
            line=key.fileobj.readline()
            if not line: sel.unregister(key.fileobj);alive-=1;continue
            done+=1
        if time.time()-last>5:
            el=time.time()-t0;print(f'\r{done}/{total} frames  {el:.0f}s  eta {el/max(done,1)*(total-done):.0f}s',end='',flush=True);last=time.time()
    rc=[pr.wait() for pr in procs]
    print(f'\r{done}/{total} frames  {time.time()-t0:.0f}s')
    if any(rc): raise SystemExit(f'worker failed: {rc}')
    lst=os.path.join(tmp,'list.txt');open(lst,'w').write(''.join(f"file '{q}'\n" for q in paths))
    if a.preview:
        subprocess.run(['ffmpeg','-y','-loglevel','error','-f','concat','-safe','0','-i',lst,'-vf','scale=out_color_matrix=bt709:out_range=tv,format=yuv420p',
            '-c:v','libx264','-preset','medium','-crf','20','-colorspace','bt709','-color_primaries','bt709','-color_trc','bt709','-movflags','+faststart',master],check=True)
    else:
        subprocess.run(['ffmpeg','-y','-loglevel','error','-f','concat','-safe','0','-i',lst,'-c','copy',master],check=True)
    print('master',master,f'{os.path.getsize(master)/1e6:.1f}MB',f'{time.time()-t0:.0f}s')
    if a.preview or a.no_web or (a.start,a.end)!=(0,900): return
    web(master)

def web(src):
    """웹용: 1920(60fps) · 960(30fps, 좁은 화면) + 포스터(0프레임). bt709 행렬로 변환(기본 bt601이면 색이 틀어짐), 전달 특성은 sRGB 표기"""
    P='setparams=color_primaries=bt709:color_trc=iec61966-2-1:colorspace=bt709:range=tv'
    outs=[(f'reel-{a.lang}-1920.mp4',f'scale=1920:1080:out_color_matrix=bt709:out_range=tv:flags=accurate_rnd+full_chroma_int,format=yuv420p,{P}',a.fps,a.crf,'4.2'),
          (f'reel-{a.lang}-960.mp4',f'fps=30,scale=960:540:flags=lanczos+accurate_rnd+full_chroma_int:out_color_matrix=bt709:out_range=tv,format=yuv420p,{P}',30,a.crf+2,'4.0')]
    for fn,vf,fps,crf,lvl in outs:
        dst=os.path.join(a.out,fn)
        cmd=['ffmpeg','-y','-loglevel','error','-i',src,'-vf',vf,'-c:v','libx264','-preset','slow','-crf',str(crf),
             '-profile:v','high','-level:v',lvl,'-g',str(fps*5),'-pix_fmt','yuv420p','-an','-movflags','+faststart',dst]
        subprocess.run(cmd,check=True)
        print('web',dst,f'{os.path.getsize(dst)/1e6:.2f}MB')
    poster=os.path.join(a.out,f'poster-{a.lang}.webp')
    subprocess.run(['ffmpeg','-y','-loglevel','error','-i',src,'-frames:v','1','-c:v','libwebp','-quality','88',poster],check=True)
    print('poster',poster)

if a.worker: asyncio.run(worker())
else: main()
