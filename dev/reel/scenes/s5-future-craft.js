/* 쇼릴 s5-future — 벡터 기체(순수 그림): eVTOL(3/4 정사영 · 붐 6 · 앞 틸트 로터 6 · 뒤 리프트 로터 6 · V 꼬리) · OTV(금박 버스 · 태양 전지판 · 분사)
   몸 좌표 x 앞 · y 위 · z 옆(단위 = 배율 1의 px). 보기 좌표 X 오른쪽 · Y 위 · Z 보는 쪽. 칠 순서는 깊이(먼 붐 · 로터 → 동체 → 가까운 것) */
import {C,TAU,rgba,clamp,lerp,hermite} from '../engine.js';

/* 키놀이(pitch, 코 위 +) → 방위(yaw) → 내려다봄(el, 위가 보는 쪽으로) → 화면 돌림(roll, 반시계 +) */
export function rot3(yaw,pitch,el,roll=0){const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch),ce=Math.cos(el),se=Math.sin(el),cr=Math.cos(roll),sr=Math.sin(roll);
  return ([x,y,z])=>{const x1=x*cp-y*sp,y1=x*sp+y*cp,x2=x1*cy+z*sy,z2=-x1*sy+z*cy,y3=y1*ce-z2*se,z3=y1*se+z2*ce;return [x2*cr-y3*sr,x2*sr+y3*cr,z3]}}
/* 원판 경로: 중심 c(화면) · 몸 좌표 반축 u1 · u2(회전 후 화면 벡터로) — 켤레 지름 변환 */
function ell(g,c,a,b){g.save();g.transform(a[0],a[1],b[0],b[1],c[0],c[1]);g.moveTo(1,0);g.arc(0,0,1,0,TAU);g.restore()}

/* 동체 단면: 반폭 r(x) · 중심 높이 yc(x)(꼬리 쪽으로 올라감) · 세로 1.12배 */
const RF=hermite([[-70,2.2],[-56,3.4],[-40,6.4],[-22,10.6],[-4,13.2],[14,13.6],[30,12.6],[42,10.2],[51,7],[56,3.8],[58.6,0]]);
const YF=hermite([[-70,31],[-50,25.5],[-26,20],[0,18.4],[58,17.2]]);
const ST=Array.from({length:64},(_,i)=>{const x=-70+128.6*i/63;return [x,RF(x),YF(x)]});
const BZ=[31,64,97],BY=30.5,WY=33.4,RR=15.5;

