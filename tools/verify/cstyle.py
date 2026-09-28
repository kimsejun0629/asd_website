#!/usr/bin/env python3
"""계산된 스타일 덤프: 페이지마다 세 상태(S0 맨 위 · S1 끝까지 내린 뒤 · S2 다시 맨 위)에서
모든 요소의 경로 · 속성 · 직계 글 · 위치(문서 기준) · 계산된 스타일(요소 · ::before · ::after · ::marker · ::placeholder)을 적는다.

  python3 cstyle.py BASE OUT.json.gz [--vp pc|phone|WxH[@dpr][,m]] [--pages index,aero-en,...] [--tabs]
                    [--workers 7] [--overlay DIR] [--custom]

- 스타일은 같은 태그(가상 요소별)에서 가장 흔한 값을 표(modes)로 두고, 다른 값만 요소에 적는다(비교 때 표로 채움).
- 사용자 정의 속성(--*)은 기본으로 빼고(값은 이미 풀린 표준 속성에 반영됨), --custom이면 요소에서 새로 정한 값만 적는다.
"""
import argparse, asyncio, time, sys
from datetime import datetime
from playwright.async_api import async_playwright
import common as C

SNAP_JS = r"""
(opt)=>{
  const NR=new Set(['head','script','style','meta','link','title','template','noscript','base']);
  const names=[];{const cs=getComputedStyle(document.documentElement);for(let i=0;i<cs.length;i++){const n=cs[i];if(!n.startsWith('--'))names.push(n)}}
  names.sort();const NP=names.length;
  const sx=scrollX,sy=scrollY,base=location.href.replace(/[#?].*$/,'').replace(/[^/]*$/,'');
  const rel=u=>u&&u.startsWith(base)?u.slice(base.length):(u||'');
  const r2=v=>Math.round(v*100)/100;
  const tabs=new Map(),recs=[],pathOf=new Map(),opOf=new Map();
  const grab=(cs,key)=>{let t=tabs.get(key);if(!t){t=Array.from({length:NP},()=>new Map());tabs.set(key,t)}
    const a=new Array(NP);for(let i=0;i<NP;i++){let v=cs.getPropertyValue(names[i]);if(v.includes(base))v=v.split(base).join('');a[i]=v;const m=t[i];m.set(v,(m.get(v)||0)+1)}return [key,a]};
  const hash=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(16)+':'+s.length};
  const head=document.head;
  for(const el of document.getElementsByTagName('*')){
    const par=el.parentElement,tag=el.tagName.toLowerCase();
    let idx=1;for(let s=el.previousElementSibling;s;s=s.previousElementSibling)if(s.tagName===el.tagName)idx++;
    const path=(par?pathOf.get(par)+'>':'')+tag+(idx>1?':'+idx:'');pathOf.set(el,path);
    let lab=tag;if(el.id)lab+='#'+el.id;const cl=(el.getAttribute('class')||'').trim();if(cl)lab+='.'+cl.split(/\s+/).join('.');
    const rec={p:path,g:lab.length>90?lab.slice(0,90)+'…':lab};
    if(el.attributes.length){const a={};for(const at of el.attributes)a[at.name]=at.value;rec.a=a}
    if(NR.has(tag)||(head&&head.contains(el))){rec.nr=1;if(tag==='script'||tag==='style')rec.x={h:hash(el.textContent||'')};recs.push(rec);continue}
    let t='';for(const n of el.childNodes)if(n.nodeType===3)t+=n.data;t=t.replace(/\s+/g,' ').trim();if(t)rec.t=t.length>400?t.slice(0,400)+'…':t;
    const hasBox=el.getClientRects().length>0;
    if(hasBox){const b=el.getBoundingClientRect();rec.r=[r2(b.left+sx),r2(b.top+sy),r2(b.width),r2(b.height)]}
    const cs=getComputedStyle(el);rec.s=grab(cs,tag);
    /* 보이지 않음(iv): 상자 없음 · visibility · 조상까지 곱한 불투명도 0 — 양쪽 다 안 보이면 비교에서 뺌(지나온 경로에 따라 남는 값) */
    const op=(opOf.get(par)??1)*parseFloat(cs.opacity||'1');opOf.set(el,op);
    if((!hasBox&&cs.display!=='contents')||cs.visibility!=='visible'||op<0.001)rec.iv=1;
    for(const [ps,k] of [['::before','b'],['::after','f']]){const pc=getComputedStyle(el,ps),c=pc.getPropertyValue('content');
      rec[k]=(c==='none'||c==='normal')?c:grab(pc,tag+ps)}
    if(cs.display.includes('list-item'))rec.m=grab(getComputedStyle(el,'::marker'),'::marker');
    if((tag==='input'||tag==='textarea')&&el.placeholder)rec.h=grab(getComputedStyle(el,'::placeholder'),'::placeholder');
    if(opt.custom){const pcs=par?getComputedStyle(par):null,v={};for(let i=0;i<cs.length;i++){const n=cs[i];if(!n.startsWith('--'))continue;const x=cs.getPropertyValue(n);if(!pcs||pcs.getPropertyValue(n)!==x)v[n]=x}if(Object.keys(v).length)rec.v=v}
    const x={};
    if(tag==='img'){x.src=rel(el.currentSrc);x.ok=el.complete&&el.naturalWidth>0?1:0;x.nw=el.naturalWidth}
    if(tag==='video'){x.src=rel(el.currentSrc)}
    if((tag==='input'||tag==='textarea'||tag==='select')&&el.value)x.val=el.value;
    if(el.scrollLeft||el.scrollTop)x.sc=[Math.round(el.scrollLeft),Math.round(el.scrollTop)];
    if(Object.keys(x).length)rec.x=x;
    recs.push(rec);
  }
  const modes={};for(const [k,t] of tabs){const o={};t.forEach((m,i)=>{let b=null,bc=-1;for(const [v,c] of m)if(c>bc){bc=c;b=v}o[names[i]]=b});modes[k]=o}
  const cmp=g=>{if(!Array.isArray(g))return g;const [k,a]=g,md=modes[k],o={};for(let i=0;i<NP;i++){const n=names[i];if(a[i]!==md[n])o[n]=a[i]}return {k,d:o}};
  for(const r of recs)for(const k of ['s','b','f','m','h'])if(r[k]!==undefined)r[k]=cmp(r[k]);
  const fonts=document.fonts?[...document.fonts].filter(f=>f.status==='loaded').map(f=>`${f.family} ${f.weight} ${f.style}`):[];
  return {doc:{title:document.title,y:Math.round(scrollY),H:document.documentElement.scrollHeight,W:document.documentElement.scrollWidth,
               vw:innerWidth,vh:innerHeight,dpr:devicePixelRatio,hash:location.hash,fonts:[...new Set(fonts)].sort(),
               iv:window.__ka?[...window.__ka.iv].sort((a,b)=>a-b):[]},
          modes,els:recs};
}
"""


