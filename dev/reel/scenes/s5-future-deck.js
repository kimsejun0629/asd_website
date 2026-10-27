/* 쇼릴 s5-future — 가까운 구름 판(z5): 카메라가 지나 올라간(아래에 있는) 판만. 판 높이 A · 띠(깊이 Z · 옆 X · 길이 Lx · 앞뒤 폭 e)
   지나는 순간 지평선에 붙은 한 줄로 태어나 아래로 벌어짐 — 앞 띠는 빠르게 · 먼 띠는 지평선 가까이 천천히(참 원근 시차)
   모양: 윗면 봉긋한 테(1px 크림) + 몸(위가 짙고 아래로 풀림). 표면 틀(가장자리를 따라 휨)에 그리고, 두께 기울기는 가장자리 중심 원형(휜 띠도 법선 방향) */
import {C,seg,lerp,clamp,smooth,rgba,TAU,W,H,hash,layer} from '../engine.js';
import {FL,fadeLeft,hC,sC,surfK} from './s5-future-kit.js';

/* 판 높이: 카메라가 지나는 때 ≈568.8 · 570.8 · 572.2 · 573.7 — 569–577 어느 프레임에도 판 하나 이상이 화면을 가로지름 */
const DK=[{A:1.25,seed:0xa1},{A:2.3,seed:0xa2},{A:4.2,seed:0xa3},{A:7.8,seed:0xa4}];
const NB=4,NS=56,ZN=12,ZF=120;
const BAND=DK.flatMap((d,di)=>Array.from({length:NB},(_,i)=>{const h=k=>hash(i,d.seed*16+k),q=(i+.25+.5*h(0))/NB,Z=Math.exp(lerp(Math.log(ZN),Math.log(ZF),q));
  const w0=lerp(320,700,h(1)),x0=lerp(-560,520,(((i+di*.37)*.618)%1+h(2)*.3)%1);   /* c=0 화면 폭 · 가운데(VX 기준) — 판마다 엇갈림 */
  return {A:d.A,Z,q,X:x0*Z/FL,Lx:w0*Z/FL,e:lerp(.2,.3,h(3)),a:lerp(.21,.15,q),p0:h(5)*TAU,p1:h(6)*TAU,p2:h(9)*TAU,p3:h(10)*TAU,n0:lerp(2,3.5,h(7)),n1:lerp(5,8,h(8)),n2:lerp(10.5,14,h(11))}}));
BAND.sort((a,b)=>b.Z-a.Z);                                     /* 먼 띠부터(가까운 띠가 가림) */
const WIND=.012;
export function decks(g,f,c,L,V,colX){const fo=1-smooth(seg(c,.8,.97)),fc=smooth(seg(c,.02,.15));if(fo<=0||c<=0)return;const hc=hC(c),sx=sC(c),S=V.S;let any=false;const Y=layer('s5dk');
  const [ox,oy]=V.p(L.cx,L.cy);
  for(const b of BAND){const D=hc-b.A,sg=D<0?-1:1;
    /* 지나기 전(위, 천장): 밑면이 지평선 쪽으로 내려옴 — 옅게(.5), 오르기 시작(c .02→.15)에 나타남 */
    const m=smooth(clamp(Math.abs(D)/(.3*b.A+.25)))*fo*(D<0?.5*fc:1),al=b.a*m;if(al<=.003)continue;
    const mid=FL*D/b.Z,hh=Math.abs(mid)*b.e;if(mid-2*hh>H||mid+2*hh<-H)continue;
    const X=b.X-WIND*(f-560),top=[],bot=[];let x0=1e9,x1=-1e9;
    for(let i=0;i<=NS;i++){const u=-1+2*i/NS,en=Math.pow(Math.max(0,1-u*u),.45),dx=(X+u*b.Lx/2)*FL/b.Z*sx;
      const lu=(.5*Math.abs(Math.sin(b.n0*Math.PI*u+b.p0))+.32*Math.abs(Math.sin(b.n1*Math.PI*u+b.p1))+.18*Math.abs(Math.sin(b.n2*Math.PI*u+b.p2)))
        *(.65+.35*Math.sin(1.3*Math.PI*u+b.p3));                   /* 봉긋한 먼 가장자리(크고 작은 봉우리 · 고르지 않게) */
      const pt=surfK(dx,-(mid-sg*hh*en*(.55+.9*lu)),L),pb=surfK(dx,-(mid+sg*hh*en*.7),L);
      const qt=V.p(pt[0],pt[1]),qb=V.p(pb[0],pb[1]);top.push(qt);bot.push(qb);x0=Math.min(x0,qt[0]);x1=Math.max(x1,qt[0])}
    if(x1<-20||x0>W+20)continue;any=true;
    const path=()=>{Y.beginPath();top.forEach((q,i)=>i?Y.lineTo(q[0],q[1]):Y.moveTo(q[0],q[1]));for(let i=bot.length-1;i>=0;i--)Y.lineTo(bot[i][0],bot[i][1]);Y.closePath()};
    /* 몸: 뒤를 가리는 어둠(부피) → 위(테 쪽) 짙은 크림이 아래로 풀림 */
    const rT=Math.max(0,(L.R-(mid-sg*hh*1.45))*S),rB=Math.max(0,(L.R-(mid+sg*hh*.7))*S),gr=Y.createRadialGradient(ox,oy,rB,ox,oy,Math.abs(rT-rB)<1?rB+sg:rT);
    gr.addColorStop(0,rgba(C.cream,0));gr.addColorStop(.45,rgba(C.cream,al*.25));gr.addColorStop(.78,rgba(C.cream,al*.7));gr.addColorStop(1,rgba(C.cream,al));
    path();Y.fillStyle=rgba(C.night,.4*m);Y.fill();Y.fillStyle=gr;Y.fill();
    /* 윗면 테: 끝으로 갈수록 옅게 · 3px 옅은 빛 위에 1px */
    const A=top[0],B=top[top.length-1],ra=.3*m,rim=k=>{const gl=Y.createLinearGradient(A[0],A[1],B[0],B[1]);gl.addColorStop(0,rgba(C.cream,0));gl.addColorStop(.22,rgba(C.cream,k));gl.addColorStop(.78,rgba(C.cream,k));gl.addColorStop(1,rgba(C.cream,0));return gl};
    Y.beginPath();top.forEach((q,i)=>i?Y.lineTo(q[0],q[1]):Y.moveTo(q[0],q[1]));Y.lineJoin='round';Y.lineWidth=3;Y.strokeStyle=rim(ra*.25);Y.stroke();Y.lineWidth=1;Y.strokeStyle=rim(ra);Y.stroke()}
  if(!any)return;
  fadeLeft(Y,colX-300,colX+220,1,.08);g.drawImage(Y.canvas,0,0)}
