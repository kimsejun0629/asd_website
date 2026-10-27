/* 쇼릴 s5-future — 하늘(z5): 구름 · 연무 판 3겹(카메라가 뚫고 올라가며 지평선에 붙었다가 아래로 빠짐 — 참 원근 시차) · 행성 면 · 대기 빛띠 · 별 3겹(시드, 시차 흐름)
   모두 c(f)와 뛰어듦 V에서 나옴. 크림 낮은 α만(팔레트: 어두운 바탕 위 크림 섞임) */
import {C,E,seg,lerp,clamp,smooth,rgba,TAU,W,H,hash,layer} from '../engine.js';
import {P} from '../shared.js';
import {FL,VX,RX,kLit,fadeLeft,hC,sC,surfK,colMask} from './s5-future-kit.js';

/* ── 구름 판: 높이 A(카메라 처음 높이 1 기준) · 조각(c=0 화면 x · 폭 rx0 · 깊이 Z) ── */
/* 판 높이: 카메라가 1.3 · 2 · 3.2 · 5.5 · 10.5를 지나는 때 ≈569 · 570 · 571.5 · 573 · 574.5 — 겹겹이 차례로 지평선에 붙었다 아래로 쏟아짐 */
const DECK=[{A:1.3,n:6,al:.09,seed:0x61},{A:2,n:6,al:.085,seed:0x62},{A:3.2,n:6,al:.08,seed:0x63},{A:5.5,n:6,al:.07,seed:0x64},{A:10.5,n:6,al:.06,seed:0x65}];
const WISP=DECK.map(d=>Array.from({length:d.n},(_,i)=>{const h=k=>hash(i,d.seed*8+k),Z=Math.exp(lerp(Math.log(4.5),Math.log(75),h(0))),x0=lerp(VX-1250,VX+950,(i+.2+.6*h(1))/d.n),rx0=lerp(90,300,h(2));
  return {X:(x0-VX)*Z/FL,Z,Lx:rx0*Z/FL,a:d.al*lerp(.55,1,h(3)),A:d.A}}));
const WIND=.014;                                             /* 판이 함께 흐름(세계 단위/f) — 화면 속도는 1/Z(가까울수록 빠름) */
export function haze(g,f,c,L,V,a){if(a<=0)return;const Y=layer('s5hz'),hc=hC(c),sx=sC(c);
  for(const D of WISP)for(const w of D){const X=w.X-WIND*(f-495),dy=FL*(hc-w.A)/w.Z,dx=FL*X/w.Z*sx;
    const rx=FL*w.Lx/w.Z*sx,ry=Math.max(.9,Math.hypot(FL*Math.abs(hc-w.A)*.42*w.Lx/(w.Z*w.Z),FL*.035/w.Z)),q=surfK(dx,-dy,L),p=V.p(q[0],q[1]),S=V.S;
    if(p[0]+rx*S<-40||p[0]-rx*S>W+40||p[1]+ry*S<-40||p[1]-ry*S>H+40)continue;
    const al=w.a*a*(1.2+1.1*smooth(clamp((hc-w.A)/w.A)))*(hc>w.A?1-smooth(clamp((hc-w.A)/(.8*w.A))):1);   /* 아래로 지나간 연무는 곧 풀림(가까운 구름 판 s5-future-deck이 이어받음) */if(al<=.002)continue;
    Y.save();Y.translate(p[0],p[1]);Y.rotate(dx/L.R+V.r);Y.scale(rx*S,ry*S);const gr=Y.createRadialGradient(0,0,0,0,0,1);
    gr.addColorStop(0,rgba(C.cream,al));gr.addColorStop(.45,rgba(C.cream,al*.55));gr.addColorStop(1,rgba(C.cream,0));Y.fillStyle=gr;Y.beginPath();Y.arc(0,0,1,0,TAU);Y.fill();Y.restore()}
  /* 판이 지평선 아래로 내려오면 글 기둥 쪽에서 사라짐 */
  fadeLeft(Y,...RX(c),smooth(seg(c,.12,.4)));colMask(Y,1,0,320,110);g.drawImage(Y.canvas,0,0)}

