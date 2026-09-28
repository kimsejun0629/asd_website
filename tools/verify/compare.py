#!/usr/bin/env python3
"""두 cstyle 덤프(기준 A · 후보 B)를 비교해 짧은 보고서를 낸다.

  python3 compare.py A.json.gz B.json.gz [--noise noise.json | --no-noise] [--ignore-props p1,p2]
                     [--ignore-file extra.json] [--rect-tol 0.5] [--max 12] [--json summary.json]
                     [--derive-noise noise.json]   # 두 기준 실행의 차이를 노이즈 파일의 auto 항목으로 더함

종류(kind): add · del(구조) · mv(경로만 바뀜) · vis(보임 ↔ 안 보임) · t(직계 글) · r.xy · r.wh · r.box(위치 · 크기 · 상자 유무)
            a:<속성> · x:<img src 등>
            s:<속성>(요소) · b:/f:/m:/h:<속성>(::before · ::after · ::marker · ::placeholder) · v:<--사용자 속성>
            doc:<H · W · title · fonts> · head(렌더 안 되는 요소: head · script · style · link …)
화면에 영향 없는 정보(info): head · mv · 요청 URL 차이 · a:class · a:style(계산된 스타일이 따로 비교되므로) · v:* · doc:fonts
양쪽 모두 안 보이는 요소(상자 없음 · visibility · 누적 불투명도 0)의 차이는 세기만 한다(hidden-both).
"""
import argparse, difflib, json, re, sys
from collections import defaultdict, Counter
from pathlib import Path
import common as C

MARGIN = re.compile(r'^s:margin-(left|right|top|bottom|inline-start|inline-end|block-start|block-end)$')
INFO_KINDS = re.compile(r'^(head|mv|a:class|a:style|v:.*|doc:fonts)$')


class Noise:
    def __init__(self, cfg, vp, extra_props=()):
        self.cfg = cfg or {}
        self.vp = vp
        self.props = set(self.cfg.get('ignore_props', [])) | set(extra_props)
        self.subs = [(s.get('attr', '.*'), re.compile(s['re']), s.get('to', '*')) for s in self.cfg.get('attr_subs', [])]
        self.rules = []
        for r in self.cfg.get('rules', []):
            self.rules.append(dict(why=r.get('why', ''), page=re.compile(r.get('page', '.*')), vp=re.compile(r.get('vp', '.*')),
                                   path=re.compile(r['path']) if 'path' in r else None,
                                   label=re.compile(r['label']) if 'label' in r else None,
                                   subtree=r.get('subtree', False),
                                   attr={k: re.compile(v) for k, v in r.get('attr', {}).items()},
                                   kinds=[re.compile(k) for k in r.get('kinds', ['.*'])]))
        self.auto = self.cfg.get('auto', {}).get(vp, {})
        self.console = [re.compile(x) for x in self.cfg.get('console_ignore', [])]
        self.urls = [re.compile(x) for x in self.cfg.get('url_ignore', [])]
        self.margin_same_box = self.cfg.get('margin_if_same_box', False)
        self.stats = Counter()                      # 무엇이 몇 건을 걸렀는지(--noise-stats)

    def sub_attr(self, name, v):
        for an, rx, to in self.subs:
            if re.fullmatch(an, name):
                v = rx.sub(to, v)
        return v

    def hit(self, page, path, kind, labels, attrs=()):
        """labels · attrs: [자신, 부모, 조부모 …] 순서의 라벨 · 속성 사전"""
        if kind[:2] in ('s:', 'b:', 'f:', 'm:', 'h:') and kind[2:] in self.props:
            self.stats['ignore_props'] += 1
            return True
        a = self.auto.get(page, {}).get(path)
        if a and (kind in a or (kind.startswith('r.') and 'r' in a)):
            self.stats['auto'] += 1
            return True
        for i, r in enumerate(self.rules):
            if not r['page'].search(page) or not r['vp'].search(self.vp):
                continue
            if not any(k.search(kind) for k in r['kinds']):
                continue
            if r['path'] and not r['path'].search(path):
                continue
            if r['label']:
                ls = labels if r['subtree'] else labels[:1]
                if not any(r['label'].search(l) for l in ls):
                    continue
            if r['attr']:
                ats = attrs if r['subtree'] else attrs[:1]
                if not any(all(rx.search(at.get(k, '')) for k, rx in r['attr'].items()) for at in ats):
                    continue
            self.stats[f'rule{i}: ' + r['why'][:60]] += 1
            return True
        return False


