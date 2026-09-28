# 무인기 `#seq` 모션 그래픽 (uav · uav-en)

무인기 쪽의 스크롤 연동 장면(9장)을 고칠 때 읽는다. 공용 규칙(KA · 루프 · 순차 등장)은 motion.md, 색 · CSS 규칙은 design-system.md, 검사는 verify.md.

## 1. 파일과 불러오는 순서

`uav.html` · `uav-en.html`은 마크업만 담는다(글 · `hreflang`만 다름). 스크립트는 모두 body 끝의 동기 classic이고 순서를 바꾸지 않는다.

`js/site.js` → `uav-data.js` → `uav-kit.js` → `uav-scenes1.js` → `uav-scenes2.js` → `uav.js` → `js/scroll-fx.js`

| 파일 | 내용 |
|---|---|
| `css/uav.css` | 무대 · 라벨 · 기체 그림 · 글 층 · 압축 단계(`.stage.f*` · `.r*`) · 목차 · 제원 · 브로슈어. 영문 조판은 끝의 `:where(html[lang="en"])` 묶음. **맨 끝**의 `#seq` 등장 규칙(`.rvs` · `.rv-in` · `@keyframes rvphs`)은 유일한 사본이므로 파일 끝에 둔다(scroll-fx.js는 더 이상 `<style>`을 넣지 않음) |
| `js/uav-data.js` | `window.UAV={SC:[]}`(이 쪽의 유일한 새 전역) · `GN`(큰 이름) · `CFG`(장별 `{img, iso, hero, ph:[단계 경계 N+1개], concept?}`, 두 언어 공통) · `TX.ko` · `TX.en`(`{cap, concept, src, ch:[{name, rail, en, alt, mission, feats, phases:[[이름, 설명]…], specs, src}], sc:[장면 라벨 9벌]}`). 글은 innerHTML에 들어가는 HTML 조각(`<b>` · `<em>` · `&amp;` 그대로) |
| `js/uav-kit.js` | 공유 상태 `U.st={heroGate, curCh}`, 색 `C` · 수학(`seg` · `lerp` · `eo` · `eio`) · `setA` · `el` · `tr` · `op` · 스프라이트(`SPR` · `ALLSP` · `sil`) · 배경 · 궤적 · 비행운 · 미사일 · 폭발. 끝에서 `Object.assign(U,{…})`로 내보냄. 불러올 때 DOM을 건드리지 않음 |
| `js/uav-scenes1.js` / `uav-scenes2.js` | 장면 등록 `SC[0..4]` / `SC[5..8]` = `(g,{tag,place,defs,rep},TL)=>t=>…`(TL = 그 장의 라벨 글 `TX[lang].sc[i]`). 6 · 9장은 리포트 카드 `rep(TL.rep)` |
| `js/uav.js` | `CH` 조립(`U.CFG.map` + `X=U.TX[EN?'en':'ko']` → 예전 CH 모양) · 글 층 · 창 맞춤(`fitOverlay` · `fitPlates`) · 장면 생성(`U.SC.map`, 만들 때 `st.curCh=i`) · 스크롤 루프(`KA.loop`) · 깊은 링크 |

- 공유 값은 `st.curCh` · `st.heroGate`로 읽고 쓴다. 구조 분해하면 값이 복사되어 어긋난다.
- `KA`에서 `EN · MQ · pad2 · jumpTo · loop`(uav.js), `reduce · clamp`(uav-kit.js)를 가드 없이 꺼낸다 → site.js와 함께 게시한다(publish.md).

## 2. 장(章) 순서 · 그림

- 운용고도 순 9장: 중고도 · 스텔스 · 저피탐 편대기 · 중형 자폭 · 사단 · **아음속 무인표적기(KUS-100UAT, 6번)** · 소형 자폭 · 함상 중고도 · Digital MRO.
- 화면 순서 = 깊은 링크 `#c1`~`#c9` = 메인 무인기 스트립 순서(`index.html`의 `uav.html#cN`, `index-en.html`의 `uav-en.html#cN` 각 9개).
- 탑뷰 `img/sp/*_top2.webp` · `tgt_top.webp`는 2026 국방산업발전대전 발표자료 7쪽 렌더를 오른쪽(+x)을 향하게 돌린 것이다. 저피탐 편대기는 첫 화면 위장 도색과 맞추려고 `img/lw_2.webp`를 유지한다. 표적기 3D는 리플렛 PDF의 내장 이미지(`img/sp/tgt_iso.webp`).
- 자료로 "최신화"할 때는 기존 장의 글 · 그림을 고친다. 새 장 · 새 구역을 만들지 않는다(CLAUDE.md 규칙).

