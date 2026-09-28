/* 스크롤 연출 (모든 페이지)
   · 관성 스크롤(Lenis) · 사업 패널 미디어 펼침 · 히어로 영상 다가옴 — 한화에어로스페이스 메인 참조
   · 순차 등장 — Beyond Aero(/one) 참조: 그림과 문장이 한꺼번에 나오지 않고
     작은 라벨 → 제목(흐림에서 또렷하게) → 본문 → 그림(틀이 먼저, 사진은 살짝 당겨지며) → 세부 항목(하나씩) 순서로
   · 메인 페이지는 구역별로 순서를 직접 지정하고, 하위 페이지는 같은 규칙을 구역 구조에서 자동으로 적용
   모든 쪽: site.js(KA · .subnext · .ph.bare) 뒤. 채워 두는 쪽 스크립트(careers · newsroom · history · uav*)보다 뒤, index.js보다 앞 — 순서: docs/motion.md */
(()=>{
'use strict';
const {reduce,clamp,HH,MQ,loop}=window.KA;
const root=document.documentElement;
const ease=t=>1-Math.pow(1-t,3);
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];

/* 1 · 관성 스크롤: 네이티브 스크롤 위치를 그대로 쓰므로 sticky 패널 · 스크롤 연동 효과가 모두 그대로 동작.
   연혁 가로 스테이지 · 무인기 모션 그래픽 위에서는 각자의 스크롤 제어를 쓰도록 비켜 줌.
   라이브러리는 첫 화면을 붙잡지 않도록 이 스크립트가 뒤따라 불러옴(이미 있으면 그대로 사용) */
if(!reduce&&matchMedia('(hover:hover) and (pointer:fine)').matches){
  const init=()=>{if(!window.Lenis||window.KA_LENIS)return;
    const lenis=new Lenis({lerp:.085,smoothWheel:true,wheelMultiplier:1,prevent:n=>!!(n.classList&&(n.classList.contains('hx-stage')||n.id==='seq'))});
    /* 프레임 루프는 부드러운 스크롤이 움직이는 동안만(가만히 있을 때 매 프레임 깨우지 않음) — 휠 · 안내 버튼 · 3D 바로가기 모두 scrollTo를 거치므로 거기서 다시 켬.
       다시 켤 때 첫 프레임의 시간 간격은 화면 주기(최근 프레임 간격 15개의 중앙값 — 버벅인 프레임에 끌려가지 않게)로: 계속 돌던 원래와 같은 궤적.
       처음 몇 프레임은 이 값을 재려고 돌림 */
    let rid=0,prev=0,gap=1000/60,warm=16;const iv=[];
    const raf=t=>{if(!prev)lenis.time=t-gap;else if(t>prev)iv.push(t-prev)>15&&iv.shift();prev=t;lenis.raf(t);
      if(lenis.animate.isRunning||warm-->0)rid=requestAnimationFrame(raf);else{rid=prev=0;if(iv.length)gap=Math.min(50,[...iv].sort((a,b)=>a-b)[iv.length>>1])}};
    const kick=()=>{if(!rid){rid=requestAnimationFrame(raf);dispatchEvent(new Event('ka-lenis'))}};   /* 다시 켰음을 알림(3D 루프가 그 뒤로 줄을 섬) */
    const sT=lenis.scrollTo.bind(lenis);lenis.scrollTo=(...a)=>{sT(...a);kick()};
    kick();
    window.KA_LENIS=lenis;};
  if(window.Lenis)init();
  else{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/lenis@1.3.4/dist/lenis.min.js';s.async=true;s.onload=init;document.head.appendChild(s)}
}
if(reduce)return;

/* 2 · 순차 등장 ─ 각 묶음은 기준 요소(trigger)와 [요소, 종류, 시작 시각(초)] 목록.
   종류: t=글(흐림→또렷, 살짝 떠오름) · img=그림(틀 먼저, 안의 사진이 1.06→1로 당겨짐) · rule=윗선이 왼쪽부터 그어진 뒤 글 · fl=스트립 카드가 하나씩 · fade=투명도만 */
root.classList.add('rv','rv-now');   /* 표시 준비 중에는 전환 없이 곧바로 숨김 */
const SEQ=[];
let genAt=0;   /* 다음 묶음이 시작할 수 있는 가장 이른 시각(ms) — 페이지 전체에서 위 → 아래 순서를 지키는 공통 시계 */
let prevG=null,prevEnd=0;   /* 바로 앞에 예약한 묶음과 그 마지막 항목의 시작 시각 */
/* 윗선 하나(inset 0 1px 0)만 있는 요소는 선 긋기 연출을 쓰고, 선 색은 원래 색을 그대로 이어받음 */
const LINE=/^(rgba?\([^)]*\)|#[0-9a-f]+|[a-z]+) 0px 1px 0px(?: 0px)? inset$/i;
function lineOf(el){
  const cs=getComputedStyle(el),m=LINE.exec(cs.boxShadow.trim());
  if(!m||!/^(static|relative)$/.test(cs.position)||getComputedStyle(el,'::before').content!=='none')return null;
  return m[1];
}
function mark(el,type,base,items){
  if(type==='rule'){const c=lineOf(el);if(c){el.style.setProperty('--rv-line',c);el.style.setProperty('--rv-lo','1')}}
  el.setAttribute('data-rv',type);el.style.setProperty('--d',base.toFixed(2)+'s');items.push({el,base});
}
function seq(trigger,steps){
  const items=[];
  steps.forEach(([sel,type,at,gap])=>{
    const els=typeof sel==='string'?$$(sel,trigger):[].concat(sel).filter(Boolean);
    els.forEach((el,i)=>{if(!el.hasAttribute('data-rv'))mark(el,type,at+(gap||0)*i,items)});
  });
  if(items.length)SEQ.push({trigger,items});
}

/* ── 메인 페이지 ── */
/* 히어로: 불러오자마자 — 영상 → 윗줄 라벨 → 제목 → 본문 → 버튼 */
const hero=$('.hero .hv');
if(hero){
  seq(hero,[['video','fade',0],['.hv-lbl','t',.55],['.hv-h1','t',.8],['.hv-lead','t',1.15],['.hv-ctas','t',1.45]]);
  const h=SEQ.pop();requestAnimationFrame(()=>requestAnimationFrame(()=>play(h,0)));
  genAt=performance.now()+1600;   /* 첫 화면에 다음 구역이 함께 보여도(폰) 히어로 제목 · 본문 · 버튼이 먼저 */
}
/* 사업 패널: 탭 → 큰 제목 → 설명 → 이력 항목 하나씩 → 버튼 · 미디어는 글이 자리 잡은 뒤 */
$$('.biz .bp').forEach(bp=>{
  const pf=$$('.bp-pf li',bp).length;
  const fl=$('.fleet',bp);if(fl&&!matchMedia(MQ.stack).matches)seq(fl,[[fl,'fl',.1]]);
  seq(bp,[['.bp-meta','t',0],['.bp-t','t',.12],['.bp-lead','t',.34],['.bp-pf li','rule',.55,.1],['.bp-go','t',.55+pf*.1],['.fleet','fl',.65+pf*.1]]);
  /* 고정 패널은 아래에서 덮어 올라오므로, 패널이 화면 절반 넘게 올라온 뒤에 재생해야 글이 나타나는 과정이 보임 */
  const g=SEQ[SEQ.length-1];if(g&&g.trigger===bp)g.line=.42;
});
const fut=hero&&$('#future');
if(fut){
  seq(fut,[['.side>*','t',0,.12],['.main .lead','t',.3]]);
  $$('.fut>.fc',fut).forEach((fc,k)=>{const b=.25+k*.18;seq(fc,[['.fr','img',b],['.lbl','t',b+.3],['h3','t',b+.42],['p','t',b+.54],['li','t',b+.68,.1]])});
  const krn=$('.kr-note',fut);if(krn)seq(krn,[[krn,'t',0]]);   /* 영문 페이지: 한국어 기사 안내 */
}
const news=hero&&$('#news');
if(news){
  seq(news,[['.side>*','t',0,.12],['.news-h .more','t',.3]]);
  const nws=$('#nws',news);
  if(nws){
    const tag=()=>{ $$('.nc',nws).forEach((c,k)=>{const b=.1+k*.16;seq(c,[['.fr','img',b],['.meta','t',b+.3],['.t','t',b+.42]])}) };
    tag();
    /* 최신 3건이 데이터로 다시 채워지면 새 카드에도 같은 순서를 적용 */
    new MutationObserver(()=>{tag();watch()}).observe(nws,{childList:true});
  }
}
const ct=hero&&$('#contact');
if(ct)seq(ct,[['.side>*','t',0,.12],['.main>.body','t',.36],['.cta-act .btn','t',.56,.1],['.cta-job','t',.85]]);

/* ── 하위 페이지(회사소개 · 사업 · 뉴스룸 · 인재채용): 구역 구조에서 같은 순서를 자동으로 ──
   구역의 블록을 문서 순서대로 모음: 라벨(.side) → 제목 · 본문(.main 안의 각 요소) → 목록(카드 · 항목 하나하나) → 기타.
   블록마다 화면에 들어올 때 등장하고, 한 번에 여러 블록이 들어오면 문서 순서대로 조금씩 시차를 둠 */
const COLL='.pillars,.stats,.locs,.grid,.vgrid,.bgrid,.bz-pf,.roles,.prog,.sites,.bens,.steps,.jobs,.gbody,.mx-sum,.mx-bars,.mx-gal,.mx-life,.mx-ups,.mx-next';
const SKIP='.hx,#seq,script,style,template,[data-rvq],[data-rvc]';
const STEP={card:.2,rule:.12,t:.14};
const seen=new Set();              /* 이미 보여 준 목록 카드(더보기 · 필터로 다시 그려져도 다시 숨기지 않음) */
const keyOf=el=>el.getAttribute('href')||(el.textContent||'').trim().slice(0,90);
const isBtnRow=el=>el.children.length>1&&[...el.children].every(c=>c.classList.contains('btn'));
function blocks(el,out){
  [...el.children].forEach(c=>{
    if(c.matches(SKIP)||c.hasAttribute('data-rv'))return;
    if(c.matches('.main,.hist-intro')||c.matches(COLL)||isBtnRow(c)){blocks(c,out);return}
    if(!c.querySelector(':scope>.fr')&&c.querySelector(COLL)){blocks(c,out);return}
    if(!c.children.length&&!c.textContent.trim())return;   /* 데이터로 채워질 빈 자리는 채워진 뒤에 */
    out.push(c);
  });
  return out;
}
function tagBlock(b){
  if(b.parentElement&&b.parentElement.matches(COLL)&&seen.has(keyOf(b))){b.setAttribute('data-rvq','');return}
  if(b.matches('.gside')){   /* 왼쪽 머리글: 라벨 → 제목 → 부제, 다음 블록은 제목이 뜬 뒤 */
    const items=[];[...b.children].forEach((x,j)=>mark(x,'t',j*.12,items));
    b.setAttribute('data-rvc','');   /* 목록이 다시 그려질 때 또 묶지 않게 */
    SEQ.push({trigger:b,items,gen:true,step:.26});return;
  }
  const items=[],fr=b.querySelector(':scope>.fr');
  if(fr){
    /* 카드: 그림 틀 → 사진 → 라벨 · 제목 · 본문 차례로 */
    mark(fr,'img',0,items);let j=0;
    [...b.children].forEach(x=>{if(x===fr)return;(x.classList.contains('tx')?[...x.children]:[x]).forEach(y=>{if(!y.hasAttribute('data-rv'))mark(y,'t',.3+.12*j++,items)})});
    b.setAttribute('data-rvc','');
    SEQ.push({trigger:b,items,gen:true,step:STEP.card});
  }else{
    const type=lineOf(b)?'rule':'t';mark(b,type,0,items);
    SEQ.push({trigger:b,items,gen:true,step:STEP[type]});
  }
}
const GEN=$$('main>section.sec').filter(s=>!s.querySelector('[data-rv]')&&!s.matches('.biz'));
function tagAll(){GEN.forEach(s=>blocks(s,[]).forEach(tagBlock))}
tagAll();
const sn=$('main>.subnext');if(sn&&!sn.hasAttribute('data-rv'))tagBlock(sn);
const waiting=()=>$$('main>section:not([hidden]) :is(.vgrid,.bgrid,.jobs,#nws,#feat)').some(e=>!e.children.length&&!e.textContent.trim());
/* 이미 그려진 요소를 숨길 때 흐려지며 사라지는 전환이 끼지 않도록, 숨은 상태를 한 번 계산한 뒤 전환을 되살림 */
void root.offsetHeight;root.classList.remove('rv-now');

/* 묶음의 기준 요소 윗단이 화면 아래 22% 선을 넘으면(또는 이미 지나쳤으면) 한 번 재생 — 스크롤을 한두 줄 더 내린 뒤 나타나도록.
   숨겨진 하위 화면 안의 묶음은 기다렸다가, 그 화면이 열릴 때 재생 */
const timers=new Map();
const stackMQ=matchMedia(MQ.stack);
const PH=$('main>.ph');let afterHero=!!PH,heroT=performance.now();
function play(g,off){
  let last=0;g.at=performance.now()+off*1000;
  g.items.forEach(({el,base})=>{el.classList.remove('rv-end');el.style.setProperty('--d',(base+off).toFixed(2)+'s');last=Math.max(last,base+off)});
  /* 방금 표시한 요소도 숨은 상태를 한 번 계산해 둔 뒤 등장시켜야 전환이 보임(불러오자마자 화면 안에 있는 블록) */
  void root.offsetHeight;
  g.items.forEach(({el})=>el.classList.add('in'));
  g.done=true;
  if(g.gen&&g.trigger.parentElement&&g.trigger.parentElement.matches(COLL))seen.add(keyOf(g.trigger));
  clearTimeout(timers.get(g));
  timers.set(g,setTimeout(()=>g.items.forEach(({el})=>el.classList.add('rv-end')),(last+1.9)*1000));
}
function reset(g){clearTimeout(timers.get(g));g.items.forEach(({el})=>el.classList.remove('in','rv-end'));g.done=false}
function watch(){
  const line=innerHeight*.78,hit=[];
  /* 페이지 끝까지 내려 더 스크롤할 수 없으면, 화면 안에 들어온 나머지 블록도 재생(선을 넘지 못하고 남는 블록이 없게) */
  const end=scrollY+innerHeight>=document.documentElement.scrollHeight-4;
  for(let i=SEQ.length-1;i>=0;i--){
    const g=SEQ[i];if(g.done)continue;
    if(g.trigger===sn&&waiting())continue;   /* 아래 '다음 화면' 링크는 데이터로 채워질 목록이 채워진 뒤에 */
    if(!g.trigger.isConnected){SEQ.splice(i,1);continue}
    if(!g.trigger.getClientRects().length)continue;
    const tt=g.trigger.getBoundingClientRect().top;
    if(tt<(g.line&&stackMQ.matches?innerHeight*g.line:line)||(end&&tt<innerHeight))hit.push(g);
  }
  hit.sort((a,b)=>a.trigger.compareDocumentPosition(b.trigger)&Node.DOCUMENT_POSITION_FOLLOWING?-1:1);
  /* 하위 페이지를 열 때(또는 하위 화면을 바꿀 때)는 히어로의 라벨 → 제목 → 설명이 먼저 나온 뒤 본문이 이어짐 */
  /* 영상 위 글자가 없는 화면(제목이 구역 왼쪽에 있는 탭)은 영상이 열리기 시작할 즈음 곧바로 */
  const now=performance.now(),HL=PH&&PH.classList.contains('bare')?.5:1.15;
  const gen=afterHero&&hit.some(g=>g.gen);const lead=gen?Math.max(0,HL-(now-heroT)/1000):0;if(gen)afterHero=false;
  /* 블록 시작 시각을 페이지 전체에서 이어 셈 — 조금 전 판정돼 아직 기다리는 블록보다 아래 블록이 먼저 시작하지 않게(대기 중 머리글 · 본문 순서 뒤바뀜 방지) */
  /* 같은 목록 안의 카드끼리는 조금씩 겹쳐 이어지고(step), 목록 · 구역을 벗어나는 다음 블록은 앞 묶음의 마지막 항목이 시작한 뒤에 */
  const kind=e=>(e.className||'').split(' ')[0];
  const sched=(g,from,cap)=>{
    const lb=Math.max(0,...g.items.map(x=>x.base));
    const same=prevG&&prevG.done&&prevG.trigger.parentElement===g.trigger.parentElement&&kind(prevG.trigger)===kind(g.trigger);
    /* 같은 목록이라도 앞 카드 아래 줄에 놓인 카드(폰에서 세로로 쌓인 카드, 격자의 다음 줄)는 앞 카드가 다 나온 뒤에 */
    const below=same&&g.trigger.getBoundingClientRect().top>=prevG.trigger.getBoundingClientRect().bottom-4;
    if(prevG&&prevG.done&&(!same||below))from=Math.max(from,prevEnd-(g.gen?0:Math.min(...g.items.map(x=>x.base))*1000));
    const off=Math.min(Math.max(from,genAt)-now,cap)/1000;play(g,off);
    /* 메인 페이지 묶음은 카드마다 시차가 이미 들어 있으므로(base) 같은 목록 안에서는 덧붙이지 않음 */
    const st=now+off*1000;genAt=st+(g.gen?(g.step||STEP.t):0)*1000;prevEnd=st+(lb+.12)*1000;prevG=g;
  };
  hit.forEach(g=>{const l=g.gen?lead:0;sched(g,now+l*1000,(l+2)*1000)});
  /* 데이터로 늦게 채워진 목록처럼, 방금 재생한 블록보다 아래에 있는데 이미 예약돼 아직 시작 전인 블록은 그 뒤로 다시 예약 */
  if(hit.length){
    const last=hit[hit.length-1].trigger;
    SEQ.filter(g=>g.done&&g.at>now+30&&!hit.includes(g)&&(last.compareDocumentPosition(g.trigger)&Node.DOCUMENT_POSITION_FOLLOWING))
       .sort((a,b)=>a.trigger.compareDocumentPosition(b.trigger)&Node.DOCUMENT_POSITION_FOLLOWING?-1:1)
       .forEach(g=>{reset(g);sched(g,g.at,2600)});
  }
}

/* 하위 화면 전환(같은 페이지 안): 닫히는 화면은 처음 상태로 되돌려 두었다가, 다시 열리면 처음부터 재생.
   데이터로 채워지는 목록(뉴스 · 영상 · 브로슈어 · 채용 공고)은 새 카드에도 같은 순서를 적용 */
const main=$('main');
if(main){
  let pend=false;
  new MutationObserver(ms=>{
    let retag=false;
    ms.forEach(m=>{
      if(m.type==='attributes'){if(m.target.hidden)SEQ.forEach(g=>{if(g.done&&m.target.contains(g.trigger))reset(g)});else if(PH&&m.target.parentElement===main){afterHero=true;heroT=performance.now();genAt=0;prevG=null}   /* 새 하위 화면은 앞 화면의 대기와 무관하게 */}
      else if(!m.target.closest('.hx,#seq,[data-rv],[data-rvc]')&&GEN.some(s=>s.contains(m.target)))retag=true;
    });
    if(retag)tagAll();
    if(!pend){pend=true;requestAnimationFrame(()=>{pend=false;watch()})}
  }).observe(main,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden']});
}

/* 무인기 체계 화면(#seq): 장면 글이 스크롤에 맞춰 통째로 나타나던 것을, 장면이 열릴 때마다
   번호 → 제목(흐림에서 또렷하게) → 영문 → 임무 → 특징 하나씩, 제원 표 · 임무 단계 · 아래 큰 제원 줄은 한 칸씩 차례로 나오게.
   장면을 벗어나면 처음 상태로 되돌려, 다시 들어올 때 다시 재생 · 단계를 하나만 보여 주는 배치(.f5)에서는 새로 켜지는 단계마다 같은 등장
   등장 규칙(.rvs · .rv-in · --dl)은 css/uav.css 끝 */
const sq=$('#seq');
if(sq){
  const U=[];
  const add=(el,kids)=>{el.classList.add('rvs');kids.forEach(k=>k.style.setProperty('--dl',k.d.toFixed(2)+'s'));U.push(el)};
  $$('.cht',sq).forEach(c=>{const k=[];let d=0;[...c.children].forEach(x=>{if(x.classList.contains('feats'))[...x.children].forEach((f,j)=>{f.d=.55+j*.09;k.push(f)});else{x.d=d;d+=x.tagName==='H2'?.16:.13;k.push(x)}});add(c,k)});
  $$('.spec',sq).forEach(c=>add(c,[...c.children].map((x,j)=>(x.d=.05+j*.07,x))));
  $$('#phases>div',sq).forEach(c=>add(c,[...c.children].map((x,j)=>(x.d=j*.07,x))));
  $$('#ispecs>.ispec',sq).forEach(c=>add(c,[...c.children].map((x,j)=>(x.d=.35+j*.08,x))));
  /* 화면(스테이지)이 실제로 보일 때만 재생 — 첫 장면은 처음부터 불투명이라 이 조건이 없으면 화면에 닿기 전에 이미 재생됨 */
  /* 되돌림은 무대가 화면을 완전히 벗어났을 때만(섹션 끝에서 아직 보이는 글이 흐려지지 않게) · 들어올 때는 블록 자신도 화면 안에 들어와야 */
  /* 무대가 화면을 벗어나 모든 장면 글을 되돌린 뒤에는 멈추고, 스크롤 · 창 크기 변화 때 다시 켬 */
  const wake=loop(()=>{const r=sq.getBoundingClientRect(),inv=r.top<innerHeight*.55&&r.bottom>innerHeight*.45,gone=r.bottom<=0||r.top>=innerHeight;let any=false;
    U.forEach(el=>{const o=parseFloat(el.style.opacity||'0'),on=el.classList.contains('rv-in');
      if(o>.35&&inv&&!on){const b=el.getBoundingClientRect();if(b.height&&b.top<innerHeight*.92&&b.bottom>0){el.classList.add('rv-in');any=true}}
      else if((o<.02||gone)&&on)el.classList.remove('rv-in');else if(on)any=true});
    return !(gone&&!any)});
  addEventListener('scroll',wake,{passive:true});addEventListener('resize',wake);wake();
}

/* 3 · 사업 패널 미디어 펼침 (메인 페이지) */
const panels=$$('.biz .bp');
const wide=matchMedia(MQ.wide);
let tick=false;
function update(){
  tick=false;watch();const vh=innerHeight;
  /* 펼침 값은 패널이 아니라 미디어 자신에(물려받지 않는 값이라 값이 바뀌어도 안의 카드 · 도면까지 다시 계산하지 않음) */
  panels.forEach(bp=>{const ms=$$('.fleet',bp);if(!ms.length)return;const r=ms[0].getBoundingClientRect();const p=(wide.matches?ease(clamp((vh-r.top)/(vh*.45))):1).toFixed(4);ms.forEach(m=>m.style.setProperty('--open',p))});
}
const req=()=>{if(!tick){tick=true;requestAnimationFrame(update)}};
addEventListener('scroll',req,{passive:true});addEventListener('resize',req);addEventListener('load',req);update();
/* 뒤에 있던 탭 · 창이 앞으로 나오면 그동안 멈춰 있던 등장 확인을 바로 다시 */
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')req()});addEventListener('pageshow',req);
})();