def style_diffs(ma, ga, mb, gb, prefix, out):
    """계산된 스타일 비교(표 + 차이로 복원)"""
    if isinstance(ga, str) or isinstance(gb, str) or ga is None or gb is None:
        ca = ga if isinstance(ga, str) or ga is None else 'generated'
        cb = gb if isinstance(gb, str) or gb is None else 'generated'
        if ca != cb:
            out.append((prefix + ':content', str(ca), str(cb)))
        return
    MA, DA = ma.get(ga['k'], {}), ga['d']
    MB, DB = mb.get(gb['k'], {}), gb['d']
    keys = set(DA) | set(DB)
    if MA is not MB:
        keys |= {k for k in set(MA) | set(MB) if MA.get(k) != MB.get(k)}
    for k in keys:
        va = DA.get(k, MA.get(k))
        vb = DB.get(k, MB.get(k))
        if va != vb:
            out.append((prefix + ':' + k, va, vb))


def compare_state(page, st, A, B, noise, tol):
    """한 페이지 · 한 상태 비교 → (diffs, noise_count, stats)"""
    ea, eb = A['els'], B['els']
    ma, mb = A['modes'], B['modes']
    # 모드 표가 같으면 같은 객체로(비교 줄이기)
    for k in set(ma) & set(mb):
        if ma[k] == mb[k]:
            mb[k] = ma[k]
    ra = [e for e in ea if not e.get('nr')]
    rb = [e for e in eb if not e.get('nr')]
    pa = {e['p']: e for e in ra}
    pb = {e['p']: e for e in rb}
    lab_a = {e['p']: e['g'] for e in ea}
    att_a = {e['p']: e.get('a', {}) for e in ea}
    diffs, nz, hid = [], 0, 0
    # 같은 부모 아래 같은 태그 수가 다르면(요소를 넣거나 뺌) 그 뒤 n번째 경로가 밀리므로 그 무리와 자손은 경로로 짝짓지 않고
    # (라벨, 글) 순서 맞춤으로 짝지음 — 수가 같으면(클래스 이름만 바뀜 등) 경로로 짝지음
    def groups(els):
        c = Counter()
        for e in els:
            par, _, last = e['p'].rpartition('>')
            c[(par, last.split(':')[0])] += 1
        return c
    ga, gb = groups(ra), groups(rb)
    shaky = {k for k in set(ga) | set(gb) if ga.get(k) != gb.get(k)}

    def stable(path):
        parts = path.split('>')
        for i in range(len(parts)):
            if ('>'.join(parts[:i]), parts[i].split(':')[0]) in shaky:
                return False
        return True
    pairs = [(pa[p], pb[p]) for p in pa if p in pb and stable(p)]
    only_a = [e for e in ra if e['p'] not in pb or not stable(e['p'])]
    only_b = [e for e in rb if e['p'] not in pa or not stable(e['p'])]
    if only_a and only_b:
        sig = lambda e: (e['g'], e.get('t', ''))
        sm = difflib.SequenceMatcher(None, [sig(e) for e in only_a], [sig(e) for e in only_b], autojunk=False)
        ma_ids, mb_ids = set(), set()
        for blk in sm.get_matching_blocks():
            for i in range(blk.size):
                x, y = only_a[blk.a + i], only_b[blk.b + i]
                pairs.append((x, y))
                ma_ids.add(id(x)); mb_ids.add(id(y))
                diffs.append(('mv', x['p'], x['g'], x['p'], y['p']))
        only_a = [e for e in only_a if id(e) not in ma_ids]
        only_b = [e for e in only_b if id(e) not in mb_ids]
    for e in only_a:
        diffs.append(('del', e['p'], e['g'], e['g'], None))
    for e in only_b:
        diffs.append(('add', e['p'], e['g'], None, e['g']))

    for x, y in pairs:
        d = []
        if x.get('iv') != y.get('iv'):
            d.append(('vis', 'hidden' if x.get('iv') else 'shown', 'hidden' if y.get('iv') else 'shown'))
        if x.get('t', '') != y.get('t', ''):
            d.append(('t', x.get('t', ''), y.get('t', '')))
        rx, ry = x.get('r'), y.get('r')
        if (rx is None) != (ry is None):
            d.append(('r.box', rx, ry))
        elif rx:
            if abs(rx[0] - ry[0]) > tol or abs(rx[1] - ry[1]) > tol:
                d.append(('r.xy', rx, ry))
            if abs(rx[2] - ry[2]) > tol or abs(rx[3] - ry[3]) > tol:
                d.append(('r.wh', rx, ry))
        aa, ab = x.get('a', {}), y.get('a', {})
        for k in set(aa) | set(ab):
            va, vb = aa.get(k), ab.get(k)
            if va is not None:
                va = noise.sub_attr(k, va)
            if vb is not None:
                vb = noise.sub_attr(k, vb)
            if va != vb:
                d.append(('a:' + k, va, vb))
        xa, xb = x.get('x', {}), y.get('x', {})
        for k in set(xa) | set(xb):
            if xa.get(k) != xb.get(k):
                d.append(('x:' + k, xa.get(k), xb.get(k)))
        for key in 'sbfmh':
            if key in x or key in y:
                style_diffs(ma, x.get(key), mb, y.get(key), key, d)
        va, vb = x.get('v', {}), y.get('v', {})
        for k in set(va) | set(vb):
            if va.get(k) != vb.get(k):
                d.append(('v:' + k, va.get(k), vb.get(k)))
        if d and x.get('iv') and y.get('iv'):
            hid += len(d)                           # 양쪽 다 안 보이는 요소: 지나온 경로에 따라 남은 값 — 세기만
            continue
        if d:
            parts = x['p'].split('>')
            anc = ['>'.join(parts[:i]) for i in range(len(parts) - 1, 0, -1)]
            labels = [x['g']] + [lab_a.get(q, '') for q in anc]
            attrs = [x.get('a', {})] + [att_a.get(q, {}) for q in anc]
            same_box = rx and ry and all(abs(u - v) <= tol for u, v in zip(rx, ry))
            for kind, bv, av in d:
                # flex · auto 여백: Chromium이 쓰인 값(예 378.6px)이나 0px을 레이아웃 이력에 따라 돌려줌 — 상자가 같으면 화면도 같음
                if noise.margin_same_box and same_box and MARGIN.match(kind):
                    nz += 1
                    noise.stats['margin_if_same_box'] += 1
                elif noise.hit(page, x['p'], kind, labels, attrs):
                    nz += 1
                else:
                    diffs.append((kind, x['p'], x['g'], bv, av))
    # 렌더 안 되는 요소(head · script · style …): 순서 있는 서명 목록
    def nr_sig(e):
        a = e.get('a', {})
        keep = {k: a[k] for k in ('src', 'href', 'rel', 'type', 'name', 'content', 'charset') if k in a}
        return e['g'].split('.')[0] + ' ' + json.dumps(keep, ensure_ascii=False) + ' ' + str(e.get('x', {}).get('h', ''))
    na = [nr_sig(e) for e in ea if e.get('nr')]
    nb = [nr_sig(e) for e in eb if e.get('nr')]
    if na != nb:
        ca, cb = Counter(na), Counter(nb)
        for s in (ca - cb):
            diffs.append(('head', 'head', s[:160], s[:160], None))
        for s in (cb - ca):
            diffs.append(('head', 'head', s[:160], None, s[:160]))
        if not (ca - cb) and not (cb - ca):
            diffs.append(('head', 'head', 'order', 'order changed', ''))
    # 문서 전체
    da, db = A['doc'], B['doc']
    for k in ('H', 'W', 'title', 'y', 'fonts', 'iv'):
        if da.get(k) != db.get(k):
            kind = 'doc:' + k
            if noise.hit(page, 'doc', kind, ['doc'], [{}]):
                nz += 1
            else:
                diffs.append((kind, 'doc', 'doc', da.get(k), db.get(k)))
    stats = {'els_a': len(ea), 'els_b': len(eb), 'pairs': len(pairs), 'hidden': hid}
    return diffs, nz, stats


