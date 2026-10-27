"""쇼릴 검사(스토리보드 Build plan · Loop 7). 실패 있으면 종료 코드 1. 결과 JSON · PNG는 --out(_out/reel/check).
  check.py all [--lang ko|en|ko,en] [--only id] [--full]     seam · boxes · clear3d · palette · det + 요약표
  check.py seam [--width 960|1920] [--samples auto|1] [--mp4 파일]
      MAD(899→0) ≤ 1.3 × 이웃 쌍(880→ … →20) 중앙값. samples 1 = reel.thumb. --mp4: 디코딩 H.264(끝 20 · 처음 21프레임).
      all은 _out/reel/reel-<lang>-1920.mp4가 있으면 함께.
  check.py det [--frames 0,450,899]      SHA-1: 브라우저 A 첫 렌더 → 다른 프레임 거친 뒤 역순 → 새 브라우저 B, 모두 같아야
  check.py boxes [--every 5]             tier≤2 26px 미만 · SAFE 밖(tier 3 경고) · tier 1 Z-OV(허용 tal.matte* · logo*) · 겹침(α<.2 무시, 같은 자리 굴림 경고)
  check.py palette [--every 10] [--full] ?nogl=1, 3×3 균일 화소가 팔레트 C ∪ 섞임에서 ΔE76 > 6인 덩어리 · 순흑 · 순백
      무인기 324–420 스프라이트 원색 허용 · 사진 716–800 경고만 · --full: 3D 알파를 가린 원래 프레임도
  check.py clear3d [--every 1]           glMask 3D 금지 구역: LT x<1500 y>690(882–104) · 셔터 x<1150 y>690(180–329) · 비전 x>1100 y>560(668–716)
  공통: --only 장면id · -v 전체 목록. 서버: python3 -m http.server 8768 --bind ::1(루트)
"""
import argparse, asyncio, base64, hashlib, json, os, re, subprocess, sys, time
import numpy as np
from PIL import Image, ImageDraw
from playwright.async_api import async_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
REEL = os.path.join(ROOT, 'dev', 'reel')
W, H, N = 1920, 1080, 900
ARGS = ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--disable-background-timer-throttling', '--disable-renderer-backgrounding']
INF = 1e9

def _src(name):
    try: return open(os.path.join(REEL, name), encoding='utf-8').read()
    except OSError: return ''

def _obj(src, name, default):
    """shared.js의 {k:v,…} 상수(숫자만) 읽기 — 원본이 기준"""
    m = re.search(r'export const %s=\{([^}]*)\}' % name, src)
    if not m: return default
    d = {k: float(v) for k, v in re.findall(r'(\w+):(-?[\d.]+)', m.group(1))}
    return {**default, **d}

SH = _src('shared.js')
SAFE = _obj(SH, 'SAFE', {'x0': 96, 'x1': 1824, 'y0': 60, 'y1': 1020})
ZOV = _obj(SH, 'ZOV', {'x1': 1040, 'y1': 560})
# 3D 금지 구역: (이름, 설명, (xlo,xhi,ylo,yhi) — 화소 중심이 열린 구간 안이면 금지, 프레임)
KEEP = [('LT', 'x<1500 y>690', (-INF, 1500, 690, INF), [*range(882, 900), *range(0, 105)]),
        ('shutter', 'x<1150 y>690', (-INF, 1150, 690, INF), list(range(180, 330))),
        ('vision', 'x>1100 y>560', (1100, INF, 560, INF), list(range(668, 717)))]
UAV_WIN, PHOTO_WIN = (324, 420), (716, 800)
EVERY = {'boxes': 5, 'palette': 10, 'clear3d': 1}   # --every 기본값

# ── 쪽 안 도우미(엔진 파일은 건드리지 않음) ──
JS_CK = r'''()=>{window.__ck={
b64:u=>new Promise(r=>{const q=new FileReader();q.onload=()=>{const s=q.result;r(s.slice(s.indexOf(',')+1))};q.readAsDataURL(new Blob([u]))}),
rgb(d,n){const o=new Uint8Array(n*3);for(let i=0,j=0;j<o.length;i+=4,j+=3){o[j]=d[i];o[j+1]=d[i+1];o[j+2]=d[i+2]}return o},
/* readPixels는 아래→위(파이썬에서 뒤집음) */
full(){const d=reel.pixels();return this.b64(this.rgb(d,d.length/4))},
/* 축소판(reel.thumb은 폭을 바꾸면 깨짐 → 폭마다 캔버스) */
small(w){const h=Math.round(w*reel.H/reel.W);let c=this.c;if(!c||c.width!==w){c=this.c=document.createElement('canvas');c.width=w;c.height=h}
  const x=c.getContext('2d',{willReadFrequently:true});x.imageSmoothingQuality='high';x.clearRect(0,0,w,h);x.drawImage(document.getElementById('out'),0,0,w,h);
  return this.b64(this.rgb(x.getImageData(0,0,w,h).data,w*h))},
grab(f,w,s){if(f!==null)reel.frame(f,{samples:s});return w>=reel.W?this.full():this.small(w)},
async sha(f,s){reel.frame(f,{samples:s});const h=await crypto.subtle.digest('SHA-1',reel.pixels());return [...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,'0')).join('')},
/* 잉크 위 · 아래(굵기 모름 → 300 · 700 중 큰 값) */
ink(L){const x=document.createElement('canvas').getContext('2d');return L.map(([s,z])=>{let a=0,d=0;for(const w of [300,700]){x.font=w+' '+z+'px Hanjin';x.letterSpacing='0px';
  const m=x.measureText(s);a=Math.max(a,m.actualBoundingBoxAscent);d=Math.max(d,m.actualBoundingBoxDescent)}return [a,d]})},
/* 스프라이트 원색(불투명 화소) */
async colors(P,M=512){const S=new Set();for(const p of P){const im=new Image();im.src=p;await im.decode();const k=Math.min(1,M/Math.max(im.width,im.height));
  const w=Math.max(1,Math.round(im.width*k)),h=Math.max(1,Math.round(im.height*k));const c=document.createElement('canvas');c.width=w;c.height=h;
  const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(im,0,0,w,h);const d=x.getImageData(0,0,w,h).data;
  for(let i=0;i<d.length;i+=4)if(d[i+3]>=250)S.add((d[i]&252)<<16|(d[i+1]&252)<<8|(d[i+2]&252))}return [...S]}}}'''

