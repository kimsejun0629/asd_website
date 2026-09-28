# 움직임 · 공용 스크립트 안내 (web/js)

코드 변경 시 갱신한다.

## 1. 규칙
- 쪽 스크립트는 body 끝의 **동기 classic**이다(defer · async 없음, module은 aero의 a3d.js뿐). 파일마다 `(()=>{'use strict';…})()`로 감싼다(newsroom.js만 `(async()=>{…})()`). 최상위 const가 겹치면 SyntaxError가 난다.
- `site.js`가 KA를 쓰는 스크립트보다 먼저다(aero의 importmap · a3d.js · 대체 타이머는 앞이지만 KA를 안 씀). 다른 파일은 맨 앞에서 `const {…}=window.KA`로 꺼내 쓴다(같은 릴리스 URL로 함께 게시, publish.md).
- 주석 형식은 CLAUDE.md를 따른다.
- 리팩터 비교: verify.md.

## 2. window.KA (js/site.js)
| 이름 | 뜻 |
|---|---|
| `EN` | `<html lang>`이 en으로 시작(index.html은 lang 없음 → 국문) |
| `reduce` | prefers-reduced-motion(불러올 때 한 번) |
| `MQ.narrow/wide/stack` | `(max-width:900px)` · `(min-width:901px)` · 그 `and (min-height:680px)`(CSS와 같게). 쓰는 쪽이 `matchMedia(MQ.x)` |
| `onMQ(mql,fn)` | change 알림(없으면 addListener) |
| `clamp(v,a=0,b=1)` · `pad2(n)` · `esc(s)` | 자르기 · 두 자리 · HTML 이스케이프(`??`) |
| `MON` · `fmtDate(d,{loose})` | 국문 `2026.09.24[ 13:04]`, 영문 `Sep 24, 2026`(아니면 ''). loose는 `.`도 받고 원문 그대로 |
| `byDate(a,b)` | media.json 새 글 먼저(sort 비교 함수) |
| `srcLabel(u,{more,tag})` | 기사 출처. more=구글 사이트 · 팟빵(뉴스룸), tag=두 뉴스 사이트 뒤 말(메인 영문 ' · in Korean') |
| `HH()` | 고정 머리글 아래 끝 px(없으면 76) |
| `smoothTo(y,sec)` | Lenis 있으면 그것, 없으면 smooth |
| `loop(step,on)` → `wake` | 아래 4 |
| `INPUT` | 자동 재생 재시도 입력 4종 |
| `ICON.arw/ext/play/sndOn/sndOff` · `ARW` · `EXT` | SVG 글(ARW · EXT는 옛 이름) |
| `jumpTo(y\|fn,done)` · `anchorTop(el)` | 쪽 안 이동(가렸다 옮김) · 앵커 목적지(sticky 패널 보정) |

전역은 `KA` · `KA_LENIS`(Lenis, 비동기, 터치 · 움직임 줄임이면 없음) · `UAV` · `A3D`, 이벤트는 `ka-lenis`.

## 3. 쪽마다 불러오는 순서
| 쪽 | 순서 |
|---|---|
| index | site → scroll-fx → index |
| aero | importmap → a3d.js(module, 파싱 뒤) → 인라인 대체 타이머 → site → scroll-fx |
| uav | site → uav-data → uav-kit → uav-scenes1 → uav-scenes2 → uav → scroll-fx |
| mro | site → scroll-fx → mro |
| company | site → history → scroll-fx |
| newsroom | site → newsroom → scroll-fx |
| careers | site → careers → scroll-fx |

순서가 중요한 까닭:
- site.js가 `.subnext` · `.ph.bare` · `hidden`을 먼저 만든다.
- careers는 `#jobList`, uav는 `.cht` 등을 **동기로** 채운다. 그래야 scroll-fx의 첫 `tagAll()` · `#seq` 태그가 이를 본다.
- index.js는 scroll-fx 뒤다. 메인 순서는 scroll-fx가 먼저 등록하고, 복제 · `#nws`는 그 MutationObserver를 거친다.
- history는 scroll · resize 리스너 순서 때문에 scroll-fx 앞이다.

## 4. 쉬는 동안 멈추는 루프(`KA.loop`)
`step(t)`가 참이면 다음 프레임, 거짓이면 멈춘다. `wake()`는 멈춰 있을 때만 켠다. `on`은 다시 켤 때만 부른다. 루프 상태는 부르는 쪽이 가진다.

| 루프 | 깨우는 곳 | 멈춤 |
|---|---|---|
| index 스트립 | scroll · resize · load(measure 뒤) · 스트립 포인터 · IO 50% · RO(패널 · 여백 · 스트립) | 흐를 스트립(화면 근처 · 포인터 없음)도 스크롤 변화도 없음. 다시 켜면 `fresh`(첫 dt=직전 간격) |
| scroll-fx `#seq` 글 | scroll · resize | 무대가 화면 밖이고 `.rv-in` 없음 |
| history | scroll · 다시 배치(데이터 · resize · fonts.ready · load · 탭 열림) | 탭 숨김 · 데이터 없음 · p=q이고 드래그 없음 |
| uav 장면 | scroll · resize · `KA_LENIS.on('scroll')`(첫 wheel에 연결) | 무대 밖 · 따라가기 끝. 멈출 때 `lastT=0` |

