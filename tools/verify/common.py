"""검증 도구 공통: 페이지 목록 · 브라우저 · 안정화(settle) · 애니메이션 고정 · 스크롤.

cstyle.py · pixdiff.py가 같은 절차로 페이지를 열고 멈춰 세우도록 여기 한곳에 둔다.
"""
import asyncio, json, re, time, gzip, mimetypes
from pathlib import Path
from urllib.parse import urlparse

HERE = Path(__file__).resolve().parent
NOISE_FILE = HERE / 'noise.json'

BASES = ['index', 'aero', 'uav', 'mro', 'company', 'newsroom', 'careers']
PAGES = [b + s for b in BASES for s in ('.html', '-en.html')]
# 하위 화면(탭): 첫 탭은 기본 페이지가 이미 덮으므로 나머지만('company.html#about' — open_page가 메뉴 링크를 눌러 엶)
TABS = {'company': ['about', 'history', 'locations'],
        'newsroom': ['video', 'brochure'],
        'careers': ['roles', 'growth', 'sites', 'benefits', 'process']}
GL_ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist',
           '--disable-gpu-rasterization', '--disable-partial-raster']      # 래스터는 CPU(Skia)로: GPU(SwiftShader) 래스터는 사선 · 가는 선 안티앨리어싱이 실행마다 1px씩 달라짐

VIEWPORTS = {
    'pc': dict(viewport={'width': 1440, 'height': 900}, device_scale_factor=1, is_mobile=False, has_touch=False),
    'phone': dict(viewport={'width': 390, 'height': 844}, device_scale_factor=3, is_mobile=True, has_touch=True,
                  user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 '
                             '(KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'),
}


def page_list(spec=None, tabs=False):
    """--pages 인자(쉼표, 'index' · 'index-en' · 'company#about' 모두 허용) → 페이지 id 목록"""
    if spec:
        out = []
        for s in spec.split(','):
            s = s.strip()
            if not s:
                continue
            f, _, h = s.partition('#')
            if not f.endswith('.html'):
                f += '.html'
            out.append(f + ('#' + h if h else ''))
        return out
    out = []
    for p in PAGES:
        out.append(p)
        if tabs:
            b = p.replace('-en.html', '').replace('.html', '')
            out += [p + '#' + t for t in TABS.get(b, [])]
    return out


def viewport_opts(spec):
    """'pc' · 'phone' · 'WxH' · 'WxH@dpr' · 'WxH@dpr,m'(모바일 · 터치)"""
    if spec in VIEWPORTS:
        return spec, dict(VIEWPORTS[spec])
    m = re.fullmatch(r'(\d+)x(\d+)(?:@([\d.]+))?(,m)?', spec)
    if not m:
        raise SystemExit('viewport: pc | phone | WxH[@dpr][,m]')
    w, h, d, mob = int(m[1]), int(m[2]), float(m[3] or 1), bool(m[4])
    return spec, dict(viewport={'width': w, 'height': h}, device_scale_factor=d, is_mobile=mob, has_touch=mob)


def load_noise(path=None):
    p = Path(path) if path else NOISE_FILE
    if p.exists():
        return json.loads(p.read_text())
    return {}


def base_url(b):
    return b if b.endswith('/') else b + '/'


def rel_url(url, base):
    """요청 URL → 기준 주소를 뗀 상대 경로(두 기준 주소를 같은 이름으로 비교하려고)"""
    if url.startswith(base):
        return url[len(base):]
    u = urlparse(url)
    if u.hostname in ('::1', 'localhost', '127.0.0.1'):
        return 'LOCAL:' + u.path
    return url


def dump_json(obj, path):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    data = json.dumps(obj, ensure_ascii=False, separators=(',', ':')).encode()
    if str(path).endswith('.gz'):
        with gzip.open(path, 'wb', compresslevel=6) as f:
            f.write(data)
    else:
        path.write_bytes(data)


def read_json(path):
    path = str(path)
    if path.endswith('.gz'):
        with gzip.open(path, 'rb') as f:
            return json.loads(f.read())
    return json.loads(Path(path).read_text())


