# 폴더 · 도구 목록 (현행 · 옛)

검사: verify.md · 게시: publish.md.
`_archive/` · `_verification/` · `_out/` · `research/` · `assets/` · `tools/_legacy/` · `tools/pylib/`는 `.ignore`로 기본 검색에서 빠진다(경로를 주면 읽힘).

## 1. 최상위

| 경로 | 내용 |
|---|---|
| `web/` | 사이트 원본 = 게시 트리. 여기만 게시한다. 문서 · 도구를 넣지 않는다 |
| `docs/` | 이 문서들(게시 안 함, mkfonts도 읽지 않음) |
| `dev/` | 개발 페이지(게시 안 함, `../web/js/…`를 불러옴): `a3d-debug.html`(3D 한 대 정지 렌더, 3d.md §4) · `symtest.html`(태극 도형) · `gltest.html`(WebGL 빈 페이지 — `nan2` · `probe_v2` · `probe_parts2`가 여기서 a3d-craft.js를 불러옴) |
| `tools/` | 빌드 · 검사 스크립트(§2 · §3) |
| `research/` | `livery25/`(livery.md) · `ac/`(기종별 공항 계획 문서: 3면도 · 치수) · `ref3d/`(3D 참고 사이트 캡처: `refs/` jpg 363 · `archer_tt.mp4` · `joby.mp4` · `log_*.txt`) · 참고 사이트 캡처(`bm*` · `ref2` · `sub` · `measure` · `mobile` · `hanwha` · `fetched-pages` 등) · 옛 사이트 자료(`kal*` · `old-site-screens` · `mroimg` · `leaf` · `aeroimg`) |
| `assets/` | 원본 영상 · 사진 · 리플렛 · 발표자료, 한진그룹체 원본(`HanjinGroupSans-*.woff2`, mkfonts가 읽음) |
| `_archive/` | `pre-refactor-v60/`(v60 기준본) · `refactor-stage-a/`(Stage A 동결본) · `claude-md-v60.md`(줄이기 전 CLAUDE.md 원문) · `live-snapshots/live*` · `release*`(지난 게시) · `dev-mirrors/site_*` · `web-local-before-sync-20260925/` · `replaced-2026092*`(게시에서 바뀐 옛 파일, 예 `pattern.webp`) · 영상 프레임 · 인코딩 기록(`biz-video-frames` · `uav-seq-frames` · `video-encode-logs`) · `move_log_20260925.json` |
| `_verification/` | 검증 결과(스크린샷 · 측정). `perf/`(3D 메모리 · 동일성 근거), `refactor/`(이번 리팩터: understand · implement · stage-b · stage-c · runs) |
| `_out/` | 도구 출력(`aero3d/` · `rvaudit/` · `shots/` · `hv/` · `r3d/`), 비교용 링크 트리(`datacheck/` · `stageb-*`), 이동 기록 `move_log_20260926.tsv` · `move_log_20260927.tsv` |
| 루트 | `KoreanAir_BrandGuidelines_MAR2025.pdf`(pattern/build.py가 읽음) · Premiere 프로젝트(`무제.prproj` · Auto-Save 폴더 — 옮기지 않음) · `.ignore` |

## 2. 현행 도구

| 경로 | 쓰임 |
|---|---|
| `tools/verify/` | 화면 동일성 하네스(check · release · manifest · cstyle · compare · pixdiff · run_all · fontset, README.md) |
| `tools/aero3d/` | smoke · beats · flow · fallback · slowfont · strip · multi · shot · nan2 · probe_v2 · probe_parts2(verify.md §5) |
| `tools/rvaudit/` | seqaudit · seqreport · tabswitch(순차 등장) |
| `tools/fonts/mkfonts.py` | 한진그룹체를 겹치지 않는 unicode-range 3조각 + `web/css/fonts.css`로(publish.md §4). `--check`. `import`로 `syl()` · `used()`만 쓰면 fontTools가 필요 없다 |
| `tools/data/fmtjson.py` | `web/data/*.json`을 레코드 한 줄씩으로(값 · 순서 그대로). `--check` |
| `tools/pattern/build.py` | 브랜드 2D 패턴(§4) |
| `tools/pattern/shot.py` | 패턴 요소만 흰색으로 드러내 캡처(탭은 `careers.html#process`처럼). **`OLD=1`은 깨져 있다**: 마스크를 `/web/img/pattern.webp`에서 읽는데 그 파일은 `_archive/replaced-20260926/`로 갔다 |
| `tools/render/` | 메인 스트립용 위에서 본 기체: `masks.py`(svgs.json → `m_*.png`) → `shade2.py <기종…>` → `top_<기종>.webp`. **`tools/render`에서 실행**(cwd의 `svgs.json` · `m_*.png` · `meta.json` · `HanjinGroupSans-Bold.ttf`를 읽음). 인자 없이 돌리면 제외된 g6500까지 만드니 기종을 지정한다. 결과는 **새 이름으로 복사**해 `web/img/aero/top-<기종>-k26.webp`(AH-6만 `top-ah6.webp`) — 메인 `#aero` 스트립과 aero 3D 대체 목록이 같은 파일을 쓴다 |
| `tools/hv/` | 영상 인코딩: `enc.sh` · `encF.sh`(2-pass x264) · `track.py`(기체 중심 키프레임 → `fcF*.txt`, encF.sh가 읽음) · `cuts.txt` · `fc*.txt`(입력). 두 .sh의 `FF`와 `S`(`cd` 할 작업 폴더)는 옛 세션 scratchpad 경로다 → `FF=tools/pylib/imageio_ffmpeg/binaries/ffmpeg-macos-aarch64-v7.1`, `S`는 출력 폴더(`_out/hv` 등)로 바꿔 쓴다 |
| `tools/pylib/` | imageio-ffmpeg(ffmpeg 바이너리) |
| `tools/serve/Caddyfile` | 외부 미리보기 서버(verify.md §1) |

