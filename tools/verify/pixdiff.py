#!/usr/bin/env python3
"""화면 픽셀 비교: 두 주소(A · B)의 같은 페이지를 나란히 열어 같은 스크롤 위치마다 화면을 찍고 픽셀을 비교한다.

  python3 pixdiff.py BASE_A BASE_B OUTDIR [--vp pc|phone|WxH[@dpr][,m]] [--pages ...] [--tabs] [--workers 6]
                     [--max-shots 25] [--step 1.0] [--overlay-a DIR] [--overlay-b DIR] [--tol 0] [--keep-all]

- 영상 · WebGL 캔버스와 noise.json의 pix_hide 선택자(시간에 따라 흐르는 스트립 · 3D 설명선 · 무인기 장면)는
  visibility:hidden + opacity:0으로 가린다. WebGL 그리기 호출은 기본으로 건너뛴다(--gl-draw로 되살림).
- 위치: 0, 1×화면, 2×화면 … 끝(최대 --max-shots장, 넘으면 고르게 나눔). 위치마다 안정될 때까지 기다린 뒤
  유한 애니메이션은 끝으로 · 무한 반복은 0초로 멈추고(Web Animations API) 찍는다.
- 채널 차가 허용치(noise.json pix_tol, pix_zones 영역 안은 그 값)를 넘는 픽셀만 센다.
- 다른 픽셀이 있는 장면만 OUTDIR/<page>/NN_yY_{a,b,diff}.png로 남긴다(--keep-all이면 모두).
- 오류 · 로컬 서버 연결 끊김(재시도 뒤에도) · B에만 있는 실패 요청은 errors로 센다.
"""
import argparse, asyncio, io, json, shutil, sys, time
from datetime import datetime
from pathlib import Path
import numpy as np
from PIL import Image
from playwright.async_api import async_playwright
import common as C


ZONES_JS = r"""
(sels)=>{const out=[],vw=innerWidth,vh=innerHeight;
  sels.forEach(([sel,tol])=>document.querySelectorAll(sel).forEach(e=>{const r=e.getBoundingClientRect();
    if(r.width&&r.height&&r.right>0&&r.bottom>0&&r.left<vw&&r.top<vh)out.push([r.left,r.top,r.right,r.bottom,tol])}));
  return out}
"""


def diff_img(a, b, tol, zones=(), dpr=1):
    """zones: [x0,y0,x1,y1,tol](CSS px) — 그 안은 허용치를 높임"""
    d = np.abs(a.astype(np.int16) - b.astype(np.int16)).max(axis=2)
    if zones:
        t = np.full(d.shape, tol, np.int16)
        H, W = d.shape
        for x0, y0, x1, y1, zt in zones:
            ya, yb = max(0, int(y0 * dpr) - 2), min(H, int(np.ceil(y1 * dpr)) + 2)
            xa, xb = max(0, int(x0 * dpr) - 2), min(W, int(np.ceil(x1 * dpr)) + 2)
            if ya < yb and xa < xb:
                t[ya:yb, xa:xb] = np.maximum(t[ya:yb, xa:xb], zt)
        m = d > t
    else:
        m = d > tol
    return m, int(m.sum()), int(d[m].max()) if m.any() else 0


def save_diff(path, a, m):
    f = a.astype(np.float32)
    g = (f[..., 0] * .299 + f[..., 1] * .587 + f[..., 2] * .114) * .35 + 30
    out = np.stack([g, g, g], axis=2).astype(np.uint8)
    out[m] = (255, 0, 64)
    Image.fromarray(out).save(path)


