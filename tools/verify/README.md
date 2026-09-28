# tools/verify — 화면 변화 0 리팩터링 검증

기준(동결 스냅샷 `_archive/pre-refactor-v60/`)과 후보(`web/`)를 같은 절차로 열어
**계산된 스타일 · 위치 · 구조**(cstyle)와 **화면 픽셀**(pixdiff)을 비교한다. `web/` · `_archive/`는 건드리지 않는다.

## 한 번에

```sh
cd asd_website && python3 -m http.server 8768 --bind ::1      # 이미 떠 있으면 생략
tools/verify/run_all.sh <label>                               # 한가할 때 약 9분(아래 시간)
```

- 결과: `_verification/refactor/runs/<label>/summary.txt`(판정 · 단계별 시간), `compare-{pc,phone}.txt`, `pixdiff-{pc,phone}.txt`, 차이 난 장면 이미지 `pix-*/<page>/NN_yY_{a,b,diff}.png`.
- 끝 코드 0 = 차이 없음. 14쪽 + 탭 화면 20개(회사소개 · 뉴스룸 · 인재채용의 두 번째 이후 탭) = 34개 × PC(1440×900) · 폰(390×844, DPR 3, 터치).
- 환경 변수: `A` · `B`(주소), `OVA` · `OVB`(빠진 파일 보충 폴더, 기본 없음), `TABS=`(빈 값이면 탭 제외), `WORKERS`(기본 7), `VPS="pc"`.
- 노이즈 재보정: `B="http://[::1]:8768/_archive/pre-refactor-v60/" tools/verify/run_all.sh calib-…` → 기준끼리 0이어야 한다.
- 한 페이지만: `python3 cstyle.py URL a.json.gz --pages mro,mro-en` 두 번(A · B) → `python3 compare.py a.json.gz b.json.gz`, `python3 pixdiff.py A B out --pages mro`.
  - `--pages`를 주면 `--tabs`는 탭을 펼치지 않는다(`common.page_list`). 탭 화면은 `company#history`처럼 직접 적거나, `--pages` 없이 `--tabs`로 34화면을 돈다.
- 기준본은 둘: `_archive/pre-refactor-v60/`(v60 = 게시본, 기본값) · `_archive/refactor-stage-a/`(Stage A 동결본). 기준별로 알려진 차이(index 죽은 SVG 노드 · mro `use.land` → `path.land` · uav 주입 `<style>`)와 간헐 잡음(폰 `index-en y=0 px=3 max=68`, `.scue-l` 빛 줄기 — A↔A에서도 남)은 `docs/verify.md` §3.

## 도구

| 파일 | 하는 일 |
|---|---|
| `cstyle.py BASE OUT.json.gz [--vp pc\|phone] [--pages index,company#about] [--tabs] [--overlay DIR]` | 페이지마다 S0(열자마자 맨 위) → S1(0.6화면씩 끝까지 내린 뒤) → S2(다시 맨 위)에서 모든 요소의 경로(태그:n번째 사슬) · 속성 · 직계 글 · 문서 기준 위치(0.01px) · 계산된 스타일(요소 · ::before · ::after · ::marker · ::placeholder)과 콘솔 오류 · 실패 요청 · 요청 URL을 gzip JSON으로 |
| `compare.py A B [--noise-stats] [--ignore-props p,q] [--ignore-file x.json] [--json out]` | 페이지 · 상태별로 구조(add/del/mv) · 속성 · 글 · 위치(>0.5px) · 스타일 차이를 (속성, 전 → 후)로 묶어 보고. `--derive-noise noise.json`은 남은 차이를 auto 항목으로 더함 |
| `pixdiff.py A B OUTDIR [--vp] [--tabs] [--max-shots 25]` | 두 주소를 나란히 열어 0, 1화면, 2화면 … 끝(최대 25장)에서 찍고 픽셀 비교(다른 픽셀 수 · 최대 채널 차), 차이 있는 장면만 이미지로 |
| `common.py` | 공통 절차(안정 대기 · 애니메이션 고정 · 스크롤 · 탭 열기 · 브라우저 재시작) |
| `noise.json` | 보정된 노이즈 규칙(아래) |

