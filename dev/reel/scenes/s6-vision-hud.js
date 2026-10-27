/* 쇼릴 s6-vision 보조 — 격납고 계기(드론 · 로버 · 스캔선 · 조준 · 십자선) · 비전 액자 괄호 · 글 가림막 · 표본 더 나누기
   모든 값은 f(실수)만으로 정해진다. 드론 · 로버 경로는 기체 좌표(m)에서 짜고 GL.project로 화면에 옮긴다 */
import {C,E,seg,lerp,clamp,loglerp,fract,rgba,glowLine,rng,layer,LANG} from '../engine.js';
import {blurAt} from '../blur.js';
import {RET,FRAME,FUT_COL} from '../shared.js';
/* 결함 위치: 좌현 바깥 플랩 위(RET.x 그대로, y는 실제 날개 시위 가운데 — RET.y 620은 뒷전 뒤 바닥이라 옮김) */
export const RT={x:RET.x,y:560,box:RET.box};

/* ── 드론 4대: 잔디깎기 경로(기체 좌표 m) — 폭 방향 직선 + 10f 반원 회전, 0.47 m/f ── */
const SPD=.47,TURN=10,RHO=SPD*TURN/Math.PI;          /* 반원 반지름 ≈1.5 m → 줄 간격 3 m */
const R0=rng(0x1A1);
/* X: 앞(+) · Z: 우현(+) — 기체 중심 기준. za→zb로 첫 줄, 줄마다 뒤로(−X) 3 m */
export const DRONES=[
  {x0:19.5,za:-3.6,zb:4.4,s0:0,f0:614},             /* 기수 */
  {x0:3.5,za:17.5,zb:8.5,s0:0,f0:614.7},             /* 우현 안쪽 날개 */
  {x0:.2,za:-17,zb:-9,s0:0,f0:615.3},                /* 좌현 날개(조준 안쪽) */
  {x0:-21.5,za:10.5,zb:3.5,s0:0,f0:616},             /* 우현 수평꼬리 */
].map(d=>({...d,s0:R0()*2.2,ph:R0()}));
/* 경로 위 거리 s → [X, Z, 진행 방향(화면 라디안, 0 = 오른쪽)] */
function lawn(d,s){const L=Math.abs(d.zb-d.za),T=Math.PI*RHO,per=L+T;const n=Math.floor(s/per),u=s-n*per,dir=(n%2?-1:1)*Math.sign(d.zb-d.za);
  const x=d.x0-n*2*RHO,zs=n%2?d.zb:d.za,ze=n%2?d.za:d.zb;
  if(u<L)return [x,zs+dir*u,dir>0?0:Math.PI];
  const a=(u-L)/RHO;const zc=ze,xc=x-RHO;             /* 반원: 끝점에서 뒤로 돌아 다음 줄로 */
  return [xc+RHO*Math.cos(a),zc+dir*RHO*Math.sin(a),dir>0?a:Math.PI-a]}
/* 화면 진행 방향: 기수 위(화면 −y) · 우현 오른쪽(화면 +x) — 폭 방향 직선은 좌우, 반원은 아래로 돎 */
export function dronePose(d,f){const s=d.s0+SPD*Math.max(0,f-d.f0);const [x,z,h]=lawn(d,s);return {x,z,h}}

/* 드론 한 대: 스프라이트(최대 64px) + 90px 탐지 사각(1px 크림 α.45) + 20f 주기 훑는 막대 */
export function drawDrone(g,spr,X,Y,h,p,a,f,ph){if(a<=.003)return;const k=.6+.4*E.outBack(clamp(p),1.3);g.save();g.globalAlpha*=a;
  const s=90*k,x0=X-s/2,y0=Y-s/2;
  g.strokeStyle=rgba(C.cream,.45);g.lineWidth=1;g.strokeRect(x0+.5,y0+.5,s-1,s-1);
  const u=fract((f-600)/20+ph),by=y0+s*u;                              /* 훑는 막대: 위 → 아래 */
  const gr=g.createLinearGradient(0,by-18*k,0,by);gr.addColorStop(0,rgba(C.cream,0));gr.addColorStop(1,rgba(C.cream,.10));
  g.save();g.beginPath();g.rect(x0,y0,s,s);g.clip();g.fillStyle=gr;g.fillRect(x0,by-18*k,s,18*k);g.fillStyle=rgba(C.cream,.5);g.fillRect(x0,by-.5,s,1);g.restore();
  const sw=64*k*spr.width/Math.max(spr.width,spr.height),sh=64*k*spr.height/Math.max(spr.width,spr.height);
  g.translate(X,Y);g.rotate(h);g.drawImage(spr,-sw/2,-sh/2,sw,sh);g.restore()}

