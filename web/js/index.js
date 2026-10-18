/* 메인(index · index-en) 전용 — 최근 소식(군집 드론 무대는 swarm-gl.js · swarm.js)
   순서: site.js(KA) → scroll-fx.js(data-rv · #nws 감시) → 이 파일 → swarm-gl.js → swarm.js */
(()=>{
'use strict';
const {EN,EXT,esc,fmtDate,srcLabel,byDate}=window.KA;   /* EN: index.html은 lang이 없어 국문 */

/* 최근 소식: 뉴스룸 데이터에서 최신 3건(영문은 영문 제목이 있는 것만) */
function latestNews(){
  const box=document.getElementById('nws');
  const day=d=>esc(fmtDate(d));   /* 2026.09.09 · Sep 9, 2026 */
  const src=u=>srcLabel(u,{tag:EN?' · in Korean':''});   /* 구글 사이트 · 팟빵은 호스트 이름 그대로(more 없음) */
  fetch('data/media.json').then(r=>r.json()).then(D=>{
    const N=[...(D.news||[])].filter(n=>!EN||n.title_en).sort(byDate).slice(0,3);if(N.length<3)return;
    box.innerHTML=N.map(n=>`<a class="card nc" href="${esc(n.mediaUrl_kr)}" target="_blank" rel="noopener"><div class="fr"><img src="${esc(n.img)}" alt="" loading="lazy"></div><div class="meta"><span>${day(n.updatedDate)}</span><span>${src(n.mediaUrl_kr)}</span></div><p class="t">${esc(EN?n.title_en:n.title_kr)}${EXT}</p></a>`).join('');
  }).catch(()=>{});
}

latestNews();
})();
