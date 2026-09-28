# 로컬 확인 · 검증

하네스 판정 · 결정성 · 잡음: `tools/verify/README.md`.

## 1. 로컬 서버

```sh
cd asd_website && python3 -m http.server 8768 --bind ::1      # 이미 떠 있으면 재실행 불필요
# 사이트 http://[::1]:8768/web/index.html · 개발 페이지 http://[::1]:8768/dev/a3d-debug.html?t=787&yaw=2.53&el=.24&d=1
```

- `localhost` 대신 `[::1]`을 쓴다. 8766 포트는 IPv4에서 다른 앱(whale_copy)이 써서 요청이 섞인다.
- 프로젝트 루트를 서비스하므로 기준본도 같은 서버에서 열린다(§3).
- **외부(Tailscale) 미리보기:** 8770 = Caddy(`tools/serve/Caddyfile`, 루트 `web/`, `ROOT` · `PORT`로 바꿈) → `http://100.115.178.23:8770/`(이 Mac의 Tailscale 주소, userspace 모드라 외부 포트 = 내부 포트). 실행: `PORT=8770 nohup caddy run --config tools/serve/Caddyfile --adapter caddyfile &`. 재부팅하면 다시 띄운다.
  - 파이썬 간이 서버는 부분 요청(Range) · 연결 재사용이 없어 영상 탐색(seek)이 안 되고(메인 히어로 800 → 1600 전환 때 처음부터 다시 재생), 아이폰 사파리는 Apple 문서상 Range가 필요하므로 외부 미리보기에 쓰지 않는다. 재생 시작 자체는 Chrome · Firefox · WebKit 모두 두 서버에서 된다(2026-09-25 검증).

## 2. 헤드리스 Chromium(Playwright)

- WebGL: `--use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist`.
- 영상이 스트리밍되므로 `networkidle` 대신 `load`로 기다린다.
- Lenis가 켜져 있으면 스크롤 전에 `KA_LENIS.destroy()`(터치 · 움직임 줄임이면 Lenis 없음).

## 3. 화면 동일성 하네스 (`tools/verify`)

```sh
tools/verify/run_all.sh <label>                                   # 기본 A=v60 기준본, B=web/ · 34화면 × PC · 폰
A='http://[::1]:8768/_archive/refactor-stage-a/' WORKERS=3 tools/verify/run_all.sh <label>
```

- 결과: `_verification/refactor/runs/<label>/summary.txt` · `compare-{pc,phone}.txt` · `pixdiff-{pc,phone}.txt` · 차이 장면 `pix-*/`. 끝 코드 0 = 차이 없음. 한가할 때 약 9분.
- 환경 변수: `A` · `B`(주소) · `WORKERS`(기본 7, 부하가 크면 2~3) · `VPS="pc"` · `TABS=`(빈 값 = 탭 제외) · `OVA` · `OVB`(빠진 파일 보충 폴더).
- 한 쪽만: `cd tools/verify; python3 cstyle.py <A> a.json.gz --vp pc --pages mro,mro-en` · 같은 명령을 B로 → `python3 compare.py a.json.gz b.json.gz --noise-stats`, `python3 pixdiff.py <A> <B> out --vp pc --pages mro,mro-en`.
  - **`--pages`를 주면 `--tabs`는 탭을 펼치지 않는다.** 탭 화면은 `company#history`처럼 직접 적거나, `--pages` 없이 `--tabs`로 34화면을 모두 돈다.
- 판정: cstyle `visual 0`이면 `NO VISUAL DIFFERENCE`, `info`(head · link · script · 요청 URL · class/style 속성)는 참고. pixdiff `differing 0`.
- `settle-timeouts` · `unsettled` · `errors`가 0이 아니면 그 결과는 믿지 않고, 한가할 때 `WORKERS`를 줄여 그 쪽만 다시 돌린다. 의심되는 차이는 **기준끼리(A↔A) 대조**를 함께 돌려 가린다.

**기준본(같은 서버, 경로만 다름)**

| 주소 | 내용 |
|---|---|
| `/_archive/pre-refactor-v60/` | v60 = 게시본(`video/`는 `web/video` 링크 — `web/video` 파일을 옮기거나 이름을 바꾸면 기준도 바뀜) |
| `/_archive/refactor-stage-a/` | Stage A 동결본(쪽별 css/js 분리 뒤). 죽은 index SVG 노드는 이미 없고, MRO 육지는 `<use>` |
| `/web/` | 후보 |

**알려진 차이 · 잡음(후보 탓 아님)**

- v60 ↔ web, index · index-en: 숨은 죽은 SVG 노드(`.af` 35 · `.xc` 6)를 지워 형제 경로가 밀려 raw 판정이 `DIFFERENCES FOUND`다. 기준 덤프에서 그 노드를 빼는 `python3 _verification/refactor/implement/runs/index/dropdead.py A.json.gz A-drop.json.gz`(tools/verify에서) 뒤 비교하거나, 그 노드가 없는 Stage A 동결본을 기준으로 쓴다.
- Stage A ↔ web, mro · mro-en: `del use.land` / `add path.land` × 3상태 = visual 12(예상된 교체, 계산값 · 상자 · 픽셀 같음). v60 ↔ web에서는 `NO VISUAL DIFFERENCE`.
- uav: `<head>`의 주입 `<style>`이 빠진 것은 info.
- 폰 pixdiff `index-en y=0 px=3 max=68`(`.scue-l` 빛 줄기 맨 윗줄): A↔A에서도 3번에 1번 나는 간헐 잡음(noise.json에서 메인의 .scue-l만 픽셀 비교 제외, 스타일은 계속 비교).
- 부하가 크면 company(-en)#history 카드 루프가 수렴하지 못해 unsettled가 난다. WebKit은 글자 폭 소수 px · 줄 꺾임 차이가 기준끼리도 난다.

