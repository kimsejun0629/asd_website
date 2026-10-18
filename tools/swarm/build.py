# 메인 군집 드론 형상 — 점 구름 생성기 → web/data/swarm.txt (js/swarm.js가 읽음)
# 사용: python3 tools/swarm/build.py [--preview 폴더]
#  · 사람(AI) 흉상: assets/swarm/makehuman-base.obj(MakeHuman 기본 메시, CC0)의 어깨 위 표면을 넓이 비례로 뽑음(얼굴은 다듬어 표정 없앰)
#    없으면 https://raw.githubusercontent.com/makehumancommunity/makehuman/master/makehuman/data/3dobjs/base.obj 를 받아 둠
#  · 기체: 탑뷰 그림의 알파 → 평면형 + 동체 관 + 꼬리 기울기 · 수직꼬리날개. UH-60은 공개 제원으로 그린 평면형(로터는 따로)
#  · 형상마다 점 수가 다르고 순서는 섞어 둠(앞부분만 써도 고르게 — 폰 · 편대의 같은 기종 여러 대)
# 파일: 'SWM2' · uint16 S · uint16 점 수 × S, 이어서 형상마다 (int16 x,y,z · int8 nx,ny,nz · uint8 속성) × 점 수
#  좌표는 형상마다 [-1,1](가장 긴 변 = 2). 사람: x 오른쪽 · y 위 · z 앞. 기체: x 기수 · y 위 · z 오른쪽 날개
#  속성: 아래 4비트 밝기(0~15), 위 4비트 종류(0 크림 · 1 금색 · 2 도장 하늘색 · 3 회전 로터)
#  이 이진 내용을 base64(76자 줄)로 적음 — 게시 호스트가 .bin(application/octet-stream)을 서비스하지 않음
import sys, struct, hashlib, re, base64
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'web/data/swarm.txt'
REFS = ['web/index.html', 'web/index-en.html', 'web/js/swarm.js']   # 'data/swarm.txt?v=…'를 쓰는 곳
RNG = np.random.default_rng(1977)

# 기체 설정 — x는 꼬리(0) → 기수(1) 비율, z · h는 그림 세로(날개폭) 비율
#  body: 동체 반폭 상한 · tilt: 꼬리면 기울기 · lift: 높이 올림(T꼬리) · fins: 수직꼬리날개 다각형 [(x,h)…]
#  gold: 금색 부위(대한항공 제작) · edge: 윤곽선 점 비율
FIN_LM = [(.40, 0), (.61, 0), (.52, .13), (.45, .13)]   # 중형 자폭(mlm_top3): 동체 옆 수직날개 — 탑뷰의 어두운 두 줄
FIN_LMT = [(.025, 0), (.12, 0), (.075, .07), (.035, .07)]   # 날개 끝 수직날개 — 뒷전 뒤로 나온 판
SHAPES = [
    dict(id='ai', n=6144),
    dict(id='muav', n=1536, src='web/img/sp/fs_top2.webp', body=.028, edge=.32, tilt=[dict(x=(0, .17), z=.03, ang=38)]),
    dict(id='stealth', n=1536, src='web/img/sp/st_top2.webp', body=.035, edge=.32),
    dict(id='lowus', n=2048, src='web/img/lw_2.webp', body=.105, edge=.28, tilt=[dict(x=(0, .26), z=.10, ang=58)]),
    dict(id='lm', n=1920, src='web/img/sp/mlm_top3.webp', body=.05, edge=.3,
         fins=[dict(z=.075, poly=FIN_LM), dict(z=-.075, poly=FIN_LM), dict(z=.49, poly=FIN_LMT), dict(z=-.49, poly=FIN_LMT)]),
    dict(id='civil', n=6144, src='web/img/aero/top-787-k26.webp', rot=-90, body=.048, edge=.24,
         tilt=[dict(x=(.18, .62), z=.05, ang=6)], fins=[dict(z=0, poly=[(.015, .045), (.16, .045), (.075, .20), (.03, .20)])]),
    dict(id='uh60', n=3072),
    dict(id='g6500', n=3072, src='tools/render/top_g6500.webp', rot=-90, body=.047, edge=.28,
         lift=[dict(x=(0, .15), z=.05, dy=.13)], fins=[dict(z=0, poly=[(.02, .04), (.17, .04), (.09, .175), (.03, .175)])]),
]