def compare_net(page, a, b, noise):
    out = []
    ign = lambda s, rxs: any(r.search(s) for r in rxs)
    ca = set(a['console'] + a['pageerror'])
    for m in (b['console'] + b['pageerror']):
        if m not in ca and not ign(m, noise.console):
            out.append(('console', m))
    fa = set(a['failed'])
    for m in b['failed']:
        if m not in fa and not ign(m, noise.urls):
            out.append(('failed', m))
    for m in a['failed']:
        if m not in set(b['failed']) and not ign(m, noise.urls):
            out.append(('fixed', m))
    ra, rb = set(a['requests']), set(b['requests'])
    info = [('url+', u) for u in sorted(rb - ra) if not ign(u, noise.urls)] + \
           [('url-', u) for u in sorted(ra - rb) if not ign(u, noise.urls)]
    return out, info


def short(v, n=70):
    s = json.dumps(v, ensure_ascii=False) if not isinstance(v, str) else v
    return s if len(s) <= n else s[:n - 1] + '…'


PRIO = {'add': 0, 'del': 0, 'vis': 1, 'r.box': 2, 'r.wh': 2, 'r.xy': 3, 't': 4}


def group_lines(ds, maxn):
    """차이 목록 → 묶은 줄들: 같은 (전 → 후) · 같은 요소들에서 함께 바뀐 속성은 한 줄로(color가 바뀌면 border-*-color 등 파생 속성도 같이 바뀜)"""
    groups = defaultdict(list)
    for d in ds:
        kind = d[0]
        if kind in ('add', 'del', 'mv') or kind.startswith('r.'):
            key = (kind, '', '')
        else:
            key = (kind, short(d[3]), short(d[4]))
        groups[key].append(d)
    merged = {}
    for (kind, bv, av), items in groups.items():
        if kind[:2] in ('s:', 'b:', 'f:', 'm:', 'h:'):
            mk = (kind[:2], bv, av, frozenset(i[1] for i in items))
        else:
            mk = (kind, bv, av, None)
        merged.setdefault(mk, []).append((kind, items))
    rows = []
    for (k0, bv, av, _), lst in merged.items():
        kinds = sorted((k for k, _ in lst), key=lambda k: (k[2:].startswith('-webkit'), len(k), k))   # color · width 같은 짧은 원 속성을 앞에
        items = lst[0][1]
        info = INFO_KINDS.match(kinds[0]) is not None
        rows.append((info, PRIO.get(kinds[0], 5), -len(items), kinds, bv, av, items))
    rows.sort(key=lambda r: r[:3])
    out = []
    for info, _, _, kinds, bv, av, items in rows[:maxn]:
        tag = '(info) ' if info else ''
        kind = kinds[0]
        name = kind if len(kinds) == 1 else f"{kind[:2]}{','.join(k[2:] for k in kinds[:3])}{f' +{len(kinds) - 3}' if len(kinds) > 3 else ''}"
        sample = ', '.join(sorted({i[2] for i in items}, key=len)[:3])
        if kind.startswith('r.'):
            out.append(f"    {tag}{kind} ×{len(items)}: " + '; '.join(f"{i[2]} {i[3]}→{i[4]}" for i in items[:3]))
        elif kind in ('add', 'del', 'mv'):
            out.append(f"    {tag}{kind} ×{len(items)}: " + '; '.join(f"{i[1]} ({i[2]})" if kind != 'mv' else f"{i[3]} → {i[4]}" for i in items[:4]))
        else:
            out.append(f"    {tag}{name}: {bv} → {av}  ×{len(items)}  [{sample}]")
    if len(rows) > maxn:
        out.append(f"    … {len(rows) - maxn} more groups")
    return out


