/* 쇼릴 장면 모듈 s5-future — [495,646) Beyond · 미래 한 카메라(UAM → 궤도 · OTV → 뛰어듦) (스토리보드 S10–S11)
   s5-bg(z5): 고리(안에 미래 땅이 비침) → 지평선 → 지구 가장자리 · 별 · 행성 · 대기 빛띠 · 땅 격자 · 버티포트 · 구름 판(s5-future-sky · -uam)
   s5-gfx(z20): 본부 점 · 궤적 · eVTOL(머리를 탐) · 자취 · 궤도 · OTV(s5-future-craft). s5-text(z30): s5-future-text.js. 기하는 s5-future-geo.js(모두 c(f)에서 나옴)
   금색 층 · OTV · 별은 605–606, 세상 층은 612에 α0, 글은 645에 α0. 578–600 느린 밀기가 뛰어듦으로 이어짐 */
import {scene,C,E,seg,lerp,clamp,smooth,rgba,TAU,LANG} from '../engine.js';
import {P,FUT_COL} from '../shared.js';
import * as Q from './s5-future-geo.js';
import {lit,kLit,poly,RX} from './s5-future-kit.js';
import {haze,planet,stars,surface} from './s5-future-sky.js';
import {ground,ringMap,craft} from './s5-future-uam.js';
import {decks} from './s5-future-deck.js';
import {evtol,otv} from './s5-future-craft.js';
import './s5-future-text.js';

const V0={S:1,a:1,r:0,p:(x,y)=>[x,y]};
const COLX=(FUT_COL[LANG]||FUT_COL.ko).x1+40;                /* 글 기둥 오른끝 +40 */
const view=f=>f<Q.PUSH0?V0:Q.plunge(f);
const circ=(g,V,cx,cy,R)=>{const [x,y]=V.p(cx,cy);g.beginPath();g.arc(x,y,Math.max(0,R*V.S),0,TAU)};
/* 꼭대기 둘레 ±108° 호 하나 — 점선 위상은 꼭대기에 고정(점선 하나가 꼭대기 가운데: 반지름 · 확대가 바뀌어도 점선이 흐르지 않고 꼭대기에 겹친 점선이 없음) */
function topArc(g,V,cx,cy,R,dash){const [x,y]=V.p(cx,cy),r=R*V.S,t=-Math.PI/2+V.r;g.beginPath();g.arc(x,y,r,t-Math.PI*.6,t+Math.PI*.6);
  if(dash){const P=dash[0]+dash[1];g.setLineDash(dash);g.lineDashOffset=((dash[0]/2-r*Math.PI*.6)%P+P)%P}else g.setLineDash([])}
/* 금색 궤적 선: 2px 심 + 10px 빛 α.18. grad [A,B,aA]: A→B 사이에서 α가 aA→a(선 방향 기울기) */
function goldLine(g,pts,a,grad){if(a<=0||pts.length<2)return;g.save();g.lineCap='round';g.lineJoin='round';poly(g,pts);
  const st=m=>{if(!grad)return rgba(C.goldHi,m*a);const [A,B,aA]=grad,gr=g.createLinearGradient(A[0],A[1],B[0],B[1]);gr.addColorStop(0,rgba(C.goldHi,m*aA));gr.addColorStop(1,rgba(C.goldHi,m*a));return gr};
  g.strokeStyle=st(.18);g.lineWidth=10;g.stroke();g.strokeStyle=st(1);g.lineWidth=2;g.stroke();g.restore()}

/* ── 배경(z5) ── */
scene({id:'s5-bg',from:495,to:612,z:5,
  draw(g,f){const V=view(f);
    if(f<525){const r=Q.ring(f);haze(g,f,0,r,V0,smooth(seg(f,509,523)));ground(g,f,0,r,ringMap(r),seg(f,503,512),seg(f,513,516));ring(g,f);return}
    const L=Q.limb(f),c=L.c,k=kLit(c);g.globalAlpha=V.a;
    stars(g,f,c,L,V,Q.camS,Q.camR);
    planet(g,L,V,c,k);surface(g,f,c,L,V);
    /* 땅은 α가 아니라 자리로 빠짐(1+24c² 늘어남이 아래로 쏟아냄 = 고도감). 패드는 c≈.44에 화면 밖, 격자 부채선만 c .45→.75에 옅어짐 */
    ground(g,f,c,L,(x,y)=>Q.gP(x,y,c),1-smooth(seg(c,.45,.75)),1-smooth(seg(c,.45,.6)));
    haze(g,f,c,L,V,1);decks(g,f,c,L,V,COLX);
    /* 가장자리 선 1px(꼭대기를 화소 중앙에) */
    circ(g,V,L.cx,L.cy+.5/V.S,L.R);g.lineWidth=1;g.strokeStyle=lit(g,C.cream,lerp(.5,.42,c),k,c);g.stroke();
  }});

