# 게시 · 게시본 동기화

`web/`을 claude.ai 아티팩트로 올리거나 게시본과 맞출 때 읽는다. 검사 방법은 verify.md, 도구 목록은 tools.md.

- 게시 주소: https://claude.ai/artifact/8PVpxzCfkjLGqoRoqLs2tV — **여러 세션이 게시한다. 게시본이 기준이다.**
- 2026-09-27 확인: 게시본 = v60(id `1790421930-d731`, 262개 · 약 96MB, 2026-09-26). 최근 게시: v58 2D 패턴 SVG · v59 3D 메모리 · 무인기 성능 · v60 전수 최적화(글꼴 조각 · 유휴 루프 정지). `_archive/pre-refactor-v60/`이 v60과 같은 내용이다(`video/`는 `web/video` 링크).
- `web/` = 로컬 v60 + 미게시 리팩터(§5). Stage D 재개 시 라이브 목록 도구가 없어 동기화 미확인; 게시 전 1절을 반드시 수행한다.

## 1. 고치기 전: 게시본과 맞추기

1. Artifact `list`(`scope=files`, `url`=게시 주소) → 버전 id와 파일 목록(경로 · 크기, 해시는 없음)을 받는다.
2. `web/`과 비교한다. 새 파일 · 크기가 다른 파일 · 의심되는 파일은 Artifact `read`(`path`)로 받아 sha1을 비교하고, 게시본이 새 것이면 `web/`에 반영한다. 덮기 전의 로컬 파일은 `_archive/`에 둔다(예: `web-local-before-sync-20260925/`).
3. 게시본의 `data/*.json`이 한 줄 압축형이면 받은 뒤 `python3 tools/data/fmtjson.py`로 다시 정리한다(값 · 순서는 그대로, 공백만 바뀜). 새 한글 음절이 섞여 왔는지 §4로 본다.

## 2. 게시 절차

1. `web/`에서 고치고 로컬에서 확인한다(verify.md). 화면이 같아야 하는 변경은 기준본과 비교한다.
2. 게시 전 점검(모두 저장소 루트에서):
   - `python3 tools/verify/check.py` — 크기 · 참조 · JS 구문 · 릴리스 URL. 식별자 갱신은 llm-workflow.md.
   - `python3 tools/data/fmtjson.py --check` — 1이면 인자 없이 돌려 정리.
   - `python3 tools/verify/fontset.py` — 1이면 site 조각에 없는 음절이 있음 → §4.
   - `python3 tools/fonts/mkfonts.py --check` — 0 통과 · 1 다시 만들어야 함 · 3 안 쓰는 site 음절만 있음(화면 영향 없음, 지금 '촬' 1자) · 2 사용법 오류.
   - `python3 tools/aero3d/smoke.py` — 14쪽 오류 · HTTP ≥400 · 깨진 이미지가 모두 `[]`.
3. **게시 직전 버전을 다시 확인한다**(Artifact `read`, path 없이 · 또는 `list`). 1단계 때와 버전 id가 다르면 1로 돌아간다.
4. Artifact `publish`: `url`=게시 주소, `root`=`web/`, `file_path`=`web/index.html`, `files`에는 **바꾼 파일만**(게시 경로 → 원본 경로). 빠진 파일은 게시본에 그대로 남고, 지울 파일은 `null`로 둔다.
5. 게시 뒤 확인(§6).

## 3. 한도 · 도구 버릇

- 한 번에 255개 · 64MB 이하. 파일 하나는 텍스트 16MB, 바이너리(영상 · 이미지 · 글꼴) 15MB 이하.
- 게시본 전체(지금 `web/` 280개 · 약 97MB)는 한 번에 다시 올릴 수 없다 → 바꾼 파일만 올린다.
- 게시 도구는 이 세션에서 게시본 index 쪽을 `read`로 **끝까지 읽기 전에는 거절**한다 → 읽고 다시 보낸다.
- "내용이 같다"며 거절되면 **바꾸지 말고 그대로 다시 보낸다.**
- 다른 곳에서 새 버전이 올라와 충돌로 거절되면, 돌려받은 새 내용에 내 변경을 합쳐 다시 보낸다(`force`는 사용자가 그 버전을 버리라고 할 때만).
- 호스트는 조각 파일을 감싼다. 게시 뒤 받은 `index.html`이 `<!doctype html>` + `<html>`(lang 없음)으로 시작하는지 본다.

## 4. 캐시 · 글꼴