class Reel:
    """reel 쪽 하나(브라우저 탭)"""
    def __init__(self, pg): self.pg, self.logs, self.scene_errors = pg, [], []
    async def ev(self, js, arg=None): return await self.pg.evaluate(js, arg)

async def open_reel(b, a, extra=''):
    url = f'http://[::1]:8768/dev/reel/index.html?cap=1&lang={a.lang}' + (f'&only={a.only}' if a.only else '') + extra
    pg = await b.new_page(viewport={'width': W, 'height': H}, device_scale_factor=1)
    R = Reel(pg)
    pg.on('console', lambda m: R.logs.append(m.type + ': ' + m.text) if m.type in ('error', 'warning') else None)
    pg.on('pageerror', lambda e: R.logs.append('pageerror: ' + str(e)))
    await pg.goto(url)
    await pg.wait_for_function('window.reel&&(window.reel.ready||window.reel.error)', timeout=180000)
    err = await R.ev('window.reel.error||null')
    if err: raise RuntimeError('reel error: ' + err + '\n' + '\n'.join(R.logs))
    R.scene_errors = await R.ev('window.reel.sceneErrors||[]')
    await R.ev(JS_CK)
    return R

def decode(b64, w):
    a = np.frombuffer(base64.b64decode(b64), np.uint8).reshape(round(w * H / W), w, 3); return a[::-1] if w >= W else a

async def grab(R, f, w, smp): return decode(await R.ev('([f,w,s])=>__ck.grab(f,w,s)', [f, w, smp]), w)

async def glmask(R, f, w):   # 3D 알파(0–255) 평면
    return np.frombuffer(base64.b64decode(await R.ev('([f,w])=>reel.glMask(f,w)', [f, w])), np.uint8).reshape(round(w * H / W), w)

def e1(e): return str(e).split('\n')[0][:300]
STAT = {True: 'PASS', False: 'FAIL', None: 'SKIP'}

def smp_arg(s): return 'auto' if str(s) == 'auto' else int(s)

def res(name, lang, ok, detail, data=None):
    return {'check': name, 'lang': lang, 'ok': ok, 'detail': detail, 'data': data or {}}

def save_json(a, name, obj):
    os.makedirs(a.out, exist_ok=True); p = os.path.join(a.out, f'{name}-{a.lang}.json')
    with open(p, 'w', encoding='utf-8') as fh: json.dump(obj, fh, ensure_ascii=False, indent=1, default=lambda o: o.item() if hasattr(o, 'item') else str(o))
    return p

def ranges(fs, st=None):
    """[0,5,10,20] → '0–10, 20' (간격 st 이하면 이어 붙임, 없으면 가장 작은 간격)"""
    fs = sorted(set(int(round(f)) for f in fs))
    if not fs: return ''
    st = st or min((b - a for a, b in zip(fs, fs[1:])), default=1); out = []; s = p = fs[0]
    for f in fs[1:]:
        if f - p > st: out.append(f'{s}' if s == p else f'{s}–{p}'); s = f
        p = f
    out.append(f'{s}' if s == p else f'{s}–{p}'); return ', '.join(out)

# ── seam ──
def seam_rule(name, lang, frames, labels, k, a, tag):
    d = [float(np.abs(frames[i + 1].astype(np.float32) - frames[i].astype(np.float32)).mean()) for i in range(len(frames) - 1)]
    s = d[k]; nb = d[:k] + d[k + 1:]; med = float(np.median(nb))
    ratio = s / med if med > 0 else (0.0 if s == 0 else float('inf'))
    ok = s <= 1.3 * med + 1e-9
    detail = f'MAD {labels[k]}→{labels[k + 1]} {s:.2f} vs median {med:.2f} = {ratio:.2f}× (≤1.3)'
    png = os.path.join(a.out, f'{tag}-{lang}.png'); seam_png(png, d, k, med, labels, frames)
    return res(name, lang, ok, detail, {'mad': dict(zip([f'{labels[i]}>{labels[i + 1]}' for i in range(len(d))], [round(x, 3) for x in d])),
                                        'seam': s, 'median': med, 'ratio': ratio, 'png': png})

