#!/usr/bin/env python3
"""릴리스 자산 URL 확인(기본) · 갱신(--write). 루트에서 실행, 서버 불필요.

공통 API나 CSS를 바꿔 게시할 때 RELEASE를 올리고 --write 뒤 함께 게시한다.
파일명과 스크립트 순서는 보존하며 HTML/preload/모듈 의존성에 같은 버전을 쓴다.
"""
import argparse
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
WEB = ROOT / 'web'
RELEASE = 'refactor-d1'
HTML_REF = re.compile(r'((?:href|src)\s*=\s*["\'])((?:css|js)/[^"\'?]+\.(?:css|js))(?:\?[^"\']*)?(["\'])', re.I)
MODULE_REF = re.compile(r'((?:from\s+|import\s*)["\'])(\./[^"\'?]+\.js)(?:\?[^"\']*)?(["\'])')


def versioned(text, pattern):
    return pattern.sub(lambda m: f'{m[1]}{m[2]}?v={RELEASE}{m[3]}', text)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--write', action='store_true', help='URL 갱신(기본은 검사만)')
    args = parser.parse_args()
    changed = []
    for path in sorted([*WEB.glob('*.html'), *WEB.glob('js/a3d*.js')]):
        old = path.read_text()
        new = versioned(old, HTML_REF if path.suffix == '.html' else MODULE_REF)
        if old != new:
            changed.append(str(path.relative_to(ROOT)))
            if args.write:
                path.write_text(new)
    print(f'릴리스 {RELEASE}: ' + ('갱신 ' if args.write else '갱신 필요 ') + str(len(changed)))
    for path in changed:
        print(path)
    return 0 if args.write or not changed else 1


if __name__ == '__main__':
    raise SystemExit(main())