- **이미지를 바꾸면 파일 이름을 바꾼다**(예: `top-787-k25.webp` → `top-787-k26.webp`). 모든 참조를 함께 바꾸고, 쓰지 않는 옛 파일은 게시에서 `null`로 지운다.
- **새 한글 음절**(문구 · `media.json` · `history.json`): `python3 tools/fonts/mkfonts.py <새 TAG>`(예 `k2`, 글자 · 숫자 · `-` · `.`). `web/fonts/HanjinGroupSans-{Light,Bold}-{site,rest}-<TAG>.woff2` 4개와 `css/fonts.css`를 올리고, 옛 site · rest 4개는 `null`. base 두 개는 이름이 같으므로 해시가 바뀐 경우만 올린다.
  - 조각: base(한글 음절 뺀 전부) · site(사이트 글에 쓰인 음절, 주석 · `fonts.load(…)` 안 제외) · rest(나머지 음절). `fonts.css`는 모든 쪽에서 site.css 앞의 막는 스타일시트다.
  - rest는 뉴스룸 검색창만 load 뒤 미리 받는다(`js/newsroom.js`의 `document.fonts.load('300 15px "HanjinGroupSans"','가힣')` — `'가힣'`을 `fonts.load(` 밖으로 빼면 mkfonts가 '힣'을 site에 넣어 미리 받기가 멈춤). **뉴스룸 외 쪽이 `*-rest-*.woff2`를 받지 않는지** 확인한다(cstyle 덤프의 요청 URL 목록 · 개발자 도구 네트워크 탭, verify.md).
- HTML의 로컬 CSS/JS, index preload, 3D 모듈 import에는 `?v=refactor-d1`이 붙는다(`tools/verify/release.py`). 공용 계약 변경 시 식별자를 올려 함께 게시한다. 파일명·동기 실행 순서는 그대로다.
- v60 `site.js`가 새 코드와 섞이면 히어로·스트립·뉴스·뉴스룸·영문 채용·무인기·연혁이 멈추고 본문이 숨을 수 있다. 릴리스 URL로 옛 URL의 캐시를 분리했다. 호스트가 쿼리를 유지하는지는 게시 후 Network에서 확인하고, 새 탭에서 위 기능을 확인한다. 쿼리를 없애거나 무시하는 호스트라면 게시 전에 파일명 버전 방식으로 바꿔야 한다.
- 초기 표시: 국문 메인은 게시 틀의 CSS 전 크림색 프레임이 사라졌다. 외부 파일 분리로 느린 망에서는 UAV 무대·메인 영상 시작이 첫 표시보다 늦을 수 있다. index.js preload는 개선되어 유지했고, UAV preload는 효과가 없어 철회했다.
- MRO 육지는 fetch 뒤 표시된다. preload는 WebKit 중복 요청 때문에 철회했다. 실패는 콘솔 `mro-land` 경고로 남긴다.

## 5. 이번 리팩터(Stage A~D, 게시 전): 변경 목록은 매번 재생성

- **새 파일 18:** `css/{index,aero,uav,mro,company,newsroom,careers}.css` · `img/mro-land.svg` · `js/{index,mro,newsroom,careers,a3d-paint,uav-data,uav-kit,uav-scenes1,uav-scenes2,uav}.js`
- **바뀐 파일 25:** HTML 14쪽 전부 · `css/{site,history,fonts}.css` · `img/pattern2d.svg` · `data/{media,history}.json` · `js/{site,scroll-fx,history,a3d,a3d-craft}.js`
- **현재 43개(추가 18 · 변경 25), 삭제 없음.** WOFF2 · 영상 · 나머지 이미지는 그대로다. fonts.css · pattern2d.svg는 값/형상을 보존하는 줄바꿈 변경이다.
- 따로 올리면 깨지는 짝(그래서 전체 변경 목록을 한 게시로):
  - `js/site.js`(KA 도우미) ↔ 나머지 모든 쪽 JS
  - `js/scroll-fx.js`(`<style>` 주입 없앰) ↔ `css/uav.css` 끝의 `#seq` 등장 규칙
  - `uav*.html` ↔ `css/uav.css` + `js/uav-data · uav-kit · uav-scenes1 · uav-scenes2 · uav.js`
  - `js/a3d-craft.js` ↔ `js/a3d-paint.js`
  - `mro*.html`(빈 `<path class="land">`) ↔ `js/mro.js`(fetch로 채움) ↔ `img/mro-land.svg` · `css/mro.css`
  - 각 쪽 HTML ↔ 그 쪽 `css/<쪽>.css` · `js/<쪽>.js`
- 목록 다시 뽑기(v60 기준, 루트):

```sh
python3 tools/verify/manifest.py --output _verification/refactor/stage-d/publish-manifest.json
```

SHA-256 · 추가/변경/삭제 · 전송량이 기록된다. 라이브가 바뀌었으면 `--baseline`에 동기화한 기준본을 지정한다. Stage C의 41개 목록은 사용하지 않는다.

## 6. 게시 뒤 확인

- MRO/U 쪽 지도에 육지가 그려지는가(`js/mro.js`가 `img/mro-land.svg`를 fetch — 불투명 출처 틀에서도 됨, 외부 `<use>`는 빠졌었음).
- aero 3D가 `a3-gl`로 시작하고 첫 기종이 그려지는가(대체 목록이 아님).
- 위 캐시 혼합 점검, 뉴스룸 외 쪽 rest 글꼴 요청 없음, `index.html` 머리.
