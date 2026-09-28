/* MRO/U 쪽(mro.html · mro-en.html) — 입고 경로 지도: 화면 밖이면 맥동을 멈추고, 육지 모양을 채움
   site.js · scroll-fx.js 뒤의 동기 classic */
(()=>{
'use strict';
const map=document.querySelector('.mx-mapsvg');if(!map)return;
/* 지도 맥동(SVG라 매 프레임 레이아웃 · 그리기)은 지도가 화면에 보일 때만 돎 — 기본 root · 여백 없음 */
new IntersectionObserver(es=>map.classList.toggle('pz',!es[es.length-1].isIntersecting)).observe(map);
/* 육지: img/mro-land.svg(모양의 유일한 원본)의 #land 경로를 글로 받아 path.land의 d로(색은 css .mx-mapsvg .land).
   외부 <use>는 불투명 출처(sandbox) 틀에서 아무 표시 없이 빠지고 load도 늦춰서 fetch로 — fetch는 load를 늦추지 않음.
   head preload(as=fetch)는 넣지 않음 — WebKit은 fetch에 재사용하지 않아 두 번 받고 경고(stage-d F3).
   파일은 줄을 나눠 두었으므로 공백을 한 칸으로, 'Z M'은 'ZM'으로(v60 인라인 d와 같은 글자) */
const land=map.querySelector('path.land');
if(land)fetch('img/mro-land.svg').then(r=>r.text()).then(t=>{const m=/<path id="land" d="([^"]*)"/.exec(t);
  if(m)land.setAttribute('d',m[1].replace(/Z\s+M/g,'ZM').replace(/\s+/g,' '))}).catch(e=>console.warn('mro-land',e));   /* 실패하면 육지 없는 지도 — 콘솔에만 남김 */
})();
