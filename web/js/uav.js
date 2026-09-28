/* 무인기 체계 화면(#seq) 본체 — 장 목록 · 장면 라벨 · 글 층(설명 · 단계 · 목차 · 제원 · 큰 이름 · 기체 그림) · 창 맞춤 · 장면 생성 · 스크롤 루프 · 깊은 링크.
   uav.html · uav-en.html: js/site.js(window.KA) · uav-data/kit/scenes1/scenes2.js 뒤, js/scroll-fx.js 앞의 동기 스크립트여야 함
   (scroll-fx가 여기서 만든 .cht · .spec · 단계 · 첫 화면 제원에 등장 효과를 붙이고, 같은 프레임에서 이 루프가 먼저 돌아 쓴 투명도를 읽음) */
(()=>{
'use strict';
const U=window.UAV,st=U.st;
const {reduce,clamp,seg,lerp,eio,setA,el,SPR,ALLSP}=U;
const {EN,MQ,pad2,jumpTo,loop}=window.KA;   /* EN: site.js가 <html lang>으로 정함 */

/* 장 목록 */
/* 공통 설정(CFG) + 이 언어 글(TX) → 장 목록 CH: {ko(제목),rail,en,feats,mission,plate,iso,hero,concept,phases:[[시작,끝,이름,설명]…],specs,src} */
const X=U.TX[EN?'en':'ko'];
const CH=U.CFG.map((c,i)=>{const t=X.ch[i];return {ko:t.name,rail:t.rail,en:t.en,feats:t.feats,mission:t.mission,
  plate:`<img class="iso" src="${c.img}" alt="${t.alt}">`,iso:c.iso,hero:c.hero,concept:c.concept,
  phases:t.phases.map((q,j)=>[c.ph[j],c.ph[j+1],q[0],q[1]]),specs:t.specs,src:t.src}});
const N=CH.length;

/* 라벨(DOM, 고정 px 크기) */
const svg=document.getElementById('scene');svg.setAttribute=setA;
const labelLayer=document.getElementById('labels');
const stage=document.querySelector('.stage');
const sec=document.getElementById('seq');
/* 설명 후반을 부드럽게 감속. 거리 곡선의 기울기는 양수라 정지 구간이 없음. */
const slowZones=U.CFG.flatMap((c,i)=>(c.slow||[]).map(s=>({from:i+s.from,to:i+s.to,extra:s.extra}))),slowH=slowZones.reduce((n,s)=>n+s.extra,0);
sec.style.setProperty('--read-extra',(slowH*100)+'svh');
let slowScale=1,scrollUnit=1;
function measureScroll(){scrollUnit=Math.max(1,(sec.offsetHeight-innerHeight-stage.clientHeight*slowH)/N);slowScale=stage.clientHeight/scrollUnit}
const easeDistance=t=>t*t*t*(10+t*(-15+6*t));
function distanceAt(q){return q+slowScale*slowZones.reduce((n,s)=>n+s.extra*easeDistance(seg(q,s.from,s.to)),0)}
function sceneAt(d){
  if(!slowZones.length||d<=slowZones[0].from)return d;
  if(d>=distanceAt(N))return N;
  /* 누적 거리의 역함수. 양 끝에서 원래 속도로 이어져 경계가 튀지 않음. */
  let a=0,b=N;for(let j=0;j<28;j++){const m=(a+b)/2;if(distanceAt(m)<d)a=m;else b=m}return (a+b)/2}
const scrollYAt=q=>sec.offsetTop+scrollUnit*distanceAt(q);
measureScroll();addEventListener('resize',measureScroll);
const tags=[];
const chVis=new Array(N).fill(0);   /* 장별 보임(0~1) — 라벨이 장과 함께 사라지게 */
function tag(text,cls=''){const e=document.createElement('div');e.className='tag '+cls;e.innerHTML=text;e.style.opacity=0;labelLayer.appendChild(e);const o={e,x:0,y:0,o:0,dx:0,dy:0,ch:st.curCh};tags.push(o);return o}
function place(o,x,y,v,dx=10,dy=-6){o.x=x;o.y=y;o.o=v;o.dx=dx;o.dy=dy}
let CTM=null,stageRect=null;const OB=[];let fitV=0;
addEventListener('resize',()=>{fitV++});document.fonts&&document.fonts.ready.then(()=>{fitV++});
/* 라벨이 가리면 안 되는 영역: 헤더, 현재 체계의 설명·임무 단계·제원, 목차 */
function obstacles(){
  OB.length=0;const sr=stageRect,pad=8;
  const add=el=>{if(!el)return;const r=el.getBoundingClientRect();if(r.width>0&&r.height>0)OB.push({l:r.left-sr.left-pad,t:r.top-sr.top-pad,r:r.right-sr.left+pad,b:r.bottom-sr.top+pad})};
  const ci=Math.min(Math.max(Math.floor(p),0),N-1);
  add(T[ci]);add(P[ci]&&P[ci].el);add(SP[ci]);add(rail);
  const g=document.querySelector('.gh');if(g){const r=g.getBoundingClientRect();OB.push({l:-1e4,t:-1e4,r:1e4,b:r.bottom-sr.top+4})}
}
function flushTags(){
  CTM=svg.getScreenCTM();stageRect=stage.getBoundingClientRect();
  const pt=svg.createSVGPoint(),SW=stageRect.width,M=10;let obs=false;
  for(const o of tags){
    const ov=o.o*chVis[o.ch];if(ov<=0.001){if(o.e.style.opacity!=='0')o.e.style.opacity=0;o.k=1;continue}
    if(!obs){obstacles();obs=true}
    if(o.wv!==fitV){o.w=o.e.offsetWidth;o.h=o.e.offsetHeight;o.wv=fitV}
    if(o.base==null)o.base=o.e.classList.contains('l');
    pt.x=o.x;pt.y=o.y;const q=pt.matrixTransform(CTM);
    const ax=q.x-stageRect.left,y0=q.y-stageRect.top+o.dy-o.h/2;
    /* 화면 가장자리에 닿으면 반대쪽으로 뒤집어 잘리지 않게 */
    const R=ax+o.dx,Lx=ax-o.dx-o.w;let left=o.base;
    if(!left&&R+o.w>SW-M&&Lx>=M)left=true;else if(left&&Lx<M&&R+o.w<=SW-M)left=false;
    const x0=Math.min(Math.max(left?Lx:R,M),SW-M-o.w);
    if(left!==o.cur){o.e.classList.toggle('l',left);o.cur=left}
    /* 설명 글과 겹치는 라벨은 잠시 숨김 */
    const hit=!o.keep&&OB.some(b=>x0<b.r&&x0+o.w>b.l&&y0<b.b&&y0+o.h>b.t);
    o.k=(o.k??1)+((hit?0:1)-(o.k??1))*(reduce?1:K(.25));
    /* 늘 보이는 라벨(점검 리포트)은 숨기는 대신 가리는 글(제원 표 등) 위로 올려 겹치지 않게 */
    let y1=y0;if(o.keep){const top=(OB.find(b=>b.l<-1e3)||{b:0}).b+6;for(const b of OB){if(b.l<-1e3)continue;if(x0<b.r&&x0+o.w>b.l&&y1<b.b&&y1+o.h>b.t)y1=Math.max(top,b.t-o.h-6)}}
    o.e.style.transform=`translate(${x0.toFixed(1)}px,${y1.toFixed(1)}px)`;
    o.e.style.opacity=(ov*o.k).toFixed(3);
  }
}
/* 늘 보이는 리포트 카드(6 · 9장): 라벨처럼 장면 점을 따라가되 숨지 않고(keep), 가리는 글(제원 표 등) 위로 올림 — t=[머리, 본문, 꼬리] */
const REP_CSS='flex-direction:column;align-items:flex-start;gap:8px;padding:18px 20px;background:rgba(37,40,42,.92);box-shadow:inset 0 0 0 1px rgba(192,183,171,.4)';
function rep(t){const e=document.createElement('div');e.className='tag big';e.style.cssText+=REP_CSS;
  e.innerHTML=`<span class="lbl" style="color:#A19A91">${t[0]}</span><span style="font-size:22px;font-weight:300">${t[1]}</span><span style="font-weight:300;color:#A19A91">${t[2]}</span>`;
  labelLayer.appendChild(e);e.style.opacity=0;
  const o={e,x:0,y:0,o:0,dx:0,dy:0,ch:st.curCh,keep:true};tags.push(o);return o}

/* 글 층 만들기 */
const chts=document.getElementById('chts'),phasesEl=document.getElementById('phases'),rail=document.getElementById('rail'),specsEl=document.getElementById('specs'),plates=document.getElementById('plates');
rail.innerHTML=`<div class="lbl cap">${X.cap}</div><div class="axis"><b></b></div>`;
const T=[],P=[],RL=[],SP=[],PL=[],GI=[],IS=[];const GN=U.GN;const giantsEl=document.getElementById('giants'),ispecsEl=document.getElementById('ispecs');
/* 숫자와 단위는 줄바꿈으로 떨어지지 않게 (예: 2.8 m) */
const nb=v=>String(v).replace(/(\d) (?=[^\s\d]+$)/,'$1\u00a0');
CH.forEach((c,i)=>{
  const t=document.createElement('div');t.className='cht';
  t.innerHTML=`<div class="no lbl"><span>${pad2(i+1)} / ${pad2(N)}</span></div><h2>${c.ko}</h2>`+
    `<div class="en lbl">${c.en}${c.concept?`<span class="tagc">${X.concept}</span>`:''}</div><p class="mission">${c.mission}</p>`+
    `<div class="feats">${c.feats.map(f=>`<div class="feat"><i></i><div><b>${f[0]}</b><span>${f[1]}</span></div></div>`).join('')}</div>`;
  chts.appendChild(t);T.push(t);
  const p=document.createElement('div');if(U.CFG[i].slow)p.className='slow-phases';p.style.cssText='position:absolute;left:0;right:0;bottom:0;display:flex;flex-direction:column';
  p.innerHTML=c.phases.map((ph,j)=>`<div class="phs"><span class="n">${pad2(j+1)}</span><span class="k">${ph[2]}</span><span class="d">${ph[3]}</span><i></i></div>`).join('');phasesEl.appendChild(p);P.push({el:p,items:[...p.children]});
  const a=document.createElement('a');a.href='#seq';a.innerHTML=`<span>${c.rail}</span><i></i>`;a.addEventListener('click',e=>{e.preventDefault();jump(i)});rail.appendChild(a);RL.push(a);
  const s=document.createElement('div');s.className='spec';s.innerHTML=`<div class="lbl h">Specifications</div>${c.specs.map(r=>`<div class="r"><span>${r[0]}</span><span>${nb(r[1])}</span></div>`).join('')}<div class="src">${X.src} · ${c.src}</div>`;specsEl.appendChild(s);SP.push(s);
  const pl=document.createElement('div');pl.className='plate';pl.innerHTML=c.plate+`<img class="top" src="${SPR[c.hero].h}" alt="" aria-hidden="true">`;plates.appendChild(pl);PL.push(pl);
  const gi=document.createElement('div');gi.className='giant';gi.textContent=GN[i];gi.setAttribute('aria-hidden','true');giantsEl.appendChild(gi);GI.push(gi);
  const is=document.createElement('div');is.className='ispec';is.style.setProperty('--n',Math.max(4,c.specs.length));
  is.innerHTML=c.specs.map(r=>`<div class="it"><span class="k">${r[0]}</span><span class="v">${nb(r[1])}</span></div>`).join('')+`<div class="src">${X.src} · ${c.src}</div>`;
  ispecsEl.appendChild(is);IS.push(is);
});
let plx=.58;
function fitGiants(){const cs=getComputedStyle(document.querySelector('.stage'));plx=parseFloat(cs.getPropertyValue('--plx'))||.58;const gk=parseFloat(cs.getPropertyValue('--gk'))||.56;
  GI.forEach(g=>{g.style.fontSize='100px';const w=g.scrollWidth||1;g.style.fontSize=Math.min(100*innerWidth*.96/w,innerHeight*gk)+'px'})}
fitGiants();addEventListener('resize',fitGiants);document.fonts&&document.fonts.ready.then(fitGiants);

/* 창 높이에 맞춘 압축 단계: 9개 체계 중 가장 긴 설명·제원까지 겹치지 않는 가장 낮은 단계를 고름 */
const stageEl=document.querySelector('.stage');
const FL=['f1','f2','f3','f4','f5','f6','f7'],FR=['r1','r2','r3'];
function fitOverlay(){
  const H=stageEl.clientHeight;if(!H)return;
  stageEl.classList.remove(...FL,...FR);
  const px=v=>parseFloat(v)||0,GAP=24,mobile=matchMedia(MQ.narrow).matches;
  stageEl.classList.add('m-all');
  const PH=P.map(p=>p.items.map(it=>{const d=it.querySelector('.d');return {b:it.offsetHeight-d.offsetHeight,d:Math.min(60,d.scrollHeight)}}));
  stageEl.classList.remove('m-all');
  const phaseNeed=(i,lv)=>{const R=PH[i];if(lv>=7)return 0;
    if(lv>=5||mobile)return Math.max(...R.map(r=>r.b+r.d));
    if(lv===4)return R.reduce((s,r)=>s+r.b-6,0);
    return R.reduce((s,r)=>s+r.b,0)+Math.max(...R.map(r=>r.d))};
  const availL=H-px(getComputedStyle(T[0]).top)-px(getComputedStyle(phasesEl).bottom);
  for(let lv=0;lv<=7;lv++){
    stageEl.classList.remove(...FL);for(let k=0;k<lv;k++)stageEl.classList.add(FL[k]);
    const need=Math.max(...T.map((t,i)=>{const ph=phaseNeed(i,lv);return t.offsetHeight+(ph?GAP+ph:0)}));
    if(need<=availL)break;
  }
  if(mobile)return;
  const availR=H-px(getComputedStyle(rail).top)-px(getComputedStyle(specsEl).bottom);
  for(let r=0;r<=3;r++){
    stageEl.classList.remove(...FR);for(let k=0;k<r;k++)stageEl.classList.add(FR[k]);
    const rh=r>=3?0:rail.offsetHeight,sh=Math.max(...SP.map(s=>s.offsetHeight));
    if(rh+(rh?GAP:0)+sh<=availR)break;
  }
}
/* 체계 첫 화면의 기체 이미지·큰 이름: 설명 글이나 목차와 겹치는 창 크기에서만, 둘 사이 빈 곳으로 옮기고 이미지는 그 폭에 맞춤 */
const PF=new Array(N).fill(null);
function fitPlates(){
  PF.fill(null);IS.forEach(x=>x.classList.remove('tight'));PL.forEach(pl=>{const iso=pl.querySelector('.iso');iso.style.maxWidth='';iso.style.maxHeight=''});GI.forEach(g=>{g.style.left='';g.style.right='';g.style.top=''});
  if(innerWidth/innerHeight<1.05){
    /* 세로 화면: 제목 아래와 제원 위 사이 빈 칸의 가운데에, 그 높이를 넘지 않게 */
    const H=stageEl.clientHeight;
    PL.forEach((pl,i)=>{const iso=pl.querySelector('.iso');const a=T[i].offsetTop+T[i].offsetHeight+16;
      let b=IS[i].offsetTop-16;if(b-a<140){IS[i].classList.add('tight');b=IS[i].offsetTop-16}
      const band=b-a,h=iso.offsetHeight;if(band<40||!h)return;const mh=Math.min(h,band);PF[i]={cx:.5,cy:(a+b)/2/H};if(mh<h)iso.style.maxHeight=mh+'px';GI[i].style.top=((a+b)/2/H*100+2).toFixed(2)+'%'});
    return;
  }
  const W=innerWidth,sr=stageEl.getBoundingClientRect(),H=sr.height,m=parseFloat(getComputedStyle(T[0]).left)||20,CL=24;
  const rr=rail.getBoundingClientRect(),railOn=rr.width>0&&getComputedStyle(rail).display!=='none';
  const railL=railOn?rr.left:W-m,railB=railOn?rr.bottom-sr.top:0;
  PL.forEach((pl,i)=>{
    const R=[];const tw=document.createTreeWalker(T[i],NodeFilter.SHOW_TEXT);let n;
    while(n=tw.nextNode()){if(!n.textContent.trim())continue;const rg=document.createRange();rg.selectNodeContents(n);for(const q of rg.getClientRects())if(q.width>0)R.push(q)}
    if(!R.length)return;
    const tr=Math.max(...R.map(r=>r.right)),tb=Math.max(...R.map(r=>r.bottom))-sr.top;
    const a=tr+CL,b=railL-CL,freeC=(a+b)/2,fw=Math.max(220,b-a);
    const iso=pl.querySelector('.iso'),w=iso.offsetWidth,h=iso.offsetHeight;
    if(w&&h){const cx=plx*W,cy=.52*H,L0=cx-w/2,R0=cx+w/2,T0=cy-h/2;
      if((L0<tr+CL&&T0<tb+CL)||(railOn&&R0>railL-CL&&T0<railB+CL)){PF[i]={cx:freeC/W,mw:fw};iso.style.maxWidth=fw+'px'}}
    const g=GI[i],rg=document.createRange();rg.selectNodeContents(g);const gr=rg.getBoundingClientRect();
    if(gr.width&&gr.left<tr+CL&&gr.top-sr.top<tb+CL){const sh=freeC-(gr.left+gr.right)/2;g.style.left=sh+'px';g.style.right=(-sh)+'px'}
  });
}
let fitQ=0;const fitAll=()=>{fitOverlay();fitPlates()};const fitSoon=()=>{cancelAnimationFrame(fitQ);fitQ=requestAnimationFrame(fitAll)};
fitAll();addEventListener('resize',fitSoon);document.fonts&&document.fonts.ready.then(fitSoon);addEventListener('load',fitSoon);
function jump(i){jumpTo(()=>scrollYAt(i+.06),()=>{first=true})}

/* 장면 */
const defs=el('defs',{},svg);
{const f=el('filter',{id:'shf',x:'-30%',y:'-30%',width:'160%',height:'160%'},defs);el('feColorMatrix',{type:'matrix',values:'0 0 0 0 0.05  0 0 0 0 0.06  0 0 0 0 0.06  0 0 0 .75 0'},f);el('feGaussianBlur',{stdDeviation:2.6},f);
 const sm=el('filter',{id:'smk',x:'-50%',y:'-50%',width:'200%',height:'200%'},defs);el('feGaussianBlur',{stdDeviation:9},sm);
 const fg=el('radialGradient',{id:'fire'},defs);[['0','#FFF7EA',1],['.35','#E9D9BE',.95],['.7','#83735B',.55],['1','#83735B',0]].forEach(([o,c,a])=>el('stop',{offset:o,'stop-color':c,'stop-opacity':a},fg));}
const root=el('g',{},svg);
const ctx={tag,place,defs,rep};   /* 장면에 넘기는 도구(uav-scenes*.js의 둘째 인자) */

/* 장면 생성 */
const layers=U.SC.map((make,i)=>{st.curCh=i;const g=el('g',{opacity:0},root);const upd=make(g,ctx,X.sc[i]);return {g,upd,shown:false,hero:ALLSP.find(q=>q.ch===i&&q.hero)}});

/* 갱신 루프 */
let p=0,travel=0,focus={x:800,y:450},vbx=800;
function target(){const r=sec.getBoundingClientRect();return clamp(-r.top/(sec.offsetHeight-innerHeight))*distanceAt(N)}
function visOf(i,p){const a=i===0?1:clamp((p-(i-.05))/.1);const b=i===N-1?1:clamp(((i+1+.05)-p)/.1);return Math.min(a,b)}
const ib=new Array(N).fill(0),ibT=new Array(N).fill(0),entryP=new Array(N).fill(0);let lastRaw=0,lockUntil=0,peak=0,first=true;
const LAND=.1;
function scrollToP(q){window.scrollTo({top:scrollYAt(q),behavior:'instant'})}
addEventListener('wheel',e=>{if(e.deltaY<0&&performance.now()<lockUntil)e.preventDefault()},{passive:false});
/* 따라가는 비율을 프레임 간격에 맞춤: 간격을 60fps 프레임 수로 반올림(1.5프레임 미만은 1) — 타임스탬프 흔들림 · 120Hz는 원래 값 그대로, 프레임이 빠지면 빠진 수만큼(30fps면 두 프레임치) */
let lastT=0,fk=1;const K=c=>fk===1?c:1-Math.pow(1-c,fk);
document.addEventListener('visibilitychange',()=>{lastT=0});   /* 탭이 가려졌다 돌아오면 원래처럼 멈춘 자리에서 이어서 */
function frame(now){hook();fk=lastT&&now>lastT?Math.max(1,Math.round((now-lastT)/(1000/60))):1;lastT=now;
  const sb=sec.getBoundingClientRect(),gone=sb.bottom<=0||sb.top>=innerHeight;   /* 쓰기 전에 읽음 */
  const tg=target();travel=(reduce||first)?tg:travel+(tg-travel)*K(.14);first=false;if(Math.abs(tg-travel)<.0004)travel=tg;
  p=sceneAt(travel);
  const raw=clamp(Math.floor(p),0,N);
  if(raw<lastRaw){const c=Math.min(raw,N-1);ibT[c]=1;entryP[c]=travel;
    // 역스크롤 진입: 모션을 되감지 않고 챕터 첫 화면(아이소메트릭 뷰)으로 바로 이동
    const land=c+LAND;if(tg>distanceAt(land)+.01){scrollToP(land);lockUntil=performance.now()+450}}
  else if(raw>lastRaw){ibT[Math.min(raw,N-1)]=0}
  const ci=Math.min(raw,N-1);
  if(raw!==lastRaw)peak=travel;
  if(ibT[ci]){if(travel<entryP[ci])entryP[ci]=travel;if(travel>entryP[ci]+.02){ibT[ci]=0;peak=travel}}
  else{if(travel>peak)peak=travel;
    // 챕터 중간에서 위로 스크롤: 역재생 대신 첫 화면으로 바로 이동
    if(raw<N&&tg<peak-.03&&p-ci>LAND+.03){ibT[ci]=1;entryP[ci]=travel;scrollToP(ci+LAND);lockUntil=performance.now()+450}}
  lastRaw=raw;for(let j=0;j<N;j++)ib[j]=reduce?ibT[j]:ib[j]+(ibT[j]-ib[j])*K(.2);
  let dimV=0;
  const IW=innerWidth,IH=innerHeight,portrait=IW/IH<1.05;   /* 쓰기 전에 한 번만 읽음 */
  let shake=0;
  layers.forEach((L,i)=>{
    const v=visOf(i,p),t=clamp(p-i),ie=ib[i];chVis[i]=v*(1-ie);
    const rv=ibT[i]||(i===ci-1&&ibT[ci]);const ts=rv?0:t;
    const ke=eio(seg(t,.02,.15))*(1-ie),fe=seg(t,.14,.17)*(1-ie);
    const tv=Math.min(i===0?1:seg(p,i,i+.04),i===N-1?1:1-seg(p,i+.96,i+1));
    /* 시점 · 등장값이 두 번 연속 같으면 장면을 다시 계산하지 않음(9장 드론은 그린 뒤에 altK를 바꾸므로 두 번째 호출까지는 결과가 바뀜) */
    if(v>0){L.g.setAttribute('opacity',v.toFixed(3));st.heroGate=seg(ts,.13,.16)*(1-ie);const same=L.shown&&L.mt===ts&&L.mg===st.heroGate;if(!same||L.mn<2){L.mn=same?L.mn+1:1;L.mt=ts;L.mg=st.heroGate;L.last=L.upd(ts)}const f=L.last;if(v>.5&&f){focus=f;if(f.shake)shake=f.shake}L.shown=true}
    else if(L.shown){L.g.setAttribute('opacity',0);L.shown=false}
    T[i].style.opacity=tv;T[i].style.visibility=tv>0?'visible':'hidden';
    P[i].el.style.opacity=tv*seg(ke,.55,1);P[i].el.style.visibility=tv>0?'visible':'hidden';
    SP[i].style.visibility=v>0?'visible':'hidden';SP[i].style.opacity=tv*seg(ke,.82,1);
    const gv=tv*(1-seg(ke,0,.45));GI[i].style.opacity=gv;GI[i].style.visibility=gv>0.005?'visible':'hidden';GI[i].style.transform=`translateY(-50%) scale(${(1+ke*.08).toFixed(3)})`;
    dimV=Math.max(dimV,v*(1-ke));
    const isv=tv*(1-seg(ke,.82,1));IS[i].style.opacity=isv;IS[i].style.visibility=isv>0.005?'visible':'hidden';
    if(isv>0.005){const fr=SP[i].getBoundingClientRect(),sr0=stage.getBoundingClientRect();
      if(fr.width>0){const ix=IS[i].offsetLeft,iy=IS[i].offsetTop,iw=IS[i].offsetWidth;const fx=fr.left-sr0.left,fy=fr.top-sr0.top;const sc=lerp(1,fr.width/iw,ke);IS[i].style.transform=`translate(${((fx-ix)*ke).toFixed(1)}px,${((fy-iy)*ke).toFixed(1)}px) scale(${sc.toFixed(4)})`}
      else IS[i].style.transform=`translateY(${(ke*20).toFixed(1)}px)`}
    if(v>0){P[i].items.forEach((it,j)=>{const t=ts;const [a,b]=CH[i].phases[j];const on=t>=a&&(t<b||(j===CH[i].phases.length-1&&t>=b));it.classList.toggle('on',on&&t>0.001||(j===0&&t<a));it.classList.toggle('done',t>=b&&!on);
      const progress=U.CFG[i].slow&&!rv?seg(travel,distanceAt(i+a),distanceAt(i+b)):seg(t,a,b);it.querySelector('i').style.width=(progress*100)+'%'})}
    // 기체 판을 지도 스프라이트 위에 맞춤(같은 이미지)
    const k=ke;const pv=v*(1-fe);
    const pl=PL[i];pl.style.opacity=pv;pl.style.visibility=pv>0.01?'visible':'hidden';
    if(pv>0.01&&L.hero){
      const hd=L.hero;const cfg=hd.cfg;const isoN=CH[i].iso||0;
      const ctm=svg.getScreenCTM();const pt2=svg.createSVGPoint();pt2.x=hd.x;pt2.y=hd.y;const q=pt2.matrixTransform(ctm);const sr=stage.getBoundingClientRect();
      const pf=PF[i],cx=portrait?.5:(pf?pf.cx:plx),cy=pf&&pf.cy?pf.cy:.52;pl.style.left=(cx*100)+'%';pl.style.top=(cy*100)+'%';
      const iso=pl.querySelector('.iso'),top=pl.querySelector('.top');
      const iw=iso.offsetWidth||1,ih=iso.offsetHeight||1;const tmax=Math.max(iw,ih)*.78;const tk=tmax/Math.max(cfg.w,cfg.hh);const tw=cfg.w*tk,th=cfg.hh*tk;
      if(top.dataset.w!=String(Math.round(tw))){top.style.width=tw+'px';top.style.height=th+'px';top.dataset.w=String(Math.round(tw))}
      const sprMax=cfg.max*(hd.s||1)*ctm.a;const ts=lerp(1,sprMax/tmax,k);
      const rot=lerp(0,(hd.r||0)-isoN,k);
      const dx=(q.x-sr.left-sr.width*cx)*k,dy=(q.y-sr.top-sr.height*cy)*k;
      pl.style.transform=`translate(calc(-50% + ${dx.toFixed(1)}px),calc(-50% + ${dy.toFixed(1)}px)) rotate(${rot.toFixed(2)}deg) scale(${ts.toFixed(4)})`;
      const a1=seg(k,0,.55),a2=seg(k,.18,.7);
      iso.style.opacity=(1-seg(k,.12,.5)).toFixed(3);iso.style.transform=`rotateX(${(58*eio(a1)).toFixed(2)}deg) scale(${(1-.12*a1).toFixed(3)})`;
      top.style.opacity=seg(k,.18,.5).toFixed(3);top.style.transform=`translate(-50%,-50%) rotateX(${(-38*(1-eio(a2))).toFixed(2)}deg) rotate(${isoN}deg)`;
    }
  });
  document.getElementById('dim').style.opacity=(dimV*.74).toFixed(3);
  // 카메라
  let camOK=true;
  if(portrait){const W=980,H=W*IH/IW,vt=clamp(focus.x,W/2-60,1600-W/2+60);vbx+=(vt-vbx)*(reduce?1:K(.08));camOK=Math.abs(vt-vbx)<.01;svg.setAttribute('viewBox',`${(vbx-W/2).toFixed(1)} ${(450-H/2).toFixed(1)} ${W} ${H.toFixed(1)}`)}
  else if(svg.getAttribute('viewBox')!=='0 0 1600 900')svg.setAttribute('viewBox','0 0 1600 900');
  const sh=(!reduce&&shake>0&&shake<.3)?(1-shake/.3)*7:0;root.setAttribute('transform',sh?`translate(${(Math.sin(shake*140)*sh).toFixed(1)} ${(Math.cos(shake*170)*sh).toFixed(1)})`:'');
  // 목차 레일
  const ai=clamp(Math.floor(p+.001),0,N-1);RL.forEach((a,i)=>a.classList.toggle('on',i===ai));
  rail.querySelector('.axis b').style.height=(clamp(p/N)*100)+'%';
  flushTags();
  /* 무대가 화면 밖이고 따라가기(진행 · 되감기 · 세로 화면 카메라)가 끝났으면 멈춤 — 스크롤 · 창 크기 변화 때 같은 프레임 안에서 다시 켬 */
  if(gone&&travel===tg&&camOK&&ib.every((v,j)=>Math.abs(v-ibT[j])<1e-4)){lastT=0;return false}
  return true;
}
const wake=loop(frame);
addEventListener('scroll',wake,{passive:true});addEventListener('resize',wake);wake();
/* Lenis가 움직일 때는 그 scroll 알림에서도 깨움 — Lenis보다 먼저 돌아 되감기 착지(scrollToP)가 덮이지 않게 */
let hk=0;const hook=()=>{if(!hk&&window.KA_LENIS){hk=1;KA_LENIS.on('scroll',wake)}};addEventListener('wheel',hook,{passive:true});
/* deep link: uav.html#c1 … #c9 → 해당 체계 첫 화면 (장 수를 바꾸면 [1-9]도) */
const hm=/^#c([1-9])$/.exec(location.hash);
if(hm){const go=()=>{scrollToP(+hm[1]-1+.06);first=true};go();addEventListener('load',go,{once:true})}
})();