async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('a')
    ap.add_argument('b')
    ap.add_argument('out')
    ap.add_argument('--vp', default='pc')
    ap.add_argument('--pages')
    ap.add_argument('--tabs', action='store_true')
    ap.add_argument('--workers', type=int, default=6)
    ap.add_argument('--max-shots', type=int, default=25)
    ap.add_argument('--step', type=float, default=1.0, help='찍는 간격(화면 높이 배수)')
    ap.add_argument('--overlay-a')
    ap.add_argument('--overlay-b')
    ap.add_argument('--tol', type=int, default=None, help='채널 차이 허용치(기본 noise.json pix_tol 또는 0)')
    ap.add_argument('--noise')
    ap.add_argument('--keep-all', action='store_true')
    ap.add_argument('--gl-draw', action='store_true', help='WebGL 그리기를 실제로 함(기본은 건너뜀 — 캔버스는 가려서 비교 안 함)')
    args = ap.parse_args()
    A, B = C.base_url(args.a), C.base_url(args.b)
    vp_name, vp = C.viewport_opts(args.vp)
    pages = C.page_list(args.pages, args.tabs)
    noise = C.load_noise(args.noise)
    mask = C.mask_selector(noise)
    hide = ','.join(['video', 'canvas'] + [s for s in noise.get('pix_hide', []) if s not in ('video', 'canvas')])
    tol = args.tol if args.tol is not None else noise.get('pix_tol', 0)
    zsel = [[z['sel'], z['tol']] for z in noise.get('pix_zones', [])]
    dpr = vp.get('device_scale_factor', 1)
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    T0 = time.time()

    async def prep(b, base, overlay, pid):
        ctx = await C.new_context(b, vp, overlay, base, args.gl_draw)
        page = await ctx.new_page()
        tr = C.Tracker(page, base)
        await C.open_page(page, base, pid, tr, mask)
        await C.settle2(page, tr, mask, min_ms=1500)
        # visibility만으로는 안쪽에서 visible을 다시 준 요소(무인기 장면 등)가 보이므로 불투명도도 0
        await page.add_style_tag(content=f'{hide}{{visibility:hidden!important;opacity:0!important}}')
        await C.kill_lenis(page)
        return ctx, page, tr

    async def page_run(b, pid):
        t0 = time.time()
        res = {'shots': [], 'notes': []}
        ctxs = []
        d = out / C.fid(pid)
        shutil.rmtree(d, ignore_errors=True)            # 다시 할 때 앞 시도의 이미지를 남기지 않게
        try:
            (ca, pa, ta), (cb, pb, tb) = await asyncio.gather(prep(b, A, args.overlay_a, pid), prep(b, B, args.overlay_b, pid))
            ctxs = [ca, cb]
            ma, mb = await C.metrics(pa), await C.metrics(pb)
            if ma['H'] != mb['H']:
                res['notes'].append(f"page height A {ma['H']} ≠ B {mb['H']}")
            vh, maxy = ma['vh'], max(0, ma['H'] - ma['vh'])
            ys = list(range(0, maxy + 1, max(1, int(vh * args.step))))
            if not ys or ys[-1] != maxy:
                ys.append(maxy)
            if len(ys) > args.max_shots:
                ys = sorted({round(maxy * i / (args.max_shots - 1)) for i in range(args.max_shots)})
            for i, y in enumerate(ys):
                await asyncio.gather(C.scroll_to(pa, y), C.scroll_to(pb, y))
                await asyncio.gather(C.frames(pa), C.frames(pb))
                sa, sb = await asyncio.gather(C.settle2(pa, ta, mask, min_ms=300), C.settle2(pb, tb, mask, min_ms=300))
                await asyncio.gather(C.freeze(pa), C.freeze(pb))
                # 끝낸 transform 애니메이션 층은 다음 프레임들에서 최종 배율로 다시 래스터됨 — 그 뒤에 찍음
                await asyncio.gather(C.frames(pa, 3), C.frames(pb, 3))
                await asyncio.sleep(0.15)
                zones = (await pa.evaluate(ZONES_JS, zsel)) + (await pb.evaluate(ZONES_JS, zsel)) if zsel else []
                ia, ib = await asyncio.gather(pa.screenshot(caret='hide', timeout=120000), pb.screenshot(caret='hide', timeout=120000))
                await asyncio.gather(C.thaw(pa), C.thaw(pb))
                ya, yb = await pa.evaluate('scrollY'), await pb.evaluate('scrollY')
                a = np.asarray(Image.open(io.BytesIO(ia)).convert('RGB'))
                bb = np.asarray(Image.open(io.BytesIO(ib)).convert('RGB'))
                shot = {'y': y, 'ya': ya, 'yb': yb}
                if not sa.get('ok') or not sb.get('ok'):
                    shot['settle'] = [sa.get('ok'), sb.get('ok')]
                    shot['why'] = {k: v.get('st') for k, v in (('a', sa), ('b', sb)) if not v.get('ok')}
                if a.shape != bb.shape:
                    shot.update(px=-1, max=-1, note=f'size {a.shape} vs {bb.shape}')
                else:
                    m, n, mx = diff_img(a, bb, tol, zones, dpr)
                    shot.update(px=n, max=mx)
                    if n or args.keep_all:
                        d.mkdir(parents=True, exist_ok=True)
                        stem = d / f'{i:02d}_y{y}'
                        Image.fromarray(a).save(f'{stem}_a.png')
                        Image.fromarray(bb).save(f'{stem}_b.png')
                        if n:
                            save_diff(f'{stem}_diff.png', a, m)
                            ys_, xs_ = np.nonzero(m)
                            shot['box'] = [int(xs_.min()), int(ys_.min()), int(xs_.max()), int(ys_.max())]
                res['shots'].append(shot)
        except Exception as e:
            res['error'] = repr(e)[:500]
        if ctxs:
            res['net_a'], res['net_b'] = ta.summary(), tb.summary()
            # 로컬 서버가 밀려 연결이 끊긴 요청(python http.server는 대기열 5)이 있으면 그 페이지를 다시
            res['transient'] = ta.transient() + tb.transient()
        for c in ctxs:
            try:
                await c.close()
            except Exception:
                pass
        res['secs'] = round(time.time() - t0, 1)
        return res

    async with async_playwright() as p:
        browsers = {}

        async def one(pid, k):
            res = await C.with_browser(p, browsers, k, lambda b: page_run(b, pid))
            sh = res.get('shots', [])
            bad = [s for s in sh if s.get('px')]
            nf = sorted(set(res.get('net_b', {}).get('failed', [])) - set(res.get('net_a', {}).get('failed', [])))
            if nf:
                res.setdefault('notes', []).append('B failed: ' + ', '.join(nf[:3]))
            print(f"  {pid:28s} {res.get('secs', 0):6.1f}s  shots={len(sh)}  diff-shots={len(bad)}"
                  f"{'  max-px=' + str(max(s['px'] for s in bad)) if bad else ''}"
                  f"{'  retried ' + str(res['retries']) if res.get('retries') else ''}"
                  f"{'  ' + '; '.join(res['notes']) if res.get('notes') else ''}"
                  f"{'  ERROR ' + res['error'] if 'error' in res else ''}", file=sys.stderr, flush=True)
            return res

        print(f'pixdiff A={A} B={B} vp={vp_name} pages={len(pages)} hide="{hide}" tol={tol}', file=sys.stderr)
        results = await C.run_pool(pages, one, args.workers)
        for b in browsers.values():
            try:
                await b.close()
            except Exception:
                pass

    summ = {'meta': {'tool': 'pixdiff', 'a': A, 'b': B, 'vp': vp_name, 'hide': hide, 'tol': tol,
                     'when': datetime.now().isoformat(timespec='seconds'), 'secs': round(time.time() - T0, 1)},
            'pages': {pid: results[pid] for pid in pages}}
    tot_shots = sum(len(r.get('shots', [])) for r in results.values())
    diff_shots = [(pid, s) for pid, r in results.items() for s in r.get('shots', []) if s.get('px')]
    errs = [pid for pid, r in results.items() if 'error' in r or r.get('transient')
            or set(r.get('net_b', {}).get('failed', [])) - set(r.get('net_a', {}).get('failed', []))]
    unsettled = sum(1 for r in results.values() for s in r.get('shots', []) if 'settle' in s)
    summ['totals'] = {'shots': tot_shots, 'diff_shots': len(diff_shots), 'errors': len(errs), 'unsettled': unsettled,
                      'diff_px': sum(max(0, s['px']) for _, s in diff_shots)}
    (out / 'summary.json').write_text(json.dumps(summ, ensure_ascii=False, indent=1))
    verdict = 'NO PIXEL DIFFERENCE' if not diff_shots and not errs else 'PIXEL DIFFERENCES FOUND'
    print(f"pixdiff {vp_name}: {verdict} — shots {tot_shots}, differing {len(diff_shots)}, errors {len(errs)}, unsettled {unsettled}, "
          f"{summ['meta']['secs']}s → {out}")
    for pid, s in diff_shots[:20]:
        print(f"   {pid} y={s['y']} px={s['px']} max={s['max']} box={s.get('box')}{'  (안정 대기 초과 — 부하 확인)' if 'settle' in s else ''}")
    if unsettled:
        print(f"   ! 안정 대기를 넘긴 장면 {unsettled}장: 기계가 바쁘면(다른 브라우저 작업) 연혁 · 3D 루프가 수렴하지 못함 — 한가할 때 · WORKERS를 줄여 다시")
    sys.exit(0 if verdict.startswith('NO') else 1)


if __name__ == '__main__':
    asyncio.run(main())