/* S10 고리: 2px 금색 → 515–525 1px 크림 α.5로. 고리 위 점의 화면 속도(꼭대기에서 각 φ)만큼 옅게 — 수백 px/f로 날아가는 옆 · 아래는 거의 사라지고
   꼭대기 호만 또렷(곧 지평선이 됨). 착지하며 속도가 0이 되면 원래 α로 */
function ring(g,f){const r=Q.ring(f),x=seg(f,515,525),e=.1,dR=(Q.ringR(f+e)-Q.ringR(f-e))/(2*e),dy=((Q.ring(f+e).cy-Q.ringR(f+e))-(Q.ring(f-e).cy-Q.ringR(f-e)))/(2*e);
  const st=(col,a)=>{const gr=g.createConicGradient(-Math.PI/2,r.cx,r.cy);for(let i=0;i<=32;i++){const ph=i/32*TAU,sp=Math.hypot(dR*Math.sin(ph),dy+dR*(1-Math.cos(ph)));gr.addColorStop(i/32,rgba(col,a*clamp(24/Math.max(sp,1e-3))))}return gr};
  if(x<1){g.beginPath();g.arc(r.cx,r.cy,r.R,0,TAU);g.lineWidth=2;g.strokeStyle=st(C.goldHi,1-x);g.stroke()}
  if(x>0){g.beginPath();g.arc(r.cx,r.cy+.5,r.R,0,TAU);g.lineWidth=1;g.strokeStyle=st(C.cream,.5*x);g.stroke()}}

/* ── 그래픽(z20) ── */
scene({id:'s5-gfx',from:495,to:612,z:20,
  draw(g,f){
    /* 본부 점: 495에 s4와 같은 8px(반지름 4) → 505까지 0 */
    if(f<505){const d=8*(1-E.accel(seg(f,495,505)));if(d>.05){g.beginPath();g.arc(P.x,P.y,d/2,0,TAU);g.fillStyle=C.goldHi;g.fill()}}
    if(f<515)return;
    /* 뛰어듦에서 금색 층은 601–605에 먼저 빠짐(E.accel) — s6 A350(604부터 α)이 나타날 때 금선이 기체를 가로지르지 않게 */
    const V0=view(f),V={...V0,a:V0.a*(1-E.accel(seg(f,601,605)))},L=Q.limb(f),c=L.c;
    if(f>=525&&V.a>.001){orbits(g,f,c,V);
      trajectory(g,f,L,V);
      if(f>562)trailLine(g,Q.trail(f).map(q=>V.p(q[0],q[1])),V.a,1-seg(c,AIR[0],AIR[1]));
      pulse(g,f,V);otvPath(g,f,L,V);
      chevron(g,f,V)}
    const K=craft(f);if(K)evtol(g,K.x,K.y,K.sc,K);
    otvCraft(g,f,L,V0);
  }});

/* UAM 궤적 + 80px마다 6px 십자. 공기 층 α: seg(c,.1,.3), 십자는 c .1에 먼저 */
const AIR=[.45,.75],CX=.1;                                    /* 공기 층(순항 · 수직선)은 상승 한가운데까지 남아 말림과 이어짐(머리가 떨어진 조각으로 보이지 않게) */
function trajectory(g,f,L,V){const p=Q.trjP(f);if(p<=0)return;const c=L.c,a=(1-seg(c,AIR[0],AIR[1]))*V.a;if(a<=0)return;
  const s=p*Q.TRJ.len,M=(x,y)=>{const q=Q.trjMap(x,y,c,L);return V.p(q[0],q[1])},at=d=>{const e=Q.trjCut(d);return e[e.length-1]};
  /* 늘어나는 수직선: 땅과 함께 아래로 늘어나 고도를 보여 주다(패드가 빠지는 c≈.44 무렵) 굽이 아래 260px 안에서 흩어짐(비행운처럼) */
  const B=M(P.x,300);goldLine(g,Q.trjCut(s).map(q=>M(q[0],q[1])),a,[[B[0],B[1]+260],B,a*(1-smooth(seg(c,.35,.6)))]);
  if(c>=CX)return;g.save();g.lineWidth=1;g.lineCap='butt';
  for(let d=80;d<=s;d+=80){const m0=M(...at(d-1)),m1=M(...at(d+1)),q=M(...at(d));
    const t=Math.atan2(m1[1]-m0[1],m1[0]-m0[0]),al=.75*a*(1-seg(c,0,CX))*clamp((s-d)/40);if(al<=0)continue;
    g.strokeStyle=rgba(C.cream,al);g.beginPath();for(const r of [t+Math.PI/4,t-Math.PI/4]){const dx=3*Math.cos(r),dy=3*Math.sin(r);g.moveTo(q[0]-dx,q[1]-dy);g.lineTo(q[0]+dx,q[1]+dy)}g.stroke()}
  g.restore()}
