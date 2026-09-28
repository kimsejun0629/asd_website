#!/usr/bin/env python3
"""대한항공 1차 2D 패턴 → 이음매 없는 SVG.

브랜드 가이드(KoreanAir_BrandGuidelines_MAR2025.pdf) 안의 원본 타일 패턴
(PatternType 1, XStep 269.179 × YStep 174.42, 세로 쐐기 도형들)을 꺼내,
- 넓이 0 영역에 잘려 안 보이는 복사본 · 유령 도형을 버리고
- 경계를 넘는 쐐기는 위아래 두 조각 대신 온전한 도형 하나로 모아(중복 제거)
- 그 한 주기 도형을 <use> 격자로 이어 그린다(잘라 붙이는 곳이 없음 → 이음매 없음).

SVG에는 width · height · viewBox가 없다. CSS 마스크로 쓰면 요소 크기 그대로
그려지고(1 단위 = 1 CSS px), 패턴 배율 · 위상은 파일 안에 고정된다.
연혁 카드(.hx-ph.none)는 매 프레임 크기 · 흐림이 바뀌어 Firefox가 벡터를 매번 다시 그리므로,
같은 도형을 반복 없는 래스터 한 장(카드 최대 560×420보다 큰 600×450, 3배 해상도)으로 굽는다.

  python3 tools/pattern/build.py            # web/img/pattern2d.svg(1080px 배율), pattern2d-hx.webp(560px 배율)
  python3 tools/pattern/build.py --check    # 원본 타일(쐐기마다 · 클립)과 재구성(두 경로 · 클립 없음) 픽셀 비교
"""
import math, re, subprocess, sys, tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PDF = ROOT / 'KoreanAir_BrandGuidelines_MAR2025.pdf'
OUT = ROOT / 'web/img'

# 옛 pattern.webp(1440×973, 이음매 없는 타일이 아니었음)와 같은 배율 · 위상. webp 윗부분과
# 상관이 가장 큰 값(2026-09-25 측정): 1단위 1.5869px, webp 왼쪽 위 = 패턴 좌표 (13.23, 123.19).
# site.css는 그 webp를 1080px, history.css는 560px 폭으로 깔았다.
WEBP_S, WEBP_OX, WEBP_OY = 1.5869, 13.23, 123.19
VARIANTS = {
    # 이름: (배율 px/단위, 덮는 폭 px, 덮는 높이 px[, 래스터 배수])
    # 가로: 8K(7680px) 화면 · 축소 보기까지(요소 폭 = 창 폭), 세로: 가장 긴 ::before(폰 바닥글 약 740px)에 여유
    'pattern2d.svg': (WEBP_S * 1080 / 1440, 8192, 1100),
    'pattern2d-hx.webp': (WEBP_S * 560 / 1440, 600, 450, 3),
}


def tile_stream():
    b = PDF.read_bytes()
    i = re.search(rb'/XStep', b).start()
    d = b[b.rfind(b'<<', 0, i - 300):b.find(b'stream', i)]
    xs = float(re.search(rb'/XStep ([\d.]+)', d).group(1))
    ys = float(re.search(rb'/YStep ([\d.]+)', d).group(1))
    n = int(re.search(rb'/Length (\d+)', d).group(1))
    e = b.find(b'stream', i) + 6
    while b[e:e + 1] in b'\r\n':
        e += 1
    return xs, ys, b[e:e + n].decode('latin1')