# ── 페이지 안에서 쓰는 도우미(문서 시작 전에 심음) ──
# 변이 기록: 마지막 변이 시각 · 요소별 횟수(가리기 선택자 안은 셈하지 않음 — 스트립처럼 늘 움직이는 곳)
INIT_JS = r"""
(()=>{
  const K=window.__ka={last:performance.now(),hist:new Map(),mask:null,n:0,f:0,lf:0};
  /* 프레임 수: 부하로 프레임이 느리면 '0.7초 조용함'이 수렴 중인 루프(연혁 카드 · 무인기) 한두 프레임 사이에 채워지므로 프레임으로도 셈 */
  const tick=()=>{K.f++;requestAnimationFrame(tick)};requestAnimationFrame(tick);
  const lab=e=>{if(!e||e.nodeType!==1)e=e&&e.parentElement;if(!e)return '?';let s=e.tagName.toLowerCase();if(e.id)s+='#'+e.id;
    const c=(e.getAttribute('class')||'').trim().split(/\s+/).filter(Boolean).slice(0,2);if(c.length)s+='.'+c.join('.');return s};
  K.lab=lab;
  /* 곧 울릴 타이머(5초 이하 setTimeout) 수 — 순차 등장의 rv-end처럼 늦게 붙는 클래스를 기다리려고 */
  const st=window.setTimeout,ct=window.clearTimeout,pend=new Set();
  window.setTimeout=function(fn,ms,...a){if(typeof fn!=='function')return st.call(window,fn,ms,...a);
    const id=st.call(window,function(){pend.delete(id);return fn.apply(this,arguments)},ms,...a);if((+ms||0)<=5000)pend.add(id);return id};
  window.clearTimeout=function(id){pend.delete(id);return ct.call(window,id)};
  K.timers=()=>pend.size;
  /* 1초 이상 주기의 setInterval(연혁 카드 사진 슬라이드 2.8초)은 돌리지 않고 주기만 기록 — 시각에 따라 보이는 사진이 달라져 비교할 수 없음 */
  const si=window.setInterval,ci=window.clearInterval,fake=new Set();let fid=1e9;K.iv=new Set();
  window.setInterval=function(fn,ms,...a){if(typeof fn==='function'&&(+ms||0)>=1000){K.iv.add(+ms);const id=fid++;fake.add(id);return id}return si.call(window,fn,ms,...a)};
  window.clearInterval=function(id){if(fake.has(id)){fake.delete(id);return}return ci.call(window,id)};
  const mo=new MutationObserver(ms=>{const now=performance.now();
    for(const m of ms){const t=m.target.nodeType===1?m.target:m.target.parentElement;
      if(K.mask&&t&&t.closest&&t.closest(K.mask))continue;
      /* 같은 값을 다시 쓴 것(classList.remove · tabIndex 등 매 프레임 같은 값)은 변화가 아님 */
      if(m.type==='attributes'&&m.oldValue===m.target.getAttribute(m.attributeName))continue;
      if(m.type==='characterData'&&m.oldValue===m.target.data)continue;
      K.last=now;K.lf=K.f;K.n++;const k=lab(t)+(m.type==='attributes'?'['+m.attributeName+']':'{'+m.type[0]+'}');K.hist.set(k,(K.hist.get(k)||0)+1)}});
  mo.observe(document,{subtree:true,childList:true,attributes:true,characterData:true,attributeOldValue:true,characterDataOldValue:true});
})();
"""

# WebGL 그리기 호출 건너뛰기: 캔버스는 비교하지 않으므로(픽셀 비교에서도 가림) 그리는 비용만 뺀다 — 3D 연출의 DOM(설명선 · 레일 · 방위 눈금)은 그대로 계산됨
NO_GL_DRAW_JS = r"""
(()=>{for(const C of [window.WebGLRenderingContext,window.WebGL2RenderingContext]){if(!C)continue;const P=C.prototype;
  for(const m of ['drawArrays','drawElements','drawArraysInstanced','drawElementsInstanced','drawRangeElements','drawBuffers','clear','blitFramebuffer'])
    if(typeof P[m]==='function')P[m]=function(){}}})();
"""

