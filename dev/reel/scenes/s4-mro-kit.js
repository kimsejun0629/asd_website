/* s4-mro 도우미: 지도 변환(시작 자세 · 닻 곡선만 지역값) · 육지 가림(타원 깃털) · 경로 표 · 글줄 등장/퇴장 · 표본 안 나눔 · 검사 상자 */
import {C,E,seg,clamp,lerp,loglerp,rgba,glyphs,layer,hash,font,W,H,CUR} from '../engine.js';
import {P,MAP,mapT,mapAnc,ROUTES} from '../shared.js';
import {stepH} from './s4-mro-num.js';

export const B=MAP.busan;
/* 시작 자세: 왼쪽 아래 글 묶음과 겹치지 않게 지도를 오른쪽 위로(s 1.1, 부산 760,500) — 값과 곡선은 모두 shared.mapT */
export const S0=MAP.s0,A0=MAP.a0;
/* 닻(부산 화면 위치)은 배율과 따로: 433–447에 P*로 와서 멈춤 → 여섯 혜성이 450에 멈춘 점 위에 내려앉음(배율은 432–462 ioQuint 그대로)
   곡선 bez(.8,0,.4,1) 434–447: 432–439(N=8) 최고 37px/f · 440–447(N=24) 최고 120px/f — 두 구간 모두 표본 간격 ≤2.5px */
export const anc=mapAnc;
/* 462–495 느린 밀기: 등속(스토리보드 선형)이되 양끝 20%만 속도를 올리고 내림 — 462(확대 정지)와 495(축소 시작)의 속도 꺾임 제거, 끝값 동일(shared.trap) */
export const mt=mapT;
/* 들어오는 카메라(418–446, 지역값): 부산 둘레로 배율 ×.78→1 · 세로 눌림 .84→1(지도 면이 눕혀졌다 세워짐) · 굴림 +3°→0
   — mapT의 솟음(ty) · 확대 위에 곱함, 446부터 mapT 그대로(경계 · 착지 450 · 부산 495 불변). 굴림은 머무름 0→−1°와 같은 방향
   — 휩이 걷힌 뒤에 보이게: 418부터 outQuad(420 u .14 · 432 .75 · 440 .94), 446에 속도 0 */
export function cam(f){const u=E.outQuad(seg(f,418,446));return {z:loglerp(.78,1,u),sy:lerp(.84,1,u),r:3*(1-u)}}
/* 지도 → 화면(프레임별) */
export function xf(f){const m=mt(f),c0=cam(f),S=m.s*m.k*c0.z,sy=c0.sy,r=(m.rot+c0.r)*Math.PI/180,c=Math.cos(r),s=Math.sin(r),ax=m.ax,ay=m.ay+m.ty;
  return {m,S,sy,r,ax,ay,pt:v=>{const x=(v[0]-B[0])*S,y=(v[1]-B[1])*S*sy;return [ax+x*c-y*s,ay+x*s+y*c]}}}

/* ── 육지 가림(지도 좌표, L의 변환이 지도 공간일 때): 타원 하나의 부드러운 깃털(smootherstep) × 아래 잘린 선 띠
   중심 (560,520) · 반지름 560×480(위 바깥 y 40 — 잘린 윗선 y 20이 흔들림에도 0) · 안쪽 .832 — 부산 위도에서 서쪽 x 13→110(사이트처럼 대륙은 흐려짐), 한국 · 규슈 · 오키나와는 1,
   대륙 북서 · 위 잘린 선(y 20) · 알래스카 동쪽 잘린 선은 둥근 곡선으로 사라짐(직선 · 모서리 없음). j: 표본마다 ±12px 흔들어 8비트 계단을 누적에서 풂 */
const ss=t=>t*t*t*(t*(t*6-15)+10),EL={cx:560,cy:520,rx:560,ry:480,d0:.832};
export function landMask(L,S,j){L.globalCompositeOperation='destination-in';
  L.save();L.translate(EL.cx+j/S,EL.cy+j/S);L.scale(EL.rx,EL.ry);const gr=L.createRadialGradient(0,0,0,0,0,1);gr.addColorStop(0,rgba(C.night,1));
  for(let i=0;i<=16;i++)gr.addColorStop(EL.d0+(1-EL.d0)*i/16,rgba(C.night,1-ss(i/16)));L.fillStyle=gr;L.fillRect(-3,-3,6,6);L.restore();
  const gb=L.createLinearGradient(0,645+j/S,0,600+j/S);for(let i=0;i<=8;i++)gb.addColorStop(i/8,rgba(C.night,E.ioCubic(i/8)));L.fillStyle=gb;L.fillRect(-200,-100,1400,900)}

