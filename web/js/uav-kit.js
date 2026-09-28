/* 무인기 장면 도구 — 색 · 수학 · SVG 요소(setA) · 기체 스프라이트 · 배경 · 궤적 · 비행운 · 미사일 · 폭발. uav.html · uav-en.html
   uav-data.js 뒤, uav-scenes1/2.js · uav.js 앞. 불러올 때는 DOM을 건드리지 않고 window.UAV에 내보내기만 함 */
(()=>{
'use strict';
const U=window.UAV;
/* 장 사이 공유 상태 — heroGate: uav.js frame이 장마다 씀 → op()가 주인공 기체 투명도 상한으로 읽음 · curCh: 만드는 중인 장 번호(sprite · 라벨이 기록) */
const st=U.st={heroGate:1,curCh:0};
const NS='http://www.w3.org/2000/svg';
const C={night:'#25282A',cblue:'#4D5055',cream:'#C0B7AB',cream80:'#A19A91',rose:'#6C6463',smoke:'#716C6C',gold:'#83735B'};
const {reduce,clamp}=window.KA;   /* site.js 공용 도우미 — 장면에는 U로 그대로 넘김 */
const seg=(t,a,b)=>clamp((t-a)/(b-a));
const lerp=(a,b,k)=>a+(b-a)*k;
const eo=k=>1-Math.pow(1-k,3);
const eio=k=>k<.5?4*k*k*k:1-Math.pow(-2*k+2,3)/2;
/* 같은 값은 다시 쓰지 않음 — WebKit은 같은 값을 써도 그 영역을 다시 그림 */
const setA=function(k,v){v=String(v);if(this.getAttribute(k)!==v)Element.prototype.setAttribute.call(this,k,v)};
function el(t,a,p){const e=document.createElementNS(NS,t);e.setAttribute=setA;if(a)for(const k in a)e.setAttribute(k,a[k]);if(p)p.appendChild(e);return e}
function tr(e,x,y,r=0,s=1){
  if(e._sp){const sp=e._sp;sp.x=x;sp.y=y;sp.r=r;sp.s=s;const a=sp.cfg.alt*s*sp.altK;
    e.setAttribute('transform',`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${r.toFixed(1)}) scale(${s})`);
    sp.sh.setAttribute('transform',`translate(${(x+a*.55).toFixed(1)} ${(y+a*.8).toFixed(1)}) rotate(${r.toFixed(1)}) scale(${s})`);return}
  e.setAttribute('transform',`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${r.toFixed(1)}) scale(${s})`)}
/* 투명도는 toFixed(3) 글자로 씀 — css/uav.css가 opacity "0" · "0.000"인 층 · 필터를 그리지 않으므로(display:none) 자릿수를 바꾸지 말 것 */
function op(e,v){if(e._sp){if(e._sp.hero)v=Math.min(v,st.heroGate);e.setAttribute('opacity',v.toFixed(3));e._sp.sh.setAttribute('opacity',(v*.6).toFixed(3));return}e.setAttribute('opacity',v.toFixed(3))}
let rnd=1;const R=()=>{rnd=(rnd*16807)%2147483647;return (rnd-1)/2147483646};

/* 윤곽(위에서 봄, +x 방향) */
/* 윤곽선(fill:'none')으로 그릴 때만 씀(3장 가짜 표적 · 위협) — 나머지는 sil()이 SPR 스프라이트로 그림 */
const SIL={
 lowus:['M44,0L22,-5L8,-8L-6,-30L-16,-30L-12,-9L-22,-9L-30,-17L-34,-15L-28,0L-34,15L-30,17L-22,9L-12,9L-16,30L-6,30L8,8L22,5Z'],
 fighter:['M52,0L32,-5L12,-6L-2,-36L-15,-36L-10,-8L-26,-8L-34,-21L-41,-21L-36,-6L-43,-6L-43,6L-36,6L-41,21L-34,21L-26,8L-10,8L-15,36L-2,36L12,6L32,5Z']
};
const ALLSP=[];
const SPR={
 male:{h:'img/sp/fs_top2.webp',w:702,hh:1350,nose:0,max:124,alt:62},
 stealth:{h:'img/sp/st_top2.webp',w:695,hh:1350,nose:0,max:108,alt:72},
 lowus:{h:'img/lw_2.webp',w:1000,hh:799,nose:0,max:86,alt:56},
 fighter:{h:'img/sp/fighter.webp',w:700,hh:465,nose:0,max:100,alt:60},
 mlm:{h:'img/sp/mlm_top.webp',w:868,hh:964,nose:0,max:80,alt:32},
 slm:{h:'img/sp/slm_top2.webp',w:1030,hh:666,nose:0,max:74,alt:24},
 ft:{h:'img/sp/ft_top2.webp',w:881,hh:1200,nose:0,max:108,alt:36},
 tgt:{h:'img/sp/tgt_top.webp',w:1200,hh:992,nose:0,max:68,alt:44},
 naval:{h:'img/sp/naval_top.webp',w:632,hh:1350,nose:0,max:124,alt:46},
 quad:{h:'img/sp/mro_top2.webp',w:529,hh:689,nose:0,max:40,alt:16},
 rover:{h:'img/sp/rover_top2.webp',w:401,hh:364,nose:0,max:26,alt:2},
 vehicle:{h:'img/sp/apc.webp',w:200,hh:92,nose:0,max:30,alt:2},
 truck:{h:'img/sp/truck.webp',w:240,hh:81,nose:0,max:34,alt:2},
 usv:{h:'img/sp/usv.webp',w:200,hh:59,nose:0,max:38,alt:1.5},
 boat:{h:'img/sp/boat.webp',w:240,hh:73,nose:0,max:46,alt:1.5},
 ship:{h:'img/sp/ship.webp',w:1400,hh:226,nose:0,max:224,alt:3},
 carrier:{h:'img/sp/ship.webp',w:1400,hh:226,nose:0,max:250,alt:3},
 airliner:{h:'img/sp/airliner.webp',w:1321,hh:1200,nose:0,max:760,alt:4},
 radar:{h:'img/sp/radar.webp',w:220,hh:93,nose:0,max:40,alt:2},
 sat:{h:'img/sp/sat.webp',w:26,hh:200,nose:0,max:70,alt:0},
 gcs:{h:'img/sp/gcs.webp',w:200,hh:96,nose:0,max:34,alt:2}
};
function sprite(kind,parent){
  const c=SPR[kind],k=c.max/Math.max(c.w,c.hh),w=c.w*k,h=c.hh*k;
  const sh=el('g',{},parent);el('image',{href:c.h,x:-w/2,y:-h/2,width:w,height:h,transform:`rotate(${-c.nose})`,filter:'url(#shf)'},sh);
  const b=el('g',{},parent);el('image',{href:c.h,x:-w/2,y:-h/2,width:w,height:h,transform:`rotate(${-c.nose})`},b);
  b._sp={cfg:c,sh,altK:1,x:0,y:0,r:0,s:1,w,h,kind,ch:st.curCh};ALLSP.push(b._sp);op(b,0);return b;
}
function sil(kind,parent,o={}){
  if(SPR[kind]&&o.fill!=='none')return sprite(kind,parent);
  const g=el('g',{},parent);
  for(const d of SIL[kind]) el('path',{d,fill:o.fill??C.cream,stroke:o.stroke??'none','stroke-width':o.sw??0,'stroke-dasharray':o.dash??'', 'vector-effect':'non-scaling-stroke'},g);
  return g;
}

/* 생성 배경 */
function bg(g,name){el('image',{href:`img/bg/${name}.webp`,x:-100,y:-650,width:1800,height:2200,preserveAspectRatio:'none'},g);grid(g)}
function grid(g,step=100){
  let d='';for(let x=-900;x<=2500;x+=step)d+=`M${x},-900V1800`;for(let y=-900;y<=1800;y+=step)d+=`M-900,${y}H2500`;
  el('path',{d,stroke:C.cream,'stroke-opacity':.07,'stroke-width':1,fill:'none','vector-effect':'non-scaling-stroke'},g);
}

/* 경로 도우미 */
function track(g,d){
  // 경로는 위치 계산에만 쓰고 화면에는 그리지 않음 — 기체가 가기 전에 궤적이 보이지 않도록
  const plan=el('path',{d,fill:'none',stroke:'none'});   /* 문서에 붙이지 않음 — 값은 같고, 매 호출마다 레이아웃을 강제하지 않음 */
  const L=plan.getTotalLength();
  return {L,
    pt(u){const a=plan.getPointAtLength(L*clamp(u));return {x:a.x,y:a.y}},
    at(u){u=clamp(u);const a=plan.getPointAtLength(L*u),b=plan.getPointAtLength(Math.min(L,L*u+2)),c=plan.getPointAtLength(Math.max(0,L*u-2));return {x:a.x,y:a.y,r:Math.atan2(b.y-c.y,b.x-c.x)*57.2958}}};
}
/* 궤적(비행운): 기체가 지나간 자리에만 생기고, 일정 길이를 넘으면 먼 쪽부터 서서히 사라짐.
   pos(t) = 시점 t의 위치, t0 = 기체가 보이기 시작하는 시점, tau = 궤적이 남는 길이(시간) */
const mixC=(a,b,k)=>{const h=c=>[1,3,5].map(i=>parseInt(c.substr(i,2),16)),A=h(a),B=h(b);return `rgb(${A.map((v,i)=>Math.round(v+(B[i]-v)*k)).join(',')})`};
function contrail(g,o={}){
  const N=o.n??24,op0=o.op??1,gam=o.gam??1,head=o.head??'#DCD4C8',tail=o.color??C.gold;
  const segs=Array.from({length:N},(_,k)=>el('line',{stroke:mixC(head,tail,Math.min(1,k/(N*.8))),'stroke-width':o.w??2,'vector-effect':'non-scaling-stroke',opacity:0},g));
  const hide=()=>{for(const q of segs)q.setAttribute('opacity',0)};
  return {update(pos,t,t0,tau,vis=1){
    if(t<=t0||vis<=.001){hide();return}
    let prev=pos(t);
    for(let k=1;k<=N;k++){
      const q=segs[k-1],p=pos(Math.max(t0,t-tau*k/N));
      if(Math.abs(p.x-prev.x)+Math.abs(p.y-prev.y)<.1)q.setAttribute('opacity',0);
      else{q.setAttribute('x1',prev.x.toFixed(1));q.setAttribute('y1',prev.y.toFixed(1));q.setAttribute('x2',p.x.toFixed(1));q.setAttribute('y2',p.y.toFixed(1));q.setAttribute('opacity',(op0*vis*Math.pow(1-(k-1)/N,gam)).toFixed(3))}
      prev=p;
    }
  }};
}
/* 미사일 형상(위에서 본 모습): 동체 · 꼬리날개 · 카나드 · 분사 불꽃 */
function missile(g,s=1.5){
  const m=el('g',{opacity:0},g),fl=el('g',{},m);
  el('ellipse',{cx:-16,cy:0,rx:9,ry:2.8,fill:C.gold,opacity:.6},fl);
  el('ellipse',{cx:-12,cy:0,rx:4.5,ry:1.5,fill:'#FFF7EA'},fl);
  el('path',{d:'M12,0L7,-1.7L-8,-1.7L-8,1.7L7,1.7Z',fill:'#E4DDD2'},m);
  el('path',{d:'M-8,-1.7L-11.5,-5.2L-4.5,-1.7ZM-8,1.7L-11.5,5.2L-4.5,1.7Z',fill:C.cream80},m);
  el('path',{d:'M3,-1.7L1,-3.6L-1,-1.7ZM3,1.7L1,3.6L-1,1.7Z',fill:C.cream80},m);
  return {set(x,y,r,v,t){tr(m,x,y,r,s);m.setAttribute('opacity',v.toFixed(3));fl.setAttribute('opacity',(.7+.3*Math.sin(t*1200)).toFixed(3))}};
}
function ellipsePath(cx,cy,rx,ry){return `M${cx-rx},${cy}A${rx},${ry} 0 1 1 ${cx+rx},${cy}A${rx},${ry} 0 1 1 ${cx-rx},${cy}`}
function bracket(g,w,h){
  const b=el('g',{},g);const s=10;
  el('path',{d:`M${-w/2},${-h/2+s}V${-h/2}H${-w/2+s}M${w/2-s},${-h/2}H${w/2}V${-h/2+s}M${w/2},${h/2-s}V${h/2}H${w/2-s}M${-w/2+s},${h/2}H${-w/2}V${h/2-s}`,fill:'none',stroke:C.cream,'stroke-width':1.5,'vector-effect':'non-scaling-stroke'},b);
  return b;
}
function link(g,dash='2 8'){return el('line',{stroke:C.cream,'stroke-opacity':.7,'stroke-width':1.2,'stroke-dasharray':dash,'vector-effect':'non-scaling-stroke'},g)}
function setLine(l,a,b,t){l.setAttribute('x1',a.x);l.setAttribute('y1',a.y);l.setAttribute('x2',b.x);l.setAttribute('y2',b.y);l.style.strokeDashoffset=-t*400}
function boom(g,x,y,scale=1){
  const b=el('g',{},g);tr(b,x,y,0,scale);
  const scorch=el('circle',{r:44,fill:C.rose,opacity:0},b);
  const r2=el('circle',{r:1,fill:'none',stroke:C.gold,'stroke-width':3,opacity:0,'vector-effect':'non-scaling-stroke'},b);
  const r1=el('circle',{r:1,fill:'none',stroke:C.cream,'stroke-width':2,opacity:0,'vector-effect':'non-scaling-stroke'},b);
  const smokes=[];rnd=Math.floor(x*3+y*5)+7;for(let i=0;i<9;i++)smokes.push({dx:(R()-.3)*90,dy:(R()-.2)*70,r:40+R()*50,c:i%2?'#3C3F42':'#57544F',e:el('circle',{r:1,fill:i%2?'#3C3F42':'#57544F',filter:'url(#smk)',opacity:0},b)});
  const core=el('circle',{r:1,fill:'url(#fire)',opacity:0},b);
  rnd=Math.floor(x*7+y*3)+11;const parts=[];
  for(let i=0;i<22;i++){const a=i/22*6.2832+R()*.2;parts.push({a,d:110+R()*110,l:el('line',{stroke:i%3?C.cream:C.gold,'stroke-width':1.6,'vector-effect':'non-scaling-stroke',opacity:0},b)})}
  return {g:b,update(k){
    const on=k>0?1:0;
    core.setAttribute('r',(6+110*eo(seg(k,0,.2)))*(1-.5*seg(k,.25,.7)));op(core,on*(1-seg(k,.22,.62)));
    r1.setAttribute('r',20+200*eo(seg(k,0,.7)));op(r1,on*(1-seg(k,.25,.85)));
    r2.setAttribute('r',10+150*eo(seg(k,.08,.8)));op(r2,on*(1-seg(k,.3,.95)));
    op(scorch,.85*seg(k,.25,.6));
    smokes.forEach((m,i)=>{const q=seg(k,.12+i*.02,1);m.e.setAttribute('cx',(m.dx*eo(q)+q*40).toFixed(1));m.e.setAttribute('cy',(m.dy*eo(q)+q*30).toFixed(1));m.e.setAttribute('r',(m.r*(.3+.9*eo(q))).toFixed(1));op(m.e,on*.8*seg(k,.12+i*.02,.3+i*.02)*(1-.6*seg(k,.7,1)))});
    for(const p of parts){const d=30+p.d*eo(seg(k,0,.8));const c=Math.cos(p.a),s=Math.sin(p.a);p.l.setAttribute('x1',c*(d-16));p.l.setAttribute('y1',s*(d-16)*.9);p.l.setAttribute('x2',c*d);p.l.setAttribute('y2',s*d*.9);op(p.l,on*(1-seg(k,.35,1)))}
  }};
}

Object.assign(U,{C,reduce,clamp,seg,lerp,eo,eio,setA,el,tr,op,SPR,ALLSP,sil,bg,track,contrail,missile,ellipsePath,bracket,link,setLine,boom});
})();
