/* 쇼릴 s5-future — UAM(z5 땅 · z20 기체 상태): 원근 격자(참 원근, 거리 따라 옅어짐) · 버티포트(패드 면 · 모서리 표지 · TLOF 고리 · V 표지 · 등 · 접근선)
   · 내리바람 물결 · 기체 그림자 · eVTOL 상태(수직 상승이 빠른 동안 뒤 원판 테를 옅게 — 블러에 겹친 원통처럼 보이지 않게)(궤적 머리를 타고 들어 올림 → 틸트 전환 → 순항 → 562 뒤 오른쪽 밖으로) */
import {C,E,seg,lerp,clamp,smooth,rgba,TAU,layer} from '../engine.js';
import {P} from '../shared.js';
import * as Q from './s5-future-geo.js';
import {FL,HY,VX,fadeLeft,colMask} from './s5-future-kit.js';

export const Z0=FL/(P.y-HY);                                /* 패드 깊이(c=0 화면 P*) */
const gw=(X,Z)=>[VX+FL*X/Z,HY+FL/Z];
const GA=.15;
/* ── eVTOL 상태 ── */
const DIR=(()=>{const d=[1767-1306,258-262],m=Math.hypot(d[0],d[1]);return [d[0]/m,d[1]/m]})();
export function craft(f){if(f<515||f>=578)return null;const L=Q.limb(f),c=L.c,s=Q.trjP(f)*Q.TRJ.len;let x,y;
  if(f<=Q.TRJ_F[1])[x,y]=Q.head(f);else{const d=Q.V_END*(f-Q.TRJ_F[1]);[x,y]=Q.trjMap(1767+DIR[0]*d,258+DIR[1]*d,c,L)}
  if(f<525){const r=Q.ring(f);y+=r.cy-r.R-HY}              /* 지평선이 자리 잡기 전: 패드(고리 창)와 함께 */
  const ex=smooth(seg(f,562,574));
  return {x,y,s,sc:lerp(1,.84,smooth(seg(s,120,Q.TRJ.len)))*(1-.3*ex),
    yaw:-.64,pitch:-.11*Math.sin(Math.PI*seg(s,100,430))-.02*smooth(seg(s,300,500)),
    el:lerp(.33,.1,smooth(seg(s,40,330)))+.55*smooth(seg(c,0,.4)),
    tilt:Math.PI/2*smooth(seg(s,105,350)),rim:1-.6*smooth(seg(s,60,200)),spin:smooth(seg(f,516,524)),lift:smooth(seg(f,518,525))*(1-smooth(seg(s,260,450))),stop:smooth(seg(s,330,470)),
    alpha:smooth(seg(f,515,521))*(1-smooth(seg(c,.25,.42))),h:Math.max(0,Q.limb(f).yt+168-y)}}

/* ── 땅: M = c=0 화면 → 지금. a 격자 α, ap 패드 α ── */
export function ground(g,f,c,L,M,a,ap){if(a<=0&&ap<=0)return;const Gd=g;g=layer('s5gr');g.save();g.beginPath();g.arc(L.cx,L.cy,L.R,0,TAU);g.clip();
  if(a>0){grid(g,M,a);colMask(g)}                           /* 격자만 글 기둥(기록 줄) 뒤에서 지움 — 빠지는 패드는 자르지 않음 */
  if(ap>0)pad(g,f,M,ap);
  g.restore();fadeLeft(g,520,1000);Gd.drawImage(g.canvas,0,0)}
