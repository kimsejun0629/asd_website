/* 대한항공 항공우주사업본부 · 공용 도우미(window.KA) · 공통 헤더 / 모바일 메뉴 / 푸터 · 영상 (KO · EN)
   body 끝의 동기 classic — KA를 쓰는 어느 스크립트보다 먼저(aero만 importmap · module a3d.js · 인라인 대체 타이머가 앞, 셋 다 KA를 안 씀).
   뒤 스크립트는 const {…}=window.KA로 바로 꺼내 씀. 목록 · 쪽마다 불러오는 순서: docs/motion.md */

/* 0 · 공용 도우미 — 값은 이 파일이 불릴 때 한 번 정함 */
(()=>{
'use strict';
const EN=(document.documentElement.lang||'').toLowerCase().startsWith('en');   /* index.html은 lang이 없어 국문 */
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
/* css의 @media와 같은 조건(바꾸면 양쪽을 함께) · 쓰는 쪽이 matchMedia(KA.MQ.x)로 따로 만듦 */
const MQ={narrow:'(max-width:900px)',wide:'(min-width:901px)',stack:'(min-width:901px) and (min-height:680px)'};
/* 조건 변화 알림 — addEventListener가 없는 옛 사파리(13 이하)는 addListener */
const onMQ=(mq,fn)=>mq.addEventListener?mq.addEventListener('change',fn):mq.addListener(fn);
const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
const pad2=n=>String(n).padStart(2,'0');
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
/* 날짜 'YYYY-MM-DD[ HH:MM]' → 국문 2026.09.24(시각은 그대로 남음) · 영문 Sep 24, 2026(형식이 아니면 ''). loose: '.'도 받고 형식이 아니면 원문 그대로(채용 공고) */
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const fmtDate=(d,{loose=false}={})=>{if(!EN)return (d||'').replace(/-/g,'.');
  const m=(loose?/^(\d{4})[-.](\d{2})[-.](\d{2})/:/^(\d{4})-(\d{2})-(\d{2})/).exec(d||'');return m?`${MON[+m[2]-1]} ${+m[3]}, ${m[1]}`:loose?d:''};
const byDate=(a,b)=>b.updatedDate.localeCompare(a.updatedDate);   /* sort 비교: media.json 새 글 먼저(같은 날은 배열 순서) */
/* 기사 출처 이름(주소의 호스트로). tag: 두 뉴스 사이트 이름 뒤에 붙일 말 · more: 구글 사이트 · 팟빵도 이름으로(뉴스룸 — 메인은 호스트 그대로) */
const SRC=EN?['Korean Air Newsroom','Naver News','Podbbang']:['대한항공 뉴스룸','네이버 뉴스','팟빵'];
const srcLabel=(u,{more=false,tag=''}={})=>{try{const h=new URL(u).hostname;
  return h.includes('news.koreanair.com')?SRC[0]+tag:h.includes('naver')?SRC[1]+tag:more&&h.includes('google')?'Google Sites':more&&h.includes('podbbang')?SRC[2]:h.replace(/^www\./,'')}catch{return ''}};
/* 고정 머리글의 실제 아래 끝(안전 영역 포함) · 머리글이 없으면 76 */
const HH=()=>{const g=document.querySelector('.gh');return g?g.getBoundingClientRect().bottom:76};
/* y로 부드럽게: Lenis가 있으면 그것으로(duration 초), 없으면 브라우저 smooth(움직임 줄임이면 곧바로) */
const smoothTo=(y,duration)=>{if(window.KA_LENIS)KA_LENIS.scrollTo(y,{duration});else window.scrollTo({top:y,behavior:reduce?'auto':'smooth'})};
/* 쉬는 동안 멈추는 rAF 루프. step(t)가 참이면 다음 프레임도, 거짓이면 멈춤 · 돌려주는 wake()는 멈춰 있을 때만 다시 켬.
   on은 멈췄다 다시 켤 때만 부름(첫 시작은 빼고) · 루프마다 따로 두는 값(lastT · fresh …)은 부르는 쪽이 step · on 안에서 */
const loop=(step,on)=>{let run=false,ran=false;const f=t=>{if(step(t))requestAnimationFrame(f);else run=false};
  return ()=>{if(run)return;run=true;if(ran&&on)on();ran=true;requestAnimationFrame(f)}};
const INPUT=['pointerdown','touchend','click','keydown'];   /* 자동 재생이 거절됐을 때 다시 재생해 볼 입력 */
const ICON={arw:'<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.25"><path d="M1 8h13M9 3l5 5-5 5"></path></svg>',
  ext:'<svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.25"><path d="M3 9L9 3M4 3h5v5"></path></svg>',
  play:'<svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M3 1.5v9l7.5-4.5z"></path></svg>',
  sndOn:'<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.25"><path d="M2 6h3l4-3v10l-4-3H2z"/><path d="M11 5.5a3.5 3.5 0 0 1 0 5M12.8 3.5a6.3 6.3 0 0 1 0 9"/></svg>',
  sndOff:'<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.25"><path d="M2 6h3l4-3v10l-4-3H2z"/><path d="M11 6l4 4M15 6l-4 4"/></svg>'};
window.KA=Object.assign(window.KA||{},{EN,reduce,MQ,onMQ,clamp,pad2,esc,MON,fmtDate,byDate,srcLabel,HH,smoothTo,loop,INPUT,ICON,ARW:ICON.arw,EXT:ICON.ext});
})();