# 안정 여부: 마지막 변이 이후 시간 · 도는 유한 애니메이션 · 화면 안 미완료 이미지 · 글꼴
STATUS_JS = r"""
(mask)=>{const K=window.__ka;if(!K)return null;K.mask=mask||null;
  const now=performance.now();
  const fin=document.getAnimations().filter(a=>{if(a.playState!=='running')return false;
    const t=a.effect&&a.effect.getComputedTiming();if(!t||!isFinite(t.endTime))return false;
    const el=a.effect.target;if(mask&&el&&el.closest&&el.closest(mask))return false;return true});
  const vh=innerHeight;let img=0;
  for(const i of document.images){if(i.complete)continue;const r=i.getBoundingClientRect();if(r.width&&r.height&&r.bottom>0&&r.top<vh)img++}
  return {quiet:now-K.last,qf:K.f-K.lf,anims:fin.length,img,timers:K.timers(),fonts:document.fonts?document.fonts.status:'loaded',n:K.n,
          animLab:fin.slice(0,3).map(a=>K.lab(a.effect.target)+':'+(a.animationName||a.transitionProperty||a.constructor.name))}}
"""

# 멈춰 세우기: 유한 애니메이션 · 전환은 끝으로, 무한 반복은 0초에서 멈춤, 영상 멈춤(찍은 뒤 되살림)
FREEZE_JS = r"""
()=>{const inf=[];
  for(const a of document.getAnimations()){try{const t=a.effect&&a.effect.getComputedTiming();
    if(t&&isFinite(t.endTime)){if(a.playState!=='finished')a.finish()}
    else{if(a.playState==='running'){inf.push(a)}a.pause();a.currentTime=0}}catch(e){}}
  window.__kaInf=inf;
  for(const v of document.querySelectorAll('video')){try{if(!v.paused){v.__kaPlay=1;v.pause()}}catch(e){}}
  return inf.length}
"""
THAW_JS = r"""
()=>{for(const a of (window.__kaInf||[])){try{a.play()}catch(e){}}window.__kaInf=[];
  for(const v of document.querySelectorAll('video')){if(v.__kaPlay){v.__kaPlay=0;v.play().catch(()=>{})}}}
"""


def mask_selector(noise, key='settle_ignore'):
    sels = noise.get(key) or []
    return ','.join(sels) if sels else None


TRANSIENT = re.compile(r'ERR_(CONNECTION_(TIMED_OUT|RESET|REFUSED|CLOSED|ABORTED)|EMPTY_RESPONSE|TIMED_OUT|NETWORK_CHANGED|SOCKET_NOT_CONNECTED)')


class Tracker:
    """요청 · 오류 기록과 진행 중인 요청 수(영상 스트리밍은 셈에서 뺌)"""

    def __init__(self, page, base):
        self.base = base
        self.req, self.failed, self.console, self.pageerr = [], [], [], []
        self.inflight = set()
        page.on('request', self._rq)
        page.on('requestfinished', self._done)
        page.on('requestfailed', self._fail)
        page.on('response', self._resp)
        page.on('console', lambda m: self.console.append(m.text[:300]) if m.type == 'error' else None)
        page.on('pageerror', lambda e: self.pageerr.append(str(e)[:300]))

    def _rq(self, r):
        self.req.append(rel_url(r.url, self.base))
        if r.resource_type not in ('media',) and not r.url.startswith('data:'):
            self.inflight.add(r)

    def _done(self, r):
        self.inflight.discard(r)

    def _fail(self, r):
        self.inflight.discard(r)
        f = r.failure or ''
        if 'ERR_ABORTED' in f and r.resource_type == 'media':
            return                                  # 영상 부분 요청을 브라우저가 끊는 것은 정상
        self.failed.append(f'{f} {rel_url(r.url, self.base)}')

    def _resp(self, r):
        if r.status >= 400:
            self.failed.append(f'{r.status} {rel_url(r.url, self.base)}')

    def transient(self):
        """연결 문제로 실패한 요청 수(부하 때 python http.server가 연결을 못 받음 · CDN 일시 오류)"""
        return sum(1 for f in self.failed if TRANSIENT.search(f))

    def summary(self):
        return {'requests': sorted(set(self.req)), 'failed': sorted(set(self.failed)),
                'console': self.console, 'pageerror': self.pageerr}


