/* s4-mro 지도 층 더하기: 경위선(바다만 · 느린 시차) · 혜성(금색 머리 · 부드러운 빛 · 크림 꼬리) · 기지 점(튀어나옴 · 고리 · 한 번 숨) · 머무름 맥(부산으로 흐름) */
import {C,E,seg,clamp,lerp,rgba,layer,TAU,W,H} from '../engine.js';
import {MAP} from '../shared.js';
import {land} from '../kit.js';
import {B,xf,RT,partial,stroke,tail,knock,landMask} from './s4-mro-kit.js';

/* ── 경위선: 지도는 등장방형 — 경도 1° = 9.63, 위도 1° = 12.52 지도 단위(부산 129.0E 35.1N, 오산 · 미사와 · 가데나 · 하와이 · 아일슨으로 맞춤)
   5° 간격(130E · 35N 기준), 10°는 바탕 층 · 5°는 확대되며 들어옴. 시차 λ: 배율 S0·(S/S0)^λ, 자리는 시작 닻에서 λ만큼 — 땅보다 조금 느려 한 층 아래로 읽힘 ── */
const GX=9.63*5,GY=12.52*5,G0=[124.4+9.63,412+.1*12.52],LAM=.86;
const S0=xf(414).S,A0=[MAP.a0[0],MAP.a0[1]+320];
const md2=k=>((k%2)+2)%2;
export function gxf(T){return {Sg:S0*Math.pow(T.S/S0,LAM),ax:A0[0]+LAM*(T.ax-A0[0]),ay:A0[1]+LAM*(T.ay-A0[1])}}
/* 바다 경위선(층): 선 → 땅 걷어 냄 → 화면 타원 깃털 · 왼쪽 아래 글 묶음 쪽은 옅게 → 합성 α a
   — 휩(414–418) 동안 자오선이 세로 줄무늬로 번지지 않게 지도보다 늦게 417–423에 따로 들어옴(418 α .06 · 420 .5 · 422 .94) */
export function graticule(g,f,T,a){a*=E.ioQuad(seg(f,417,423));if(a<=0)return;const G=gxf(T),L=layer('s4grid');
  L.translate(G.ax,G.ay);L.rotate(T.r);L.scale(G.Sg,G.Sg*T.sy);L.translate(-B[0],-B[1]);
  const M=L.getTransform(),Mi=M.inverse();let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;
  for(const [px,py] of [[0,0],[W,0],[0,H],[W,H]]){const q=Mi.transformPoint({x:px,y:py});x0=Math.min(x0,q.x);x1=Math.max(x1,q.x);y0=Math.min(y0,q.y);y1=Math.max(y1,q.y)}
  const kx0=Math.floor((x0-G0[0])/GX),kx1=Math.ceil((x1-G0[0])/GX),ky0=Math.floor((y0-G0[1])/GY),ky1=Math.ceil((y1-G0[1])/GY);
  const lod=E.ioQuad(seg(G.Sg,1.5,2.4));
  /* 10°: 경도 k 짝수(130E · 140E …) · 위도 k 홀수(40N · 30N …) */
  const lines=(major,al)=>{L.beginPath();for(let k=kx0;k<=kx1;k++){if((md2(k)===0)!==major)continue;const x=G0[0]+k*GX;L.moveTo(x,y0);L.lineTo(x,y1)}
    for(let k=ky0;k<=ky1;k++){if((md2(k)===1)!==major)continue;const y=G0[1]+k*GY;L.moveTo(x0,y);L.lineTo(x1,y)}
    L.lineWidth=1/G.Sg;L.strokeStyle=rgba(C.cream,al);L.stroke()};
  lines(true,.07);if(lod>0)lines(false,.05*lod);
  /* 10° 교차점 십자(화면 5px 팔) */
  L.setTransform(1,0,0,1,0,0);L.beginPath();
  for(let i=kx0;i<=kx1;i++){if(md2(i))continue;for(let j=ky0;j<=ky1;j++){if(!md2(j))continue;const q=M.transformPoint({x:G0[0]+i*GX,y:G0[1]+j*GY});
    if(q.x<-8||q.x>W+8||q.y<-8||q.y>H+8)continue;L.moveTo(q.x-5,q.y);L.lineTo(q.x+5,q.y);L.moveTo(q.x,q.y-5);L.lineTo(q.x,q.y+5)}}
  L.lineWidth=1;L.strokeStyle=rgba(C.cream,.24);L.stroke();
  /* 땅 위는 걷어 냄(바다만) — 땅과 같은 타원 깃털(landMask)을 거친 가림이라 땅이 흐려지는 곳에서는 격자도 다시 살아남(보이지 않는 해안에서 선이 끊기지 않게) */
  const K=layer('s4gcut');K.translate(T.ax,T.ay);K.rotate(T.r);K.scale(T.S,T.S*T.sy);K.translate(-B[0],-B[1]);K.fillStyle=C.night;K.fill(land());landMask(K,T.S,0);
  L.setTransform(1,0,0,1,0,0);L.globalCompositeOperation='destination-out';L.drawImage(K.canvas,0,0);
  L.globalCompositeOperation='destination-in';
  /* 화면 타원 깃털(중심 1180,460) — 가장자리로 사라짐 */
  L.save();L.translate(1180,460);L.scale(1240,800);const rg=L.createRadialGradient(0,0,0,0,0,1);[[0,1],[.5,1],[.8,.45],[1,0]].forEach(([t,v])=>rg.addColorStop(t,rgba(C.night,v)));
  L.fillStyle=rg;L.fillRect(-2,-2,4,4);L.restore();
  /* 왼쪽 아래 글 묶음 뒤는 글이 들어오며 걷힘(둥근 상자 깃털 140, .7) — 489–499에 마저 걷어 s5 글줄 뒤를 비움 */
  const tk=.7*E.ioCubic(seg(f,424,446))+.3*E.ioCubic(seg(f,489,499));if(tk>0){L.globalCompositeOperation='destination-out';L.globalAlpha=tk;L.drawImage(knock(1000,470,60,140),60-140,530-140);L.globalAlpha=1}
  g.save();g.globalAlpha=a;g.drawImage(L.canvas,0,0);g.restore()}

