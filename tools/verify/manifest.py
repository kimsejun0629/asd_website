#!/usr/bin/env python3
"""로컬 기준본 대비 게시 목록: manifest.py [--baseline 폴더] [--output JSON].

루트에서 실행, 서버 불필요. 라이브 버전 확인을 대신하지 않는다.
"""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def digest(path):
    hasher = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            hasher.update(chunk)
    return hasher.hexdigest()


def inventory(root):
    files = {}

    def walk(folder, ancestors):
        resolved = folder.resolve()
        if resolved in ancestors:
            raise ValueError(f'순환 폴더 링크: {folder}')
        for path in folder.iterdir():
            if path.is_dir():
                walk(path, ancestors | {resolved})
            elif path.is_file() and path.name != '.DS_Store':
                files[path.relative_to(root).as_posix()] = path

    walk(root, set())   # v60의 video/는 web/video 심볼릭 링크이므로 함께 읽는다.
    return files


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--baseline', type=Path, default=ROOT / '_archive/pre-refactor-v60')
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    if not (args.baseline / 'index.html').is_file():
        parser.error('기준본 index.html이 없음')
    before, after = inventory(args.baseline), inventory(ROOT / 'web')
    files = []
    for name, path in sorted(after.items()):
        sha = digest(path)
        if name not in before or sha != digest(before[name]):
            files.append({'status': 'changed' if name in before else 'new', 'path': name,
                          'bytes': path.stat().st_size, 'sha256': sha})
    removed = sorted(before.keys() - after.keys())
    total = sum(f['bytes'] for f in files)
    result = {'baseline': str(args.baseline.resolve()), 'live_verified': False,
              'files': files, 'removed': removed, 'total_bytes': total}
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(f'추가 {sum(f["status"] == "new" for f in files)} · 변경 {sum(f["status"] == "changed" for f in files)}'
          f' · 삭제 {len(removed)} · {total:,} B (라이브 미확인)')
    return int(len(files) + len(removed) > 255 or total > 64 * 1024 * 1024)


if __name__ == '__main__':
    raise SystemExit(main())