async def new_context(browser, vp_opts, overlay=None, base=None, gl_draw=False):
    ctx = await browser.new_context(**vp_opts, locale='ko-KR', timezone_id='Asia/Seoul',
                                    reduced_motion='no-preference', color_scheme='light',
                                    service_workers='block')
    await ctx.add_init_script(INIT_JS)
    if not gl_draw:
        await ctx.add_init_script(NO_GL_DRAW_JS)
    if overlay and base:
        await add_overlay(ctx, overlay, base)
    return ctx


async def add_overlay(ctx, overlay, base):
    """overlay 폴더에 있는 파일은 기준 주소의 같은 경로 대신 그 파일로 응답(기준 스냅샷에 빠진 파일 보충)"""
    ov = Path(overlay)
    files = {base + f.relative_to(ov).as_posix(): f for f in ov.rglob('*') if f.is_file()}

    async def h(route):
        f = files[route.request.url.split('#')[0].split('?')[0]]
        await route.fulfill(status=200, body=f.read_bytes(),
                            headers={'content-type': mimetypes.guess_type(f.name)[0] or 'application/octet-stream'})
    if files:
        await ctx.route(lambda u: u.split('#')[0].split('?')[0] in files, h)


async def open_page(page, base, pid, tracker, mask):
    """페이지를 열고(탭 id면 기본 화면을 연 뒤 머리글 메뉴 링크를 눌러 그 탭으로) 안정될 때까지.
    #hash로 바로 열면 브라우저의 조각 스크롤과 site.js의 맨 위 복귀가 경합해 순차 등장 상태가 실행마다 달라짐"""
    f, _, tab = pid.partition('#')
    await goto(page, base + f)
    if tab:
        await settle(page, tracker, mask, min_ms=600)
        ok = await page.evaluate("""t=>{const a=document.querySelector(`.gh .dd a[data-sub="${t}"]`)||document.querySelector(`a[href$="#${t}"]`);
            if(!a)return false;a.click();return true}""", tab)
        if not ok:
            raise RuntimeError(f'tab link not found: {tab}')


async def goto(page, url):
    await page.goto(url, wait_until='load', timeout=120000)
    try:
        await page.evaluate('document.fonts && document.fonts.ready.then(()=>1)')
    except Exception:
        pass
    # 데스크톱(hover · 정밀 포인터)이면 Lenis(CDN)가 붙을 때까지
    if await page.evaluate("matchMedia('(hover:hover) and (pointer:fine)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches"):
        try:
            await page.wait_for_function('!!window.KA_LENIS', timeout=10000)
        except Exception:
            pass


async def settle(page, tracker, mask, min_ms=800, quiet_ms=700, quiet_frames=10, max_ms=25000, poll=150):
    """변이가 quiet_ms 동안 · quiet_frames 프레임 동안 없고, 도는 유한 애니메이션 · 5초 이하 타이머 · 화면 안 미완료 이미지 ·
    진행 중 요청이 없고, 글꼴이 다 오면 끝. 못 채우면 max_ms에 멈추고 이유를 돌려줌(부르는 쪽이 페이지를 다시 함)"""
    t0 = time.time()
    await asyncio.sleep(min_ms / 1000)
    st = None
    while True:
        st = await page.evaluate(STATUS_JS, mask)
        if st is None:
            return {'ok': False, 'why': 'no-init'}
        ok = (st['quiet'] >= quiet_ms and st['qf'] >= quiet_frames and st['anims'] == 0 and st['img'] == 0 and st['timers'] == 0
              and st['fonts'] == 'loaded' and not tracker.inflight)
        if ok:
            return {'ok': True, 'ms': int((time.time() - t0) * 1000)}
        if (time.time() - t0) * 1000 > max_ms:
            hist = await page.evaluate("[...window.__ka.hist.entries()].sort((a,b)=>b[1]-a[1]).slice(0,6)")
            st['inflight'] = [rel_url(r.url, tracker.base) for r in list(tracker.inflight)[:4]]
            st['top_mut'] = hist
            return {'ok': False, 'ms': int((time.time() - t0) * 1000), 'st': st}
        await asyncio.sleep(poll / 1000)