/* ── 행성: 안쪽 night → ink80 음영(가장자리 쪽 밝음) · 바깥 대기 빛띠(크림 → 투명 110px) · 얇은 대기광 선 ──
   층에는 α를 1 기준으로 그리고 합칠 때 곱함(낮은 α를 두 번 8비트로 자르며 생기는 띠 방지) */
export function planet(g,L,V,c,k){const pin=smooth(seg(c,.5,.85)),gl=smooth(seg(c,.1,.7));if(pin<=0&&gl<=0)return;const [x,y]=V.p(L.cx,L.cy),R=L.R*V.S;
  if(pin>0){const Y=layer('s5pl'),r0=Math.max(0,R-420),t=v=>clamp((v-r0)/(R-r0)),A=.6;const gr=Y.createRadialGradient(x,y,r0,x,y,R);
    gr.addColorStop(0,rgba(C.ink80,.14/A));gr.addColorStop(t(R-200),rgba(C.ink80,.28/A));gr.addColorStop(t(R-40),rgba(C.ink80,.46/A));gr.addColorStop(1,rgba(C.ink80,1));
    Y.fillStyle=gr;Y.beginPath();Y.arc(x,y,R,0,TAU);Y.fill();fadeLeft(Y,...RX(c),k,.25);colMask(Y,k,.12,340,120);   /* 글 기둥 안은 ≈.1(넓은 가장자리 — 곧은 경계가 보이지 않게) */g.save();g.globalAlpha*=A*pin;g.drawImage(Y.canvas,0,0);g.restore()}
  if(gl>0){const Y=layer('s5gl'),B=150,A=.26;const gr=Y.createRadialGradient(x,y,R,x,y,R+B);
    gr.addColorStop(0,rgba(C.cream,1));gr.addColorStop(.08,rgba(C.cream,.6));gr.addColorStop(.3,rgba(C.cream,.24));gr.addColorStop(.62,rgba(C.cream,.07));gr.addColorStop(1,rgba(C.cream,0));
    Y.fillStyle=gr;Y.beginPath();Y.arc(x,y,R+B,0,TAU);Y.arc(x,y,R,0,TAU,true);Y.fill('evenodd');
    Y.beginPath();Y.arc(x,y,R+18*Math.sqrt(V.S),0,TAU);Y.lineWidth=1;Y.strokeStyle=rgba(C.cream,.7);Y.stroke();
    fadeLeft(Y,...RX(c),k);g.save();g.globalAlpha*=A*gl;g.drawImage(Y.canvas,0,0);g.restore()}}

/* ── 별: 3겹(먼 · 가운데 · 가까운) 시드 — 크기 · α · 흐름 속도가 겹마다 다름. 행성 원 밖(대기 빛띠 위로 서서히) · 글 기둥 밖
   뛰어듦: 가까운 겹일수록 크게 퍼짐(배율^γ) + 가까운 겹만 짧은 방사 자국(반 프레임 이동, 40px까지) ── */