**판정:** `visual`(스타일 · 위치 · 글 · 구조 · 보임 여부 · `class`/`style` 외 속성 · 새 콘솔 오류 · 실패 요청)이 0이면 `NO VISUAL DIFFERENCE`.
`info`는 참고만: `a:class` · `a:style`(효과는 계산된 스타일로 따로 비교), head · script · style · link 차이, 요청 URL 집합 차이(새 css/js 파일), 불러온 글꼴 목록.
리팩터링으로 클래스 이름만 바뀌면 경로(태그 사슬)가 같으므로 info만 나온다. 같은 부모 아래 같은 태그 수가 달라지면(요소를 넣거나 뺌) 그 무리와 자손은 (라벨, 글) 순서 맞춤으로 짝지어, 실제로 더하고 뺀 요소만 add/del(visual), 밀린 요소는 mv(info)로 나온다.
보고서는 같은 요소들에서 함께 바뀐 파생 속성(color → border-*-color …)을 한 줄로 묶고, 앞 상태와 같은 묶음은 `— S0과 같은 묶음`으로 줄인다.

## 결정성을 위해 하는 일

- **안정 대기(settle):** 값이 실제로 바뀐 DOM 변이가 0.7초 · 10프레임 동안 없고(부하로 프레임이 느리면 시간만으로는 수렴 중인 루프 사이에 조용함이 채워짐), 도는 유한 CSS 애니메이션 · 전환, 화면 안 미완료 이미지, 5초 이하 `setTimeout`(순차 등장의 `rv-end`), 진행 중 요청(영상 제외)이 없고, 글꼴이 다 올 때까지(최대 25~30초). 넘기면 한 번 더 기다린다(settle2). 그래도 넘기면 `settle-timeouts` · `unsettled`로 보고한다. 같은 값을 다시 쓰는 변이(3D의 `classList.remove` · `tabIndex`)는 셈하지 않음.
- **찍기 직전 고정:** `document.getAnimations()`의 유한 애니메이션은 `finish()`, 무한 반복은 `pause()` + `currentTime=0`, 영상은 멈춤(찍은 뒤 되살림). CSS를 주입해 끄지 않음.
- **내리기:** Lenis `destroy()` 뒤 `scrollTo(behavior:'instant')`, 걸음마다 rAF 2번(3D · 무인기 루프가 그 위치를 한 번은 처리).
- **탭:** `#hash`로 바로 열면 브라우저 조각 스크롤과 site.js의 맨 위 복귀가 경합해 등장 상태가 실행마다 달라지므로, 기본 화면을 연 뒤 머리글 메뉴 링크를 눌러 연다(사용자 탭 전환과 같은 경로).
- **WebGL 그리기 호출은 건너뜀**(`draw*` · `clear` 무효): 캔버스는 어느 쪽도 비교하지 않고, 3D 연출의 DOM(설명선 · 레일 · 방위 눈금)은 그대로 계산된다. aero 픽셀 비교 290초 → 50초. `--gl-draw`로 되살림.
- **CPU 래스터 · 부분 래스터 끔**(`--disable-gpu-rasterization --disable-partial-raster`): SwiftShader GPU 래스터는 사선 · 가는 선 안티앨리어싱이, 부분 래스터는 MRO 지도처럼 일부만 다시 그리는 곳의 경계가 실행마다 1px씩 달라짐.
- **1초 이상 주기의 `setInterval`은 돌리지 않음**(연혁 카드 사진 2.8초 교차): 어느 사진이 보이는지가 시각에 따라 달라짐. 주기만 `doc.iv`로 기록해 비교(첫 사진 상태로 고정).
- 찍기 전 고정 뒤 rAF 3번 + 0.15초: 끝낸 transform 애니메이션 층이 최종 배율로 다시 래스터된 뒤에 찍음.
- 계산된 값 속 절대 URL에서 기준 주소를 떼어 두 주소를 같은 이름으로 비교.
- 사용자 정의 속성(`--*`)은 기본 제외(`--custom`으로 포함) — 효과는 풀린 표준 속성에 이미 반영.
- 브라우저가 죽거나(다른 작업이 headless 브라우저를 정리) · 시간 초과 · 연결 오류(`ERR_CONNECTION_TIMED_OUT` 등 — python http.server는 대기열이 5라 동시 요청이 많으면 연결을 못 받음)가 있으면 그 페이지를 새 브라우저로 최대 2번 다시 한다. 그래도 남으면 errors로 센다.

## noise.json