/* 자취: 순항 끝부터 머리까지 — 궤적이 사라지면 첫 200px가 투명→불투명(상승 첫 말림이 대기 속에 잠기고 호만 남음) */
const FADE=200;
function trailLine(g,pts,a,a0){if(pts.length<2||a<=0)return;let acc=0,k=1;for(;k<pts.length;k++){acc+=Math.hypot(pts[k][0]-pts[k-1][0],pts[k][1]-pts[k-1][1]);if(acc>=FADE)break}
  if(a0>=.999){goldLine(g,pts,a);return}
  const short=k>=pts.length;if(short)k=pts.length-1;const a1=short?lerp(a0,1,acc/FADE):1;
  const A=pts[0],B=pts[k];g.save();g.lineCap='round';g.lineJoin='round';
  for(const [lw,al] of [[10,.18],[2,1]]){const gr=g.createLinearGradient(A[0],A[1],B[0],B[1]);gr.addColorStop(0,rgba(C.goldHi,al*a*a0));gr.addColorStop(1,rgba(C.goldHi,al*a*a1));
    poly(g,pts.slice(0,k+1));g.strokeStyle=gr;g.lineWidth=lw;g.lineCap='butt';g.stroke();poly(g,pts.slice(k));g.strokeStyle=rgba(C.goldHi,al*a);g.lineCap='round';g.stroke()}
  g.restore()}

/* 머리: 14px 꺾쇠(2px 금색) — UAM 동안은 eVTOL이 머리, 562 뒤 순항 끝에서 기체와 갈라지며 나타남(562–566) */
function chevron(g,f,V){const a=smooth(seg(f,562,566))*V.a;if(a<=0)return;const h=V.p(...Q.head(f)),th=Q.heading(f)+V.r,s=Math.sqrt(V.S);
  g.save();g.translate(h[0],h[1]);g.rotate(th);g.scale(s,s);g.globalAlpha*=a;g.beginPath();g.moveTo(-7,-7);g.lineTo(0,0);g.lineTo(-7,7);
  g.lineWidth=2;g.lineJoin='miter';g.lineCap='butt';g.strokeStyle=C.goldHi;g.stroke();g.restore()}