def seam_png(path, d, k, med, labels, frames):
    """위: 쌍별 MAD 막대(이음매 금색, 빨간 선 1.3×중앙값) · 아래: 이음매 앞뒤 축소판 + |차이|×4"""
    tw, th, ch = 384, 216, 220; im = Image.new('RGB', (tw * 5, ch + th + 40), (22, 22, 22)); dr = ImageDraw.Draw(im); bw = tw * 5 / len(d)
    sy = lambda v: ch - 20 - v / max(max(d), 1.3 * med, 1e-6) * (ch - 40)
    for i, v in enumerate(d):
        dr.rectangle([i * bw + 2, sy(v), i * bw + bw - 2, ch - 20], fill=(194, 166, 115) if i == k else (110, 110, 110))
        if i % 5 == 0 or i == k: dr.text((i * bw + 2, ch - 16), str(labels[i]), fill=(170, 170, 170))
    dr.line([(0, sy(1.3 * med)), (tw * 5, sy(1.3 * med))], fill=(230, 80, 80))
    df = np.clip(np.abs(frames[k + 1].astype(np.int16) - frames[k].astype(np.int16)) * 4, 0, 255).astype(np.uint8)
    tiles = [(frames[i], f'f{labels[i]}') for i in (k - 1, k, k + 1, k + 2) if 0 <= i < len(frames)] + [(df, f'|{labels[k]}-{labels[k + 1]}|x4')]
    for j, (x, lb) in enumerate(tiles):
        im.paste(Image.fromarray(np.ascontiguousarray(x)).resize((tw, th)), (j * tw, ch + 20)); dr.text((j * tw + 4, ch + 4), lb, fill=(200, 200, 200))
    os.makedirs(os.path.dirname(path), exist_ok=True); im.save(path)

def mp4_frames(path, w):
    n = int(subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-count_packets', '-show_entries', 'stream=nb_read_packets',
                            '-of', 'csv=p=0', path], capture_output=True, text=True, check=True).stdout.strip().split(',')[0])
    h = round(w * H / W)
    vf = f"setpts=N/60/TB,select='lte(n\\,20)+gte(n\\,{n - 20})',scale={w}:{h}:flags=area:in_color_matrix=bt709:in_range=tv"
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-vf', vf, '-fps_mode', 'passthrough', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
                         capture_output=True, check=True).stdout
    arr = np.frombuffer(raw, np.uint8).reshape(-1, h, w, 3)
    if len(arr) != 41: raise RuntimeError(f'{path}: {len(arr)} frames decoded (expected 41 of {n})')
    return list(arr[21:]) + list(arr[:21]), [*range(n - 20, n), *range(21)], n

async def check_seam(R, a):
    fr = [*range(880, 900), *range(21)]; smp = smp_arg(a.samples); t = time.time(); imgs = []
    for f in fr: imgs.append(await grab(R, f, a.width, smp))
    out = [seam_rule('seam', a.lang, imgs, fr, 19, a, 'seam')]
    out[0]['detail'] += f' [{a.width}px, samples {a.samples}, {time.time() - t:.1f}s]'
    mp4 = a.mp4 or (os.path.join(ROOT, '_out', 'reel', f'reel-{a.lang}-1920.mp4') if a.cmd == 'all' else '')
    if mp4 and os.path.exists(mp4):
        try:
            seq, lab, n = mp4_frames(mp4, a.width); r = seam_rule('seam-mp4', a.lang, seq, lab, 19, a, 'seam-mp4')
            r['detail'] += f' [{os.path.basename(mp4)}, {n} frames]'; out.append(r)
        except Exception as e: out.append(res('seam-mp4', a.lang, False, f'{mp4}: {e}'))
    elif mp4: out.append(res('seam-mp4', a.lang, None if a.cmd == 'all' and not a.mp4 else False, f'no {os.path.relpath(mp4, ROOT)}'))
    save_json(a, 'seam', out); return out

# ── det ──
async def shas(R, frames, smp): return [await R.ev('([f,s])=>__ck.sha(f,s)', [f, smp]) for f in frames]

HISTORY = "()=>{for(let f=0;f<900;f+=37)reel.frame(f);for(const f of [120,480,777]){reel.boxes(f);reel.glMask(f,480)}}"

async def check_det(a, pw):
    """A: 첫 렌더 → HISTORY → 역순(쪽 안 상태 누출) · B: 새 브라우저. 둘 다 전용(같은 브라우저의 다른 탭이 GPU 캐시를 바꿔 1 LSB 차이를 낸 적 있음)"""
    fs = [int(x) for x in a.frames.split(',')]; smp = smp_arg(a.samples); t = time.time()
    bA = await pw.chromium.launch(args=ARGS); bB = await pw.chromium.launch(args=ARGS); diffs = {}
    try:
        RA = await open_reel(bA, a); h1 = await shas(RA, fs, smp); await RA.ev(HISTORY); h2 = (await shas(RA, fs[::-1], smp))[::-1]
        RB = await open_reel(bB, a); h3 = await shas(RB, fs, smp)
        for f, x, y, z in zip(fs, h1, h2, h3):
            if x == y == z: continue
            A_, B_ = (await grab(RA, f, W, smp)).astype(np.int16), (await grab(RB, f, W, smp)).astype(np.int16)
            d = np.abs(A_ - B_).max(2); yy, xx = np.nonzero(d)
            diffs[f] = {'px': int(len(yy)), 'max': int(d.max())} | ({'bbox': [int(xx.min()), int(yy.min()), int(xx.max()) + 1, int(yy.max()) + 1]} if len(yy) else {})
    finally: await bA.close(); await bB.close()
    rows = [{'f': f, 'run1': x, 'same_page_after_history': y, 'fresh_browser': z, 'ok': x == y == z, **({'diff_A_vs_B': diffs[f]} if f in diffs else {})}
            for f, x, y, z in zip(fs, h1, h2, h3)]
    bad = [r['f'] for r in rows if not r['ok']]
    detail = ((f'{len(fs)} frames × 3 runs identical' if not bad else 'differ at ' + ', '.join(f'f{f}' + (f' ({diffs[f]["px"]}px ≤{diffs[f]["max"]} LSB)' if f in diffs else '') for f in bad))
              + f' (samples {a.samples}, {time.time() - t:.1f}s) ' + ' '.join(f'f{r["f"]}:{r["run1"][:10]}' for r in rows))
    out = [res('det', a.lang, not bad, detail, {'rows': rows})]; save_json(a, 'det', out); return out