def parse(src):
    """q/Q/cm(이동만)/m/l/c/h/f/W n → [(그룹, [(op, [좌표…])…])]. 그룹 = 클립 순번."""
    toks = re.findall(r'/[A-Za-z0-9]+|[-+]?\d*\.\d+|[-+]?\d+|[A-Za-z*]+', src)
    st, ctm, stk, grp, path, shapes = [], (0.0, 0.0), [], -1, [], []
    for t in toks:
        if re.fullmatch(r'[-+]?(\d*\.\d+|\d+)', t):
            st.append(float(t)); continue
        if t == 'q': stk.append(ctm)
        elif t == 'Q': ctm = stk.pop()
        elif t == 'cm':
            assert st[-6:-2] == [1, 0, 0, 1], st  # 이동 외 변환 없음
            ctm = (ctm[0] + st[-2], ctm[1] + st[-1])
        elif t in ('m', 'l', 'c'):
            path.append((t, [v + ctm[k % 2] for k, v in enumerate(st)]))
        elif t == 'h': path.append(('h', []))
        elif t == 'f': shapes.append((grp, path)); path = []
        elif t == 'n': grp += 1; path = []  # W n: 클립 경로(그룹 경계)
        elif t in ('W', 'rg', 'gs'): pass
        elif not t.startswith('/'): raise ValueError('처리 안 한 연산자 ' + t)
        st = []
    return shapes


def pts(p):
    return [(a[k], a[k + 1]) for _, a in p for k in range(0, len(a), 2)]


def bbox(p):
    q = pts(p); xs = [x for x, _ in q]; ys = [y for _, y in q]
    return min(xs), min(ys), max(xs), max(ys)


def unique(W, H, shapes):
    """클립 [0,W]×[0,H] 안에 실제로 보이는 쐐기만, 주기 기준 한 번씩."""
    g0 = [p for g, p in shapes if g == 0]  # 그룹 1은 넓이 0 삼각형에 잘려 안 보임
    vis = []
    for p in g0:
        x0, y0, x1, y1 = bbox(p)
        vw = min(x1, W) - max(x0, 0); vh = min(y1, H) - max(y0, 0)
        if vw > .05 and vh > .05:
            vis.append((p, vw * vh))
    # 기준점(첫 점)을 주기로 접어 같은 쐐기끼리 묶음 → 가장 많이 보이는 것 하나
    groups = {}
    for p, a in vis:
        x, y = p[0][1][0], p[0][1][1]
        k = (round((x % W) / .05) % round(W / .05), round((y % H) / .05) % round(H / .05))
        hit = next((g for g in groups if abs(g[0] - k[0]) <= 1 and abs(g[1] - k[1]) <= 1), None)
        groups.setdefault(hit or k, []).append((a, p))
    return len(g0), len(vis), [max(v, key=lambda t: t[0])[1] for v in groups.values()], groups


def periods(U, groups):
    """그림의 실제 주기. 가로 = 선 57개 × 선 간격(각 쐐기의 오른쪽 변이 선 위치),
    세로 = 경계에서 위아래로 복사된 쐐기 쌍의 간격. PDF XStep · YStep은 이보다 조금 커서
    원본을 그대로 깔면 경계마다 실오라기만 한 틈이 생긴다."""
    xr = sorted(bbox(p)[2] for p in U)
    k = [round((x - xr[0]) / 4.7224) for x in xr]
    n = len(k); mk = sum(k) / n; mx = sum(xr) / n
    pitch = sum((a - mk) * (b - mx) for a, b in zip(k, xr)) / sum((a - mk) ** 2 for a in k)
    lines = max(k) + 1
    dy = [abs(v[0][1][0][1][1] - v[1][1][0][1][1]) for v in groups.values() if len(v) > 1]
    return pitch, lines, pitch * lines, sum(dy) / len(dy), max(dy) - min(dy)


def layers(W, U, pitch=4.7224):
    """위아래로 이웃한 쐐기는 겹친다(원본은 쐐기마다 따로 칠함). 줄마다 위에서부터 번갈아
    두 경로로 나눠, 타일 안이든 타일 사이든 겹치는 쌍은 늘 다른 경로 → 어디서나 같은 합성."""
    cols = {}
    for p in U:
        cols.setdefault(round((p[0][1][0] % W) / pitch) % round(W / pitch), []).append(p)
    out = ([], [])
    for c in cols.values():
        assert len(c) % 2 == 0, '줄마다 쐐기 수가 짝수여야 주기 경계에서도 번갈아짐'
        for k, p in enumerate(sorted(c, key=lambda p: bbox(p)[1])):
            out[k % 2].append(p)
    return out


