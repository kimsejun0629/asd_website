# 디자인 시스템 (web/css)

**규칙 순서도 중요**

## 1. 파일과 불러오는 순서

막는 `<link>` 순서: `css/fonts.css` → `css/site.css` → 쪽 CSS다.

| 쪽 | 쪽 CSS |
|---|---|
| index · index-en | `index.css`(국문 body 14px · 히어로 2:1/화면 높이 제한 · `.hv-copy` · `.hero-intro`) |
| aero | `aero.css`(3D #a3d) |
| uav | `uav.css`(#seq 무대, 맨 끝에 #seq 등장 규칙) |
| mro | `mro.css` |
| company | `history.css` → `company.css` |
| newsroom · careers | `newsroom.css` · `careers.css` |

- `fonts.css`는 `tools/fonts/mkfonts.py`가 만든다(손대지 않음).
- 국문 · 영문이 같은 파일을 쓴다. 영문 전용 규칙은 원래 자리에 `:where(html[lang="en"]) 선택자`로 둔다(명시도 0).
- `site.css`는 16개 구역이고 목차는 파일 머리에 있다. 16(`.bz-*` · 버튼 줄)은 **파일 맨 끝**에 둔다.

## 2. 토큰 (`site.css` 1 `:root`)

| 이름 | 값 | 역할 |
|---|---|---|
| `--night` `--cblue` `--cream` `--cream80` `--rose` `--smoke` `--gold` `--ink80` | 브랜드 팔레트(CLAUDE.md) | 면 · 글 · 강조 |
| `--night-rgb` `--cblue-rgb` `--cream-rgb` `--gold-rgb` | `37 40 42` 등 | 투명도용: `rgb(var(--night-rgb) / .72)` = `rgba(37,40,42,.72)` |
| `--gold-hi` · `--gold-hi-rgb` | `#B5A27F` | 금색 강조(3D 점 · 번호) |
| `--shade-rgb` · `--shade2-rgb` | `20 21 22` · `29 31 33` | 사진 · 영상 위 어둠(글자 그림자 · 가림막) |
| `--paper-rgb` · `--drop` | `250 247 242` · `rgba(0,0,0,.28)` | 도면 종이 · 그림자 |
| `--line` `--line2` / `--lineK` | 크림 .16 · .28 / 나이트 .3 | 어두운 면 선 / 밝은 면 선 |
| `--fs-lbl` `--ls-lbl` | 12px · .14em | 라벨(`.lbl`과 같은 역할) |
| `--fs-h2` `--lh-h2` `--ls-h2` | clamp(34px,4.2vw,60px) · 1.12 · -.035em | 구역 제목(`.h2`, `.gside h1/h2`) |
| `--ls-h1` · `--ls-num` | -.045em · -.05em | 큰 제목 자간 · 큰 숫자 자간 |
| `--m` `--hh` `--sat` `--sab` `--hdr` | 48px · 76px · 안전 영역 | 좌우 여백 · 머리글 높이(≤900: 20px+ · 60px) |
| `--gut` | 24px | 격자 칸 사이(`column-gap`, flex `gap`은 제외) |
| `--hero-ar` | 4 / 1 | 영상 히어로 틀 · cover |
| `--z-header` `--z-menu` `--z-pt` | 30 · 40 · 80 | 머리글 · 폰 메뉴 · 화면 전환 막 |
| `--ease-std` `--ease-roll` `--ease-line` `--ease-img` `--rv-ease` | cubic-bezier | 곡선 |
| `--t-ui` `--t-line` `--t-roll` `--t-img` `--t-rv` | .3s std · .5s line · .45s roll · 1s img · 1.1s rv | 5번 이상 쓰인 길이+곡선 |

**구역 색 토큰**은 `.sec`와 `.sec.light`에만 정의된다: `--fg`(글) · `--sub`(보조 글) · `--ln`(윗선) · `--ln0`(옅은 선) · `--acc`(강조) · `--pan`(옅은 판).
두 면에서 값만 바뀌는 색은 `.light X{…}` 대신 이것을 쓴다. `.sec` 밖(머리글 · 메뉴 · 메인 `.biz`)에는 없다. 메인 `.bp-a/b/c`는 `--ln` · `--sub`를 스스로 정한다.

JS · 인라인 참조 속성(이름 보존): `--k` `--pin` `--open` `--d` `--dl` `--rv-line` `--rv-lo` `--i` `--n` `--sx` `--plx` `--gk` `--cw` `--ih` `--iw` `--ly` `--r` `--len`.

## 3. 부품

| 클래스 | 하는 일 · 변형 | 파일 |
|---|---|---|
| `.lbl` · `.mk` | 라벨 · 금색 대시 표지 | site 3 |
| `.ul` · `.tl` | 금색 밑줄(`.on`은 늘 그어짐) · 글 밑줄 | site 3 |
| `.btn` `.roll>span` `.arw` | 버튼 · 글자 굴림 · 화살표. 색 `.b-cream` `.b-line`(어두운 면) · `.b-ink` `.b-inkline`(밝은 면) | site 3 |
| `.sec` `.side` `.main` `.full` · `.gside`(`.wide`) | 12칸 구역 · 왼쪽 머리글 | site 4 |
| `.h2` `.lead` `.body` | 구역 제목 · 도입 · 본문 | site 4 |
| `.card`(`.fr` 확대) · `.row`/`.row-d` · `.chip` | 카드 · 행 · 거르개(`aria-pressed`) | site 5 |
| `.gh` · `.mm` · `.pt` · `.subnext` · `.gf` | 머리글 · 폰 메뉴 · 화면 전환 · 다음 탭 · 바닥글(site.js) | site 6~10 |
| `.ph`(`.pv`, `.w`, `.bare`, `.snd`, `[data-hero-tabs]`) | 히어로 · 탭 표제 `data-hero-label` | site 11 |
| `.pat-v` · `.pat-w` · `.gf::before` | 2D 패턴 | site 12 |
| `[data-rv]` t · fade · img · rule · fl, `.scue` | 순차 등장 · 스크롤 안내 | site 14 |
| `.bz-pf` · `.bz-act` `.uav-act` `.cta-act` | 핵심 이력 · 버튼 줄(≤900 늘림, ≤600 세로) | site 16 |

## 4. 중단점

- **너비:** 600 · **900 | 901**(주 경계) · 1080(영문 메인, 901~1080) · 1100(목록 칸 수) · 1180(무인기, 901~1180). 374에는 지금 규칙이 없다.
- **높이:** 520(무인기 가로 폰) · 680(메인 패널 고정, ≥901과 함께) · 720(무인기 세로 폰). 390은 검사 화면(844×390)일 뿐이다.
- **JS 사본(함께 바꾼다):** 900 · 901 = `KA.MQ`(site.js) · a3d.js `(max-width:900px)`, 680 = `KA.MQ.stack`, 600 · 900 = history.js 무대 폭.
- 범위 문법(`width<=900px`)은 쓰지 않는다(옛 Safari가 규칙째 버림, 소수 너비에서 뜻이 달라짐 — 900.5px은 900도 901도 아님).

## 5. 구역 배경 교차 · 2D 패턴

- 히어로 뒤 구역은 밝음(`.sec.light`) · 어두움을 번갈아 둔다(메인: 항공기체 밝음부터, 인재채용: 채용 공고 어두움부터).
- 구역 색을 바꾸면 부품 색이 구역 토큰으로 따라온다. 토큰과 값이 다른 곳(인재채용 `.ben`)만 `.sec:not(.light)` 규칙으로 둔다.
- 패턴은 `img/pattern2d.svg` 한 장(`tools/pattern/build.py`가 만듦)을 요소 크기 그대로 마스크로 깔고, `::before` 크기는 `round(…,1px)`로 정수 px.
- 연혁 카드는 구운 `img/pattern2d-hx.webp`를 쓴다(history.css, Firefox 성능).

## 6. 캐스케이드 주의

- **순서가 결과를 바꾸는 곳**(site.css 머리 주석에 적힘):
  - `.ph` 높이: 11 → 13(≤900)
  - `.ph.pv` 비율: 11 기본 → 11 안의 ≤900
  - 13 ≤900 모음은 1~12 뒤
  - 쪽 CSS도 파일 안 순서를 바꾸지 않는다(특히 index · uav의 영문 묶음, uav 끝 #seq 규칙).
- **`.ms` 충돌:** mro.css의 `.ms`가 폰 메뉴 `.mm nav .ms`에도 걸려 MRO/U 쪽에서만 하위 목록이 세로 · 위 여백 24px이다. 지금 화면이라 둔다.
- **index.html에는 `lang`이 없다**(넣지 말 것). 국문 body 14px은 index.css 5행(머리 주석 바로 뒤)의 `:where(html:not([lang="en"])) body`다.
- **곡선 없는 전환**(기본 `ease`: `.chip` 배경 .25s, aero · uav의 .3~.5s 등)은 그대로 둔다. `--ease-std`로 바꾸면 움직임이 바뀐다.
- **`!important`**
  - site.css: `[hidden]` · `.ph.pv` 높이 · Lenis · `html.rv-now` · `[data-rv="rule"]` 그림자 · 움직임 줄임 규칙들
  - index.css: `.fleet.drive .fl-track` · 움직임 줄임
  - uav.css: `.stage.m-all .phs`
- **쓰지 않는 것**
  - `@layer`: `!important`의 우선순위가 층 사이에서 뒤집힌다.
  - 중첩: Safari 16.5 전에는 해석하지 못하고, `:is()`처럼 명시도가 커진다.
  - `color-mix()` · 상대 색 · 범위 문법: 지원에 빈틈이 있다.
- 투명도 0 정지점은 `transparent`가 아닌 `rgb(var(--night-rgb) / 0)`으로 쓴다.
- **CSS 주석은 `/* */`만.** `//`는 주석이 아니라 다음 선택자에 붙어 그 규칙이 조용히 사라지고, mkfonts는 이를 주석으로 보아 글꼴 점검에도 안 드러난다.

## 7. 쪽 스타일시트 추가

1. `web/css/<쪽>.css`를 만들고 머리에 한국어 주석(무엇 · 누가 부름 · 어디 뒤)을 둔다.
2. `<head>`의 `site.css` 바로 뒤에 막는 `<link rel="stylesheet">`로 둔다. scroll-fx.js가 시작할 때 계산된 스타일(윗선 색)을 읽으므로 미루지 않는다.
3. 색 · 칸 사이 · 전환은 토큰으로, 구역 안의 색은 `--fg/--sub/--ln…`으로 쓴다. 한 번만 쓰는 장면 색에는 "이 자리만" 주석을 단다.
4. 클래스 이름이 다른 쪽의 기존 클래스(`.ms`는 site.js 메뉴 · mro.css, `.mk` `.mb` `.feat` `.cta` `.more` `.meta` `.tag`도 공용)과 겹치지 않게 짓는다.
5. 새 음절이 생기면 `tools/fonts/mkfonts.py <TAG>`(publish.md). 검증은 verify.md.
6. site.css는 35 KB 한도 근처 — 한 쪽 전용 규칙은 쪽 CSS에. 초기 로딩 차이 · 릴리스 URL은 publish.md §4.
