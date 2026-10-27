/* 쇼릴 s5-future — 한 카메라 기하(순수 함수). 모든 층은 c(f) 하나에서 나온다(스토리보드 S10–S11)
   고리 → 지평선 → 지구 가장자리(LIMB) · 땅 사상 · 표면 틀(지평선을 따라 휘는 (s, 고도)) · UAM 궤적 · 머리(상승 → 궤도) · OTV · 뛰어듦 */
import {E,seg,lerp,clamp,smooth,loglerp} from '../engine.js';
import {P,LIMB} from '../shared.js';

const D2R=Math.PI/180;
export const HY=300,VX=1216;                          /* c=0 지평선 · 소실점 x */
export const cOf=f=>E.ioCubic(seg(f,562,585));        /* 0 땅 카메라 → 1 궤도 */
export const ytOf=c=>300+420*c;
export const RlOf=c=>loglerp(60000,LIMB.R,c);         /* c=1: 꼭대기 720 · 중심 (1216,3940) = LIMB */

/* S10 고리(495–525): R = 12·5000^ioQuart, 꼭대기 456→300. 본부 점 안(r2)에서 태어남(중심 = P*)
   태어남 항 −10·(1−outQuad) 495–503: 처음 2.5px/f로 나와 ioQuart 가속에 넘겨줌(속도가 ≈1.5px/f 아래로 멈칫하지 않게) */
export const ringR=f=>12*Math.pow(5000,E.ioQuart(seg(f,495,525)));
export function ring(f){const s=seg(f,495,525),Rs=12*Math.pow(5000,E.ioQuart(s)),yt=lerp(456,300,E.ioCubic(s));
  return {cx:VX,cy:yt+Rs,R:Rs-10*(1-E.outQuad(seg(f,495,503)))}}   /* 495: r2 — 2px 선(1~3)이 8px 점 안에 숨음(s4와 같은 그림) */
/* 지평선/가장자리 원(525 이후) */
export function limb(f){const c=cOf(f),yt=ytOf(c),R=RlOf(c);return {c,yt,cx:VX,cy:yt+R,R}}

/* 땅 사상(c=0에서 쓴 땅 위 점 → 지금): 카메라가 오르며 땅이 아래로 빠르게 빠짐 */
export const gP=(x,y,c)=>[VX+(x-VX)*(1+6*c*c),ytOf(c)+(y-HY)*(1+24*c*c)];
/* 표면 틀: s = 지평선 꼭대기에서 잰 호 길이, alt = 지평선 위 높이 → 지금 원 위에. 지평선이 휘면 함께 휨(궤도 층과 같은 틀) */
export function surf(s,alt,L){const a=s/L.R,r=L.R+alt;return [L.cx+r*Math.sin(a),L.cy-r*Math.cos(a)]}
/* 궤적 점: 버티포트(땅)는 땅 사상, 순항 고도는 표면 틀 — 고도 비율로 섞어 수직선이 늘어남(시차) */
export function trjMap(x,y,c,L){const w=smooth(clamp((P.y-y)/(P.y-258))),q=gP(x,y,c);if(w<=0)return q;const s=surf(x-VX,HY-y,L);return [lerp(q[0],s[0],w),lerp(q[1],s[1],w)]}

/* UAM 궤적(c=0): P*에서 수직 → 반지름 90 굽이 → (1767,258) 순항. 길이 누적표 */
export const TRJ=(()=>{const p=[[VX,P.y],[VX,352]];for(let i=1;i<=30;i++){const a=Math.PI+i/30*Math.PI/2;p.push([1306+90*Math.cos(a),352+90*Math.sin(a)])}p.push([1767,258]);
  const L=[0];for(let i=1;i<p.length;i++)L.push(L[i-1]+Math.hypot(p[i][0]-p[i-1][0],p[i][1]-p[i-1][1]));return {p,L,len:L[L.length-1]}})();
/* 길이 s까지의 부분 경로 + 끝점 */
export function trjCut(s){const {p,L}=TRJ;s=clamp(s,0,TRJ.len);const out=[p[0]];let i=1;for(;i<p.length&&L[i]<=s;i++)out.push(p[i]);
  if(i<p.length){const u=(s-L[i-1])/(L[i]-L[i-1]||1);out.push([lerp(p[i-1][0],p[i][0],u),lerp(p[i-1][1],p[i][1],u)])}return out}
