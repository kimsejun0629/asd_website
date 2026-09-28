/* 뉴스룸 쪽 스크립트: data/media.json → 최신 소식 · 기사 목록(연도 · 검색 · 더보기) · 홍보영상 · 브로슈어
   newsroom.html · newsroom-en.html 공용(문구는 KA.EN으로). site.js(KA) 뒤 · scroll-fx.js 앞의 보통 스크립트, 채우기는 fetch 뒤 비동기 */
(async()=>{
  'use strict';
  const {EXT,EN,esc,fmtDate:dt,srcLabel,byDate,ICON}=window.KA;
  let D={news:[],video:[],brochure:[]};try{D=await (await fetch('data/media.json')).json()}catch{}
  const T=EN?{latest:'Latest',read:'Read article <span class="kr-tag">KR</span> ',all:'All',
      empty:'No articles match your filters. Try another year or search term.',yt:'YouTube · in Korean',cover:' brochure cover',pdf:['English PDF','Korean PDF','View PDF']}
    :{latest:'최신 소식',read:'기사 보기 ',all:'전체',
      empty:'조건에 맞는 기사가 없습니다. 연도나 검색어를 바꿔 보세요.',yt:'YouTube',cover:' 브로슈어 표지',pdf:['국문 PDF','영문 PDF','PDF 보기']};
  /* 출처 이름(구글 사이트 · 팟빵까지) · 날짜(국문 2026.09.24 · 영문 Sep 24, 2026 — dt=KA.fmtDate) / 제목: 영문이 없으면 국문 */
  const src=u=>srcLabel(u,{more:true});
  const tt=EN?n=>n.title_en||n.title_kr:n=>n.title_kr;
  const hay=EN?n=>(n.title_en||'')+' '+n.title_kr:n=>n.title_kr+' '+(n.title_en||'');   /* 검색 대상: 그 언어 제목 먼저 */
  const newest=a=>[...a].sort(byDate);   /* 새 글 먼저(같은 날은 배열 순서) */

  /* 최신 소식: 가장 새 기사 하나 */
  const N=newest(D.news);
  const f=N[0],feat=document.getElementById('feat');
  if(f){feat.href=f.mediaUrl_kr;feat.innerHTML=`<div class="fr"><img src="${f.img}" alt=""></div>`
    +`<div class="tx"><div class="meta"><b>${T.latest}</b><span>${dt(f.updatedDate)}</span><span>${src(f.mediaUrl_kr)}</span></div>`
    +`<p class="t">${esc(tt(f))}</p><span class="more">${T.read}<span class="arw">${EXT}</span></span></div>`}

  /* 기사 목록: 연도 칩 · 검색 · 12개씩 더보기 */
  const years=['all',...new Set(N.map(n=>n.updatedDate.slice(0,4)))];
  const yEl=document.getElementById('years');
  yEl.innerHTML=years.map((y,i)=>`<button type="button" class="chip" data-y="${y}" aria-pressed="${i===0}">${y==='all'?T.all:y}</button>`).join('');
  let Y='all',Q='',shown=12;
  const grid=document.getElementById('grid'),more=document.getElementById('moreBtn'),cnt=document.getElementById('cnt');
  const card=n=>`<a class="card ncard" href="${esc(n.mediaUrl_kr)}" target="_blank" rel="noopener"><div class="fr"><img src="${n.img}" alt="" loading="lazy"></div>`
    +`<div class="meta"><span>${dt(n.updatedDate)}</span><span>${src(n.mediaUrl_kr)}</span></div><p class="t">${esc(tt(n))}<span class="ex">${EXT}</span></p></a>`;
  function list(){return N.slice(1).filter(n=>(Y==='all'||n.updatedDate.startsWith(Y))&&(!Q||hay(n).toLowerCase().includes(Q)))}
  function draw(){const L=list();grid.innerHTML=L.length?L.slice(0,shown).map(card).join(''):`<p class="empty">${T.empty}</p>`;
    more.hidden=shown>=L.length;cnt.textContent=`${Math.min(shown,L.length)} / ${L.length}`}
  yEl.addEventListener('click',e=>{const b=e.target.closest('.chip');if(!b)return;yEl.querySelectorAll('.chip').forEach(c=>c.setAttribute('aria-pressed',c===b));Y=b.dataset.y;shown=12;draw()});
  document.getElementById('q').addEventListener('input',e=>{Q=e.target.value.trim().toLowerCase();shown=12;draw()});
  /* 검색창에 치는 글자도 한진체로 — 사이트에 없는 음절 조각(rest)을 load 뒤에(검색창을 먼저 누르면 바로) 받음
     아래 fonts.load(…) 안의 '가힣'은 mkfonts가 호출째 지워 음절 수에서 뺌 — 밖으로 빼거나 ?.로 바꾸지 않음 */
  const qf=()=>{document.fonts&&document.fonts.load('300 15px "HanjinGroupSans"','가힣').catch(()=>{})};
  document.getElementById('q').addEventListener('focus',qf,{once:true});
  document.readyState==='complete'?setTimeout(qf,0):addEventListener('load',()=>setTimeout(qf,0),{once:true});
  more.addEventListener('click',()=>{shown+=12;draw()});draw();

  /* 홍보영상 */
  const vcard=v=>`<a class="card vcard" href="${esc(v.mediaUrl_kr)}" target="_blank" rel="noopener"><div class="fr"><img src="${v.img}" alt="" loading="lazy">`
    +`<span class="play" aria-hidden="true">${ICON.play}</span></div>`
    +`<p class="t">${esc(tt(v))}</p><span class="d">${dt(v.updatedDate)} · ${T.yt}</span></a>`;
  document.getElementById('vgrid').innerHTML=newest(D.video).map(vcard).join('');

  /* 브로슈어: 국문 · 영문 PDF가 따로 있으면 그 쪽 언어 PDF를 먼저(채움 버튼) */
  const PDF='https://aerospace.koreanair.com/contents/media/brochure/';
  const btn=(c,u,t)=>`<a class="btn ${c}" href="${PDF+encodeURIComponent(u)}" target="_blank" rel="noopener">`
    +`<span class="roll"><span>${t}</span><span>${t}</span></span><span class="arw">${EXT}</span></a>`;
  const bro=b=>{
    const two=b.mediaUrl_en&&b.mediaUrl_en!==b.mediaUrl_kr,nm=EN?b.name_en||b.title_en||b.title_kr:b.title_kr,sub=EN?b.sub_en:b.title_en;
    const [u1,u2]=EN?[b.mediaUrl_en,b.mediaUrl_kr]:[b.mediaUrl_kr,b.mediaUrl_en];
    return `<article class="bro"><div class="fr"><img src="${b.img}" alt="${esc(nm)}${T.cover}" loading="lazy"></div><h3 class="t">${esc(nm)}</h3>`
      +`${sub?`<p class="e">${esc(sub)}</p>`:''}`
      +`<div class="dl">${two?btn('b-cream',u1,T.pdf[0])+btn('b-line',u2,T.pdf[1]):btn('b-cream',b.mediaUrl_kr,T.pdf[2])}</div></article>`};
  document.getElementById('bgrid').innerHTML=newest(D.brochure).map(bro).join('');
})();