## 3. 장을 더하거나 뺄 때 고칠 곳

1. `uav-data.js`: `CFG`에 한 칸, `TX.ko.ch` · `TX.en.ch`에 한 칸씩, `TX.ko.sc` · `TX.en.sc`에 장면 라벨 한 벌씩, `GN`에 큰 이름.
2. `uav-scenes1.js` 또는 `uav-scenes2.js`: `SC[i]=` 장면 등록(번호로 등록하므로 순서 = 장 번호).
3. `css/uav.css`: `#seq` 높이의 `9 * 280vh`에서 9를 장 수로. `--read-extra`는 읽기 거리 추가분이다.
4. `uav.js`: 깊은 링크 정규식 `/^#c([1-9])$/`(10장 이상이면 정규식을 넓힘). `chVis` · `PF` · `ib` 등은 `new Array(N)`이라 저절로 맞는다. 리포트 카드의 장 번호도 `st.curCh`라 따로 고치지 않는다.
5. `index.html` · `index-en.html`의 `#uav` 스트립 카드(링크 `#cN` · 그림 · 이름).
6. 새 한글 음절이 생기면 `tools/fonts/mkfonts.py <새 TAG>`(publish.md).

## 4. 성능 규칙(폰에서 느리던 문제, v59)

- 투명도 0인 장(층) · 그림자 · 연기(필터)는 CSS로 `display:none`(`#scene>g>g[opacity="0"]` · `"0.000"` 등). 이 규칙은 `op()`가 `toFixed(3)`로 쓰는 값과 짝이다 — 둘 중 하나만 바꾸지 않는다.
- `setA`(`el()`로 만든 요소의 `setAttribute`)는 같은 값이면 쓰지 않는다. 그래서 매 프레임 같은 값을 불러도 된다.
- 시점이 같으면 장면을 다시 계산하지 않는다.
- 따라가는 비율(.14 · .2 · .08 · .25)은 프레임 간격을 60fps 프레임 수로 반올림한 `fk`로 맞춘다(`K(c)=1-(1-c)^fk`). 60 · 120Hz에서는 원래 값 그대로, 30fps면 두 프레임치 → 느린 기기에서도 같은 속도. WebKit 폰 세로 5fps → 약 50fps가 됐다.
- 루프는 `KA.loop`: scroll · resize · `KA_LENIS.on('scroll')`(첫 wheel에 연결, 되감기 착지)로 깨고, 무대 밖 · 따라가기가 끝나면 멈춘다(멈출 때 `lastT=0`).

## 5. 알려진 것

- **설명 후반 감속(2026-09-27):** 9장·42단계의 `CFG[i].slow`를 사용한다. `{from,to,extra}`는 장 안의 감속 범위와 추가 거리(무대 높이 배수). 승인된 중고도 설정은 그대로이며 각 장의 설명 완성 시점에 맞춘다. `distanceAt`은 5차 곡선으로 거리를 누적하고 `sceneAt`은 그 역함수다. `travel`은 실제 거리, `p`는 장면 진행. 완전 정지 없이 감속·복귀하며 양 끝의 속도가 이어진다. 목차·깊은 링크·의도된 역스크롤 첫 화면 복귀에도 같은 변환을 적용한다. 설명 진행선은 실제 입력에 반응하며 별도 정지 안내는 없다. 결과·교대·회수 라벨 및 MDI 카드는 감속 중 완전히 읽도록 조금 일찍 나타난다. 국문·영문 공통. 검증: `_verification/slow-all-20260927/`.

- **`fitPlates` 경합(원래부터):** 켜진 목차 항목(`.rail a.on i`)이 0.5초 전환으로 10 → 32px 늘어나는 동안 목차를 재면 기체 그림 · 큰 이름 위치가 실행마다 약 10px 달라진다. 기준본도 같다. 고치면 보이는 동작이 바뀌므로 그대로 둔다.
- pixdiff는 `#seq #scene · #labels · #giants · #plates`를 가린다(verify.md). 장면 안은 `_verification/refactor/implement/runs/uav/scripts/`(`quick` · `seqdom` · `seqdom2` · `behave` · `rvsaudit` · `fitprobe`)와 `_verification/refactor/stage-b/runs/js/scripts/uav_*.py`로 기준 · 후보를 따로 비교한다. 기준끼리(A↔A2)도 다를 수 있으니 대조를 함께 돌린다.
- 파일을 만든 일회성 생성기 `runs/uav/scripts/build_uav.py`는 기록용이다. 다시 돌리지 않는다.