/* 들어 올림 525(지평선이 자리 잡는 박자, 멈춘 채 시작) → 562 순항 끝을 순항 속도로 지나감(1.5u²−.5u³, 끝 기울기 1.5) — eVTOL이 머리를 타고, 562 뒤엔 제 속도로 오른쪽 밖으로 */
export const TRJ_F=[525,562];
export const trjP=f=>{const u=seg(f,TRJ_F[0],TRJ_F[1]);return 1.5*u*u-.5*u*u*u};
export const V_END=TRJ.len*1.5/(TRJ_F[1]-TRJ_F[0]);   /* 순항 끝 속도(px/f) */

/* 궤도(표면 틀 고도 260 · 480). 머리는 I(s 224.8 = −86°)에 들어와 반시계(왼쪽)로 감속, 600에 꼭대기(s 0, P* 위)를 천천히 지남 */
export const ALO=260,AHI=480,S_I=LIMB.R*4*D2R;
export const LIMB_C=[LIMB.cx,LIMB.cy];
export const I=surf(S_I,ALO,{cx:LIMB.cx,cy:LIMB.cy,R:LIMB.R});   /* ≈ (1459,468) */
const herm=(u,p0,m0,p1,m1)=>{const u2=u*u,u3=u2*u;return (2*u3-3*u2+1)*p0+(u3-2*u2+u)*m0+(-2*u3+3*u2)*p1+(u3-u2)*m1};
const V_S=S_I*2/15,V1=5;                              /* 삽입 순간 s 속도(= 상승 끝 속도, C1) · 600에 남는 느린 흐름(멈춤 없이 뛰어듦으로) */
export const sHead=f=>f<=600?herm(seg(f,585,600),S_I,-V_S*15,0,-V1*15):-V1*(f-600);
/* 상승(562–585): 표면 틀 3차 곡선 — 순항 끝(551,42)에서 순항 방향(접선 이어짐, 머리가 562에 돌지 않음)으로 떠나 위로 말려 I에 궤도 접선(−s)으로
   (오른쪽으로 넓히면 되돌이 고리가 x≈1885까지 나가 585–600 궤도 장면에 남음 — 말림은 좁게, 순항 · 자취 첫 200px를 일찍 지워 J자를 없앰) */
const C0=[551,42],C1=[551+110,42+110*4/461],C2=[S_I+260,ALO],C3=[S_I,ALO];
const M1=23*V_S/(3*(C2[0]-C3[0]));                    /* u′(1): 끝 속도 맞춤 */
const bz=(u,i)=>{const v=1-u;return v*v*v*C0[i]+3*v*v*u*C1[i]+3*v*u*u*C2[i]+u*u*u*C3[i]};
const curl=u=>[bz(u,0),bz(u,1)];
/* 시작 기울기 M0: 순항 끝을 지나는 eVTOL과 같은 속도로 떠남(멈칫 없이) — 곧 위로 말려 기체와 갈라짐. u′>0 전 구간(판별식 음수) */
const M0=V_END*23/(3*Math.hypot(C1[0]-C0[0],C1[1]-C0[1]));
const uOf=f=>{const t=seg(f,562,585);return (t*t*t-2*t*t+t)*M0+(3*t*t-2*t*t*t)+(t*t*t-t*t)*M1};
/* 머리의 표면 좌표(562 이후) */
export const headS=f=>f<585?curl(uOf(f)):[sHead(f),ALO];
/* 머리 위치(화면) — 528 이후 전부 */
export function head(f){const L=limb(f);
  if(f<562){const e=trjCut(trjP(f)*TRJ.len);const q=e[e.length-1];return trjMap(q[0],q[1],L.c,L)}
  const h=headS(f);return surf(h[0],h[1],L)}
/* 머리 방향 = 자취의 접선(화면) */
export function heading(f){const L=limb(f);let a,b;
  if(f<562){const s=Math.max(1,trjP(f)*TRJ.len),e0=trjCut(s-1),e1=trjCut(s);a=e0[e0.length-1];b=e1[e1.length-1];a=trjMap(a[0],a[1],L.c,L);b=trjMap(b[0],b[1],L.c,L)}
  else if(f<585){const u=uOf(f),p0=curl(Math.max(0,u-.002)),p1=curl(Math.max(.002,u));a=surf(p0[0],p0[1],L);b=surf(p1[0],p1[1],L)}
  else{const s=sHead(f);a=surf(s+1,ALO,L);b=surf(s,ALO,L)}
  return Math.atan2(b[1]-a[1],b[0]-a[0])}