def load_sprite(src, rot=0, size=560):
    im = Image.open(ROOT / src).convert('RGBA')
    if rot:
        im = im.rotate(rot, expand=True, resample=Image.BICUBIC)
    a = np.array(im)
    ys, xs = np.nonzero(a[:, :, 3] > 160)
    a = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    k = size / max(a.shape[:2])
    im = Image.fromarray(a).resize((max(1, round(a.shape[1] * k)), max(1, round(a.shape[0] * k))), Image.LANCZOS)
    return np.array(im).astype(np.float32) / 255   # H×W×4, 꼬리 왼쪽 · 기수 오른쪽


def uh60(k=28):
    # UH-60 탑뷰(m): 전장(로터 포함) 19.76 · 동체 15.26 · 동체 폭 2.36 · 주로터 지름 16.36(4엽, 시위 0.53) · 수평안정판 4.38 · 꼬리로터 3.35
    W, H = round(19.76 * k), round(16.36 * k)
    y0 = H / 2
    nose = 16.06                                  # 왼쪽 끝(꼬리로터 뒤끝)에서 기수까지
    X = lambda s: (nose - s) * k                  # s: 기수에서 뒤로 잰 거리
    half = [(0, 0), (.25, .45), (.6, .75), (1.3, 1.0), (2.4, 1.18), (7.0, 1.18), (8.0, .85), (9.0, .45), (13.6, .32), (14.6, .36), (15.26, .18)]
    body = Image.new('L', (W, H), 0)
    d = ImageDraw.Draw(body)
    top = [(X(s), y0 - w * k) for s, w in half]
    bot = [(X(s), y0 + w * k) for s, w in reversed(half)]
    d.polygon(top + bot, fill=255)
    d.ellipse([X(.35) - .5 * k, y0 - .6 * k, X(.35) + .5 * k, y0 + .6 * k], fill=255)   # 둥근 기수
    st = [(X(13.9), y0 - .3 * k), (X(13.6), y0 - 2.19 * k), (X(14.5), y0 - 2.19 * k), (X(14.8), y0 - .3 * k)]
    d.polygon(st, fill=255)
    d.polygon([(x, 2 * y0 - y) for x, y in st], fill=255)                               # 수평안정판(좌우)
    d.rectangle([X(15.95), y0 + .38 * k, X(14.0), y0 + .56 * k], fill=255)                # 꼬리로터(옆에서 본 원판 — 오른쪽)
    rot = Image.new('L', (W, H), 0)
    d = ImageDraw.Draw(rot)
    hub = np.array([X(4.5), y0])
    for a in np.radians([45, 135, 225, 315]):
        u, v = np.array([np.cos(a), np.sin(a)]), np.array([-np.sin(a), np.cos(a)])
        c = .265 * k
        p = [hub + v * c, hub + u * 8.18 * k + v * c, hub + u * 8.18 * k - v * c, hub - v * c]
        d.polygon([tuple(q) for q in p], fill=255)
    d.ellipse([hub[0] - .55 * k, y0 - .55 * k, hub[0] + .55 * k, y0 + .55 * k], fill=255)
    f = lambda m: np.dstack([np.full((H, W, 3), .8, np.float32), np.array(m, np.float32) / 255])
    return f(body), f(rot), y0, 1.65 * k          # 로터 높이: 동체 가운데 줄 위 1.65 m


def edt(mask):
    # 안쪽 화소에서 윤곽까지 거리(화소)
    pad = np.pad(mask, 1)
    edge = mask & ~(pad[:-2, 1:-1] & pad[2:, 1:-1] & pad[1:-1, :-2] & pad[1:-1, 2:])
    ey, ex = np.nonzero(edge)
    E = np.stack([ex, ey], 1).astype(np.float32)
    iy, ix = np.nonzero(mask)
    P = np.stack([ix, iy], 1).astype(np.float32)
    d = np.empty(len(P), np.float32)
    for i in range(0, len(P), 4096):
        q = P[i:i + 4096]
        d[i:i + 4096] = np.sqrt(((q[:, None, :] - E[None]) ** 2).sum(2).min(1))
    D = np.zeros(mask.shape, np.float32)
    D[iy, ix] = d + .5
    return D, E