/* eVTOL — o: {yaw,pitch,el,tilt(0 수직 축 → π/2 앞),spin(앞 원판 α),lift(뒤 원판 α),stop(멈춘 뒤 날개 α),alpha} */
export function evtol(g,ox,oy,s,o){const R=rot3(o.yaw,o.pitch||0,o.el),S=v=>{const q=R(v);return [ox+s*q[0],oy-s*q[1],q[2]]},V=v=>{const q=R(v);return [s*q[0],-s*q[1]]};
  const al=o.alpha??1;if(al<=.002)return;g.save();g.globalAlpha*=al;g.lineCap='round';g.lineJoin='round';
  const zN=R([0,0,1])[2]>=0?1:-1;                       /* 보는 쪽 옆(+z가 가까우면 1) */
  const up=o.el>=0,tl=o.tilt||0,ax=[Math.sin(tl),Math.cos(tl),0],ap=[Math.cos(tl),-Math.sin(tl),0];
  /* 로터 · 붐 목록(깊이) */
  const rot=[],boom=[];
  for(const zz of BZ)for(const sg of [1,-1]){const z=zz*sg;
    boom.push({d:R([0,BY,z])[2],z});
    const hf=[42,BY+2.5,z],cf=[hf[0]+ax[0]*5,hf[1]+ax[1]*5,z];rot.push({d:R(cf)[2],k:'f',h:hf,c:cf});
    const hr=[-48,BY+2.5,z],cr=[-48,BY+6.5,z];rot.push({d:R(cr)[2],k:'r',h:hr,c:cr})}
  const drawBoom=b=>{const a=S([-50,BY,b.z]),e=S([44,BY,b.z]);g.beginPath();g.moveTo(a[0],a[1]);g.lineTo(e[0],e[1]);g.lineWidth=3.6*s;g.strokeStyle=C.cream80;g.stroke();
    g.lineWidth=Math.max(.8,1*s);g.strokeStyle=rgba(C.cream,.7);g.stroke()};
  const drawRot=r=>{
    if(r.k==='f'){const a=S(r.h),e=S(r.c);g.beginPath();g.moveTo(a[0],a[1]);g.lineTo(e[0],e[1]);g.lineWidth=4.4*s;g.strokeStyle=C.cream80;g.stroke();
      disc(g,e,V([0,0,RR]),V([ap[0]*RR,ap[1]*RR,0]),o.spin??1,s)}
    else{const e=S(r.c),lf=o.lift??1,st=o.stop||0;
      if(lf>0)disc(g,e,V([RR,0,0]),V([0,0,RR]),lf,s,o.rim??1);
      if(st>0){const a=S([r.c[0]-RR,r.c[1],r.c[2]]),b=S([r.c[0]+RR,r.c[1],r.c[2]]);g.beginPath();g.moveTo(a[0],a[1]);g.lineTo(b[0],b[1]);g.lineWidth=1.6*s;g.strokeStyle=rgba(C.cream80,st);g.stroke()}
      g.beginPath();g.arc(e[0],e[1],1.6*s,0,TAU);g.fillStyle=C.cream80;g.fill()}};
  const wing=()=>{const P=[[9,WY,112],[13,WY,0],[9,WY,-112],[-3,WY,-112],[-7,WY,0],[-3,WY,112]].map(S);
    g.beginPath();P.forEach((q,i)=>i?g.lineTo(q[0],q[1]):g.moveTo(q[0],q[1]));g.closePath();g.fillStyle=C.smoke;g.fill();
    g.fillStyle=rgba(C.cream,clamp(o.el/.3)*.85);g.fill();
    g.beginPath();g.moveTo(P[0][0],P[0][1]);g.lineTo(P[1][0],P[1][1]);g.lineTo(P[2][0],P[2][1]);g.lineWidth=Math.max(.8,1.1*s);g.strokeStyle=C.cream;g.stroke()};
  const fin=sg=>{const P=[[-57,31,0],[-72,32,0],[-79,54,22*sg],[-70,54,22*sg]].map(S);g.beginPath();P.forEach((q,i)=>i?g.lineTo(q[0],q[1]):g.moveTo(q[0],q[1]));g.closePath();
    g.fillStyle=C.cream80;g.fill();g.lineWidth=Math.max(.7,.9*s);g.strokeStyle=C.cream;g.stroke()};
  const body=()=>{g.beginPath();for(const [x,r,yc] of ST){if(r<=.05)continue;ell(g,S([x,yc,0]),V([0,0,r]),V([0,1.12*r,0]))}
    const U=V([0,1,0]),m=Math.hypot(U[0],U[1])||1,c=S([0,18,0]),gr=g.createLinearGradient(c[0]+U[0]/m*17*s,c[1]+U[1]/m*17*s,c[0]-U[0]/m*16*s,c[1]-U[1]/m*16*s);
    gr.addColorStop(0,C.cream);gr.addColorStop(.48,C.cream80);gr.addColorStop(.82,C.smoke);gr.addColorStop(1,C.ink80);g.fillStyle=gr;g.fill();   /* 배는 ink80까지(블러에도 동체 윤곽이 남게) */
    /* 옆 줄: 창 띠(night) · 금색 선 */
    const side=(x0,x1,ph,n)=>{const pts=[];for(let i=0;i<=n;i++){const x=lerp(x0,x1,i/n),r=RF(x),yc=YF(x);pts.push(S([x,yc+1.12*r*Math.sin(ph),zN*r*Math.cos(ph)]))}return pts};
    const w=side(10,52,.6,16);g.beginPath();w.forEach((q,i)=>i?g.lineTo(q[0],q[1]):g.moveTo(q[0],q[1]));g.lineWidth=4.2*s;g.strokeStyle=C.night;g.stroke();
    const k=side(-54,53,-.16,22);g.beginPath();k.forEach((q,i)=>i?g.lineTo(q[0],q[1]):g.moveTo(q[0],q[1]));g.lineWidth=Math.max(.9,1.3*s);g.strokeStyle=C.goldHi;g.stroke()};
  /* 칠 순서 */
  const far=rot.filter(r=>r.d<0).sort((a,b)=>a.d-b.d),near=rot.filter(r=>r.d>=0).sort((a,b)=>a.d-b.d);
  const bf=boom.filter(b=>b.d<0),bn=boom.filter(b=>b.d>=0),fz=R([0,0,1])[2];
  far.forEach(drawRot);if(!up)wing();bf.forEach(drawBoom);fin(fz<0?1:-1);body();bn.forEach(drawBoom);if(up)wing();fin(fz<0?-1:1);near.forEach(drawRot);
  g.restore()}
/* 도는 원판: 흐린 면(가장자리가 짙은 방사) + 1px 테 */
function disc(g,c,a,b,al,s,rim=1){if(al<=0)return;g.save();g.transform(a[0],a[1],b[0],b[1],c[0],c[1]);const gr=g.createRadialGradient(0,0,0,0,0,1);
  gr.addColorStop(0,rgba(C.cream,.05*al));gr.addColorStop(.72,rgba(C.cream,.12*al));gr.addColorStop(.96,rgba(C.cream,.24*al));gr.addColorStop(1,rgba(C.cream,.05*al));
  g.fillStyle=gr;g.beginPath();g.arc(0,0,1,0,TAU);g.fill();g.restore();g.beginPath();ell(g,c,a,b);g.lineWidth=Math.max(.7,.9*s);g.strokeStyle=rgba(C.cream,.42*al*rim);g.stroke()}