def num(v, nd=3):
    s = f'{v:.{nd}f}'.rstrip('0').rstrip('.')
    s = s.replace('-0.', '-.') if s.startswith('-0.') else (s[1:] if s.startswith('0.') else s)
    return '0' if s in ('', '-0', '-') else s


def path_d(ps, dx=0.0, dy=0.0):
    """쐐기들을 한 경로로(상대 좌표)."""
    out = []
    for p in ps:
        cx = cy = None
        for op, a in p:
            if op == 'm':
                x, y = a[0] + dx, a[1] + dy
                out.append(f'M{num(x)} {num(y)}'); cx, cy, sx, sy = x, y, x, y
            elif op == 'l':
                x, y = a[0] + dx, a[1] + dy
                if abs(x - cx) < 5e-4: out.append('v' + num(y - cy))
                elif abs(y - cy) < 5e-4: out.append('h' + num(x - cx))
                else: out.append('l' + num(x - cx) + ' ' + num(y - cy))
                cx, cy = x, y
            elif op == 'c':
                q = [a[k] + (dx if k % 2 == 0 else dy) for k in range(6)]
                r = [q[k] - (cx if k % 2 == 0 else cy) for k in range(6)]
                out.append('c' + ' '.join(num(v) for v in r).replace(' -', '-'))
                cx, cy = q[4], q[5]
            elif op == 'h':
                out.append('z'); cx, cy = sx, sy
        if out[-1] != 'z':
            out.append('z')  # f는 열린 경로도 닫아 채움
    return ''.join(out).replace(' -', '-')


def svg(W, H, U, s, cw, ch, ox=0.0, oy=0.0, size=False):
    """배율 s, (0,0) = 패턴 좌표 (ox,oy). 덮는 범위 cw×ch px — 쐐기가 이 범위에 닿는 칸만 놓음.
    size=True면 width · height를 적음(래스터로 구울 때)."""
    bb = [bbox(p) for p in U]
    x0, y0 = min(b[0] for b in bb), min(b[1] for b in bb)
    x1, y1 = max(b[2] for b in bb), max(b[3] for b in bb)
    ci = range(math.floor((ox - x1) / W), math.ceil((ox + cw / s - x0) / W) + 1)
    cj = range(math.floor((oy - y1) / H), math.ceil((oy + ch / s - y0) / H) + 1)
    row = ''.join(f'<use href="#w" x="{num(i * W, 4)}"/>' for i in ci)
    col = ''.join(f'<use href="#r" y="{num(j * H, 4)}"/>' for j in cj)
    tile = ''.join(f'<path d="{path_d(L)}"/>' for L in layers(W, U))
    wh = f' width="{cw}" height="{ch}"' if size else ''
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg"{wh}>'
        f'<!-- 대한항공 1차 2D 패턴(브랜드 가이드 2.5) · tools/pattern/build.py · 주기 {W:.4f}×{H:.4f} 단위, '
        f'1단위 {s:.5f}px, 이음매 없이 {len(ci)}×{len(cj)}칸({cw}×{ch}px) -->'
        f'<defs><g id="w">{tile}</g><g id="r">{row}</g></defs>'
        f'<g transform="matrix({s:.6f} 0 0 {s:.6f} {num(-ox * s)} {num(-oy * s)})">{col}</g></svg>\n')


def render(svg_text, w, h, png):
    with tempfile.NamedTemporaryFile('w', suffix='.svg', delete=False) as f:
        f.write(svg_text)
    subprocess.run(['resvg', '-w', str(w), '-h', str(h), f.name, str(png)], check=True, capture_output=True)