def voxel_pick(P, w, n):
    # 후보 P(×3)에서 n개를 고르게 — 칸(정육면체)마다 하나(가중 무작위), 칸 크기는 이분 탐색
    key = RNG.random(len(P)) ** (1 / np.maximum(w, 1e-6))
    lo, hi = 1e-4, float(np.ptp(P, 0).max())
    best = None
    for _ in range(24):
        c = (lo + hi) / 2
        _, inv = np.unique(np.floor(P / c).astype(np.int64), axis=0, return_inverse=True)
        inv = inv.ravel()
        if inv.max() + 1 >= n:
            lo, best = c, inv
        else:
            hi = c
    order = np.lexsort((-key, best))
    first = np.r_[True, best[order][1:] != best[order][:-1]]
    sel = order[first]
    if len(sel) > n:
        sel = sel[RNG.permutation(len(sel))[:n]]
    elif len(sel) < n:
        rest = np.setdiff1d(np.arange(len(P)), sel)
        sel = np.concatenate([sel, RNG.choice(rest, n - len(sel), replace=False)])
    return sel


def inside(pts, poly):
    x, y = pts[:, 0], pts[:, 1]
    res = np.zeros(len(pts), bool)
    j = len(poly) - 1
    for i in range(len(poly)):
        xi, yi = poly[i]
        xj, yj = poly[j]
        res ^= ((yi > y) != (yj > y)) & (x < (xj - xi) * (y - yi) / (yj - yi + 1e-12) + xi)
        j = i
    return res


def edge_walk(E):
    # 윤곽 화소를 가까운 이웃 따라 잇는 순서
    n = len(E)
    left = np.ones(n, bool)
    order = [0]
    left[0] = False
    cur = 0
    for _ in range(n - 1):
        d = ((E - E[cur]) ** 2).sum(1)
        d[~left] = 1e18
        cur = int(d.argmin())
        left[cur] = False
        order.append(cur)
    return np.array(order)