/* 설명선 글 아래 가림(화면 좌표): 둥근 상자 + 바깥 깃털 fe px, 한 번 구움 */
const KN=new Map();
export function knock(w,h,r,fe){const k=[w,h,r,fe].join('|');let c=KN.get(k);if(c)return c;c=document.createElement('canvas');const cw=Math.ceil(w+2*fe),ch=Math.ceil(h+2*fe);c.width=cw;c.height=ch;
  const x=c.getContext('2d'),d=x.createImageData(cw,ch),a=d.data;
  for(let py=0;py<ch;py++)for(let px=0;px<cw;px++){const qx=Math.max(Math.abs(px+.5-cw/2)-(w/2-r),0),qy=Math.max(Math.abs(py+.5-ch/2)-(h/2-r),0),sd=Math.hypot(qx,qy)-r;
    const v=sd<=0?1:1-ss(clamp(sd/fe));const i=(py*cw+px)*4;a[i]=a[i+1]=a[i+2]=0;a[i+3]=Math.round(255*v)}
  x.putImageData(d,0,0);KN.set(k,c);return c}

/* 경로: 지도 좌표 2차 곡선 → 호 길이 표 */
const NS=96;
export const RT=ROUTES.map(r=>{const pts=[],L=[0];for(let i=0;i<=NS;i++){const t=i/NS,u=1-t;pts.push([u*u*r.p0[0]+2*u*t*r.c[0]+t*t*B[0],u*u*r.p0[1]+2*u*t*r.c[1]+t*t*B[1]]);
  if(i)L.push(L[i-1]+Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]))}return {...r,pts,L,len:L[NS]}});
/* 호 길이 비율 p까지의 화면 점들(끝 = 머리) */
export function partial(r,T,p){const tl=r.len*clamp(p),out=[T.pt(r.pts[0])];for(let i=1;i<=NS;i++){if(r.L[i]<=tl){out.push(T.pt(r.pts[i]));continue}
  const u=(tl-r.L[i-1])/(r.L[i]-r.L[i-1]||1);out.push(T.pt([lerp(r.pts[i-1][0],r.pts[i][0],u),lerp(r.pts[i-1][1],r.pts[i][1],u)]));break}return out}
export function stroke(g,pts,lw,style){if(pts.length<2)return;g.beginPath();g.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)g.lineTo(pts[i][0],pts[i][1]);g.lineWidth=lw;g.strokeStyle=style;g.stroke()}
/* 폴리라인 끝에서 뒤로 len px */
export function tail(pts,len){const out=[pts[pts.length-1]];let acc=0;for(let i=pts.length-1;i>0;i--){const a=pts[i],b=pts[i-1],d=Math.hypot(a[0]-b[0],a[1]-b[1]);
  if(acc+d>=len){const u=(len-acc)/(d||1);out.push([lerp(a[0],b[0],u),lerp(a[1],b[1],u)]);break}acc+=d;out.push(b)}return out.reverse()}

/* 검사용 상자(엔진 box와 같은 형식) — 층에 그리거나 엔진이 기록하지 않는 글. ink [위, 높이]: 큰 숫자는 실제 잉크 상자 */
export function pushBox(g,id,s,o,x,y,w,a,tier,ink=null){const Bx=window.__boxes;if(!Bx||a<=.02)return;const t=g.getTransform(),Y=ink?ink[0]:y-o.size*.8;
  Bx.push({id,s,size:o.size,tier,x:Math.round(t.a*x+t.c*Y+t.e),y:Math.round(t.b*x+t.d*Y+t.f),w:Math.round(w),h:Math.round(ink?ink[1]:o.size),f:CUR.f,a:+a.toFixed(2)})}
/* 엔진 상자 기록을 잠시 끔(층 · 겹침 그리기) */
export function quiet(fn){const B0=window.__boxes;window.__boxes=null;try{return fn()}finally{window.__boxes=B0}}

/* 디더 가림(한 번 구움): 알파 1−2δ~1 균일 잡음 — 옅은 기울기 채움(육지 .05)이 8비트에서 띠지지 않게. 평균 1−δ */
export const DITH=.12;let DC=null;
export function dither(){if(DC)return DC;DC=document.createElement('canvas');DC.width=W;DC.height=H;const x=DC.getContext('2d'),d=x.createImageData(W,H),a=d.data;
  for(let i=0;i<W*H;i++){a[i*4+3]=Math.round(255*(1-2*DITH*hash(i,77)))}x.putImageData(d,0,0);return DC}

