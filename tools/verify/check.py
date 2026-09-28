#!/usr/bin/env python3
"""정적 규약 검사: 루트에서 python3 tools/verify/check.py, 서버 불필요.

web의 파일/줄 크기, 로컬 정적 참조, JS 구문, JSON 형식, 릴리스 URL을 검사한다.
파일을 수정하지 않으며 실패가 하나라도 있으면 1로 끝난다. 렌더 검사는 별도다.
"""
import json
import re
import shutil
import subprocess
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlsplit

import release

ROOT = Path(__file__).resolve().parents[2]
WEB = ROOT / 'web'
TEXT = {'.html', '.css', '.js', '.json', '.svg'}


class References(HTMLParser):
    def __init__(self):
        super().__init__()
        self.urls = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        for key in ('src', 'href', 'poster'):
            if attrs.get(key):
                self.urls.append(attrs[key])


def local_reference(source, url):
    parts = urlsplit(url)
    if parts.scheme or parts.netloc or not parts.path:
        return None
    path = unquote(parts.path)
    target = (WEB / path.lstrip('/') if path.startswith('/') else source.parent / path).resolve()
    if not target.is_relative_to(WEB.resolve()) or not target.is_file():
        return f'{source.relative_to(ROOT)}: 없는 로컬 참조 {url}'
    return None


def main():
    errors = []
    for path, limit in [(ROOT / 'CLAUDE.md', 6500), (ROOT / 'AGENTS.md', 2000),
                        *((p, 8192) for p in (ROOT / 'docs').glob('*.md'))]:
        if path.stat().st_size > limit:
            errors.append(f'{path.relative_to(ROOT)}: 문서 {path.stat().st_size} B(한도 {limit})')
    files = sorted(p for p in WEB.rglob('*') if p.suffix in TEXT and p.is_file())
    js_count = 0
    node = shutil.which('node')
    if not node:
        errors.append('node 없음: JS 구문 검사를 실행할 수 없음')
    for path in files:
        text = path.read_text()
        label = str(path.relative_to(ROOT))
        lines = text.splitlines()
        if path.suffix != '.json' and (path.stat().st_size > 35000 or len(lines) > 900):
            errors.append(f'{label}: 파일 한도 초과({path.stat().st_size} B / {len(lines)}줄)')
        for index, line in enumerate(lines, 1):
            if len(line) > 1000:
                errors.append(f'{label}:{index}: {len(line)}자(한도 1000)')
        urls = []
        if path.suffix == '.html':
            parser = References()
            parser.feed(text)
            urls = parser.urls
            for url in urls:
                parts = urlsplit(url)
                if not parts.scheme and not parts.netloc and Path(parts.path).suffix in {'.js', '.css'}:
                    if parse_qs(parts.query).get('v') != [release.RELEASE]:
                        errors.append(f'{label}: 버전 없는 자산 {url}')
            if re.search(r'<style\b', text, re.I):
                errors.append(f'{label}: 인라인 style 블록')
            if release.versioned(text, release.HTML_REF) != text:
                errors.append(f'{label}: 릴리스 URL 갱신 필요')
        elif path.suffix == '.css':
            urls = [m.strip(' \"\'') for m in re.findall(r'url\((.*?)\)', text)]
        elif path.suffix == '.js':
            if path.name.startswith('a3d'):
                urls = re.findall(r'(?:from\s+|import\s*)["\'](\./[^"\']+)["\']', text)
                if release.versioned(text, release.MODULE_REF) != text:
                    errors.append(f'{label}: 모듈 릴리스 URL 갱신 필요')
            if node:
                kind = 'module' if path.name.startswith('a3d') else 'commonjs'
                result = subprocess.run([node, f'--input-type={kind}', '--check'], input=text, text=True, capture_output=True)
                js_count += 1
                if result.returncode:
                    errors.append(f'{label}: {result.stderr.strip()}')
        elif path.suffix == '.json':
            try:
                json.loads(text)
            except ValueError as error:
                errors.append(f'{label}: {error}')
        for url in urls:
            error = local_reference(path, url)
            if error:
                errors.append(error)
    print(f'정적 검사: {len(files)}개 파일 · JS {js_count}개 · 릴리스 {release.RELEASE}')
    for error in errors:
        print(error)
    print(f'실패 {len(errors)}')
    return bool(errors)


if __name__ == '__main__':
    raise SystemExit(main())