def plan(a, cfg, n, y0=None, flat=None, cls=None):
    # 평면형 → (P 화소 단위: x 꼬리→기수, Y 위, z 그림 아래 +) · 법선 · 밝기 · 종류. flat: 모든 점을 그 높이 한 장으로(로터)
    H, W = a.shape[:2]
    mask = a[:, :, 3] > .5
    D, E = edt(mask)
    span = H
    if y0 is None:
        ys = np.nonzero(mask.any(1))[0]
        y0 = (ys.min() + ys.max()) / 2
    yc = int(round(y0))
    run = np.zeros(W, np.float32)
    for x in range(W):
        col = mask[:, x]
        if not col[yc]:
            continue
        up = yc
        while up > 0 and col[up - 1]:
            up -= 1
        dn = yc
        while dn < H - 1 and col[dn + 1]:
            dn += 1
        run[x] = min(yc - up, dn - yc) + .5
    rmax = cfg.get('body', 0) * span
    r = np.convolve(np.minimum(run, rmax), np.ones(5) / 5, mode='same') if rmax else np.zeros(W)
    iy, ix = np.nonzero(mask)
    jit = RNG.random((len(ix), 2)) - .5
    px, zz = ix + .5 + jit[:, 0], iy + .5 + jit[:, 1] - y0
    inbody = np.abs(zz) < r[ix] * .92
    Y = np.minimum(D[iy, ix], span * .022) * .45 if flat is None else np.full(len(ix), flat)

    def raise_(x, z, Y, sel_extra=True):
        for t in cfg.get('tilt', []):
            s = (x >= t['x'][0] * W) & (x <= t['x'][1] * W) & sel_extra
            Y = np.where(s, Y + np.maximum(np.abs(z) - t['z'] * span, 0) * np.tan(np.radians(t['ang'])), Y)
        for t in cfg.get('lift', []):
            s = (x >= t['x'][0] * W) & (x <= t['x'][1] * W) & (np.abs(z) > t['z'] * span) & sel_extra
            Y = np.where(s, Y + t['dy'] * span, Y)
        return Y
    Y = raise_(ix, zz, Y, ~inbody)
    lum = a[iy, ix, 0] * .3 + a[iy, ix, 1] * .59 + a[iy, ix, 2] * .11
    wing = ~inbody
    PW = np.stack([px[wing], Y[wing], zz[wing]], 1)
    NW = np.tile([0, 1, 0], (wing.sum(), 1)).astype(np.float32)
    TW = .62 + .25 * np.clip(lum[wing], 0, 1)
    PB, NB, TB = [], [], []
    for x in range(W):
        rx = r[x]
        if rx < .8:
            continue
        m = max(3, int(np.pi * rx * 1.15))
        th = (np.arange(m) + RNG.random(m)) / m * np.pi * 1.7 - np.pi * .85
        for c in th:
            PB.append((x + RNG.random(), np.cos(c) * rx * .92, np.sin(c) * rx))
            NB.append((0, np.cos(c), np.sin(c)))
            TB.append(.78 + .22 * max(np.cos(c), 0))
    PB, NB, TB = (np.array(v, np.float32).reshape(-1, k) if len(v) else np.zeros((0, k), np.float32) for v, k in ((PB, 3), (NB, 3), (TB, 1)))
    TB = TB.ravel()
    PF, NF = [np.zeros((0, 3))], [np.zeros((0, 3))]
    for f in cfg.get('fins', []):
        poly = np.array(f['poly']) * [W, span]
        g = np.mgrid[poly[:, 0].min():poly[:, 0].max():.6, 0:poly[:, 1].max():.6].reshape(2, -1).T
        g = g + (RNG.random(g.shape) - .5) * .6
        g = g[inside(g, poly)]
        xs = np.clip(g[:, 0].astype(int), 0, W - 1)
        base = r[xs] * .9 if f['z'] == 0 else span * .008
        PF.append(np.stack([g[:, 0], base + g[:, 1], np.full(len(g), f['z'] * span)], 1))
        NF.append(np.tile([0, 0, 1], (len(g), 1)))
    PF, NF = np.concatenate(PF), np.concatenate(NF)
    P = np.concatenate([PW, PB, PF]).astype(np.float32)
    Nn = np.concatenate([NW, NB, NF]).astype(np.float32)
    T = np.concatenate([TW, TB, np.full(len(PF), .8)]).astype(np.float32)
    col = np.zeros(len(P), np.uint8)
    if cfg.get('livery'):
        xi = np.clip(P[:, 0].astype(int), 0, W - 1)
        zi = np.clip((P[:, 2] + y0).astype(int), 0, H - 1)
        rgb = a[zi, xi, :3]
        col[(rgb[:, 2] > rgb[:, 0] + .12) & (np.abs(P[:, 2]) < r[xi] * 1.05 + 1)] = 2
    g = cfg.get('gold')
    if g:
        tip = np.abs(P[:, 2]) > g['tip'] * span / 2
        aft = (P[:, 0] > g['aft'][0] * W) & (P[:, 0] < g['aft'][1] * W) & (np.abs(P[:, 2]) < rmax * 1.1)
        col[tip | aft] = 1
    # 윤곽선 점
    ne = int(n * cfg.get('edge', .26))
    eb = np.abs(E[:, 1] - y0) < r[E[:, 0].astype(int)] * .92
    Ee = E[~eb]
    Ee = Ee[edge_walk(Ee)]
    st = np.hypot(*np.diff(Ee, axis=0).T)
    st[st > 2.5] = 0                              # 다른 고리로 건너뛰는 구간에는 점을 두지 않음
    seg = np.r_[0, np.cumsum(st)]
    tt = np.sort(RNG.random(ne)) * seg[-1]
    ex = np.interp(tt, seg, Ee[:, 0]) + .5
    ez = np.interp(tt, seg, Ee[:, 1]) + .5 - y0
    EY = np.full(ne, span * .004) if flat is None else np.full(ne, flat)
    EY = raise_(ex, ez, EY)
    PE = np.stack([ex, EY, ez], 1).astype(np.float32)
    ce = np.zeros(ne, np.uint8)
    if g:
        ce[np.abs(ez) > g['tip'] * span / 2] = 1
    w = np.ones(len(P))
    w[len(PW):len(PW) + len(PB)] *= 1.6
    sel = voxel_pick(P, w, n - ne)
    P = np.concatenate([P[sel], PE])
    Nn = np.concatenate([Nn[sel], np.tile([0, 1, 0], (ne, 1))]).astype(np.float32)
    T = np.concatenate([T[sel], np.ones(ne, np.float32)])
    col = np.concatenate([col[sel], ce])
    if cls is not None:
        col[:] = cls
    P[:, 2] *= -1                                 # 그림 아래쪽 = 오른쪽 날개 → 모델 z는 반대
    Nn[:, 2] *= -1
    return P, Nn, T, col


