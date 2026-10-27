/* 쇼릴 s5-future — 공용 도우미(순수): 햇빛 쪽 기울기 lit · 층 왼쪽 사라짐 fadeLeft · 경로 · 세계 원근(땅 · 구름 판)
   세계: c=0 카메라(높이 1 · 초점 FL · 지평선 HY · 소실점 VX). 판 높이 A의 점 (X, Z) → c=0 화면 → 지금(c): 표면 틀(가장자리를 따라 휨) */
import {C,seg,lerp,clamp,smooth,rgba,W,H,LANG} from '../engine.js';
import {FUT_COL} from '../shared.js';

export const NS=64,FL=500,HY=300,VX=1216;
/* 햇빛 쪽(오른쪽)만 밝은 가장자리: 궤도에 오르면(c .8→1) 어둠 경계가 오른쪽으로 물러남(420/1150 → 620/1250) */
export const RX=c=>{const s=smooth(seg(c,.8,1));return [lerp(420,620,s),lerp(1150,1250,s)]};
export const kLit=c=>smooth(seg(c,.3,.85));
export function lit(g,color,a,k,c){const gr=g.createLinearGradient(0,0,W,0),[x0,x1]=RX(c);
  for(let i=0;i<=NS;i++){const r=smooth(clamp((i/NS*W-x0)/(x1-x0)));gr.addColorStop(i/NS,rgba(color,a*lerp(1,r,k)))}return gr}
/* 층을 왼쪽으로 사라지게(destination-in 가로 기울기) — x0에서 floor, x1부터 1, k로 세기 */
export function fadeLeft(L,x0,x1,k=1,floor=0){L.setTransform(1,0,0,1,0,0);L.globalCompositeOperation='destination-in';const gr=L.createLinearGradient(0,0,W,0);
  for(let i=0;i<=NS;i++){const r=smooth(clamp((i/NS*W-x0)/(x1-x0)));gr.addColorStop(i/NS,rgba(C.night,lerp(1,floor+(1-floor)*r,k)))}L.fillStyle=gr;L.fillRect(0,0,W,H);L.globalCompositeOperation='source-over'}
export function poly(g,pts){g.beginPath();pts.forEach((q,i)=>i?g.lineTo(q[0],q[1]):g.moveTo(q[0],q[1]))}
/* 카메라 높이 배율(땅 사상 gP의 세로 1+24c² · 가로 1+6c²와 같음) */
export const hC=c=>1+24*c*c,sC=c=>1+6*c*c;
/* 표면 틀: s 호 길이, alt 가장자리 위 높이 → 화면(geo.surf와 같은 식 — 순환 import를 피해 여기 둠) */
export function surfK(s,alt,L){const a=s/L.R,r=L.R+alt;return [L.cx+r*Math.sin(a),L.cy-r*Math.cos(a)]}
/* 글 기둥(기록 줄) 가림: x1+40 · y0−36 안쪽을 부드러운 가장자리(오른쪽 sx · 위 sy px)로 지움 — 층에 곱함(k 세기, floor 남는 비율). 마스크는 언어 · 가장자리마다 한 번 굽기 */
const CM=new Map();
function colCanvas(sx,sy){const key=LANG+sx+'|'+sy;if(CM.has(key))return CM.get(key);const F=FUT_COL[LANG]||FUT_COL.ko,X1=F.x1+40,Y0=F.y0-36,cv=document.createElement('canvas');cv.width=W;cv.height=H;const m=cv.getContext('2d');
  const gx=m.createLinearGradient(X1,0,X1+sx,0);for(let i=0;i<=8;i++)gx.addColorStop(i/8,rgba(C.night,1-smooth(i/8)));m.fillStyle=gx;m.fillRect(0,0,W,H);
  m.globalCompositeOperation='destination-in';const gy=m.createLinearGradient(0,Y0-sy,0,Y0);for(let i=0;i<=8;i++)gy.addColorStop(i/8,rgba(C.night,smooth(i/8)));m.fillStyle=gy;m.fillRect(0,0,W,H);
  CM.set(key,cv);return cv}
export function colMask(L,k=1,floor=0,sx=110,sy=50){if(k<=0)return;L.save();L.setTransform(1,0,0,1,0,0);L.globalCompositeOperation='destination-out';L.globalAlpha=k*(1-floor);L.drawImage(colCanvas(sx,sy),0,0);L.restore()}