/* 1 · 머리글 · 모바일 메뉴 · 바닥글 · 드롭다운 · 화면 전환 · 하위 화면(탭) · 도착 위치 · 스크롤 안내 */
(()=>{
'use strict';
const {EN,reduce,MQ,onMQ,pad2,HH,smoothTo,ARW,EXT}=window.KA;
const page=document.body.dataset.page||'home';
const JOBS='https://koreanair.recruiter.co.kr/career/home';   /* 대한항공 채용 사이트(메뉴 · 모바일 메뉴 · 바닥글) */

/* 국문 ↔ 영문 페이지 짝 */
const PAIRS={'index.html':'index-en.html','uav.html':'uav-en.html','company.html':'company-en.html','newsroom.html':'newsroom-en.html','careers.html':'careers-en.html','aero.html':'aero-en.html','mro.html':'mro-en.html'};
const here=(location.pathname.split('/').pop()||'index.html');
const koFile=EN?(Object.keys(PAIRS).find(k=>PAIRS[k]===here)||'index.html'):(PAIRS[here]?here:'index.html');
const enFile=PAIRS[koFile];
const HOME=EN?'index-en.html':'index.html';

const NAV=EN?[
 {t:'Company',h:'company-en.html',k:'company',sub:[['Message from the Head','greeting'],['About Us','about'],['History','history'],['Locations','locations']]},
 {t:'Business',h:'index-en.html#business',k:'business',sub:[['Aerostructures','aero-en.html'],['Unmanned Systems','uav-en.html'],['MRO & Upgrade','mro-en.html']]},
 {t:'Newsroom',h:'newsroom-en.html',k:'newsroom',sub:[['News','news'],['Videos','video'],['Brochures','brochure']],ext:['Korean Air Newsroom','https://news.koreanair.com/']},
 {t:'Careers',h:'careers-en.html',k:'careers',sub:[['Job Openings','jobs'],['Roles','roles'],['Growth & Development','growth'],['Work Locations','sites'],['Benefits','benefits'],['Hiring Process','process']],ext:['Korean Air Careers',JOBS]}
]:[
 {t:'회사소개',h:'company.html',k:'company',sub:[['인사말','greeting'],['본부 소개','about'],['연혁','history'],['사업장','locations']]},
 {t:'사업',h:'index.html#business',k:'business',sub:[['항공기체','aero.html'],['무인기','uav.html'],['MRO/U','mro.html']]},
 {t:'뉴스룸',h:'newsroom.html',k:'newsroom',sub:[['뉴스','news'],['홍보영상','video'],['브로슈어','brochure']],ext:['대한항공 뉴스룸','https://news.koreanair.com/']},
 {t:'인재채용',h:'careers.html',k:'careers',sub:[['채용 공고','jobs'],['직무 소개','roles'],['성장 · 양성','growth'],['근무지','sites'],['복리후생','benefits'],['전형 절차','process']],ext:['대한항공 채용 사이트',JOBS]}
];
const T=EN?{home:'Korean Air Aerospace home',main:'Main menu',all:'Full menu',open:'Open menu',close:'Close menu',next:'Next section',site:'Korean Air Aerospace',careers:'Korean Air Careers',lang:'Language'}
          :{home:'대한항공 항공우주사업본부 홈',main:'주 메뉴',all:'전체 메뉴',open:'메뉴 열기',close:'메뉴 닫기',next:'다음 하위 메뉴',site:'대한항공 항공우주사업본부',careers:'대한항공 채용 사이트',lang:'언어 선택'};
const subHref=(n,v)=>v.includes('.html')?v:`${n.h}#${v}`;
/* 언어 전환 라벨: lang 속성을 두지 않음(iOS에서 'KO'만 다른 언어 규칙으로 재어 줄바꿈되는 현상 방지), 링크 대상 언어는 hreflang으로 표시 */
const langLinks=`<a class="ul${EN?'':' on'}" href="${koFile}" hreflang="ko" data-lang="ko"${EN?' style="color:var(--cream80)"':' aria-current="true"'}>KO</a><span>/</span><a class="ul${EN?' on':''}" href="${enFile}" hreflang="en" data-lang="en"${EN?' aria-current="true"':' style="color:var(--cream80)"'}>EN</a>`;

const gh=document.getElementById('gh');
if(gh){
  gh.outerHTML=`<header class="gh">
  <a class="logo" href="${HOME}" aria-label="${T.home}"><img src="img/logo-white.svg" alt=""></a>
  <nav aria-label="${T.main}">${NAV.map((n,i)=>{const cur=n.k===page&&n.k!=='home';return `<div class="gi" data-k="${n.k}"><a class="top ul${cur?' on':''}" href="${n.h}" aria-haspopup="true" aria-expanded="false" aria-controls="dd${i}"${cur?' aria-current="page"':''}>${n.t}</a>
    <div class="dd" id="dd${i}"><div class="dd-in"><span class="dd-h lbl">${n.t}</span>${n.sub.map(([st,v],j)=>`<a href="${subHref(n,v)}" data-sub="${v.includes('.html')?'':v}" style="--i:${j}"><span>${st}</span><i></i></a>`).join('')}${n.ext?`<a class="x" href="${n.ext[1]}" target="_blank" rel="noopener" style="--i:${n.sub.length}"><span>${n.ext[0]}</span>${EXT}</a>`:''}</div></div></div>`}).join('')}</nav>
  <div class="util" role="group" aria-label="${T.lang}">${langLinks}</div>
  <button class="menu" type="button" aria-label="${T.open}" aria-expanded="false" aria-controls="mm"><svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.25"><path d="M2 7h18M2 15h18"></path></svg></button>
</header>
<div class="mm" id="mm" role="dialog" aria-modal="true" aria-label="${T.all}">
  <div class="bar"><img src="img/logo-white.svg" alt="Korean Air Aerospace"><button class="close" type="button" aria-label="${T.close}"><svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.25"><path d="M3 3l14 14M17 3L3 17"></path></svg></button></div>
  <nav aria-label="${T.all}">${NAV.map((n,i)=>`<div class="mg"><a class="mt" href="${n.h}"><span class="lbl">0${i+1}</span><span>${n.t}</span></a><div class="ms">${n.sub.map(([st,v])=>`<a href="${subHref(n,v)}">${st}</a>`).join('')}</div></div>`).join('')}</nav>
  <div class="foot"><span class="lang" style="display:flex;gap:8px">${langLinks}</span><a href="${JOBS}" target="_blank" rel="noopener">${T.careers}</a></div>
</div>`;
  const mm=document.getElementById('mm'),btn=document.querySelector('.gh .menu'),cls=mm.querySelector('.close');
  const open=v=>{mm.classList.toggle('open',v);btn.setAttribute('aria-expanded',v);document.documentElement.style.overflow=v?'hidden':'';(v?cls:btn).focus()};
  btn.addEventListener('click',()=>open(true));cls.addEventListener('click',()=>open(false));
  mm.addEventListener('keydown',e=>{if(e.key==='Escape')open(false)});
  mm.querySelectorAll('nav a,.foot a').forEach(a=>a.addEventListener('click',()=>open(false)));
  /* 창을 넓혀 데스크톱 폭이 되면 열려 있던 모바일 메뉴를 닫고 스크롤을 되살림 */
  onMQ(matchMedia(MQ.narrow),e=>{if(!e.matches&&mm.classList.contains('open')){mm.classList.remove('open');btn.setAttribute('aria-expanded','false');document.documentElement.style.overflow=''}});
}

const gf=document.getElementById('gf');
if(gf){
  const col=(h,items)=>`<div class="col"><div class="h">${h}</div>${items.map(([t,u,x])=>`<a class="tl" href="${u}"${x?' target="_blank" rel="noopener"':''}>${t}${x?'\u00a0'+EXT:''}</a>`).join('')}</div>`;
  const KA_BASE=`https://www.koreanair.com/kr/${EN?'en':'ko'}/footer/about-us`;
  const cols=EN?[
    col('Company',[['Message from the Head','company-en.html#greeting'],['About Us','company-en.html#about'],['History','company-en.html#history'],['Locations','company-en.html#locations']]),
    col('Business',[['Aerostructures','aero-en.html'],['Unmanned Systems','uav-en.html'],['MRO & Upgrade','mro-en.html']]),
    col('Newsroom',[['News','newsroom-en.html#news'],['Videos','newsroom-en.html#video'],['Brochures','newsroom-en.html#brochure']]),
    col('Careers',[['Job Openings','careers-en.html#jobs'],['Roles','careers-en.html#roles'],['Benefits','careers-en.html#benefits'],['Korean Air Careers',JOBS,1]]),
    col('Korean Air',[['About Korean Air',`${KA_BASE}/who-we-are/overview/greetings`,1],['Corporate Governance',`${KA_BASE}/corporate-governance/mission`,1],['Investor Relations',`${KA_BASE}/investor-relations/financial-information`,1],['Sustainability',`${KA_BASE}/sustainable-management/report`,1]]),
    col('Family Sites',[['Korean Air','https://www.koreanair.com/',1],['Korean Air Newsroom','https://news.koreanair.com/',1],['Korean Air Cargo','https://cargo.koreanair.com/',1],['Hanjin KAL','https://www.hanjinkal.co.kr/',1],['Business Jet','https://bizjet.koreanair.com/',1],['Jumbos Volleyball Club','https://jumbos.kovo.co.kr/',1],['Jin Air','https://www.jinair.com/',1]])
  ]:[
    col('회사소개',[['인사말','company.html#greeting'],['본부 소개','company.html#about'],['연혁','company.html#history'],['사업장','company.html#locations']]),
    col('사업',[['항공기체','aero.html'],['무인기','uav.html'],['MRO/U','mro.html']]),
    col('뉴스룸',[['뉴스','newsroom.html#news'],['홍보영상','newsroom.html#video'],['브로슈어','newsroom.html#brochure']]),
    col('인재채용',[['채용 공고','careers.html#jobs'],['직무 소개','careers.html#roles'],['복리후생','careers.html#benefits'],['대한항공 채용 사이트',JOBS,1]]),
    col('대한항공',[['대한항공에 대하여',`${KA_BASE}/who-we-are/overview/greetings`,1],['기업지배구조',`${KA_BASE}/corporate-governance/mission`,1],['투자정보',`${KA_BASE}/investor-relations/financial-information`,1],['지속가능경영',`${KA_BASE}/sustainable-management/report`,1]]),
    col('패밀리사이트',[['대한항공','https://www.koreanair.com/',1],['대한항공 뉴스룸','https://news.koreanair.com/',1],['대한항공 화물','https://cargo.koreanair.com/',1],['한진칼','https://www.hanjinkal.co.kr/',1],['Business Jet','https://bizjet.koreanair.com/',1],['점보스 배구단','https://jumbos.kovo.co.kr/',1],['진에어','https://www.jinair.com/',1]])
  ];
  const legal=EN?`<div class="r"><b>Korean Air Lines Co., Ltd.</b><span>CEO: Woo Kee-hong and one other</span><span>Business Registration No. 110-81-14794</span><span>Chief Privacy Officer: Choi Hee-jung, Vice President</span></div>
    <div class="r"><span>Busan Tech Center: 55 Techcenter-ro, Gangseo-gu, Busan</span><span>Aerospace Technology Research Institute: 1612 Yuseong-daero, Yuseong-gu, Daejeon</span><span>Seoul Office: 7 Chungjeong-ro, Seodaemun-gu, Seoul</span></div>
    <div class="r"><a class="tl" href="https://aerospace.koreanair.com/personal" target="_blank" rel="noopener" style="color:var(--cream);font-weight:700">Privacy Policy</a><span>© 2026 KOREAN AIR</span></div>`
  :`<div class="r"><b>(주)대한항공</b><span>대표 : 우기홍 외 1명</span><span>사업자등록번호 : 110-81-14794</span><span>개인정보보호책임자 : 최희정 상무</span></div>
    <div class="r"><span>부산테크센터 : 부산광역시 강서구 테크센터로 55</span><span>대전 항공기술연구원 : 대전광역시 유성구 유성대로 1612</span><span>서울사무소 : 서울특별시 서대문구 충정로 7</span></div>
    <div class="r"><a class="tl" href="https://aerospace.koreanair.com/personal" target="_blank" rel="noopener" style="color:var(--cream);font-weight:700">개인정보처리방침</a><span>© 2026 KOREAN AIR</span></div>`;
  const sns=EN?['Korean Air on YouTube','Korean Air on Instagram','Korean Air on Facebook','Korean Air on X']:['대한항공 유튜브','대한항공 인스타그램','대한항공 페이스북','대한항공 X'];
  gf.outerHTML=`<footer class="gf">
  <div class="brand"><img src="img/logo-white.svg" alt="Korean Air Aerospace"></div>
  ${cols.join('\n  ')}
  <div class="sns">
    <a href="https://www.youtube.com/user/KoreanAirHome" target="_blank" rel="noopener" aria-label="${sns[0]}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="2" y="5" width="20" height="14" rx="3"></rect><path d="M10 9l5 3-5 3z" fill="currentColor"></path></svg></a>
    <a href="https://www.instagram.com/koreanair/" target="_blank" rel="noopener" aria-label="${sns[1]}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="3" y="3" width="18" height="18" rx="5"></rect><circle cx="12" cy="12" r="4"></circle><circle cx="17.3" cy="6.7" r=".8" fill="currentColor"></circle></svg></a>
    <a href="https://www.facebook.com/KoreanAir" target="_blank" rel="noopener" aria-label="${sns[2]}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M14 21v-8h3l.5-3.5H14V7.8c0-1 .3-1.8 1.8-1.8h1.8V3a24 24 0 0 0-2.6-.1C12.3 2.9 10.5 4.5 10.5 7.4v2.1H7.5V13h3v8"></path></svg></a>
    <a href="https://twitter.com/KoreanAir" target="_blank" rel="noopener" aria-label="${sns[3]}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M4 4l16 16M20 4L4 20"></path></svg></a>
  </div>
  <div class="legal">
    ${legal}
  </div>
</footer>`;
}

/* 펼침 메뉴(호버 · 초점 · Esc) */
const GI=[...document.querySelectorAll('.gh .gi')];
const hoverOK=matchMedia('(hover:hover)').matches;
let tClose=0;
function setOpen(gi,v){if(!gi)return;gi.classList.toggle('open',v);gi.querySelector('.top').setAttribute('aria-expanded',v)}
function closeAll(ex){GI.forEach(g=>{if(g!==ex)setOpen(g,false)})}
GI.forEach(gi=>{
  gi.addEventListener('mouseenter',()=>{if(!hoverOK)return;clearTimeout(tClose);closeAll(gi);setOpen(gi,true)});
  gi.addEventListener('mouseleave',()=>{if(!hoverOK)return;tClose=setTimeout(()=>setOpen(gi,false),140)});
  gi.addEventListener('focusin',()=>{closeAll(gi);setOpen(gi,true)});
  gi.addEventListener('focusout',e=>{if(!gi.contains(e.relatedTarget))setOpen(gi,false)});
  gi.querySelector('.top').addEventListener('click',e=>{if(!hoverOK&&!gi.classList.contains('open')){e.preventDefault();closeAll(gi);setOpen(gi,true)}});
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){const o=GI.find(g=>g.classList.contains('open'));if(o){setOpen(o,false);o.querySelector('.top').focus()}}});
document.addEventListener('click',e=>{if(!e.target.closest('.gh .gi'))closeAll()});

/* 화면 전환 막 */
const pt=document.createElement('div');pt.className='pt';pt.setAttribute('aria-hidden','true');document.body.appendChild(pt);
const root=document.documentElement;
/* 스크롤 위치: 브라우저 복원을 끄고, 도착 위치는 스크립트가 정함 */
try{history.scrollRestoration='manual'}catch{}
const instant=y=>window.scrollTo({top:Math.max(0,Math.round(y)),left:0,behavior:'instant'});
const setHash=id=>{try{history.replaceState(null,'','#'+id)}catch{}};   /* 기록을 남기지 않고 주소의 #만 바꿈 */
const closeMM=()=>{document.getElementById('mm')?.classList.remove('open');root.style.overflow=''};   /* 모바일 메뉴만 닫음(open(false)와 달리 aria · 초점은 그대로) */
/* 앵커 목적지: sticky로 붙어 있는 패널은 붙기 전 제자리를 기준으로 계산 */
function anchorTop(el){
  const bp=el.closest('.bp');
  if(bp&&getComputedStyle(bp).position==='sticky'){
    const st=bp.parentElement;let y=st.getBoundingClientRect().top+scrollY;
    for(const c of st.children){if(c===bp)break;y+=c.offsetHeight}
    return y-HH();
  }
  return el.getBoundingClientRect().top+scrollY-HH();
}
/* 같은 페이지 안의 화면 전환: 짧게 가린 뒤 목적지 맨 위로 바로 옮겨 보여줌 */
function jumpTo(y,done){
  closeAll();
  if(reduce){instant(typeof y==='function'?y():y);done&&done();return}
  root.classList.add('ka-jump');
  setTimeout(()=>{instant(typeof y==='function'?y():y);done&&done();requestAnimationFrame(()=>requestAnimationFrame(()=>root.classList.remove('ka-jump')))},250);
}
Object.assign(window.KA,{jumpTo,anchorTop});
function leaveTo(href){
  if(reduce){location.href=href;return}
  closeAll();root.classList.add('ka-leave');setTimeout(()=>{location.href=href},620);
}


/* 하위 화면: 선택한 구역만 표시 */
const cur=NAV.find(n=>n.k===page&&n.k!=='home');
const subs=cur?cur.sub.filter(([,v])=>!v.includes('.html')&&document.getElementById(v)):[];
let active=null;
const h1=document.querySelector('.ph h1'),hl=document.querySelector('.ph .in .lbl');
const ph=document.querySelector('.ph');
let pager=null;
function show(id,anim){
  const ok=subs.find(([,v])=>v===id)||subs[0];if(!ok)return;const [name,sid]=ok;
  const apply=()=>{
    subs.forEach(([,v])=>{const el=document.getElementById(v);el.hidden=v!==sid;el.classList.remove('ka-in')});
    const el=document.getElementById(sid);void el.offsetWidth;el.classList.add('ka-in');
    if(ph)ph.classList.toggle('bare',el.hasAttribute('data-own-title'));   /* 제목을 구역 안에 둔 탭(인사말)은 영상 위 글자를 숨김 */
    if(h1){h1.textContent=name}if(hl){hl.textContent=el.dataset.heroLabel||cur.t}
    document.title=`${name} · ${cur.t} · ${T.site}`;
    document.querySelectorAll('.gh .dd a[data-sub]').forEach(a=>{const on=a.closest('.gi').dataset.k===page&&a.dataset.sub===sid;a.classList.toggle('on',on);on?a.setAttribute('aria-current','page'):a.removeAttribute('aria-current')});
    const i=subs.findIndex(([,v])=>v===sid),nx=subs[(i+1)%subs.length];
    if(pager){pager.querySelector('.nx').href='#'+nx[1];pager.querySelector('.nm').textContent=nx[0];pager.querySelector('.ct').textContent=`${pad2(i+1)} / ${pad2(subs.length)}`}
    active=sid;
  };
  if(anim&&!reduce&&active){root.classList.add('ka-swap');setTimeout(()=>{apply();instant(0);root.classList.remove('ka-swap');replay()},380)}
  else{apply();if(anim)instant(0)}
}
function replay(){if(!ph)return;const els=[ph.querySelector('img'),...ph.querySelectorAll('.in>*')].filter(Boolean);els.forEach(e=>e.style.animation='none');void ph.offsetWidth;els.forEach(e=>e.style.animation='')}
if(subs.length){
  pager=document.createElement('nav');pager.className='subnext';pager.setAttribute('aria-label',T.next);
  pager.innerHTML=`<span class="ct lbl"></span><a class="nx" href="#"><span class="lbl">Next</span><span class="nm"></span><span class="arw">${ARW}</span></a>`;
  document.querySelector('main').appendChild(pager);
  pager.querySelector('.nx').addEventListener('click',e=>{e.preventDefault();const id=e.currentTarget.getAttribute('href').slice(1);setHash(id);show(id,true)});
  const first=(location.hash||'').slice(1);show(first,false);
  addEventListener('hashchange',()=>show(location.hash.slice(1),true));
}

/* 도착 위치: 하위 화면이 있는 페이지는 맨 위, 앵커가 있으면 그 구역 맨 위, 없으면 맨 위.
   이미지·폰트가 늦게 들어와도 사용자가 스크롤하기 전까지는 다시 맞춤 */
let userMoved=false;
['wheel','touchstart','keydown','mousedown'].forEach(t=>addEventListener(t,()=>{userMoved=true},{passive:true,once:true}));
function arrive(){
  if(userMoved)return;
  const h=decodeURIComponent((location.hash||'').slice(1));
  if(subs.length){instant(0);return}
  const el=h&&document.getElementById(h);
  if(el){instant(anchorTop(el));return}
  if(!h)instant(0);
}
arrive();requestAnimationFrame(arrive);
addEventListener('load',()=>{arrive();setTimeout(arrive,150)});
addEventListener('pageshow',e=>{root.classList.remove('ka-leave','ka-jump');if(e.persisted){userMoved=false;arrive()}});

/* intercept internal links: same page → swap sub; other page → transition. 언어 전환은 보고 있던 구역(#)을 유지 */
document.addEventListener('click',e=>{
  const a=e.target.closest('a[href]');if(!a||e.defaultPrevented||a.target==='_blank'||e.metaKey||e.ctrlKey||e.shiftKey||e.button!==0)return;
  const href=a.getAttribute('href');if(!href||href.startsWith('http')||href.startsWith('mailto:')||href==='#')return;
  if(a.dataset.lang){e.preventDefault();if(!a.hasAttribute('aria-current'))leaveTo(href+(location.hash||''));return}
  const [file,hash]=href.split('#');
  if(!file||file===here){
    if(subs.length&&hash&&subs.some(([,v])=>v===hash)){e.preventDefault();closeAll();closeMM();setHash(hash);show(hash,true)}
    else if(hash&&document.getElementById(hash)){e.preventDefault();closeMM();setHash(hash);const el=document.getElementById(hash);jumpTo(()=>anchorTop(el))}
    else closeAll();
    return}
  if(!file.endsWith('.html'))return;
  e.preventDefault();leaveTo(href);
});

/* 히어로 맨 아래 스크롤 안내: 아래로 내리면 내용이 차례로 나타난다는 것을 알려 줌 · 누르면 다음 구역으로 · 조금 내리면 사라짐 */
const heroBox=document.querySelector('.hero .hv')||document.querySelector('main>.ph');
if(heroBox){
  const cue=document.createElement('button');cue.type='button';cue.className='scue';cue.setAttribute('aria-label',EN?'Scroll down':'아래로 스크롤');
  cue.innerHTML='<span class="scue-t" aria-hidden="true">Scroll</span><span class="scue-l" aria-hidden="true"><i></i></span>';
  heroBox.appendChild(cue);
  cue.addEventListener('click',()=>{
    const y=(heroBox.closest('.hero')||heroBox).getBoundingClientRect().bottom+scrollY-HH();
    smoothTo(y,1.2);
  });
  /* 사라지는 전환이 끝난 뒤에만 빛 줄기를 멈춤(.idle) — 보이지 않는 안내가 매 프레임 깨우지 않게 */
  let zt=0;const rest=()=>{clearTimeout(zt);if(cue.classList.contains('off'))cue.classList.add('idle')};
  cue.addEventListener('transitionend',e=>{if(e.target===cue&&e.propertyName==='opacity')rest()});
  const hide=()=>{const o=scrollY>40;if(o===cue.classList.contains('off'))return;cue.classList.toggle('off',o);clearTimeout(zt);if(o)zt=setTimeout(()=>{if(getComputedStyle(cue).opacity==='0')rest()},700);else cue.classList.remove('idle')};
  addEventListener('scroll',hide,{passive:true});hide();
}
})();