def build_plan(cfg):
    if cfg['id'] == 'uh60':
        body, rot, y0, ry = uh60()
        nr = int(cfg['n'] * .42)
        A = plan(body, dict(body=.072, edge=.3, fins=[dict(z=0, poly=[(.02, .02), (.11, .02), (.07, .17), (.035, .17)])]), cfg['n'] - nr, y0=y0)
        B = plan(rot, dict(edge=.5), nr, y0=y0, flat=ry, cls=3)
        return finish(*(np.concatenate([a, b]) for a, b in zip(A, B)))
    return finish(*plan(load_sprite(cfg['src'], cfg.get('rot', 0)), cfg, cfg['n']))


def build_bust(n):
    src = ROOT / 'assets/swarm/makehuman-base.obj'
    if not src.exists():
        sys.exit(f'없음: {src} — 머리 주석의 주소에서 받아 둔다')
    V, F, g = [], [], None
    for ln in open(src):
        if ln.startswith('v '):
            V.append([float(x) for x in ln.split()[1:4]])
        elif ln.startswith('g '):
            g = ln.split()[1]
        elif ln.startswith('f ') and g in ('body', 'helper-l-eye', 'helper-r-eye'):
            idx = [int(t.split('/')[0]) - 1 for t in ln.split()[1:]]
            for k in range(1, len(idx) - 1):
                F.append((idx[0], idx[k], idx[k + 1], g != 'body'))
    V, F = np.array(V), np.array(F)
    # 표정 없애기: 얼굴 앞쪽 정점을 Taubin 방식으로 다듬어 입술 · 눈꺼풀 · 눈두덩 굴곡을 펴고(머리 모양은 유지) 눈알은 뺌
    F = F[F[:, 3] == 0]
    nb = [[] for _ in range(len(V))]
    for t in F[:, :3]:
        for i in range(3):
            nb[t[i]] += [t[(i + 1) % 3], t[(i + 2) % 3]]
    nb = [np.unique(x) for x in nb]
    w = np.clip((V[:, 1] - 5.9) / .5, 0, 1) * np.clip((V[:, 2] - .1) / .5, 0, 1)
    idx = np.nonzero(w > 0)[0]
    for _ in range(30):
        for lam in (.55, -.58):
            avg = np.array([V[nb[i]].mean(0) if len(nb[i]) else V[i] for i in idx])
            V[idx] += (avg - V[idx]) * lam * w[idx, None]
    a, b, c = V[F[:, 0]], V[F[:, 1]], V[F[:, 2]]
    cen = (a + b + c) / 3
    cr = np.cross(b - a, c - a)
    nrm = cr / (np.linalg.norm(cr, axis=1, keepdims=True) + 1e-12)
    keep = (cen[:, 1] > 3.6) & (np.abs(cen[:, 0]) < 2.9)          # 어깨 위(가슴 윗부분까지)
    keep &= ~((cen[:, 1] > 6) & (cen[:, 2] > .4) & (nrm[:, 2] < -.2))   # 입 안 · 콧구멍 같은 안쪽 면(점이 비쳐 얼굴에 고리가 생김)
    F, a, b, c, cen, cr, nrm = F[keep], a[keep], b[keep], c[keep], cen[keep], cr[keep], nrm[keep]
    ar = np.linalg.norm(cr, axis=1) / 2
    # 밀도: 얼굴 쪽 진하게, 잘린 아래 끝은 옅어지며 흩어짐
    dens = np.interp(cen[:, 1], [3.6, 4.5, 5.2, 8.5], [.15, .8, 1, 1])
    dens = np.where((cen[:, 1] > 6) & (nrm[:, 2] < -.3), dens * .5, dens)   # 뒤통수는 옅게(얼굴이 덜 가려지게)
    dens = np.where((cen[:, 1] > 5.5) & (cen[:, 1] < 7.2) & (nrm[:, 1] < -.35), dens * .3, dens)   # 턱 아랫면(정면에서 입 둘레 고리처럼 비침)
    ti = RNG.choice(len(F), n, p=(ar * dens) / (ar * dens).sum())
    u, v = RNG.random(n), RNG.random(n)
    s = u + v > 1
    u[s], v[s] = 1 - u[s], 1 - v[s]
    P = a[ti] + (b[ti] - a[ti]) * u[:, None] + (c[ti] - a[ti]) * v[:, None]
    Nn = nrm[ti]
    k = RNG.random(n) < .05                       # 먼지: 5%는 표면에서 조금 떠 있음
    P[k] += Nn[k] * RNG.random((k.sum(), 1)) * .35
    low = P[:, 1] < 4.3                            # 잘린 끝 아래로 조금 흘러내림
    P[low, 1] -= RNG.random(low.sum()) ** 2 * .6
    T = np.where(k, .55, .92).astype(np.float32)
    return finish(P.astype(np.float32), Nn.astype(np.float32), T, np.zeros(n, np.uint8))