/* OTV — 진행 방향 ang(화면, rad), thrust 0~1(분사 길이), 3/4로 살짝 돌려 전지판이 평행사변형으로 */
export function otv(g,ox,oy,s,ang,{thrust=0,alpha=1}={}){if(alpha<=.002)return;const R=rot3(.55,0,.42,-ang),S=v=>{const q=R(v);return [ox+s*q[0],oy-s*q[1],q[2]]};
  g.save();g.globalAlpha*=alpha;g.lineJoin='round';g.lineCap='round';
  /* 분사(뒤로 가늘어지는 크림 → 투명 · 금색 심) */
  if(thrust>0){const a=S([-11,0,0]),e=S([-11-30*thrust,0,0]),dx=e[0]-a[0],dy=e[1]-a[1],L=Math.hypot(dx,dy)||1,nx=-dy/L,ny=dx/L,w=3.2*s;
    const gr=g.createLinearGradient(a[0],a[1],e[0],e[1]);gr.addColorStop(0,rgba(C.cream,.55));gr.addColorStop(1,rgba(C.cream,0));
    g.beginPath();g.moveTo(a[0]+nx*w,a[1]+ny*w);g.lineTo(e[0],e[1]);g.lineTo(a[0]-nx*w,a[1]-ny*w);g.closePath();g.fillStyle=gr;g.fill();
    const gc=g.createLinearGradient(a[0],a[1],e[0],e[1]);gc.addColorStop(0,rgba(C.goldHi,.9));gc.addColorStop(.6,rgba(C.goldHi,0));
    g.beginPath();g.moveTo(a[0],a[1]);g.lineTo(e[0],e[1]);g.lineWidth=1.4*s;g.strokeStyle=gc;g.stroke()}
  /* 전지판: 먼 쪽 → 버스 → 가까운 쪽 */
  const panel=sg=>{const P=[[-5,0,9*sg],[5,0,9*sg],[5,0,31*sg],[-5,0,31*sg]].map(S),y0=S([0,0,6*sg]),y1=S([0,0,9*sg]);
    g.beginPath();g.moveTo(y0[0],y0[1]);g.lineTo(y1[0],y1[1]);g.lineWidth=1.2*s;g.strokeStyle=C.cream80;g.stroke();
    g.beginPath();P.forEach((q,i)=>i?g.lineTo(q[0],q[1]):g.moveTo(q[0],q[1]));g.closePath();g.fillStyle=C.cblue;g.fill();g.lineWidth=Math.max(.7,.8*s);g.strokeStyle=C.cream80;g.stroke();
    g.beginPath();for(const z of [14.5,20,25.5]){const a=S([-5,0,z*sg]),b=S([5,0,z*sg]);g.moveTo(a[0],a[1]);g.lineTo(b[0],b[1])}const m0=S([0,0,9*sg]),m1=S([0,0,31*sg]);g.moveTo(m0[0],m0[1]);g.lineTo(m1[0],m1[1]);
    g.lineWidth=.7;g.strokeStyle=rgba(C.cream,.45);g.stroke()};
  const bus=()=>{const F=[[[1,0,0],C.gold],[[-1,0,0],C.gold],[[0,1,0],C.goldHi],[[0,-1,0],C.gold],[[0,0,1],C.goldHi2],[[0,0,-1],C.goldHi2]],h=[7,6,6];
    const vis=F.map(([n,col])=>({n,col,d:R(n)[2]})).filter(q=>q.d>0).sort((a,b)=>a.d-b.d);
    for(const {n,col} of vis){const i=n.findIndex(v=>v!==0),j=(i+1)%3,k=(i+2)%3,pts=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([u,v])=>{const p=[0,0,0];p[i]=n[i]*h[i];p[j]=u*h[j];p[k]=v*h[k];return S(p)});
      g.beginPath();pts.forEach((q,m)=>m?g.lineTo(q[0],q[1]):g.moveTo(q[0],q[1]));g.closePath();g.fillStyle=col;g.fill();g.lineWidth=.6;g.strokeStyle=rgba(C.night,.35);g.stroke()}
  };
  /* 노즐(버스 뒤) */
  const nozzle=()=>{const a=S([-6,0,0]),e=S([-11,0,0]);g.beginPath();g.moveTo(a[0],a[1]);g.lineTo(e[0],e[1]);g.lineWidth=5*s;g.strokeStyle=C.cream80;g.lineCap='butt';g.stroke();g.lineCap='round'};
  const zf=R([0,0,1])[2]>=0?1:-1;panel(-zf);nozzle();bus();panel(zf);g.restore()}