/* ── 로버 2대: 날개 뒷전 뒤 · 동체 옆 바닥(기체 층 아래에 그려 가려지면 가려짐), 40px · α.45, 1px 점선 상자(크림 α.4)
   드론 탐지 사각과 618–650 내내 45px 넘게 떨어짐(GL.project로 잼) ── */
/* 좌현 로버는 동체 쪽으로 들어가며 움직임(잰 값: 영문 'defect detection'과 70px · 국문 102px · 드론 사각 45px) — 바깥으로 옮기면 표지 쪽이라 더 가까워짐 */
export const ROVERS=[{x:-11.5,z0:-5.4,z1:-4.6},{x:-11,z0:7.2,z1:9.6}];
export function drawRover(g,spr,X,Y,a){if(a<=.003)return;g.save();g.globalAlpha*=a;
  const sw=40,sh=40*spr.height/spr.width;g.globalAlpha*=.45;g.drawImage(spr,X-sw/2,Y-sh/2,sw,sh);g.globalAlpha/=.45;
  g.strokeStyle=rgba(C.cream,.4);g.lineWidth=1;g.setLineDash([4,4]);g.strokeRect(Math.round(X-30)+.5,Math.round(Y-30)+.5,60,60);g.restore()}

/* ── 스캔선: x 800→1640(616–648, 등속) · 2px 금색 심 + 빛 + 훑은 쪽 눈금 + 60px 크림 α.06 꼬리
   위(y 60) · 아래(y 960) 끝 72px는 1px 띠마다 투명도를 낮춰 양쪽 같이 부드럽게 사라짐(더하기 빛은 그대로 더하기)
   아래끝은 s5 기록 줄 위(FUT_COL.y0)에 머물다가 글 기둥 오른끝(x1)을 지나며 60px에 걸쳐 960까지 자람 — 글을 긋지 않음 ── */
const SC={y0:60,y1:960,fd:72};
export function scanLine(g,f){if(f<616||f>=648)return;const x=lerp(800,1640,seg(f,616,648));const op=seg(f,616,619)*(1-E.accel(seg(f,643,648)));if(op<=.003)return;
  const FC=FUT_COL[LANG]||FUT_COL.ko,y1=Math.round(lerp(FC.y0,SC.y1,smooth01((x-FC.x1)/60)));
  const ya=SC.y0+SC.fd,yb=y1-SC.fd,k=y=>smooth01((y+.5-SC.y0)/SC.fd)*(1-smooth01((y+.5-yb)/SC.fd));
  const trail=(y0,h,a)=>{const gr=g.createLinearGradient(x-60,0,x,0);gr.addColorStop(0,rgba(C.cream,0));gr.addColorStop(1,rgba(C.cream,.06*a));g.fillStyle=gr;g.fillRect(x-60,y0,60,h)};
  const ends=fn=>{for(let y=SC.y0;y<ya;y++)fn(y);for(let y=yb;y<y1;y++)fn(y)};
  g.save();g.globalAlpha*=op;trail(ya,yb-ya,1);ends(y=>trail(y,1,k(y)));g.restore();
  glowLine(g,x,{op,y0:ya,y1:yb,ticks:0});ends(y=>glowLine(g,x,{op:op*k(y),y0:y,y1:y+1,ticks:0}));
  /* 눈금: 40px 간격(y 60부터) — 끝 구간은 같은 비율로 옅어짐 */
  g.save();g.fillStyle=rgba(C.cream,.5);for(let y=SC.y0;y<=y1;y+=40){g.globalAlpha=op*k(y);g.fillRect(Math.round(x-3)-6,y,6,1)}g.restore()}
const smooth01=t=>{t=clamp(t);return t*t*(3-2*t)};

/* ── 조준(1 mm): 괄호 150→56px(624–636, E.snap — 630에 97%) · 2px 금색 · 팔 22px, 가운데 결함점 ── */
export const RBOX=(f)=>loglerp(150,56,E.snap(seg(f,624,636)));
/* 괄호: 사각(x0,y0)–(x1,y1) 안쪽에 굵기 lw 팔 a — fillRect(화소 격자에 맞음) */
export function brk(g,x0,y0,x1,y1,a,lw,color,alpha){if(alpha<=.003)return;g.save();g.globalAlpha*=alpha;g.fillStyle=color;
  const w=x1-x0,h=y1-y0;a=Math.min(a,w/2,h/2);
  const v=a-lw;   /* 세로 팔은 가로 팔 두께만큼 비켜 모서리 화소를 두 번 칠하지 않음 */
  g.fillRect(x0,y0,a,lw);g.fillRect(x0,y0+lw,lw,v);g.fillRect(x1-a,y0,a,lw);g.fillRect(x1-lw,y0+lw,lw,v);
  g.fillRect(x0,y1-lw,a,lw);g.fillRect(x0,y1-a,lw,v);g.fillRect(x1-a,y1-lw,a,lw);g.fillRect(x1-lw,y1-a,lw,v);g.restore()}