def finish(P, Nn, T, col):
    c = (P.max(0) + P.min(0)) / 2
    P = (P - c) / (np.ptp(P, 0).max() / 2)
    perm = RNG.permutation(len(P))
    return P[perm], Nn[perm], T[perm], col[perm]


def pack(shapes):
    out = bytearray(b'SWM2' + struct.pack('<H', len(shapes)) + b''.join(struct.pack('<H', len(s[0])) for s in shapes))
    for P, Nn, T, col in shapes:
        rec = np.zeros(len(P), dtype=[('p', '<i2', 3), ('n', 'i1', 3), ('a', 'u1')])
        rec['p'] = np.clip(np.round(P * 32767), -32767, 32767)
        rec['n'] = np.clip(np.round(Nn / (np.linalg.norm(Nn, axis=1, keepdims=True) + 1e-9) * 127), -127, 127)
        rec['a'] = np.clip(np.round(T * 15), 0, 15).astype(np.uint8) | (col.astype(np.uint8) << 4)
        out += rec.tobytes()
    return bytes(out)


def rot3(ax, ay):
    cx, sx, cy, sy = np.cos(ax), np.sin(ax), np.cos(ay), np.sin(ay)
    return np.array([[1, 0, 0], [0, cx, -sx], [0, sx, cx]]) @ np.array([[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]])


def preview(shapes, folder):
    folder = Path(folder)
    folder.mkdir(parents=True, exist_ok=True)
    S = 420
    sheet = Image.new('RGB', (S * 4, S * 2))
    cc = np.array([[192, 183, 171], [194, 166, 115], [83, 170, 226], [181, 162, 127]], np.float32)
    for i, (P, Nn, T, col) in enumerate(shapes):
        R = rot3(0, -.35) if i == 0 else rot3(.95, .4)
        Q = (P[:, :, None] * R.T[None]).sum(1)
        f = 3.2 / (3.2 - Q[:, 2])
        x = (Q[:, 0] * f * S * .42 + S / 2).astype(int)
        y = (S / 2 - Q[:, 1] * f * S * .42).astype(int)
        im = np.zeros((S, S, 3), np.float32)
        ok = (x >= 0) & (x < S - 1) & (y >= 0) & (y < S - 1)
        for dx, dy in ((0, 0), (1, 0), (0, 1)):
            np.add.at(im, (y[ok] + dy, x[ok] + dx), cc[col[ok]] * T[ok, None] * .5)
        sheet.paste(Image.fromarray(np.clip(im + [37, 40, 42], 0, 255).astype(np.uint8)), ((i % 4) * S, (i // 4) * S))
    sheet.save(folder / 'swarm-shapes.png')
    print('미리보기', folder / 'swarm-shapes.png')


def main():
    args = sys.argv[1:]
    shapes = []
    for cfg in SHAPES:
        shapes.append(build_bust(cfg['n']) if cfg['id'] == 'ai' else build_plan(cfg))
        print(cfg['id'], cfg['n'])
    data = pack(shapes)
    txt = base64.encodebytes(data)
    OUT.write_bytes(txt)
    print('→', OUT.relative_to(ROOT), len(data), 'B → base64', len(txt), 'B')
    # 캐시: 주소의 ?v=를 내용 해시로 — 바뀌면 새 주소라 브라우저가 옛 파일을 쓰지 않음
    v = hashlib.sha1(txt).hexdigest()[:8]
    for f in REFS:
        p = ROOT / f
        s = p.read_text(encoding='utf-8')
        t = re.sub(r'''(["'])data/swarm\.(?:bin|txt)(?:\?v=\w+)?(["'])''', rf'\1data/swarm.txt?v={v}\2', s)
        if t != s:
            p.write_text(t, encoding='utf-8')
            print('  ?v=' + v, f)
    if '--preview' in args:
        preview(shapes, args[args.index('--preview') + 1])


if __name__ == '__main__':
    main()