def report(res, maxn):
    """사람이 읽는 보고서(페이지 · 상태별로 묶고 잘라서, 앞 상태와 같은 묶음은 한 줄로)"""
    L = []
    for page, pr in res['pages'].items():
        head = f"■ {page}"
        lines, prev = [], None
        for st, sr in pr['states'].items():
            ds = sr['diffs']
            if not ds:
                continue
            vis = sum(1 for d in ds if not INFO_KINDS.match(d[0]))
            s = sr['stats']
            hdr = f"  {st}: els {s['els_a']}→{s['els_b']}  visual {vis}  info {len(ds) - vis}  (noise {sr['noise']} · hidden {s['hidden']})"
            body = group_lines(ds, maxn)
            if prev and body == prev[1]:
                lines.append(hdr + f"  — {prev[0]}과 같은 묶음")
                continue
            lines.append(hdr)
            lines += body
            prev = (st, body)
        for kind, m in pr['net']:
            lines.append(f"  {kind}: {short(m, 160)}")
        if pr['net_info']:
            lines.append(f"  (info) requests: " + ', '.join(f"{k}{short(u, 60)}" for k, u in pr['net_info'][:8])
                         + (f" … +{len(pr['net_info']) - 8}" if len(pr['net_info']) > 8 else ''))
        if pr.get('missing'):
            lines.append(f"  missing: {pr['missing']}")
        if lines:
            L.append(head)
            L += lines
    return L