async def settle2(page, tracker, mask, rounds=2, **kw):
    """settle을 rounds번까지 이어서(부하로 루프가 느리게 수렴하면 페이지를 다시 하는 것보다 더 기다리는 편이 빠름)"""
    t0 = time.time()
    for i in range(rounds):
        r = await settle(page, tracker, mask, **(kw if i == 0 else {**kw, 'min_ms': 0}))
        if r.get('ok'):
            break
    r['ms'] = int((time.time() - t0) * 1000)
    if i:
        r['rounds'] = i + 1
    return r


async def freeze(page):
    return await page.evaluate(FREEZE_JS)


async def thaw(page):
    await page.evaluate(THAW_JS)


async def kill_lenis(page):
    await page.evaluate("window.KA_LENIS&&window.KA_LENIS.destroy()")


async def scroll_to(page, y):
    await page.evaluate("y=>window.scrollTo({top:y,left:0,behavior:'instant'})", y)


async def frames(page, n=2):
    await page.evaluate("n=>new Promise(r=>{const f=k=>k?requestAnimationFrame(()=>f(k-1)):r();f(n)})", n)


async def metrics(page):
    return await page.evaluate("({H:document.documentElement.scrollHeight,vh:innerHeight,y:scrollY})")


async def sweep(page, frac=0.6, pause_ms=120):
    """위에서 아래까지 frac×화면 높이씩 내려감(내리는 동안 길어지는 페이지도 끝까지)"""
    m = await metrics(page)
    y, step, n = 0, max(1, int(m['vh'] * frac)), 0
    while True:
        m = await metrics(page)
        maxy = max(0, m['H'] - m['vh'])
        if y >= maxy:
            await scroll_to(page, maxy)
            await asyncio.sleep(0.4)
            m2 = await metrics(page)
            if m2['H'] - m2['vh'] <= maxy:
                break
            continue
        y = min(y + step, maxy)
        await scroll_to(page, y)
        n += 1
        await frames(page)                          # 페이지의 매 프레임 루프가 이 위치를 한 번은 처리하게
        await asyncio.sleep(pause_ms / 1000)
    return n


async def run_pool(items, worker_fn, workers):
    """items를 workers개 동시 작업으로 처리(각 작업이 브라우저 하나를 씀)"""
    q = asyncio.Queue()
    heavy = ('aero', 'uav', 'index', 'mro')
    rank = lambda it: next((i for i, h in enumerate(heavy) if str(it).startswith(h)), len(heavy))
    for it in sorted(items, key=rank):
        q.put_nowait(it)
    results = {}

    async def w(k):
        while True:
            try:
                it = q.get_nowait()
            except asyncio.QueueEmpty:
                return
            results[it] = await worker_fn(it, k)
    await asyncio.gather(*[w(k) for k in range(max(1, min(workers, len(items))))])
    return results


async def with_browser(pw, browsers, k, fn, retries=2):
    """작업 k의 브라우저로 fn(browser) 실행 — 브라우저가 죽거나(다른 작업이 headless 브라우저를 정리하는 등) 시간 초과 ·
    연결이 끊긴 요청 · 안정 대기 초과가 있으면(res['transient']) 새로 띄워 다시"""
    res = None
    for attempt in range(retries + 1):
        b = browsers.get(k)
        if b is None or not b.is_connected():
            browsers[k] = b = await pw.chromium.launch(args=GL_ARGS)
        try:
            res = await fn(b)
        except Exception as e:
            res = {'error': repr(e)[:500]}
        err = str(res.get('error', '')) if isinstance(res, dict) else ''
        if isinstance(res, dict) and ('closed' in err or 'Timeout' in err or res.get('transient')) and attempt < retries:
            try:
                await b.close()
            except Exception:
                pass
            browsers.pop(k, None)
            continue
        break
    if isinstance(res, dict) and attempt:
        res['retries'] = attempt
    return res


def fid(page_id):
    """페이지 id → 파일 이름 조각"""
    return page_id.replace('.html', '').replace('#', '@')