const SL=[{n:170,r:.85,a:[.17,.27],v:.14,dy:70,gm:.55,seed:0x71},{n:90,r:1.15,a:[.23,.32],v:.3,dy:140,gm:.8,seed:0x72},{n:40,r:1.55,a:[.28,.35],v:.5,dy:230,gm:1.05,seed:0x73}];
const STAR=SL.map(l=>Array.from({length:l.n},(_,i)=>({x:hash(i,l.seed)*(W+240)-120,y:lerp(-40,1040,hash(i,l.seed+9)),a:lerp(l.a[0],l.a[1],hash(i,l.seed+17))})));
export function stars(g,f,c,L,V,camS,camR){const va=smooth(seg(c,.35,.85))*V.a*(1-E.accel(seg(f,601,606)));   /* 뛰어듦에서 금색 층과 함께 빠짐 */if(va<=.002)return;const [pcx,pcy]=V.p(L.cx,L.cy),PR=L.R*V.S,S=V.S,S0=f>585?camS(f-.25):S,r1=V.r,r0=f>585?camR(f-.25):r1;
  const R=(x,y,s,r)=>{const dx=(x-P.x)*s,dy=(y-P.y)*s,c=Math.cos(r),n=Math.sin(r);return [P.x+dx*c-dy*n,P.y+dx*n+dy*c]};
  g.save();g.lineCap='round';
  SL.forEach((l,li)=>{const s1=Math.pow(S,l.gm),s0=Math.pow(S0,l.gm),r=l.r*Math.pow(S,.25*l.gm);
    const ys=-l.dy*(1-c)*(1-c);                            /* 오르는 동안 겹마다 다른 거리로 내려앉음(시차) */
    for(const q of STAR[li]){let x=q.x-l.v*(f-560);x=((x+120)%(W+240)+(W+240))%(W+240)-120;const y=q.y+ys;
      const [px,py]=R(x,y,s1,r1);if(px<-20||px>W+20||py<-20||py>H+20)continue;
      const d=Math.hypot(px-pcx,py-pcy)-PR,m=smooth(seg(d,8,150));if(m<=0)continue;
      const col=1-smooth(seg(py,470,560))*(1-smooth(seg(px,980,1180)));   /* 글 기둥(왼쪽 아래) 가림 */
      const al=q.a*va*m*col;if(al<=.004)continue;
      let [ox,oy]=R(x,y,s0,r0);const d0=Math.hypot(px-ox,py-oy);if(d0>40){ox=px+(ox-px)*40/d0;oy=py+(oy-py)*40/d0}
      if(li===2&&d0>.8){g.beginPath();g.moveTo(ox,oy);g.lineTo(px,py);g.lineWidth=2*r;g.strokeStyle=rgba(C.cream,al*.8);g.stroke()}   /* 자국은 가까운 겹만 · 40px까지 */
      else{g.beginPath();g.arc(px,py,r,0,TAU);g.fillStyle=rgba(C.cream,al);g.fill()}}});
  g.restore()}

/* ── 행성 표면 구름 띠: 가장자리 아래 깊이 d(px, c=1 기준)에 긴 타원 — 궤도를 도는 만큼 오른쪽으로 흐름(아래 · 가까울수록 빠름). c .6→.95에 나타남 ── */
const SURF=Array.from({length:16},(_,i)=>{const h=k=>hash(i,0x81+k),d=8+300*Math.pow(h(0),1.6);return {s0:lerp(-1500,1500,(i+h(1))/16),d,len:(50+d*.9)*lerp(1,2.4,h(2)),th:1+d*.022,a:lerp(.06,.11,h(3)),v:.9+d*.012}});
export function surface(g,f,c,L,V){const a=smooth(seg(c,.6,.95))*V.a;if(a<=.002)return;const Y=layer('s5sf'),m=lerp(3,1,smooth(seg(c,.6,1)));
  for(const q of SURF){let s=q.s0+q.v*(f-560);s=((s+1600)%3200+3200)%3200-1600;const d=q.d*m,p0=surfK(s,-d,L),p=V.p(p0[0],p0[1]),rx=q.len*V.S,ry=q.th*V.S;
    if(p[0]+rx<-20||p[0]-rx>W+20||p[1]-ry>H+20)continue;
    Y.save();Y.translate(p[0],p[1]);Y.rotate(s/L.R+V.r);Y.scale(rx,ry);const gr=Y.createRadialGradient(0,0,0,0,0,1);gr.addColorStop(0,rgba(C.cream,q.a*a));gr.addColorStop(1,rgba(C.cream,0));
    Y.fillStyle=gr;Y.beginPath();Y.arc(0,0,1,0,TAU);Y.fill();Y.restore()}
  Y.globalCompositeOperation='destination-in';Y.beginPath();const [x,y]=V.p(L.cx,L.cy);Y.arc(x,y,L.R*V.S,0,TAU);Y.fillStyle=C.night;Y.fill();Y.globalCompositeOperation='source-over';
  fadeLeft(Y,...RX(c),kLit(c));colMask(Y,1,0,320,110);g.drawImage(Y.canvas,0,0)}