def run(A, B, noise_cfg, args):
    vp = A['meta']['vp']
    noise = Noise(None if args.no_noise else noise_cfg, vp, [p for p in (args.ignore_props or '').split(',') if p])
    if args.ignore_file:
        extra = json.loads(Path(args.ignore_file).read_text())
        for k in ('ignore_props', 'attr_subs', 'rules', 'console_ignore', 'url_ignore'):
            if extra.get(k):
                noise_cfg2 = dict(noise.cfg)
                noise_cfg2.setdefault(k, [])
                noise_cfg2[k] = list(noise_cfg2[k]) + extra[k]
                noise = Noise(noise_cfg2, vp, noise.props)
    res = {'a': A['meta'], 'b': B['meta'], 'pages': {}}
    tot = Counter()
    for page in A['pages']:
        pa, pb = A['pages'][page], B['pages'].get(page)
        pr = {'states': {}, 'net': [], 'net_info': []}
        res['pages'][page] = pr
        if not pb:
            pr['missing'] = 'not in B'
            tot['missing'] += 1
            continue
        for side, p in (('A', pa), ('B', pb)):
            if p.get('error'):
                pr['net'].append(('error' + side, p['error']))
        for st in ('S0', 'S1', 'S2'):
            if st not in pa['states'] or st not in pb['states']:
                if st in pa['states'] or st in pb['states']:
                    pr['net'].append(('state-missing', st))
                continue
            diffs, nz, stats = compare_state(page, st, pa['states'][st], pb['states'][st], noise, args.rect_tol)
            pr['states'][st] = {'diffs': diffs, 'noise': nz, 'stats': stats}
            for d in diffs:
                tot['info' if INFO_KINDS.match(d[0]) else 'visual'] += 1
            tot['noise'] += nz
            tot['hidden'] += stats['hidden']
            tot['els'] += stats['els_a']
        net, info = compare_net(page, pa['net'], pb['net'], noise)
        pr['net'], pr['net_info'] = pr['net'] + net, info
        tot['net'] += len(pr['net'])
        tot['url_info'] += len(info)
        for side, p in (('A', pa), ('B', pb)):
            for st, s in p.get('settle', {}).items():
                if not s.get('ok'):
                    tot['settle_timeout'] += 1
    for page in B['pages']:
        if page not in A['pages']:
            res['pages'][page] = {'states': {}, 'net': [], 'net_info': [], 'missing': 'not in A'}
            tot['missing'] += 1
    res['totals'] = dict(tot)
    res['noise_stats'] = dict(noise.stats)
    return res