/* 조준 사각 → 액자 사각: 축마다 고정점 둘레 배율 k — 제곱근 공간 보간(로그와 선형 사이: 작은 상자는 확대처럼 · 큰 상자는 속도 제한).
   E.ioQuad 645–659: 가장자리 최고 속도 ≈122 px/f(로그 + ioQuint는 ≈300) */
const R0B=[RT.x-RT.box/2,RT.y-RT.box/2,RT.x+RT.box/2,RT.y+RT.box/2],R1B=[FRAME.x0,FRAME.y0,FRAME.x1,FRAME.y1];
function axis(l0,r0,l1,r1,e){const s=(r1-l1)/(r0-l0),p=(l1-l0*s)/(1-s),k=(1+(Math.sqrt(s)-1)*e)**2;return [p+(l0-p)*k,p+(r0-p)*k]}
export function frameRect(e){if(e>=1)return R1B.slice();const [x0,x1]=axis(R0B[0],R0B[2],R1B[0],R1B[2],e),[y0,y1]=axis(R0B[1],R0B[3],R1B[1],R1B[3],e);return [x0,y0,x1,y1]}
export const FR_T=[645,659];

/* 조준 괄호 · 액자(624–718) — 645–659 조준 사각이 액자로, 팔 22→48, 2px 금색 → 1px 크림 α.7(빠른 구간 e .15–.45에서 바뀜:
   번진 획이 옅고 중성색이라 색 바뀜이 움직임에 묻힘). 624–647: 금색 아래 4px 밤색 α.35 테(흰 날개 위 대비) */
export function reticle(g,f){
  if(f<624||f>=718)return;
  const kl=seg(f,624,627)*(1-smooth01(seg(f,644,647)));   /* 테는 벌어지기 전에 사라짐(흰 날개 위 어두운 번짐 없음) */
  if(f<645){const b=RBOX(f),a=seg(f,624,627);const x0=RT.x-b/2,y0=RT.y-b/2;
    brk(g,x0-1,y0-1,x0+b+1,y0+b+1,24,4,C.night,.35*kl);brk(g,x0,y0,x0+b,y0+b,22,2,C.goldHi,a);return}
  const e=E.ioQuad(seg(f,FR_T[0],FR_T[1]));const [x0,y0,x1,y1]=frameRect(e);const arm=lerp(22,FRAME.arm,e);
  const fo=1-E.inCubic(seg(f,708,718)),xf=smooth01(seg(e,.15,.45));
  if(kl>.003)brk(g,x0-1,y0-1,x1+1,y1+1,arm+2,4,C.night,.35*kl);
  brk(g,x0,y0,x1,y1,arm,2,C.goldHi,(1-xf)*fo);
  if(xf>0)brk(g,x0,y0,x1,y1,arm,1,C.cream,.7*xf*fo);
}
/* 결함점(4px 금색): 스캔선이 지나는 622에 나타남 · 645–649 사라짐 */
export function defectDot(g,f){if(f<622||f>=650)return;const p=E.outBack(seg(f,622,628),1.6),a=seg(f,622,624)*(1-E.accel(seg(f,645,649)));if(a<=.003)return;
  const s=4*p;g.save();g.globalAlpha*=a;g.fillStyle=C.goldHi;g.fillRect(RT.x-s/2,RT.y-s/2,s,s);g.restore()}

/* 십자선: 626–636 괄호에서 밖으로(E.snap) · 645–651 되감김(E.accel), 1px 크림 α.25, 끝 60px는 흐려짐 — 왼쪽 · 위 · 오른쪽(아래는 표지 지시선) */
export function crosshair(g,f,len=180){if(f<626||f>=651)return;const out=E.snap(seg(f,626,636)),back=E.accel(seg(f,645,651));const k=out*(1-back);if(k<=.002)return;
  const b=RBOX(f)/2+8,L=len*k,fd=Math.min(60,L);g.save();
  const arm=(dx,dy)=>{const x0=RT.x+dx*b,y0=RT.y+dy*b,x1=x0+dx*L,y1=y0+dy*L;const gr=g.createLinearGradient(x0,y0,x1,y1);
    gr.addColorStop(0,rgba(C.cream,.25));gr.addColorStop(clamp(1-fd/Math.max(L,1)),rgba(C.cream,.25));gr.addColorStop(1,rgba(C.cream,0));g.fillStyle=gr;
    if(dy===0)g.fillRect(Math.min(x0,x1),RT.y,Math.abs(x1-x0),1);else g.fillRect(RT.x,Math.min(y0,y1),1,Math.abs(y1-y0))};
  arm(-1,0);arm(0,-1);arm(1,0);g.restore()}