/* 2 · 히어로 · 패널 영상 */
(()=>{
'use strict';
const {EN,reduce,MQ,INPUT:EV,ICON}=window.KA;
const small=matchMedia(MQ.narrow).matches;
const load=v=>{if(v.getAttribute('src'))return;v.src=`${v.dataset.v}-${small?800:1600}.mp4`;if(!reduce)v.play().catch(()=>{})};
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){io.unobserve(e.target);load(e.target)}}),{rootMargin:'400px 0px'});
const VS=[...document.querySelectorAll('video[data-v],#heroVideo')];
/* 자동 재생이 거절된 경우(아이폰 저전력 모드 등) 첫 터치 · 클릭 · 키 입력 때 불러온 영상을 다시 재생 · 화면 밖 영상은 허용만 받아 두고 멈춤 */
let armed=0;
const kick=()=>{const vs=VS.filter(v=>v.getAttribute('src'));vs.forEach(v=>{if(v.paused&&!v._auto)v.play().catch(()=>{})});if(vs.length&&vs.every(v=>!v.paused||v._auto)){armed=0;EV.forEach(e=>removeEventListener(e,kick))}};
const arm=()=>{if(reduce||armed)return;armed=1;EV.forEach(e=>addEventListener(e,kick,{passive:true}))};
/* 화면에서 한 화면 넘게 벗어난 소리 없는 영상은 멈추고(_auto), 한 화면 앞으로 다가오면 멈춘 자리에서 이어서 재생 — 보이지 않는 디코딩 · 내려받기를 하지 않고, 화면에 들어올 때는 이미 움직이는 중. 소리를 켠 영상은 그대로
   root: document — iframe(아티팩트) 안에서도 rootMargin이 먹게(못 쓰는 브라우저는 기본 root) */