/* 자취: 순항 끝에서 머리까지(말림 + 궤도 호), 지금 원 위에 */
export function trail(f){const L=limb(f),out=[];const u1=f<585?uOf(f):1,n=Math.max(2,Math.ceil(56*u1));
  for(let i=0;i<=n;i++){const p=curl(u1*i/n);out.push(surf(p[0],p[1],L))}
  if(f>585){const s1=sHead(f),m=Math.max(1,Math.ceil((S_I-s1)/6));for(let i=1;i<=m;i++)out.push(surf(lerp(S_I,s1,i/m),ALO,L))}
  return out}

/* OTV: 588에 머리 자리(D)에서 머리와 같은 속도(C1)로 갈라져 순행(왼쪽)으로 점선 전이 → 높은 궤도의 앞쪽 s −300(≈872,256)
   두 궤도에 접선 · 곡률도 이어짐(고도 5차 smootherstep), 600에 −3 s/f로 천천히 흐르며 뛰어듦으로.
   호 446 동안 고도 220 — 가장 가파른 곳 ≈30°(ioCubic이면 43°): 바깥으로 도는 나선으로 읽힘(스키 점프처럼 꺾이지 않게) */
export const OTV_F0=588,OTV_F1=600;
const S_D=sHead(OTV_F0),V_D=(sHead(OTV_F0+.01)-sHead(OTV_F0-.01))/.02,S_E=-300;
const VO=3;                                           /* 600 뒤 높은 궤도에서 남는 흐름(s/f, 순행) */
export function otvS(f){if(f>OTV_F1)return [S_E-VO*(f-OTV_F1),AHI];const t=seg(f,OTV_F0,OTV_F1),n=OTV_F1-OTV_F0;
  return [herm(t,S_D,V_D*n,S_E,-VO*n),ALO+(AHI-ALO)*q5(t)]}
const q5=t=>t*t*t*(t*(6*t-15)+10);
export function otvPath(f,L){const out=[];const fe=clamp(f,OTV_F0,612),n=Math.max(1,Math.ceil((fe-OTV_F0)*4));
  for(let i=0;i<=n;i++){const q=otvS(lerp(OTV_F0,fe,i/n));out.push(surf(q[0],q[1],L))}return out}

/* 뛰어듦(600–612): 모든 세상 층을 (1216,468) 둘레로 ×(밀기)·1→5(inQuad, 로그), α×(1−inExpo) — 마지막 3f는 한 번 더 부드럽게(612 직전 44%가 한 프레임에 꺼지지 않게). 선 굵기는 그대로 */
/* 578–600 밀기: 상승이 가라앉는 동안 이미 궤도 장면이 다가옴(×1→1.08 inQuad, 600 뒤 같은 기울기로 이어짐) — 삽입 뒤 멈춘 틈 없이 뛰어듦이 그 연장으로 가속 */
export const PUSH0=578;
export const camS=f=>{const u=seg(f,PUSH0,600),t=seg(f,600,612),n=600-PUSH0;return Math.exp(Math.log(1.12)*(f<600?u*u:1+2*(f-600)/n)+Math.log(5)*E.inQuad(t))};
/* 같은 때 P* 둘레로 시계 방향 기울기 0→1.7°(inQuad, 뛰어듦까지 이어짐) — 궤도를 도는 카메라가 가장자리 쪽으로 기울며 뛰어듦에 실림 */
export const camR=f=>.03*E.inQuad(seg(f,PUSH0,612));
export function plunge(f){const t=seg(f,600,612),S=camS(f),r=camR(f),cs=Math.cos(r)*S,sn=Math.sin(r)*S;
  return {S,r,a:(1-E.inExpo(t))*(1-smooth(seg(f,609,612))),p:(x,y)=>{const dx=x-VX,dy=y-P.y;return [VX+dx*cs-dy*sn,P.y+dx*sn+dy*cs]}}}