## 4. 하네스가 가리는 곳 — 따로 비교

- **3D:** 하네스는 WebGL 그리기를 건너뛰고 캔버스를 가린다. 모델 · 프레임 동일성은:
  - `_verification/refactor/implement/runs/a3d/fp.py [chromium|webkit|firefox] [ab|ba]` — 두 craft로 여섯 기종을 만들어 형상 · 변환 · 재질 · 텍스처 픽셀 · beats 지문 비교(기준 · 후보 경로는 `fp.html`에 적혀 있음).
  - `runs/a3d-check/probe.py` — 모델 직렬화 + 세 시점 `readPixels`.
  - `runs/a3d/ident/`(`job.sh` · `tl.py` · `cmp_all.py`, 원본 `_verification/perf/final-verify/aero-identity/`) — 가짜 시계로 프레임 · DOM 동일성. 부하가 크면 첫 프레임 t0가 밀리므로 같은 t0끼리만 판정.
  - `runs/a3d/dbg/run.sh` — `dev/a3d-debug` 사본으로 정지 렌더 30장.
- **무인기 `#seq` 장면**(`#scene` · `#labels` · `#giants` · `#plates`): uav.md §5.
- **CSS 계산값 전수(숨은 요소 · 호버 · 너비 16가지):** `_verification/refactor/stage-b/css-check/`(`capture.py` → `statdiff.py`), `css-probe/`(`cssdiff.py --flips` 규칙 순서 · `interact.py` 호버/초점 · `xengine.py` WebKit · Firefox).
- **동작(메뉴 · 탭 · 영상 · 연혁 · 뉴스룸):** `_verification/refactor/stage-b/runs/js/scripts/`(`fstate.py` · `finteract.py` · `fbehave.py`).

## 5. 검사 스크립트

서버 없이 `python3 tools/verify/check.py`: 크기 · 참조 · JS 구문 · 릴리스 URL 검사. 게시 목록 생성과 읽기 범위: llm-workflow.md. 아래 도구는 서버 8768.

`BASE`(기본 `http://[::1]:8768/web/`, 끝 `/` 없어도 됨)로 기준본에도 같은 검사를 돌린다. 출력 경로 인자는 `_out/<도구>/<이름>`으로 준다.

| 명령 | 하는 일 |
|---|---|
| `python3 tools/aero3d/smoke.py` | 14쪽: 페이지 · 콘솔 오류 · HTTP ≥400 · 깨진 이미지 |
| `tools/aero3d/beats.py URL "i:phase,…" out W H [cols]` | 장면별 캡처(phase = arr · spin · p0…) |
| `tools/aero3d/flow.py i out` | 한 바퀴 회전 · 첫 부위 카메라 이동량(BASE) |
| `tools/aero3d/fallback.py` | WebGL 없음 · CDN 차단 · 모바일 높이 변화 · 회전 중 탭(BASE, 캡처는 `OUT`, 기본 `_out/aero3d/`) |
| `tools/aero3d/slowfont.py` | 글꼴이 늦으면 기체를 다시 만드는지(BASE) |
| `tools/aero3d/strip.py` | 메인 항공기체 스트립 캡처 · 카드 수(BASE · `OUT`) |
| `tools/aero3d/probe_v2.py 787,…` · `nan2.py 787` · `probe_parts2.py` | `dev/gltest.html`에서 면 방향 · NaN 좌표 · 부위(주소 고정) |
| `tools/aero3d/multi.py '<a3d-debug 주소>?t=787' "yaw=1;yaw=2" out W H` · `shot.py URL out [W H]` | 디버그 페이지 여러 각도(`;`로 나눈 매개변수) · 한 장 |
| `tools/rvaudit/seqaudit.py W H [쪽] > out.json` → `seqreport.py out.json` | 32화면 순차 등장: 누락 · 겹침 · 멈춤 · 순서 · 지연(PC · 폰 각 약 10분) |
| `tools/rvaudit/tabswitch.py W H` | 아래 Next 링크로 탭을 바꾼 뒤의 순서 |
| `tools/pattern/shot.py 엔진 W H DPR out [쪽…]` | 2D 패턴 요소만 드러내 캡처(BASE, `OLD=1`은 깨짐 — tools.md) |

## 6. 글꼴 불변식

- `python3 tools/verify/fontset.py [web 폴더]`: 원문(주석 · `fonts.load(…)` 제외)의 한글 음절이 모두 site 조각에 있으면 0. 지금 `쓰인 514 · site 515 · 없는 0 · 안 쓰는 1('촬')`.
- `python3 tools/fonts/mkfonts.py --check`: 0 · 1 · 3 · 2(publish.md §2). 리팩터 뒤 음절 집합이 바뀌면 글꼴을 다시 만들기 전에 원인(옮긴 주석 · 문구)부터 찾는다.