/* ── 표본 안 나눔: 빠른 움직임을 표본 사이까지 메움(N=8에서 겹상 방지). v px/f → 간격 sp px 이하가 되게 M(≤8)번, 각 1/M을 더하기 합성 층에 ── */
export function smear(g,f,v,draw,sp=1.2){const h=stepH(f),M=clamp(Math.ceil(v*h/sp),1,8);if(M<2){draw(g,f);return}
  const L=layer('s4sm');L.globalCompositeOperation='lighter';
  for(let i=0;i<M;i++){L.globalAlpha=g.globalAlpha/M;if(i)quiet(()=>draw(L,f+((i+.5)/M-.5)*h));else draw(L,f+((i+.5)/M-.5)*h)}
  g.save();g.globalAlpha=1;g.drawImage(L.canvas,0,0);g.restore()}
/* 글자 n개 · 예산 budget인 퇴장의 가장 빠른 글자 속도(표본 간격 할선, px/f) */
export function outV(n,f,f0,dur,budget,D,ease=E.accel){const h=stepH(f);let v=0;
  for(let k=0;k<n;k++){const st=f0+(n>1?budget*k/(n-1):0),e=ff=>ease(clamp((ff-st)/dur));v=Math.max(v,Math.abs(e(f+h/2)-e(f-h/2))*D/h)}return v}

/* ── 글자별 그리기(가림은 화면 좌표 고정) — 엔진 textEach는 clip이 dx·dy와 함께 움직여 lineIn/lineOut 띠가 가리지 못함(engine_requests) ── */
function setF(g,o){g.font=font(o.size,o.weight||300);g.letterSpacing=((o.track||0)*o.size).toFixed(2)+'px';g.textBaseline='alphabetic';g.textAlign='left'}
export function tEach(g,s,x,y,o,each){const G=glyphs(g,s,o),n=G.list.length,ax=o.align==='center'?x-G.w/2:o.align==='right'?x-G.w:x;let vis=0;
  G.list.forEach((q,k)=>{const r=each(q,k,n)||{},a=(o.alpha??1)*(r.alpha??1);if(a<=.001)return;vis=Math.max(vis,a);
    g.save();if(r.clip){g.beginPath();g.rect(r.clip[0],r.clip[1],r.clip[2],r.clip[3]);g.clip()}g.globalAlpha*=a;g.fillStyle=r.color||o.color||C.cream;setF(g,o);
    g.fillText(q.ch,ax+q.x+(r.dx||0),y+(r.dy||0));g.restore()});
  if(o.id)pushBox(g,o.id,s,o,ax,y,G.w,vis*g.globalAlpha,o.tier||2);return G.w}
const band=(y,o)=>{const cap=o.size*.92;return [y-cap*1.12,y+o.size*.3]};
/* 글줄 등장 · 퇴장(엔진 lineIn/lineOut과 같은 시간 규칙: 글자 k는 f0+budget·k/(n−1)에 시작) */
export function lin(g,s,x,y,o,f,f0,{dur=16,budget=10,dir='up',mask=null,dist=1.05,ease=E.snap}={}){if(f<f0||!s)return 0;const [m0,m1]=mask||band(y,o),sg=dir==='down'?-1:1;
  return tEach(g,s,x,y,o,(q,k,n)=>{const t=clamp((f-f0-(n>1?budget*k/(n-1):0))/dur);if(t<=0)return {alpha:0};return {dy:sg*(1-ease(t))*o.size*dist,clip:[0,m0,W,m1-m0]}})}
export function lout(g,s,x,y,o,f,f0,{dur=8,budget=4,dir='up',mask=null,dist=1.05,ease=E.accel,fade=false}={}){if(!s)return 0;const [m0,m1]=mask||band(y,o),sg=dir==='down'?1:-1;
  return tEach(g,s,x,y,o,(q,k,n)=>{const dc=o.dot&&q.ch==='·'?o.dot:undefined;if(f<f0)return {color:dc};const t=clamp((f-f0-(n>1?budget*k/(n-1):0))/dur);if(t>=1)return {alpha:0};return {dy:sg*ease(t)*o.size*dist,alpha:fade?1-t:1,clip:[0,m0,W,m1-m0],color:dc}})}   /* 옅어짐은 선형 — E.accel이 느리게 떠날 때부터 흐려짐 · o.dot: 가운뎃점 색(라벨) */
export {band};