| 키 | 내용 · 이유 |
|---|---|
| `settle_ignore` | 늘 움직여 안정 판정에서 빼는 곳: `.fl-track`(메인 스트립, 80초 한 바퀴) · `.pk-prog` · `.a3-co`(3D 설명선, 카메라가 `sin(time)`으로 흔들림) |
| `pix_hide` | 픽셀 비교에서 가리는 곳(visibility:hidden + opacity:0): 영상 · 캔버스 · 스트립 · 3D 설명선 · 무인기 장면 `#seq #scene · #labels · #giants · #plates`(장면 안 상태가 지나온 프레임 경로에 따라 달라짐 — 같은 위치라도 곧바로 온 것과 거쳐 온 것이 420px 다름). 메인 `.hero .scue-l`도 가림(기준끼리도 폰 y=0에서 3px 잡음). 이 요소들의 스타일 · 구조는 cstyle이 비교 |
| `pix_tol` | 1: 채널 차 1(1/255) 이하 무시 — 무인기 제원 줄처럼 변환 중인 글자의 반올림 차. 색 1단계 변화는 cstyle이 잡음 |
| `pix_zones` | `.hx-card` 안은 24까지 허용: 연혁 카드 루프가 멈출 때 마지막 프레임을 건너뛰어(`|p-lastP|<.00005`) 가운데 카드가 translate 0.1px · scale 0.9999만큼 실행마다 달라짐(글자 가장자리 4~5단계) |
| `margin_if_same_box` | flex `margin:auto`(머리글 nav)를 Chromium이 레이아웃 이력에 따라 378.6px 또는 0px로 돌려줌 → 상자가 같으면 여백 차이는 무시 |
| `attr_subs` | `style` 속성의 `--d` · `--dl`(순차 등장 지연, 판정 시각마다 다름) 값을 `*`로 |
| `rules` | ① `.fl-track` 아래 x 위치 · transform · style ② `.a3-c` 아래 같은 것 ③ `style`에 `--d:`가 있는 요소와 그 아래의 `transition-delay` |
| `auto` | `compare.py --derive-noise`가 채우는 페이지 · 경로별 항목(현재 비어 있음 — 위 규칙만으로 기준끼리 0) |

양쪽 모두 **안 보이는 요소**(상자 없음 · `visibility` · 조상까지 곱한 불투명도 0)의 차이는 `hidden-both`로 세기만 한다. 무인기 `#seq`의 지나간 장면처럼 숨은 요소에 남은 값이 경로에 따라 다르기 때문. 그 요소가 보이는 상태(다른 스크롤 위치 · 탭)에서는 비교된다.

리팩터링이 위 선택자 · 클래스(`.fl-track` · `.a3-co` · `.a3-c` · `#seq #scene` 등) · `--d` 이름을 바꾸면 noise.json도 같이 바꾼다(안 바꾸면 그 자리에서 차이가 난다).

## 민감도 확인

기준을 복사해 `css/site.css`의 `--cream80`을 `#A19A91 → #A19A92`(1/255), `.btn` 간격을 `28 → 29px`로 바꾼 사본과 index를 비교:
cstyle은 두 변경을 모두 잡고(`s:color,… rgb(161,154,145) → (161,154,146) ×139`, `s:column-gap 28px → 29px`, 버튼 `r.wh`), pixdiff는 버튼이 1px 밀린 9장을 잡는다(색 1단계는 pix_tol 아래 — cstyle 몫).

## 기준 스냅샷 주의

- 처음 아카이브에는 `img/video/*.webp`(뉴스룸 홍보영상 탭 썸네일 8장)가 빠져 있었다(09-26 22:17에 채워짐 — `_verification/refactor/baseline-overlay/img/video/`와 같은 파일). 빠진 파일이 또 생기면 `OVA=폴더`(`--overlay`)로 기준 쪽 요청만 채울 수 있다.
- `_archive/pre-refactor-v60/video`는 `../../web/video`를 가리키는 링크다. 영상 파일을 바꾸거나 옮기면 기준도 따라 바뀐다(영상은 비교 대상에서 가려지지만 요청 URL · 포스터는 영향).

## 시간(14코어 Mac, 작업 7개, 탭 포함 34개 화면)

| 단계 | 한가할 때 | 다른 브라우저 작업이 몰릴 때(load 150~240) |
|---|---|---|
| cstyle A · B 동시 + compare, PC | 112초 | 532초 |
| pixdiff PC(258장) | 163초 | 1177초 |
| cstyle A · B 동시 + compare, 폰 | 97초 | 258초 |
| pixdiff 폰(278장) | 148초 | 345초 |
| 합계 | **520초(8분 40초)** | 2312초 |

- 부하가 크면 연혁 가로 무대(`.hx`)의 카드 루프가 초당 1프레임도 못 돌아 수렴하지 못하고(`unsettled`), 3D 페이지 열기가 2분을 넘기기도 한다. summary에 `settle-timeouts` · `unsettled` · `errors`가 0이 아니면 그 차이는 믿지 말고, 한가할 때 · `WORKERS`를 줄여 그 페이지만 다시 돌린다.
- 덤프 크기: cstyle 한 벌(34화면 × 3상태) gzip 약 4~5MB.
