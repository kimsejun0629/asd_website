# 대한항공 항공우주사업본부 웹사이트 (asd_website)

Korean Air Aerospace 사이트 리디자인. 결과물은 claude.ai 아티팩트로 게시한다.

- 게시 주소: https://claude.ai/artifact/8PVpxzCfkjLGqoRoqLs2tV — 로컬 기준 v60 + 미게시 리팩터. 목록 · 라이브 확인: `docs/publish.md`.
- 사용자와는 한국어로. 모든 쪽은 국문 · 영문 한 쌍(`x.html` ↔ `x-en.html`, 7쌍 14쪽).
- 자세한 것은 필요할 때 `docs/`(아래 표). 옛 원문: `_archive/claude-md-v60.md`.

## 작업 규칙

1. **게시본이 기준이다**(다른 세션도 게시). 고치기 전 Artifact `list scope=files` → `web/`과 비교 → 새로 바뀐 파일을 받아 반영.
2. `web/`에서 고치고 로컬 확인 → 게시 직전 버전 재확인(`read`, path 없이) → `root`=`web/`, `file_path`=`web/index.html`, `files`에는 바꾼 파일만(지울 파일은 `null`). 한도 · 버릇 · 함께 올릴 짝: `docs/publish.md`.
3. 이미지를 바꾸면 **파일 이름을 바꿔** 캐시를 피한다(`-k25` → `-k26`). 참조를 모두 바꾸고 옛 파일은 게시에서 지움.
4. 자료(리플렛 · 브로슈어)로 "최신화"할 때는 **기존 구역을 갱신**한다. 새 구역을 만들지 않는다.
5. **도장:** 여객기 그림 · 3D는 대한항공 2025 새 도장(`docs/livery.md`). AH-6은 군용 올리브색. 글로벌 6500은 항공기체 콘텐츠에서 제외.
6. **색 · 글꼴:** 팔레트 `--night #25282A` · `--cblue #4D5055` · `--cream #C0B7AB` · `--cream80 #A19A91` · `--gold #83735B` · `--rose #6C6463` · `--smoke #716C6C` · `--ink80 #444544`. 예외는 3D 도장색(#53AAE2 · #051766) · 금색 강조(#C2A673 · #B5A27F) · 무인기 그래픽 색. CSS는 공통 · 구역 색 토큰을 쓴다(한 자리 장면 색 · 마스크 #000 예외: `docs/design-system.md`). 글꼴은 한진그룹체(Light 300 / Bold 700).
7. **새 한글 음절**(문구 · media.json · history.json)이 생기면 `python3 tools/fonts/mkfonts.py <새 TAG>`, 옛 site · rest 조각은 게시에서 `null`. 뉴스룸 외 쪽이 `*-rest-*.woff2`를 받지 않는지 확인(`docs/publish.md` §4).
8. **성능 · 구조 변경은 보이는 것(픽셀 · 레이아웃 · 움직임 · 타이밍 · 동작)이 같아야 한다.** 전후 비교로 증명한다(`docs/verify.md`).
9. 외부 스크립트는 cdnjs · cdn.jsdelivr.net만(CSP).

## 코드 규약

- **크기:** 코드 파일 ≤ 35KB · ≤ 900줄 · 한 줄 ≤ 1000자. 데이터는 더 커도 되지만 레코드 한 줄씩(`tools/data/fmtjson.py`). `css/site.css`는 한도 근처 — 한 쪽 전용 규칙은 그 쪽 CSS에.
- 국문 · 영문 쪽은 `css/<쪽>.css` · `js/<쪽>.js`를 함께 쓴다. 영문 전용 CSS는 원래 자리에 `:where(html[lang="en"]) …`, JS는 `KA.EN`.
- **`index.html`에는 `lang`이 없다(일부러 — 넣지 않는다).** 국문 body 14px은 `css/index.css`의 `:where(html:not([lang="en"])) body`.
- CSS는 `fonts.css` → `site.css` → 쪽 CSS의 막는 `<link>`. 규칙 순서도 캐스케이드의 일부다.
- 쪽 스크립트는 body 끝의 동기 classic, 쪽마다 정해진 순서(`docs/motion.md` §3). classic은 IIFE + `'use strict'`(a3d*.js는 모듈, 예외: motion.md §1), 도우미는 `const {…}=window.KA`(가드 없음 → 함께 게시). 새 루프는 `KA.loop` + 깨우는 경로.
- **주석은 한국어로 짧게.** CSS는 `/* */`만(`//`는 다음 규칙을 조용히 없앰). JS는 `/* */` 또는 공백 · `;{}(` 바로 뒤의 `//`만(mkfonts가 이 규칙으로 주석을 빼고 음절을 셈).
- **생성 파일은 손으로 고치지 않는다:** `css/fonts.css` · `fonts/*`(mkfonts) · `img/pattern2d.*`(`tools/pattern/build.py`) · `img/aero/top-*`(`tools/render`).

- **읽기 범위 · 자동 검사:** `docs/llm-workflow.md`. 먼저 `python3 tools/verify/check.py`, 게시 전 `release.py` 확인.

## 문서

| 문서 | 읽을 때 |
|---|---|
| `docs/publish.md` | 게시 · 동기화 · 한도 · 글꼴 조각 · 리팩터 게시 목록 |
| `docs/design-system.md` | 토큰 · 부품 · 중단점 · 구역 배경 · 2D 패턴 · 캐스케이드 |
| `docs/motion.md` | `window.KA` · 스크립트 순서 · `KA.loop` · 순차 등장 · 영상 · 메인 스트립 · 연혁 |
| `docs/3d.md` | aero 3D(`js/a3d*.js`, `window.A3D`) |
| `docs/uav.md` | 무인기 `#seq`(`window.UAV` · 장 더하기) |
| `docs/livery.md` | 2025 새 도장 실측값 |
| `docs/verify.md` | 서버 · 헤드리스 · 동일성 하네스 · 기준본 · 검사 스크립트 |
| `docs/tools.md` | 폴더 · 현행/옛 도구 · 패턴 빌드 |

**폴더:** `web/`(게시 트리, 여기만 게시) · `docs/` · `dev/`(개발 페이지) · `tools/`(현행 도구, 옛 것은 `tools/_legacy/`) · `research/` · `assets/`(자료 · 원본) · `_archive/` · `_verification/` · `_out/`(기준본 · 검증 · 출력 — `.ignore`로 검색 제외, 경로로는 읽힘).

## 사이트 지도 (`web/`)

- **공통:** `css/fonts.css` · `css/site.css`, `js/site.js`(머리글 · 바닥글 · 메뉴 · 영상, `window.KA`) · `js/scroll-fx.js`(Lenis `window.KA_LENIS` + 순차 등장).
- `index`(`css/index.css` · `js/index.js`): 히어로 영상 → `#business`(고정 패널 `#aero` · `#uav` · `#mro`) → `#future` → `#news`(`data/media.json`) → `#contact`.
- `aero`(`css/aero.css` · 모듈 `js/a3d.js` → `a3d-stage` · `a3d-craft` → `a3d-geo` · `a3d-paint` · `a3d-sym`): `#mg` → `#a3d` → `#aero-more`.
- `uav`(`css/uav.css` · `js/uav-data` → `uav-kit` → `uav-scenes1` → `uav-scenes2` → `uav`): `#seq`(9장) → `#uav-more`.
- `mro`(`css/mro.css` · `js/mro.js`, 육지 `img/mro-land.svg`): `#mg` → `#depot` · `#uh60` · `#upgrade` · `#next` → `#mro-more`.
- `company`(`css/history.css` · `company.css` · `js/history.js` · `data/history.json`): `#greeting` · `#about` · `#history` · `#locations`.
- `newsroom`(`css/newsroom.css` · `js/newsroom.js`): `#news` · `#video` · `#brochure`(`data/media.json`). `careers`(`css/careers.css` · `js/careers.js`): `#jobs` · `#roles` · `#growth` · `#sites` · `#benefits` · `#process`.

## 로컬 확인

`python3 -m http.server 8768 --bind ::1`(루트, 떠 있으면 생략) → `http://[::1]:8768/web/index.html`. `localhost`가 아닌 `[::1]`(8766은 다른 앱).