따로 도는 것:
- Lenis raf(scroll-fx): 움직이는 동안만(처음 켤 때만 프레임 간격을 재려고 16프레임 더). `scrollTo`가 다시 켜고 `ka-lenis`를 보낸다. 3D가 그 뒤로 줄을 선다.
- a3d: 무대가 화면에 걸칠 때만. 한 번씩 도는 rAF: scroll-fx `update`, index `recede`.
- 새 루프도 `KA.loop` + 깨우는 경로를 갖추고, 스크롤 없이 레이아웃이 바뀌면 그 루프도 깨운다.

## 5. 순차 등장(scroll-fx.js)
- `html.rv`(+불러오는 동안 `rv-now`), 요소마다 `data-rv`와 `--d`(지연)를 둔다. 종류: `t` 글 · `img` 틀→사진 · `rule` 윗선→글 · `fl` 스트립 · `fade`.
- 기준 요소 윗단이 `innerHeight*.78`을 넘으면 `.in`을 붙이고, 마지막 항목 +1.9초에 `.rv-end`를 붙인다. 메인 사업 패널은 PC 고정 화면(`MQ.stack`)에서 `.42`다. 페이지 끝에 닿으면 남은 블록도 재생한다.
- 메인은 구역별 순서(hero → `.biz .bp` → `#future` → `#news`(`#nws` 다시 태그) → `#contact`)이고, 히어로 뒤 `genAt=+1.6s`다.
- 하위 쪽은 `main>section.sec`를 `blocks()`로 자동 태그한다.
  - 목록 `COLL`의 카드는 하나씩, `.gside`는 라벨 → 제목 → 부제(`step .26`)다.
  - 이미 본 카드는 `data-rvq`, 묶은 틀은 `data-rvc`, 건너뛸 것은 `SKIP`(`.hx`, `#seq` …)이다.
- 순서 시계 `genAt`: 판정 시각이 달라도 위 → 아래로 시작한다. 같은 목록은 `step`만큼 겹치고, 아래 줄 · 다음 블록은 앞 묶음의 마지막 항목 뒤에 시작한다. 늦게 채워진 목록 뒤에 예약된 블록은 다시 예약한다.
- 탭(하위 화면)을 열면 히어로 글 뒤에 시작한다. `.ph.bare`는 .5초, 그 밖은 1.15초다. `.subnext`는 데이터 목록이 찬 뒤(`waiting()`)에 나온다.
- `#seq`: `.cht` · `.spec` · `#phases>div` · `#ispecs>.ispec`에 `.rvs`와 자식 `--dl`을 둔다. uav가 쓴 불투명도(>.35)를 보고 `.rv-in`을 붙인다. 규칙은 css/uav.css 끝에 있다.

## 6. 영상
- 메인(index.js): `hero2-800/1600`(MQ.narrow), 실패 시 800, 넓히면 1600으로 이어 재생. 자동 재생 거절 시 `INPUT`으로 재시도(`playing`까지).
- 메인은 2:1 contain·확대 없음. 125.5초부터 `.is-ending`으로 PC 글·가림막·안내를 숨기고 반복 시 복원. 모바일 글은 유지. 시간 이벤트만 사용.
- site.js의 `video[data-v]`: 400px 앞에서 불러온다.
- 화면 밖 영상은 멈춘다(`root:document`, 100% 여백, 소리 없는 것만 `_auto`). 거절되면 `arm()`으로 입력을 기다리고, 소리 버튼은 `data-sound`, 비율은 `data-ar` → `.ph.w`(3:1 이상).

## 7. 메인 `#business` · 스크롤 안내
- `#business`(PC) = 고정 패널 `#aero` · `#uav` · `#mro` + 각 `.pk-pin` 여백. 스트립이 저절로 흐르다 스크롤하면 빨라지고, 여백에서 한 바퀴 더 돌면 다음 패널이 덮는다(index.js). `#mro`는 두 줄 사진 벽(윗줄 ←, 아랫줄 →).
- `.scue`(site.js): 메인 · 하위 쪽 히어로 맨 아래 가운데. 누르면 다음 구역, 40px 넘게 내리면 사라지고 빛 줄기도 멈춤(`.idle`). PC 히어로 설명은 안내에 닿지 않는 폭(site.css).
- 무인기 `#seq`(엔진 · 장 더하기)는 uav.md.

## 8. 연혁(history.js)
- `data/history.json` → `build`(카드 · 눈금자) → `relayout`(카드 폭 · 사진 높이 · `--cw/--ih/--iw/--ly`, 높이=무대+(N−1)×step)이다.
- 루프는 `dwell` 곡선을 따라가고(.16, 가로 드래그 .4), `render`는 SC/BL/OP, `setCur`는 번호 · 연대 · 2.8초 사진 교차다.
- 입력: 버튼 · ←/→/Home/End · 옆 카드 · 드래그 · 트랙패드 가로 · 눈금자, 멈춘 뒤 260ms 맞춤.
- 스크롤은 반올림하지 않은 `scrollTo(instant)`로 한다(`instant()`로 바꾸지 말 것).

## 9. MRO 지도(mro.js)
- `.mx-mapsvg`: IO(기본 root)로 화면 밖이면 `.pz`(맥동 멈춤)를 붙인다.
- 육지: `img/mro-land.svg`를 fetch해 `#land`의 d를 빈 `path.land`에 넣는다(공백 한 칸, `Z M`→`ZM`).
  - 외부 `<use>`는 불투명 출처 틀에서 빠지고 load를 늦추지만, fetch는 늦추지 않는다.
