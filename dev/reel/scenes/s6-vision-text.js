/* 쇼릴 s6-vision 보조 — 글줄 등장 · 퇴장(가림 띠를 화면 좌표로 고정) + 글자 조각 그림
   engine lineIn/lineOut과 같은 식. 다른 점 두 가지:
   1) 엔진판은 textEach가 dy만큼 옮긴 뒤 clip을 걸어 띠가 글자와 함께 움직임(가림이 안 됨) → 여기서 띠를 먼저 건다
   2) Chrome fillText는 기준선 y를 정수 화소로 붙임(100.25 → 100, 100.5 → 101) → 블러 표본이 정수 줄에 쌓여 줄무늬.
      글자마다 한 번 구운 조각(가로 소수 위치까지 같게)을 drawImage로 소수 y에 그림(쌍선형). 멈춘 상태는 정수 위치 복사라 fillText와 같은 화소 */
import {C,E,clamp,text,textEach,glyphs,font} from '../engine.js';

const SPR=new Map();
function spr(ch,o,fx){const col=o.color||C.cream,wt=o.weight||300,k=o.size+'|'+wt+'|'+col+'|'+ch+'|'+fx;let c=SPR.get(k);if(c)return c;
  const p=Math.ceil(o.size*.5),B=p+Math.ceil(o.size*1.1);c=document.createElement('canvas');c.width=Math.ceil(o.size*1.4)+2*p;c.height=Math.ceil(o.size*1.5)+2*p;
  const x=c.getContext('2d');x.font=font(o.size,wt);x.fillStyle=col;x.textBaseline='alphabetic';x.textAlign='left';x.fillText(ch,p+fx,B);c.P=p;c.B=B;SPR.set(k,c);return c}
/* textEach와 같은 배치 · 같은 each 반환값(dy · alpha만 씀). 검사 모드(__boxes)는 엔진 textEach(상자 기록) */
function each(g,s,x,y,o,fn){if(window.__boxes)return textEach(g,s,x,y,o,fn);
  const G=glyphs(g,s,o),ax=o.align==='center'?x-G.w/2:o.align==='right'?x-G.w:x,n=G.list.length;
  G.list.forEach((q,k)=>{const r=fn(q,k,n)||{};const a=(o.alpha??1)*(r.alpha??1);if(a<=.001)return;
    const X=ax+q.x,X0=Math.floor(X),c=spr(q.ch,o,X-X0);
    g.save();g.globalAlpha*=a;g.drawImage(c,X0-c.P,y+(r.dy||0)-c.B);g.restore()});
  return G.w}
function band(y,o){const cap=o.size*.92;return [y-cap*1.12,y+o.size*.3]}
function clipped(g,m,fn){g.save();g.beginPath();g.rect(-1e5,m[0],2e5,m[1]-m[0]);g.clip();const w=fn();g.restore();return w}
export function lineIn(g,s,x,y,o,f,f0,{dur=16,budget=10,dir='up',mask=null,dist=1.05,ease=E.snap}={}){
  if(f<f0||!s)return 0;const sg=dir==='down'?-1:1;
  return clipped(g,mask||band(y,o),()=>each(g,s,x,y,o,(q,k,n)=>{const st=f0+(n>1?budget*k/(n-1):0),t=clamp((f-st)/dur);if(t<=0)return {alpha:0};return {dy:sg*(1-ease(t))*o.size*dist}}))}
/* fade: 글자 투명도 × (1 − t²) — 빠른 끝의 번짐이 옅어짐 */
export function lineOut(g,s,x,y,o,f,f0,{dur=8,budget=4,dir='up',mask=null,dist=1.05,ease=E.accel,fade=false}={}){
  if(!s)return 0;if(f<f0)return text(g,s,x,y,o);const sg=dir==='down'?1:-1;
  return clipped(g,mask||band(y,o),()=>each(g,s,x,y,o,(q,k,n)=>{const st=f0+(n>1?budget*k/(n-1):0),t=clamp((f-st)/dur);if(t>=1)return {alpha:0};return {dy:sg*ease(t)*o.size*dist,alpha:fade?1-t*t:1}}))}