/* 궤도: 높은 궤도 크림 α.36 · 낮은 궤도 크림 α.2 — 오른쪽 끝에서 왼쪽으로 그려짐(c .5→1) · 낮은 궤도 앞 호 금색 점선 6/10. 가장자리와 같은 중심, 왼쪽(글 기둥)은 어둠 */
function orbits(g,f,c,V){const oa=seg(c,.5,.95)*V.a;if(oa<=0)return;const L=Q.limb(f),k=kLit(c),[x,y]=V.p(L.cx,L.cy),sw=E.outCubic(seg(c,.5,1)),a0=-Math.PI/2+Math.PI*.6+V.r;
  g.save();g.lineWidth=1;
  for(const [dR,al] of [[480,.38],[260,.26]]){g.beginPath();g.arc(x,y,(L.R+dR)*V.S,a0,a0-Math.PI*1.2*sw,true);g.strokeStyle=lit(g,C.cream,al*oa,k,c);g.stroke()}
  /* 앞 호: 카메라가 움직이는 동안은 실선(×.5 — 빠른 밀기에서 점선이 사다리처럼 번지지 않게), 삽입(585)에 I에서 양쪽으로 점선이 번져 나감(585–591) */
  const R2=L.R+260,ph=(f<562?0:Q.headS(f)[0])/R2,gd=g.createConicGradient(-Math.PI/2+V.r,x,y),gs=g.createConicGradient(-Math.PI/2+V.r,x,y),[X0,X1]=RX(c);
  const aI=Q.S_I/L.R,sp=1800*E.outCubic(seg(f,585,591))-80;
  for(let i=0;i<=128;i++){const t=i/128,a=(t>.5?t-1:t)*TAU,dx=(ph-a)*R2,w=smooth(seg(dx,-40,20))*(1-smooth(seg(dx,380,1000))),xs=x+R2*V.S*Math.sin(a+V.r),lf=lerp(1,smooth(clamp((xs-X0)/(X1-X0))),k);
    const al=oa*dashA(f)*lf*(.35+.6*w),md=smooth(clamp((sp-Math.abs(a-aI)*R2*V.S)/80));gd.addColorStop(t,rgba(C.goldHi2,al*md));gs.addColorStop(t,rgba(C.goldHi2,.5*al*(1-md)))}
  g.lineWidth=1.5;if(sp<1720){topArc(g,V,L.cx,L.cy,R2);g.strokeStyle=gs;g.stroke()}
  if(sp>-80){topArc(g,V,L.cx,L.cy,R2,[6*V.S,10*V.S]);g.strokeStyle=gd;g.stroke()}g.restore()}
/* 뛰어듦 중 점선은 600–604에 먼저 사라짐(E.accel — 커지며 쓸리는 점선이 사다리처럼 번지지 않게) */
const dashA=f=>1-E.accel(seg(f,600,604));

/* 삽입(585, b19.5): I에서 맥동 한 겹(s4 본부 맥동과 같은 말투, r 0→36) — outCubic · α (1−t)², ≈594에 사라짐 */
function pulse(g,f,V){const t=seg(f,585,597),[x,y]=V.p(Q.I[0],Q.I[1]);
  if(t>0&&t<1){g.beginPath();g.arc(x,y,36*E.outCubic(t)*V.S,0,TAU);g.lineWidth=2;g.strokeStyle=rgba(C.goldHi,(1-t)*(1-t)*V.a);g.stroke()}
  /* 삽입점 표지: 5px 크림 고리 + 궤도에 직각인 짧은 눈금(맥동이 지나가도 자리가 남음) */
  const m=smooth(seg(f,585,590))*V.a;if(m<=0)return;const n=Math.atan2(y-V.p(Q.LIMB_C[0],Q.LIMB_C[1])[1],x-V.p(Q.LIMB_C[0],Q.LIMB_C[1])[0]),s=Math.sqrt(V.S);
  g.save();g.globalAlpha*=m;g.beginPath();g.arc(x,y,5*s,0,TAU);g.lineWidth=1;g.strokeStyle=rgba(C.cream,.7);g.stroke();
  g.beginPath();g.moveTo(x+Math.cos(n)*9*s,y+Math.sin(n)*9*s);g.lineTo(x+Math.cos(n)*17*s,y+Math.sin(n)*17*s);g.stroke();g.restore()}

/* OTV 전이 궤도: 588에 머리 자리에서 갈라져 점선 10/8 2px */
function otvPath(g,f,L,V){if(f<Q.OTV_F0)return;const pts=Q.otvPath(f,L).map(q=>V.p(q[0],q[1]));
  g.save();g.globalAlpha*=V.a*dashA(f);g.setLineDash([10,8]);g.lineWidth=2;g.lineCap='butt';g.strokeStyle=C.goldHi;poly(g,pts);g.stroke();g.restore()}
/* OTV 기체: 588–591 나타남 · 분사 588–598 · 601–605 E.accel로 빠짐(금색 층과 함께). 진행 방향 = 전이 궤도 접선 */
function otvCraft(g,f,L,V){if(f<Q.OTV_F0)return;const oa=smooth(seg(f,588,591))*(1-E.accel(seg(f,601,605)))*V.a;if(oa<=.001)return;
  const at=t=>{const q=Q.otvS(t);return V.p(...Q.surf(q[0],q[1],L))},o=at(f),b=at(f-.3),e=at(f+.3),ang=Math.atan2(e[1]-b[1],e[0]-b[0]);
  otv(g,o[0],o[1],1.55*Math.sqrt(V.S),ang,{thrust:smooth(seg(f,588,590.5))*(1-smooth(seg(f,595,600))),alpha:oa})}