# ── boxes ──
def zov_allowed(i, allow): return any(i == p or (p.endswith('*') and i.startswith(p[:-1])) for p in allow)

def name(b): return (b['id'] or '"' + b['s'][:24] + '"') + f'(t{b["tier"]})'

def box_rules(B, ink, allow, tol=1.0):
    """한 프레임의 상자 → 위반 목록 [(규칙, 심각도 'fail'|'warn', 설명, ids)]"""
    seen, U, V = set(), [], []
    for b in B:
        k = (b['s'], b['x'], b['y'], b['w'], b['h'])
        if k in seen or b['x'] >= W or b['y'] >= H or b['x'] + b['w'] <= 0 or b['y'] + b['h'] <= 0: continue   # 겹친 기록 · 화면 밖(안 보임)
        seen.add(k); U.append(b)
    for b in U:
        t, n_ = b['tier'], name(b); r = f"[{b['x']},{b['y']} {b['w']}×{b['h']}]"
        if t <= 2 and b['size'] < 26 - .05: V.append(('SIZE', 'fail', f"{n_} {b['size']:.1f}px", [b['id']]))
        if b['x'] < SAFE['x0'] - tol or b['x'] + b['w'] > SAFE['x1'] + tol or b['y'] < SAFE['y0'] - tol or b['y'] + b['h'] > SAFE['y1'] + tol:
            V.append(('SAFE', 'fail' if t <= 2 else 'warn', f'{n_} {r}', [b['id']]))
        if t == 1 and b['x'] < ZOV['x1'] and b['y'] < ZOV['y1'] and not zov_allowed(b['id'], allow):
            V.append(('ZOV', 'fail', f'{n_} {r}', [b['id']]))
    L = [b for b in U if b['a'] >= .2]
    def ib(b):   # 잉크 상자: 가로는 배치 폭, 세로는 기준선 ± 잉크(엔진 상자는 기준선−.8em부터 1em)
        asc, dsc = ink.get((b['s'], round(b['size'], 2)), (b['size'] * .8, b['size'] * .2)); base = b['y'] + .8 * b['h']
        return b['x'], base - asc, b['x'] + b['w'], base + dsc
    for i in range(len(L)):
        for j in range(i + 1, len(L)):
            x0, y0, x1, y1 = ib(L[i]); X0, Y0, X1, Y1 = ib(L[j]); ix = min(x1, X1) - max(x0, X0); iy = min(y1, Y1) - max(y0, Y0)
            if ix > 2 and iy > 2:   # 같은 자리(x · 기준선 같음)의 다른 글 = 한 칸에서 굴려 바꾸기(마스크) → 경고만
                slot = abs(L[i]['x'] - L[j]['x']) <= 1 and abs(L[i]['y'] + .8 * L[i]['h'] - L[j]['y'] - .8 * L[j]['h']) <= 1
                V.append(('SLOT' if slot else 'OVERLAP', 'warn' if slot else 'fail', f'{name(L[i])} × {name(L[j])} ∩{ix:.0f}×{iy:.0f}', [L[i]['id'], L[j]['id']]))
    return V

async def check_boxes(R, a):
    frames = list(range(0, N, a.every)); allB, errs, t = {}, [], time.time()
    for f in frames:
        try: allB[f] = await R.ev('f=>reel.boxes(f)', f)
        except Exception as e: errs.append((f, e1(e)))
    uniq = sorted({(b['s'], round(b['size'], 2)) for B in allB.values() for b in B})
    ink = dict(zip(uniq, [tuple(x) for x in await R.ev('L=>__ck.ink(L)', [list(u) for u in uniq])])) if uniq else {}
    allow = [x for x in a.zov_allow.split(',') if x]
    per, fails, warns, groups = {}, 0, 0, {}
    for f, B in allB.items():
        V = box_rules(B, ink, allow)
        if V: per[f] = V
        for rule, sev, desc, ids in V:
            fails += sev == 'fail'; warns += sev == 'warn'
            key = (rule, sev, re.sub(r' \[.*|∩.*| \d+(\.\d)?px', '', desc)); groups.setdefault(key, []).append(f)
    nb = sum(len(B) for B in allB.values()); noid = sum(1 for B in allB.values() for b in B if not b['id'])
    lines = [f'  f{f:03d}: ' + '; '.join(f'{r}{"" if s == "fail" else "(warn)"} {d}' for r, s, d, _ in per[f]) for f in sorted(per)]
    cnt = {}
    for (rule, sev, _), fs in groups.items(): k = rule + ('' if sev == 'fail' else '~'); cnt[k] = cnt.get(k, 0) + len(fs)
    detail = (f'{fails} fail / {warns} warn in {len(per)} of {len(frames)} frames ' + (' '.join(f'{k}:{v}' for k, v in sorted(cnt.items())) or '')
              + f' · {nb} boxes, {noid} without id' + (f' · {len(errs)} render errors' if errs else '') + f' [{time.time() - t:.1f}s]')
    grp = [f'  {rule}{"" if sev == "fail" else "(warn)"} {who}  @ f {ranges(fs, a.every)}' for (rule, sev, who), fs in sorted(groups.items())]
    out = [res('boxes', a.lang, fails == 0 and not errs, detail, {'grouped': grp, 'per_frame': {f: per[f] for f in sorted(per)}, 'errors': errs,
                                                                  'boxes': {f: allB[f] for f in sorted(allB)}})]
    out[0]['print'] = (['  by rule/id:'] + grp[:40 if not a.v else None] + (['  per frame:'] + (lines if a.v else lines[:40]) if lines else [])
                       + [f'  render error f{f}: {e}' for f, e in errs[:10]])
    save_json(a, 'boxes', out); return out