def check(W, H, shapes, U, s=8.0):
    """원본(그룹 0 ∩ 클립, 3×3 반복)과 재구성(U 온전한 쐐기 3×3)을 가운데 타일에서 비교."""
    import numpy as np
    from PIL import Image
    def tiles(ps, clip):
        g = []
        for i in (-1, 0, 1):
            for j in (-1, 0, 1):
                body = (''.join(f'<path d="{path_d([p], i * W, j * H)}"/>' for p in ps) if clip
                        else ''.join(f'<path d="{path_d(L, i * W, j * H)}"/>' for L in layers(W, ps)))
                g.append(f'<g clip-path="url(#c{i}{j})">{body}</g>' if clip else body)
                if clip:
                    g.insert(0, f'<clipPath id="c{i}{j}"><rect x="{i * W}" y="{j * H}" width="{W}" height="{H}"/></clipPath>')
        return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{-W} {-H} {3 * W} {3 * H}">'
                f'<rect x="{-W}" y="{-H}" width="{3 * W}" height="{3 * H}" fill="#fff"/>{"".join(g)}</svg>')
    orig = [p for g, p in shapes if g == 0]
    w, h = round(3 * W * s), round(3 * H * s)
    d = Path(tempfile.mkdtemp())
    render(tiles(orig, True), w, h, d / 'a.png'); render(tiles(U, False), w, h, d / 'b.png')
    A = np.asarray(Image.open(d / 'a.png').convert('L'), float)
    B = np.asarray(Image.open(d / 'b.png').convert('L'), float)
    # 경계 1px 띠(원본 클립 안티앨리어싱)는 따로 보고
    m = int(W * s), int(H * s)
    c = (slice(m[1] + 2, 2 * m[1] - 2), slice(m[0] + 2, 2 * m[0] - 2))
    diff = np.abs(A - B)[c]
    print(f'가운데 타일 {diff.shape[1]}×{diff.shape[0]}px: 최대 차 {diff.max():.0f}/255, '
          f'8 넘는 픽셀 {(diff > 8).sum()}, 평균 {diff.mean():.4f}')
    return d


def main():
    XS, YS, src = tile_stream()
    shapes = parse(src)
    n0, nv, U, groups = unique(XS, YS, shapes)
    multi = sum(1 for v in groups.values() if len(v) > 1)
    pitch, lines, W, H, spread = periods(U, groups)
    print(f'PDF 타일 {XS}×{YS}: 그룹0 {n0}개 중 보이는 것 {nv}개 → 쐐기 {len(U)}개(경계에서 둘로 잘렸던 것 {multi}개)')
    print(f'실제 주기 {W:.4f}×{H:.4f}(선 {lines}개 × 간격 {pitch:.5f}, 세로 쌍 간격 편차 {spread:.4f})')
    if '--check' in sys.argv:
        check(W, H, shapes, U)
        return
    for name, (s, cw, ch, *k) in VARIANTS.items():
        if name.endswith('.svg'):
            t = format_svg(svg(W, H, U, s, cw, ch, WEBP_OX, WEBP_OY))
            (OUT / name).write_text(t); kb = len(t) / 1024
        else:  # 래스터: 같은 도형 · 위상을 k배로 그려 알파만 무손실 webp로
            from PIL import Image
            k = k[0]; png = Path(tempfile.mkdtemp()) / 'r.png'
            render(svg(W, H, U, s * k, cw * k, ch * k, WEBP_OX, WEBP_OY, size=True), cw * k, ch * k, png)
            a = Image.open(png).getchannel('A'); im = Image.new('RGBA', a.size, (0, 0, 0, 0)); im.putalpha(a)
            im.save(OUT / name, 'WEBP', lossless=True, quality=100, method=6); kb = (OUT / name).stat().st_size / 1024
        print(f'{name}: 1단위 {s:.4f}px(타일 {W * s:.1f}×{H * s:.1f}px), {cw}×{ch}px, {kb:.1f}KB')


def format_svg(text):
    """요소 · 닫힌 부분 경로 사이만 줄바꿈. 좌표 토큰은 바꾸지 않는다."""
    return text.replace('><', '>\n<').replace('zM', 'z\nM')


if __name__ == '__main__':
    main()