async def capture(page, opts):
    await C.freeze(page)
    try:
        return await page.evaluate(SNAP_JS, opts)
    finally:
        await C.thaw(page)


async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('base')
    ap.add_argument('out')
    ap.add_argument('--vp', default='pc')
    ap.add_argument('--pages')
    ap.add_argument('--tabs', action='store_true', help='하위 화면(탭)도 따로 연다')
    ap.add_argument('--workers', type=int, default=7)
    ap.add_argument('--overlay', help='기준 주소에 없는 파일을 채울 폴더(같은 상대 경로)')
    ap.add_argument('--custom', action='store_true', help='사용자 정의 속성(--*)도 적는다')
    ap.add_argument('--noise', help='settle_ignore 선택자를 읽을 노이즈 파일(기본 noise.json)')
    ap.add_argument('--step', type=float, default=0.6, help='훑기 한 걸음(화면 높이 배수)')
    ap.add_argument('--gl-draw', action='store_true', help='WebGL 그리기를 실제로 함(기본은 건너뜀 — 캔버스는 비교 대상 아님)')
    a = ap.parse_args()
    base = C.base_url(a.base)
    vp_name, vp = C.viewport_opts(a.vp)
    pages = C.page_list(a.pages, a.tabs)
    noise = C.load_noise(a.noise)
    mask = C.mask_selector(noise)
    T0 = time.time()

    async with async_playwright() as p:
        browsers = {}

        async def page_run(b, pid):
            t0 = time.time()
            ctx = await C.new_context(b, vp, a.overlay, base, a.gl_draw)
            page = await ctx.new_page()
            tr = C.Tracker(page, base)
            res = {'settle': {}, 'states': {}}
            try:
                tm = res['t'] = {}
                lap = lambda k, t=[time.time()]: (tm.__setitem__(k, round(time.time() - t[0], 1)), t.__setitem__(0, time.time()))
                await C.open_page(page, base, pid, tr, mask)
                lap('load')
                res['settle']['S0'] = await C.settle2(page, tr, mask, min_ms=1500)
                res['states']['S0'] = await capture(page, {'custom': a.custom})
                lap('S0')
                await C.kill_lenis(page)
                res['steps'] = await C.sweep(page, a.step)
                lap('sweep')
                res['settle']['S1'] = await C.settle2(page, tr, mask, min_ms=1500, max_ms=30000)
                res['states']['S1'] = await capture(page, {'custom': a.custom})
                lap('S1')
                await C.scroll_to(page, 0)
                res['settle']['S2'] = await C.settle2(page, tr, mask, min_ms=1000)
                res['states']['S2'] = await capture(page, {'custom': a.custom})
                lap('S2')
            except Exception as e:
                res['error'] = repr(e)[:500]
            res['net'] = tr.summary()
            res['transient'] = tr.transient()
            res['secs'] = round(time.time() - t0, 1)
            try:
                await ctx.close()
            except Exception:
                pass
            return res

        async def one(pid, k):
            res = await C.with_browser(p, browsers, k, lambda b: page_run(b, pid))
            bad = [s for s, v in res.get('settle', {}).items() if not v.get('ok')]
            print(f"  {pid:28s} {res.get('secs', 0):6.1f}s  els={len(res.get('states', {}).get('S1', {}).get('els', []))}"
                  f"  {res.get('t', '')}{'  settle-timeout:' + ','.join(bad) if bad else ''}"
                  f"{'  retried ' + str(res['retries']) if res.get('retries') else ''}{'  ERROR ' + res['error'] if 'error' in res else ''}",
                  file=sys.stderr, flush=True)
            return res

        print(f'cstyle {base} vp={vp_name} pages={len(pages)} workers={a.workers}', file=sys.stderr)
        results = await C.run_pool(pages, one, a.workers)
        for b in browsers.values():
            try:
                await b.close()
            except Exception:
                pass

    out = {'meta': {'tool': 'cstyle', 'base': base, 'vp': vp_name, 'vp_opts': vp, 'overlay': a.overlay,
                    'custom': a.custom, 'when': datetime.now().isoformat(timespec='seconds'),
                    'secs': round(time.time() - T0, 1)},
           'pages': {pid: results[pid] for pid in pages}}
    C.dump_json(out, a.out)
    print(f'cstyle done {out["meta"]["secs"]}s → {a.out}', file=sys.stderr)


if __name__ == '__main__':
    asyncio.run(main())