/* 부채선 25(옆 1/3 간격, 패드 깊이에서 56px) · 가로선(깊이 1/3 간격, 패드가 한 줄 위) — 촘촘해지면 잔선부터 빠지고 굵은선(3칸)도 지평선 가까이 옅어짐 */
function grid(g,M,a){const [vx,vy]=M(VX,HY),ya=M(VX,HY+6)[1],yb=M(VX,HY+230)[1];
  const gr=g.createLinearGradient(0,ya,0,Math.max(ya+1,yb));gr.addColorStop(0,rgba(C.cream,0));gr.addColorStop(.45,rgba(C.cream,GA*a*.45));gr.addColorStop(1,rgba(C.cream,GA*a));
  g.strokeStyle=gr;g.lineWidth=1;g.beginPath();for(let k=-12;k<=12;k++){const q=M(...gw(k/3,.28));g.moveTo(vx+.5,vy);g.lineTo(q[0]+.5,q[1])}g.stroke();
  const zb=Z0-8/3;for(let j=0;j<90;j++){const Z=zb+j/3;if(Z<=.2)continue;const d=FL/Z,sp=d-FL/(Z+1/3),mj=j%3===2;
    const al=GA*a*smooth(seg(sp*(mj?3:1),3.2,11))*smooth(seg(d,5,110))*(mj?1.1:1);if(al<=.002)continue;
    const q0=M(VX-4*d,HY+d),q1=M(VX+4*d,HY+d);g.fillStyle=rgba(C.cream,Math.min(al,.2));g.fillRect(q0[0],Math.round(q0[1]),q1[0]-q0[0],1)}}