def derive(res, vp, noise_path):
    """차이를 노이즈 파일의 auto[vp][page][path] = [kinds]로 합침(구조 · head · doc 차이는 넣지 않음)"""
    p = Path(noise_path)
    cfg = json.loads(p.read_text()) if p.exists() else {}
    auto = cfg.setdefault('auto', {}).setdefault(vp, {})
    n = 0
    skipped = []
    for page, pr in res['pages'].items():
        for st, sr in pr['states'].items():
            for kind, path, lab, bv, av in sr['diffs']:
                if kind in ('add', 'del', 'mv', 'head') or kind.startswith('doc:'):
                    skipped.append(f'{page} {st} {kind} {path} {lab}')
                    continue
                k = kind
                lst = auto.setdefault(page, {}).setdefault(path, [])
                if k not in lst:
                    lst.append(k)
                    n += 1
    for page in auto:
        for path in auto[page]:
            auto[page][path].sort()
    p.write_text(json.dumps(cfg, ensure_ascii=False, indent=1, sort_keys=False))
    return n, skipped


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('a')
    ap.add_argument('b')
    ap.add_argument('--noise', default=str(C.NOISE_FILE))
    ap.add_argument('--no-noise', action='store_true')
    ap.add_argument('--ignore-props', help='무시할 계산된 속성(쉼표)')
    ap.add_argument('--ignore-file', help='추가 노이즈 JSON(ignore_props · attr_subs · rules · console_ignore · url_ignore)')
    ap.add_argument('--rect-tol', type=float, default=0.5)
    ap.add_argument('--max', type=int, default=12, help='상태마다 보여 줄 묶음 수')
    ap.add_argument('--json', help='요약 JSON 저장')
    ap.add_argument('--derive-noise', help='남은 차이를 이 노이즈 파일의 auto 항목으로 더함')
    ap.add_argument('--noise-stats', action='store_true', help='노이즈 규칙별로 거른 건수')
    args = ap.parse_args()
    A, B = C.read_json(args.a), C.read_json(args.b)
    if A['meta']['vp'] != B['meta']['vp']:
        print(f"! viewport differs: {A['meta']['vp']} vs {B['meta']['vp']}")
    cfg = C.load_noise(args.noise)
    res = run(A, B, cfg, args)
    print(f"compare  A={A['meta']['base']} ({A['meta']['when']})  B={B['meta']['base']} ({B['meta']['when']})  vp={A['meta']['vp']}")
    for line in report(res, args.max):
        print(line)
    t = res['totals']
    verdict = 'NO VISUAL DIFFERENCE' if not t.get('visual') and not t.get('net') and not t.get('missing') else 'DIFFERENCES FOUND'
    print(f"── {verdict}: visual {t.get('visual', 0)} · net/errors {t.get('net', 0)} · info {t.get('info', 0)} · "
          f"url-info {t.get('url_info', 0)} · noise-filtered {t.get('noise', 0)} · hidden-both {t.get('hidden', 0)} · elements {t.get('els', 0)} · "
          f"settle-timeouts {t.get('settle_timeout', 0)}")
    if args.noise_stats:
        for k, v in sorted(res['noise_stats'].items(), key=lambda kv: -kv[1]):
            print(f'   noise {v:6d}  {k}')
    if args.json:
        C.dump_json({'verdict': verdict, 'totals': t, 'a': res['a'], 'b': res['b'],
                     'pages': {p: {st: {'visual': sum(1 for d in s['diffs'] if not INFO_KINDS.match(d[0])),
                                        'info': sum(1 for d in s['diffs'] if INFO_KINDS.match(d[0])), 'noise': s['noise']}
                                   for st, s in pr['states'].items()} for p, pr in res['pages'].items()}}, args.json)
    if args.derive_noise:
        n, skipped = derive(res, A['meta']['vp'], args.derive_noise)
        print(f"derive-noise: +{n} auto entries → {args.derive_noise}")
        for s in skipped[:20]:
            print('  not auto-ignorable (structure/doc):', s)
    sys.exit(0 if verdict.startswith('NO') else 1)


if __name__ == '__main__':
    main()