# ── palette ──
def srgb2lab(rgb):
    c = np.asarray(rgb, np.float64) / 255.0; l = np.where(c <= .04045, c / 12.92, ((c + .055) / 1.055) ** 2.4)
    M = np.array([[.4124564, .3575761, .1804375], [.2126729, .7151522, .0721750], [.0193339, .1191920, .9503041]])
    with np.errstate(all='ignore'): xyz = (l @ M.T) / np.array([.95047, 1.0, 1.08883])   # numpy 2.0 + Accelerate의 헛경고(값은 정확)
    e = (6 / 29) ** 3
    f = np.where(xyz > e, np.cbrt(xyz), xyz / (3 * (6 / 29) ** 2) + 4 / 29)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1)

def palette_C():
    m = re.search(r'export const C=\{(.*?)\};', _src('engine.js'), re.S)
    return dict(re.findall(r"(\w+):'(#[0-9A-Fa-f]{6})'", m.group(1))) if m else {}

def hx(h): return np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)], np.float64)

def allowed_lab(C):
    """허용 색: C 전체 ∪ 두 색 섞임(sRGB, 캔버스 합성) ∪ 어두운 바탕(night · cblue · ink80 사이 섞임) 위의 각 색 섞임"""
    cols = np.array([hx(v) for v in C.values()]); t = np.linspace(0, 1, 41)[:, None]; pts = [cols]
    for i in range(len(cols)):
        for j in range(i + 1, len(cols)): pts.append(cols[i] * (1 - t) + cols[j] * t)
    dk = [hx(C[k]) for k in ('night', 'cblue', 'ink80') if k in C]; s = np.linspace(0, 1, 9)[:, None]
    for i in range(len(dk)):
        for j in range(i + 1, len(dk)):
            base = dk[i] * (1 - s) + dk[j] * s
            for c in cols: pts.append((base[:, None, :] * (1 - t[None]) + c * t[None]).reshape(-1, 3))
    return np.unique(np.round(srgb2lab(np.concatenate(pts)), 1), axis=0)

def mindist(X, P, ch=512):
    P2 = (P ** 2).sum(1); out = np.empty(len(X))
    for i in range(0, len(X), ch):
        x = X[i:i + ch]
        with np.errstate(all='ignore'): d2 = (x ** 2).sum(1)[:, None] + P2[None] - 2 * x @ P.T
        out[i:i + ch] = np.sqrt(np.maximum(d2.min(1), 0))
    return out

class DE:
    """RGB(24bit) → 허용 집합까지 ΔE(×4, 255=모름) 표. 실행 사이에도 파일로 캐시"""
    def __init__(self, P, cache_dir):
        self.P = P; key = hashlib.sha1(P.tobytes()).hexdigest()[:12]; self.path = os.path.join(cache_dir, f'.palette-de-{key}.npy'); self.dirty = False
        try: self.t = np.load(self.path)
        except Exception: self.t = np.full(1 << 24, 255, np.uint8)
    def __call__(self, packed):
        v = self.t[packed]; unk = np.unique(packed[v == 255])
        if len(unk):
            rgb = np.stack([(unk >> 16) & 255, (unk >> 8) & 255, unk & 255], -1)
            self.t[unk] = np.minimum(254, np.round(mindist(srgb2lab(rgb), self.P) * 4)).astype(np.uint8); v = self.t[packed]; self.dirty = True
        return v / 4.0
    def save(self):
        if self.dirty:
            os.makedirs(os.path.dirname(self.path), exist_ok=True); np.save(self.path, self.t); self.dirty = False

def box3(a, fn):
    """3×3 최대 · 최소(가로 → 세로), 가장자리 1px 제외한 안쪽"""
    h = fn(fn(a[:, :-2], a[:, 1:-1]), a[:, 2:]); return fn(fn(h[:-2], h[1:-1]), h[2:])

def dilate(m, r):
    m = m.copy()
    for _ in range(r):
        n = m.copy(); n[1:] |= m[:-1]; n[:-1] |= m[1:]; n[:, 1:] |= m[:, :-1]; n[:, :-1] |= m[:, 1:]; m = n
    return m