const onVis=es=>es.forEach(e=>{const v=e.target;v._off=!e.isIntersecting;
  if(v._off){if(!v.paused&&v.muted){v._auto=1;v.pause()}}else if(v._auto){v._auto=0;if(v.paused)v.play().catch(er=>{if(er&&er.name==='NotAllowedError')arm()})}});
let vis;try{vis=new IntersectionObserver(onVis,{root:document,rootMargin:'100% 0px'})}catch{vis=new IntersectionObserver(onVis,{rootMargin:'100% 0px'})}
/* 화면 밖에서 시작된 재생(불러오기 · 입력 · 히어로 스크립트)도 곧바로 멈춤 — 입력으로 얻은 재생 허용은 그대로 남음 */
VS.forEach(v=>{vis.observe(v);v.addEventListener('play',()=>{if(v._off&&v.muted){v._auto=1;v.pause()}})});
arm();
document.querySelectorAll('video[data-v]').forEach(v=>{
  const ar=v.dataset.ar,box=v.closest('.ph');
  if(ar&&box){const [w,h]=ar.split('/').map(Number);box.classList.toggle('w',w/h>=3||box.classList.contains('w'))}
  io.observe(v);
  if(v.hasAttribute('data-sound')&&box){
    const b=document.createElement('button');b.type='button';b.className='snd';
    const L=EN?['Sound on','Sound off']:['사운드 켜기','사운드 끄기'];
    const ic=on=>on?ICON.sndOn:ICON.sndOff;
    const set=on=>{v.muted=!on;b.setAttribute('aria-pressed',on);b.setAttribute('aria-label',on?L[1]:L[0]);b.innerHTML=ic(on)+`<span>${on?L[1]:L[0]}</span>`};
    set(false);b.addEventListener('click',()=>{load(v);set(v.muted);v.play().catch(()=>{})});box.appendChild(b);
  }
});
})();