/* 글 가림막: 밤색 부드러운 타원 두 개(왼쪽 아래 제목 · 오른쪽 삼각 칸) — 밤 바닥 위에선 보이지 않고, 밑을 지나는 기체만 어둡게 함.
   최종 자세의 기체(오른쪽 위)에는 닿지 않게 범위를 둠 */
function softEll(g,cx,cy,rx,ry,a){const gr=g.createRadialGradient(0,0,0,0,0,1);
  [[0,1],[.35,.92],[.6,.62],[.8,.26],[.93,.06],[1,0]].forEach(([t,k])=>gr.addColorStop(t,rgba(C.night,a*k)));
  g.save();g.translate(cx,cy);g.scale(rx,ry);g.fillStyle=gr;g.fillRect(-1,-1,2,2);g.restore()}
export function scrim(g,a){if(a<=.003)return;g.save();g.globalAlpha*=a;
  softEll(g,520,790,760,300,.62);softEll(g,1460,800,560,250,.74);g.restore()}

/* 빠른 움직임의 계단 무늬 막기: 엔진 표본 하나의 시간 조각(셔터/n)을 K번 더 나눠 층에 같은 무게로 더함(정지한 것은 그대로) */
export function subBlur(g,f,fn,K=4){if(window.__boxes){fn(g,f);return}const b=blurAt(f),d=b.shutter/b.n;const L=layer('s6sub');L.globalCompositeOperation='lighter';
  for(let k=0;k<K;k++){L.save();L.globalAlpha=1/K;fn(L,f+((k+.5)/K-.5)*d);L.restore()}g.drawImage(L.canvas,0,0)}
/* 같은 일을 선형광으로(구역 R=[x,y,w,h]만): 표본마다 브라우저처럼 sRGB로 겹쳐 → 선형광으로 더해 평균 → sRGB로 되돌려 넣음.
   엔진 표본끼리는 acc.js가 선형광으로 평균하므로, 안쪽 표본을 sRGB로 더하면 엔진 표본 간격마다 밝기 물결(줄무늬)이 생김 */
const LIN=new Float32Array(4081),ENC=new Uint8ClampedArray(16384);
for(let i=0;i<4081;i++){const c=i/4080;LIN[i]=c<=.04045?c/12.92:((c+.055)/1.055)**2.4}
for(let i=0;i<16384;i++){const v=i/16383;ENC[i]=Math.round(255*(v<=.0031308?v*12.92:1.055*v**(1/2.4)-.055))}
let SBC=null;
export function subBlurLin(g,f,fn,K,R){if(window.__boxes){fn(g,f);return}
  const [x0,y0,w,h]=R,b=blurAt(f),d=b.shutter/b.n,N=w*h;
  if(!SBC||SBC.width!==w||SBC.height!==h){SBC=document.createElement('canvas');SBC.width=w;SBC.height=h}
  const L=SBC.getContext('2d',{willReadFrequently:true}),bg=g.getImageData(x0,y0,w,h),B=bg.data,acc=new Float32Array(N*3),BL=new Float32Array(N*3);
  for(let i=0,j=0;i<N*4;i+=4,j+=3){BL[j]=LIN[B[i]*16];BL[j+1]=LIN[B[i+1]*16];BL[j+2]=LIN[B[i+2]*16]}
  for(let k=0;k<K;k++){L.setTransform(1,0,0,1,0,0);L.globalAlpha=1;L.globalCompositeOperation='source-over';L.clearRect(0,0,w,h);L.translate(-x0,-y0);
    fn(L,f+((k+.5)/K-.5)*d);const D=L.getImageData(0,0,w,h).data;
    for(let i=0,j=0;i<N*4;i+=4,j+=3){const A=D[i+3];if(!A){acc[j]+=BL[j];acc[j+1]+=BL[j+1];acc[j+2]+=BL[j+2];continue}const a=A/255,q=1-a;
      acc[j]+=LIN[Math.round((D[i]*a+B[i]*q)*16)];acc[j+1]+=LIN[Math.round((D[i+1]*a+B[i+1]*q)*16)];acc[j+2]+=LIN[Math.round((D[i+2]*a+B[i+2]*q)*16)]}}
  const s=16383/K;for(let i=0,j=0;i<N*4;i+=4,j+=3){B[i]=ENC[Math.round(acc[j]*s)];B[i+1]=ENC[Math.round(acc[j+1]*s)];B[i+2]=ENC[Math.round(acc[j+2]*s)]}
  g.putImageData(bg,x0,y0)}