- 메인 히어로 `web/video/hero2-800/1600.mp4`: 원본이 H.264 Level 6.2 · 시간 단위 1/1,000,000으로 잘못 표기돼 있어, 재인코딩 없이 Level 4.0 · 30 fps로 고친 파일이다(프레임 동일). 재생은 motion.md §6.

## 3. 옛 도구 `tools/_legacy/` (기록용 — 다시 돌리지 않음)

옛 포트 8766 · 옛 스냅샷(`live23` · `live24`) · 옛 scratchpad 경로 · 참고 사이트에 묶여 있다. 2026-09-27에 모음(`_out/move_log_20260927.tsv`).

| 경로 | 내용 · 주의 |
|---|---|
| `aero3d/` | 참고 사이트 탐침(`apple_closer` · `archer_drag` · `iair_click` · `probe` · `scan` · `shoot`, 출력은 옛 scratchpad), 앞 세대 탐침(`nan` · `probe_n` · `probe_parts` · `probe_v` → 지금은 `nan2` · `probe_v2` · `probe_parts2`), `jm.py`(jobyaviation), `page.py`(→ `beats.py`), `sheet.py`(`refs/*.jpg` 모음 — `research/ref3d`에서 실행), **`build_page.py`**: #a3d 없는 옛 aero.html에 3D 구역 · CSS · importmap을 끼워 넣던 것. 지금 돌리면 CSS가 인라인으로 중복되고 없는 `fonts/HanjinGroupSans-Bold.woff2` preload를 넣는다 — 돌리지 않는다 |
| `rvaudit/` | `audit.py` · `bp.py` · `uav.py`(localhost:8766) |
| `render/` | `shade.py` · `shade2_v1.py`(앞 버전, `shade2_v1`은 절대 글꼴 경로) — 돌린다면 `tools/render`에서 |
| `scripts/` · `shots/` | 일회성 작업 · 캡처(localhost · 8766 · 외부 사이트) |
| `r3d/` | `file://` 렌더러(`run2.py`는 `out2/`에 씀 — 먼저 `mkdir out2`, 옛 출력은 `_out/r3d/`) |
| `mxstrip/` | `live24` 스냅샷 기준 문자열 패처: MRO/U 사진 벽(`patch` · `patch2`) · 항공기체 스트립(`patch3`) · 무인기 라벨(`patch_uav`) · scroll-fx 등장(`patchfx`) |
| `mrobuild/` · `mromap/` · `mronews/` | MRO/U 상세 조립 · 지도(`land50.json`) · 뉴스 데이터. `assemble.py`는 자기 폴더 기준 `../live23`(없음)으로 chdir해 파일을 **제자리에서 고친다** — 쓰려면 `_archive/live-snapshots/live23`의 사본을 가리키게 바꾼다. `build_mro.py`는 `../mromap/map.json`을 읽고 아직 인라인 `<path class="land" d=…>`를 만든다. `mrobuild/mro.css`는 **옛 사본**(진짜는 `web/css/mro.css`) |

## 4. 2D 패턴 `tools/pattern/build.py`

- 브랜드 가이드 PDF의 원본 타일(쐐기 도형) → 이음매 없는 `web/img/pattern2d.svg`(1080px 배율)와 연혁 카드용 `pattern2d-hx.webp`(560px 배율 래스터, 600×450, 반복 없음). `--check`는 원본 타일과 픽셀 비교. SVG는 요소/닫힌 부분 경로 사이에서 줄바꿈하며, 좌표는 그대로다.
- SVG에 크기 · viewBox가 없어 1단위 = 1 CSS px, 배율 · 위상은 파일 안에 고정. **그리는 범위는 8192×1100px** — 더 큰 요소에 깔면 `build.py`의 범위를 늘린다.
- PDF의 XStep · YStep(269.179×174.42)은 그림의 실제 주기(269.1771×174.4111)보다 조금 크다. 경계 쐐기를 온전한 한 도형으로 모아 `<use>`로 이으므로 이음매가 없다. 예전 `pattern.webp`는 반복용 타일이 아니어서 1080px마다 어긋났다.
- CSS 쪽(마스크 · `round(…,1px)` 정수 px · 연혁 카드가 webp를 쓰는 까닭)은 design-system.md §5.

## 5. 생성 파일 — 손으로 고치지 않음

`web/css/fonts.css` · `web/fonts/*.woff2`(mkfonts) · `web/img/pattern2d.svg` · `pattern2d-hx.webp`(pattern/build.py) · `web/img/aero/top-*.webp`(render 결과 복사). `web/data/*.json`은 손으로 고쳐도 되지만 게시 전에 fmtjson으로 정리한다. `web/img/mro-land.svg`는 MRO 지도 육지 모양의 유일한 원본이다(`js/mro.js`가 fetch).