def clusters(flag, img, dE, tile=8, min_px=24):
    """표시된 화소를 8px 칸으로 묶어 이웃 칸끼리 한 덩어리 → [{px,bbox,rgb,dE,at}]"""
    th, tw = H // tile, W // tile; cnt = flag[:th * tile, :tw * tile].reshape(th, tile, tw, tile).sum((1, 3)); hot = cnt >= 3
    lab = np.zeros(hot.shape, np.int32); out = []; n = 0
    for sy, sx in zip(*np.nonzero(hot)):
        if lab[sy, sx]: continue
        n += 1; st = [(sy, sx)]; lab[sy, sx] = n; cells = []
        while st:
            y, x = st.pop(); cells.append((y, x))
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    yy, xx = y + dy, x + dx
                    if 0 <= yy < th and 0 <= xx < tw and hot[yy, xx] and not lab[yy, xx]: lab[yy, xx] = n; st.append((yy, xx))
        ys = [c[0] for c in cells]; xs = [c[1] for c in cells]; px = int(sum(cnt[c] for c in cells))
        if px < min_px: continue
        x0, y0, x1, y1 = int(min(xs)) * tile, int(min(ys)) * tile, (int(max(xs)) + 1) * tile, (int(max(ys)) + 1) * tile
        sub = flag[y0:y1, x0:x1]; yy, xx = np.nonzero(sub); cy, cx = (y0 + y1) / 2, (x0 + x1) / 2
        k = int(np.argmin((yy + y0 - cy) ** 2 + (xx + x0 - cx) ** 2)); py, pxx = int(yy[k] + y0), int(xx[k] + x0)
        rgb = np.median(img[y0:y1, x0:x1][sub], 0).astype(int)
        out.append({'px': px, 'bbox': [x0, y0, x1, y1], 'rgb': '#%02X%02X%02X' % tuple(rgb), 'dE': round(float(dE[py, pxx]), 1), 'at': [pxx, py]})
    return sorted(out, key=lambda c: -c['px'])

def in_win(f, w): return w[0] <= f <= w[1]

class Palette:
    def __init__(self, a, sprite_rgb):
        self.C = palette_C(); self.P = allowed_lab(self.C); self.de = DE(self.P, a.out); self.thr = a.de; self.min_px = a.min_px
        self.S = None
        if sprite_rgb is not None and len(sprite_rgb):   # 스프라이트 원색 + 바탕(night · uavShadow) 위 반투명
            s = np.array(sprite_rgb, np.int64); s = np.stack([(s >> 16) & 255, (s >> 8) & 255, s & 255], -1).astype(np.float64); pts = [s]
            for bg in [hx(self.C.get('night', '#25282A')), hx(self.C.get('uavShadow', '#141617'))]:
                for al in (.25, .5, .75): pts.append(s * al + bg * (1 - al))
            self.S = np.unique(np.round(srgb2lab(np.concatenate(pts)), 0), axis=0)
    def frame(self, img, f, excl=None):
        I = img.astype(np.int16); rg = (box3(I, np.maximum) - box3(I, np.minimum)).max(2)
        uni = np.zeros((H, W), bool); uni[1:-1, 1:-1] = rg <= 3              # 3×3 균일(디더 ±1 허용) → 경계 섞임 제외
        if excl is not None: uni &= ~excl
        packed = (img[..., 0].astype(np.uint32) << 16 | img[..., 1].astype(np.uint32) << 8 | img[..., 2]).ravel()
        idx = np.flatnonzero(uni.ravel()); d = self.de(packed[idx])
        dE = np.zeros(H * W, np.float32); dE[idx] = d
        mn, mx = img.min(2).ravel()[idx], img.max(2).ravel()[idx]
        forb = (mx <= 5) | (mn >= 250)                                            # 순흑 · 순백
        bad = (d > self.thr) | forb
        if self.S is not None and in_win(f, UAV_WIN) and bad.any():             # 무인기: 스프라이트 원색 허용
            cand = idx[bad]; uq, inv = np.unique(packed[cand], return_inverse=True)
            rgb = np.stack([(uq >> 16) & 255, (uq >> 8) & 255, uq & 255], -1); ok = mindist(srgb2lab(rgb), self.S) <= self.thr
            keep = np.ones(len(idx), bool); keep[np.flatnonzero(bad)[ok[inv]]] = False; bad &= keep
        flag = np.zeros(H * W, bool); flag[idx[bad]] = True
        fb = np.zeros(H * W, bool); fb[idx[bad & forb]] = True
        return clusters(flag.reshape(H, W), img, dE.reshape(H, W), min_px=self.min_px), int(fb.sum()), flag.reshape(H, W)