/* 패드(세계 X · Z 둘레) */
const RIM=.78;
function pad(g,f,M,ap){const q=(X,dz)=>M(...gw(X,Z0+dz)),line=(pts,p=1)=>{const n=pts.length-1,m=Math.max(1,Math.round(n*clamp(p)));g.beginPath();for(let i=0;i<=m;i++){const w=pts[i];i?g.lineTo(w[0],w[1]):g.moveTo(w[0],w[1])}};
  const circ=(r,a0,p)=>{const out=[];const n=64;for(let i=0;i<=n;i++){const t=a0+TAU*p*i/n;out.push(q(r*Math.sin(t),-r*Math.cos(t)))}return out};
  g.save();g.lineCap='round';g.lineJoin='round';
  /* 은은한 조명(패드 둘레 크림 α.07) */
  const c0=q(0,0),rx=q(1.6,0)[0]-c0[0],ry=(q(0,-1.3)[1]-q(0,1.3)[1])/2;
  if(rx>1&&ry>1){g.save();g.translate(c0[0],c0[1]);g.scale(1,ry/rx);const gr=g.createRadialGradient(0,0,0,0,0,rx);gr.addColorStop(0,rgba(C.cream,.075*ap));gr.addColorStop(1,rgba(C.cream,0));
    g.fillStyle=gr;g.beginPath();g.arc(0,0,rx,0,TAU);g.fill();g.restore()}
  /* 패드 면: ink80 α.55 */
  const sq=[[-RIM,-RIM],[RIM,-RIM],[RIM,RIM],[-RIM,RIM]].map(([x,z])=>q(x,z)),sa=smooth(seg(f,514,521))*ap;
  if(sa>0){g.beginPath();sq.forEach((w,i)=>i?g.lineTo(w[0],w[1]):g.moveTo(w[0],w[1]));g.closePath();g.fillStyle=rgba(C.ink80,.6*sa);g.fill()}
  /* 모서리 표지(ㄱ자 1.5px) · 가장자리 점선 */
  [[-1,-1],[1,-1],[1,1],[-1,1]].forEach(([sx,sz],i)=>{const p=E.snap(seg(f,516+i*.8,523+i*.8));if(p<=0)return;const L=.28*p;
    const A=q(sx*RIM,sz*RIM),B=q(sx*(RIM-L),sz*RIM),D=q(sx*RIM,sz*(RIM-L));g.beginPath();g.moveTo(B[0],B[1]);g.lineTo(A[0],A[1]);g.lineTo(D[0],D[1]);g.lineWidth=1.5;g.strokeStyle=rgba(C.cream,.8*ap);g.stroke()});
  const pe=seg(f,518,526);if(pe>0){g.beginPath();for(const [x0,z0,x1,z1] of [[-1,-1,1,-1],[1,-1,1,1],[1,1,-1,1],[-1,1,-1,-1]])for(let t=.42;t<1.58;t+=.19){const u=t/2,v=Math.min(t+.09,1.58)/2;
      const A=q(RIM*lerp(x0,x1,u),RIM*lerp(z0,z1,u)),B=q(RIM*lerp(x0,x1,v),RIM*lerp(z0,z1,v));g.moveTo(A[0],A[1]);g.lineTo(B[0],B[1])}
    g.lineWidth=1;g.strokeStyle=rgba(C.cream,.34*pe*ap);g.stroke()}
  /* TLOF 고리 2px(가까운 쪽부터 양쪽으로) · 안쪽 1px 점선 */
  const tp=E.snap(seg(f,517,526));if(tp>0){for(const d of [1,-1]){line(circ(.55,0,.5*d),tp);g.lineWidth=2;g.strokeStyle=rgba(C.cream,.82*ap);g.stroke()}}
  const ip=seg(f,519,527);if(ip>0){g.save();g.setLineDash([3,5]);line(circ(.43,Math.PI,1),ip);g.lineWidth=1;g.strokeStyle=rgba(C.cream,.4*ap);g.stroke();g.restore()}
  /* ∧ 표지(크림 — 금색은 궤적만): 꼭짓점이 먼 쪽(화면 위, 오르는 방향). 기체가 떠나면 드러남 */
  const vp=E.snap(seg(f,520,528));if(vp>0){line([q(-.2,-.17),q(0,.17),q(.2,-.17)],vp);g.lineWidth=2;g.strokeStyle=rgba(C.cream,.78*ap);g.stroke()}
  /* 접근선: 패드에서 오른쪽 앞으로 점선(깊이 원근) */
  const apx=E.snap(seg(f,520,530));if(apx>0){g.beginPath();for(let i=0;i<5;i++){const u0=i/5,u1=u0+.45/5;if(u0>apx)break;const A=q(lerp(.95,1.75,u0),lerp(-.95,-1.55,u0)),B=q(lerp(.95,1.75,Math.min(u1,apx)),lerp(-.95,-1.55,Math.min(u1,apx)));g.moveTo(A[0],A[1]);g.lineTo(B[0],B[1])}
    g.lineWidth=1.5;g.strokeStyle=rgba(C.cream,.36*ap);g.stroke()}
  /* 등 8(모서리 · 가운데, 둘레 순서로 켜짐) */
  const LT=[[-1,-1],[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0]];LT.forEach(([x,z],i)=>{const la=smooth(seg(f,518+i*.9,521+i*.9))*ap;if(la<=0)return;const w=q(x*(RIM+.06),z*(RIM+.06)),r=1.9*FL/(Z0+z*RIM)/168;
    const gr=g.createRadialGradient(w[0],w[1],0,w[0],w[1],r*4);gr.addColorStop(0,rgba(C.cream,.22*la));gr.addColorStop(1,rgba(C.cream,0));g.fillStyle=gr;g.beginPath();g.arc(w[0],w[1],r*4,0,TAU);g.fill();
    g.beginPath();g.arc(w[0],w[1],r,0,TAU);g.fillStyle=rgba(C.cream,.95*la);g.fill()});
  /* 기체 그림자 · 내리바람 물결 */
  const K=craft(f);if(K&&K.alpha>0){const sh=.55*K.alpha*(1-smooth(seg(K.h,0,150)))*ap;if(sh>.003){const X=(K.x-VX)*Z0/FL,k=1+K.h/260,w=q(X,0),sx=q(X+1.05*k,0)[0]-w[0],sy=(q(X,-.34*k)[1]-q(X,.34*k)[1])/2;
      if(sx>1&&sy>.5){g.save();g.translate(w[0],w[1]);g.scale(1,sy/sx);const gr=g.createRadialGradient(0,0,0,0,0,sx);gr.addColorStop(0,rgba(C.night,sh));gr.addColorStop(.6,rgba(C.night,sh*.7));gr.addColorStop(1,rgba(C.night,0));
        g.fillStyle=gr;g.beginPath();g.arc(0,0,sx,0,TAU);g.fill();g.restore()}}}
  for(let i=0;i<3;i++){const t=seg(f,527+4*i,547+4*i);if(t<=0||t>=1)continue;line(circ(.62+2.1*E.outCubic(t),0,1));g.lineWidth=1;g.strokeStyle=rgba(C.cream,.42*(1-t)*(1-t)*ap);g.stroke()}
  g.restore()}
/* 링 창(f<525): 땅을 고리 꼭대기 둘레로 k배 — 작은 고리 안에 미래 땅이 비치다 커짐 */
export function ringMap(L){const top=L.cy-L.R,k=clamp(L.R/150,.08,1);return (x,y)=>[VX+(x-VX)*k,top+(y-HY)*k]}