/* ── 혜성: 2px 꼬리 54px(크림 → 금색 머리) + 머리 점 r2.5 + 부드러운 빛 r14(금색 α .34, 보통 합성 — 팔레트 섞임 안) · k(0~1)로 자라고 줄어듦 ── */
export function comet(g,pts,k){if(k<=0)return;const tp=tail(pts,54*k),h=tp[tp.length-1],t0=tp[0];
  const R=14*(.4+.6*k),rg=g.createRadialGradient(h[0],h[1],0,h[0],h[1],R);rg.addColorStop(0,rgba(C.goldHi,.34*k));rg.addColorStop(.35,rgba(C.goldHi,.14*k));rg.addColorStop(1,rgba(C.goldHi,0));
  g.fillStyle=rg;g.fillRect(h[0]-R,h[1]-R,2*R,2*R);
  if(tp.length>1){const gr=g.createLinearGradient(t0[0],t0[1],h[0],h[1]);gr.addColorStop(0,rgba(C.cream,0));gr.addColorStop(.55,rgba(C.cream,.5));gr.addColorStop(1,rgba(C.goldHi,1));g.lineCap='round';stroke(g,tp,2,gr)}
  g.beginPath();g.arc(h[0],h[1],1+1.5*k,0,TAU);g.fillStyle=C.goldHi;g.fill()}

/* ── 머무름 맥(457–486): 경로마다 한 줄기씩 부산으로 — 긴 경로는 끝 sp만(먼 기지는 화면 밖에서 들어옴)
   금색 머리 r2 + 빛 r10(α .26) + 꼬리 64px(크림 → 금색), 떠날 때 3f · 도착 전 4f에 옅어짐(점에 흡수) ── */
/* 맥이 닿을 때 본부 점이 받음: 도착마다 따로 작은 틱(합 아닌 최대, 지름 +1.4px 이하 = 9.4px — 450 튀어나옴 12px보다 훨씬 작음)
   도착 −1 → +5f 사인 · 492에 모두 끝나 495 경계 8px 그대로 */
export const hqRecv=f=>1.4*Math.max(0,...PU.map(P=>Math.sin(Math.PI*seg(f,P.d1-1,P.d1+5))));
export const PU=[{d0:474,d1:487,sp:1},{d0:471,d1:481,sp:1},{d0:464,d1:484,sp:1},{d0:459,d1:475,sp:1},{d0:463,d1:478,sp:.3},{d0:457,d1:472,sp:.24}];   /* 한 번에 3–4줄기 · 도착 3f 간격 472–487 */
export function pulses(g,f,T,a){if(a<=0)return;g.lineCap='round';
  for(const r of RT){const P=PU[r.k],u=seg(f,P.d0,P.d1);if(u<=0||u>=1)continue;const p=lerp(1-P.sp,1,E.ioQuad(u)),pts=partial(r,T,p);
    const al=a*seg(f,P.d0,P.d0+3)*(1-seg(f,P.d1-4,P.d1));if(al<=0||pts.length<2)continue;const tp=tail(pts,64),h=tp[tp.length-1],t0=tp[0];
    const rg=g.createRadialGradient(h[0],h[1],0,h[0],h[1],10);rg.addColorStop(0,rgba(C.goldHi,.26*al));rg.addColorStop(1,rgba(C.goldHi,0));g.fillStyle=rg;g.fillRect(h[0]-10,h[1]-10,20,20);
    if(tp.length>1){const gr=g.createLinearGradient(t0[0],t0[1],h[0],h[1]);gr.addColorStop(0,rgba(C.cream,0));gr.addColorStop(.6,rgba(C.cream,.4*al));gr.addColorStop(1,rgba(C.goldHi,.9*al));stroke(g,tp,2,gr)}
    g.beginPath();g.arc(h[0],h[1],2,0,TAU);g.fillStyle=rgba(C.goldHi,al);g.fill()}}

/* ── 기지 점: 등장에 튀어나옴(outBack, r 3) · 경로 출발에 고리(3→22px, 16f) · 맥이 떠날 때 한 번 숨(r ×1.45, 고리 3→16px) ── */
const ring=(g,o,t,R,al)=>{if(t<=0||t>=1)return;g.beginPath();g.arc(o[0],o[1],3+(R-3)*E.outCubic(t),0,TAU);g.lineWidth=1;g.strokeStyle=rgba(C.cream,al*(1-t));g.stroke()};
export function bases(g,f,T){for(const r of RT){const b0=Math.min(r.f0,428),p=seg(f,b0,b0+8);if(p<=0)continue;const o=T.pt(r.p0),P=PU[r.k];
  if(o[0]<-40||o[0]>W+40||o[1]<-40||o[1]>H+40)continue;
  const br=Math.sin(Math.PI*seg(f,P.d0-3,P.d0+9));
  g.beginPath();g.arc(o[0],o[1],3*E.outBack(p,2.2)*(1+.45*br),0,TAU);g.fillStyle=rgba(C.cream,.85*clamp(p*2));g.fill();
  ring(g,o,seg(f,r.f0,r.f0+16),22,.6);if(P.sp===1)ring(g,o,seg(f,P.d0-3,P.d0+13),16,.4)}}