def pal_png(path, img, flag, cl):
    base = (img.astype(np.float32) * .35).astype(np.uint8); base[flag] = (255, 0, 255)
    im = Image.fromarray(base); dr = ImageDraw.Draw(im)
    for c in cl[:12]:
        dr.rectangle(c['bbox'], outline=(0, 255, 255), width=2); dr.text((c['bbox'][0], max(0, c['bbox'][1] - 12)), f"{c['rgb']} dE{c['dE']} {c['px']}px", fill=(0, 255, 255))
    im.resize((W // 2, H // 2)).save(path)

async def check_palette(Rn, a, Rf=None):
    kit = _src('kit.js'); m = re.search(r'export const UAV_TOP=\{(.*?)\};', kit, re.S)
    paths = re.findall(r"'(/web/img/[^']+)'", m.group(1)) if m else []
    try: srgb = await Rn.ev('P=>__ck.colors(P)', paths) if paths else []
    except Exception as e: print('  sprite colours failed:', e); srgb = []
    P = Palette(a, srgb); out = []
    passes = [('palette', Rn, False)] + ([('palette-full', Rf, True)] if Rf else [])
    for nm, R, full in passes:
        frames = list(range(0, N, a.every)); t = time.time(); rows, warn, errs, worst = [], [], [], []
        for f in frames:
            try:
                excl = None
                if full:
                    excl = dilate(await glmask(R, f, W) > 2, 2)
                    img = decode(await R.ev('()=>__ck.grab(null,1920,1)'), W)
                else: img = await grab(R, f, W, 1)
                cl, nforb, flag = P.frame(img, f, excl)
            except Exception as e: errs.append((f, e1(e))); continue
            if not cl and not nforb: continue
            row = {'f': f, 'clusters': cl[:20], 'flagged_px': int(flag.sum()), 'forbidden_px': nforb}
            (warn if in_win(f, PHOTO_WIN) else rows).append(row)
            worst = sorted(worst + [(row['flagged_px'], f, img, flag, cl)], key=lambda x: -x[0])[:3]   # 그림은 가장 나쁜 셋만
        P.de.save()
        pngs = []
        for _, f, img, flag, cl in worst:
            p = os.path.join(a.out, f'{nm}-{a.lang}-f{f:03d}.png'); pal_png(p, img, flag, cl); pngs.append(p)
        ncl = sum(len(r['clusters']) for r in rows); nf = sum(r['forbidden_px'] for r in rows)
        samp = '; '.join(f"f{r['f']} {c['rgb']} dE{c['dE']} @({c['at'][0]},{c['at'][1]}) {c['px']}px" for r in rows[:6] for c in r['clusters'][:1])
        detail = (f"{ncl} off-palette clusters in {len(rows)} of {len(frames)} frames" + (f', {nf} pure black/white px' if nf else '')
                  + (f' · photo window warn {len(warn)} frames' if warn else '') + (f' · {len(errs)} render errors' if errs else '')
                  + (f' · e.g. {samp}' if samp else '') + f' [{"GL masked" if full else "nogl"}, ΔE>{a.de}, {time.time() - t:.1f}s]')
        r = res(nm, a.lang, not rows and not errs, detail, {'frames': rows, 'photo_warn': warn, 'errors': errs, 'png': pngs, 'allowed_points': len(P.P)})
        r['print'] = [f"  f{x['f']:03d}: " + ', '.join(f"{c['rgb']} dE{c['dE']} {c['px']}px bbox{c['bbox']}" for c in x['clusters'][:4])
                      + (f" · black/white {x['forbidden_px']}px" if x['forbidden_px'] else '') for x in (rows if a.v else rows[:30])] + [f'  png {p}' for p in pngs]
        out.append(r)
    save_json(a, 'palette', out); return out

# ── clear3d ──
async def check_clear3d(R, a):
    w = a.mask_width; h = round(w * H / W); s = W / w; cx = (np.arange(w) + .5) * s; cy = (np.arange(h) + .5) * s; out = []; t = time.time(); errs = []
    for nm, rect, (xlo, xhi, ylo, yhi), frs in KEEP:
        reg = ((cy > ylo) & (cy < yhi))[:, None] & ((cx > xlo) & (cx < xhi))[None]
        sel = frs[::a.every] + ([frs[-1]] if (len(frs) - 1) % a.every else [])
        bad, worst = [], None
        for f in sel:
            try: m = await glmask(R, f, w)
            except Exception as e: errs.append((f, e1(e))); continue
            cov = (m > a.alpha) & reg; n = int(cov.sum())
            if n > a.tol:
                yy, xx = np.nonzero(cov); row = {'f': f, 'area_px': round(n * s * s), 'max_alpha': int(m[reg].max()),
                                                 'bbox': [int(xx.min() * s), int(yy.min() * s), int((xx.max() + 1) * s), int((yy.max() + 1) * s)]}
                bad.append(row)
                if not worst or n > worst[0]: worst = (n, f, m)
        png = ''
        if worst:
            n, f, m = worst; img = await grab(R, f, w, 1); o = img.astype(np.float32) * .5; o[m > a.alpha] = o[m > a.alpha] * .4 + np.array([255, 0, 255]) * .6
            im = Image.fromarray(o.astype(np.uint8)); dr = ImageDraw.Draw(im)
            dr.rectangle([max(0, xlo) / s, max(0, ylo) / s, min(W, xhi) / s - 1, min(H, yhi) / s - 1], outline=(0, 255, 255), width=2)
            png = os.path.join(a.out, f'clear3d-{a.lang}-{nm}-f{f:03d}.png'); im.save(png)
        wb = max(bad, key=lambda b: b['area_px']) if bad else None
        detail = f'{nm} ({rect}, f {ranges(frs)}): ' + (f'3D in keep-out at {len(bad)} of {len(sel)} frames: f {ranges([b["f"] for b in bad], a.every)}; '
                                                        f'worst f{wb["f"]} {wb["area_px"]}px² α≤{wb["max_alpha"]}' if bad else f'clear ({len(sel)} frames)')
        r = res(f'clear3d-{nm}', a.lang, not bad, detail, {'frames': bad, 'png': png})
        r['print'] = [f"  f{b['f']:03d}: {b['area_px']}px² α≤{b['max_alpha']} bbox{b['bbox']}" for b in (bad if a.v else bad[:15])] + ([f'  png {png}'] if png else [])
        out.append(r)
    if errs: out.append(res('clear3d-render', a.lang, False, f'{len(errs)} render errors: ' + '; '.join(f'f{f} {e}' for f, e in errs[:5])))
    out[0]['detail'] += f' [{w}px masks, α>{a.alpha}, {time.time() - t:.1f}s total]'
    save_json(a, 'clear3d', out); return out

# ── 실행 ──
def show(r):
    print(f"{r['check']:<16}{r['lang']:<4}{STAT[r['ok']]:<6}{r['detail']}")
    for l in r.get('print', []): print(l)
    sys.stdout.flush()

def load_row(R, a):
    if R.scene_errors: return res('load', a.lang, False, f'{len(R.scene_errors)} scene errors: ' + ' | '.join(e.split('\n')[0] for e in R.scene_errors))
    return None

async def run(a):
    out = []
    async with async_playwright() as pw:
        b = await pw.chromium.launch(args=ARGS); R = None
        try:
            steps = ['seam', 'boxes', 'clear3d', 'palette', 'det'] if a.cmd == 'all' else [a.cmd]
            try:
                R = await open_reel(b, a); lr = load_row(R, a)
                if lr: out.append(lr); show(lr)
            except Exception as e:
                r = res('load', a.lang, False, e1(e)); out.append(r); show(r); steps = []
            for st in steps:
                a.every = a.every_arg or EVERY.get(st, 1)   # 검사마다 기본 간격
                try:
                    if st == 'seam': rs = await check_seam(R, a)
                    elif st == 'boxes': rs = await check_boxes(R, a)
                    elif st == 'clear3d': rs = await check_clear3d(R, a)
                    elif st == 'det': rs = await check_det(a, pw)          # 전용 브라우저 둘
                    else:
                        Rn = await open_reel(b, a, '&nogl=1')
                        try: rs = await check_palette(Rn, a, R if a.full else None)
                        finally: await Rn.pg.close()
                except Exception as e:   # 장면 오류(렌더 중 throw) 등 — 이 검사만 실패로 두고 계속
                    rs = [res(st, a.lang, False, 'error: ' + e1(e))]
                for r in rs: show(r)
                out += rs
            logs = [l for l in (R.logs if R else []) if 'favicon' not in l]
            if logs: print('page console:', *logs[:10], sep='\n  ')
        finally: await b.close()
    return out

def main():
    ap = argparse.ArgumentParser(description='쇼릴 검사(seam · det · boxes · palette · clear3d · all)')
    ap.add_argument('cmd', choices=['seam', 'det', 'boxes', 'palette', 'clear3d', 'all'])
    ap.add_argument('--lang', default='ko', help='ko · en · ko,en')
    ap.add_argument('--only', default='', help='장면 id(쉼표) — 그 장면만 불러옴')
    ap.add_argument('--out', default=os.path.join(ROOT, '_out', 'reel', 'check'))
    ap.add_argument('--width', type=int, default=960, help='seam 축소판 폭(1920 = 원래 크기)')
    ap.add_argument('--samples', default='auto', help="seam · det 표본: 'auto'(blur.js) 또는 숫자")
    ap.add_argument('--mp4', default='', help='seam: 디코딩 검사할 H.264 파일')
    ap.add_argument('--frames', default='0,450,899', help='det 프레임')
    ap.add_argument('--every', type=int, default=0, help='간격(boxes 5 · palette 10 · clear3d 1)')
    ap.add_argument('--zov-allow', default='tal.matte*,logo*', help='boxes: Z-OV 허용 id(*는 접두)')
    ap.add_argument('--de', type=float, default=6.0, help='palette: ΔE76 한도')
    ap.add_argument('--min-px', type=int, default=24, help='palette: 덩어리 최소 화소 수')
    ap.add_argument('--full', action='store_true', help='palette: 3D 알파를 가린 원래 프레임도 검사')
    ap.add_argument('--mask-width', type=int, default=960, help='clear3d: glMask 폭')
    ap.add_argument('--alpha', type=int, default=8, help='clear3d: 3D로 치는 알파(0–255) 초과')
    ap.add_argument('--tol', type=int, default=0, help='clear3d: 허용 화소 수(마스크 해상도)')
    ap.add_argument('-v', action='store_true', help='전체 목록 출력')
    a = ap.parse_args(); os.makedirs(a.out, exist_ok=True)
    langs = [x for x in a.lang.split(',') if x]; a.every_arg = a.every; allr = []; t = time.time()
    for lang in langs:
        a.lang = lang; allr += asyncio.run(run(a))
    if a.cmd == 'all' or len(langs) > 1:
        print('\n' + '─' * 100 + '\nSUMMARY')
        for r in allr: print(f"  {r['check']:<16}{r['lang']:<4}{STAT[r['ok']]:<6}{r['detail'][:150]}")
    bad = [r for r in allr if r['ok'] is False]
    print(f"\n{'FAIL' if bad else 'PASS'}: {len(bad)} failing of {len(allr)} checks ({time.time() - t:.0f}s) → {os.path.relpath(a.out, ROOT)}/")
    sys.exit(1 if bad else 0)

if __name__ == '__main__':
    main()
