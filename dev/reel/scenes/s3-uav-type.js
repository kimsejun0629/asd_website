/* s3-uav 글 도우미 — 커닝을 지키는 글자별 등장 · 퇴장 · 잉크 기준 가림 띠 · id 달린 라벨
   (엔진 glyphs()가 앞 글자와의 커닝까지 넣도록 고쳐짐 — 아래 kern()은 엔진 x와의 차이만 더하므로 이제 0, 안전장치로 남김).
   다 들어온 뒤에는 text()로 통째 그림(같은 자리 · 검사 상자 정확) */
import {C,E,W,clamp,lerp,font,text,textEach,measure,hline,glyphs} from '../engine.js';

const KC=new Map(),DC=new Map();
/* 글자 i 보정 = [measure(앞 i+1글자) − measure(글자 i)] − 엔진 glyphs() x — 엔진이 커닝을 넣으면 0 */
function kern(g,s,o){const k=font(o.size,o.weight||300)+'|'+(o.track||0)+'|'+s;let v=KC.get(k);if(v)return v;
  const a=[...s],G=glyphs(g,s,o).list;let pre='';v=[];
  for(let i=0;i<a.length;i++){pre+=a[i];v.push(i?measure(g,pre,o)-measure(g,a[i],o)-G[i].x:0)}
  KC.set(k,v);return v}
/* 잉크 아래 끝(기준선 아래 px) */
function desc(g,s,o){const k=font(o.size,o.weight||300)+'|'+s;let v=DC.get(k);if(v!==undefined)return v;
  g.save();g.font=font(o.size,o.weight||300);g.letterSpacing='0px';v=Math.max(0,g.measureText(s).actualBoundingBoxDescent);g.restore();DC.set(k,v);return v}
/* 가림 띠: 위 = 엔진과 같음(cap×1.12) · 아래 = 잉크 끝 + 2px — 글자가 제 기준선에서 솟아오름(띠가 글자보다 한참 아래로 처지지 않게).
   ss: 같은 띠를 함께 쓰는 글들(가장 깊은 잉크로) */
export function bandOf(g,y,o,ss){const d=Math.max(...[].concat(ss).map(s=>desc(g,s,o)));return [y-o.size*.92*1.12,y+Math.ceil(d)+2]}
export function clipY(g,m){g.beginPath();g.rect(0,m[0],W,m[1]-m[0]);g.clip()}

/* text()와 같은 그림, 검사 상자만 없음 — 같은 자리에 겹쳐 섞는 두 번째 글(굵기 교차 · 색 겹침)용(검사 OVERLAP이 한 글을 둘로 세지 않게) */
export function textNB(g,s,x,y,o){if(!s)return 0;const w=measure(g,s,o),ax=o.align==='center'?x-w/2:o.align==='right'?x-w:x;
  g.save();g.globalAlpha*=o.alpha??1;g.fillStyle=o.color||C.cream;g.font=font(o.size,o.weight||300);g.letterSpacing=((o.track||0)*o.size).toFixed(2)+'px';
  g.textBaseline='alphabetic';g.textAlign='left';g.fillText(s,ax,y);g.restore();return w}

/* 글줄 등장(엔진 lineIn과 같은 시간 · 곡선 · 거리, 커닝 보정) — 가림 띠 m 안에서 */
export function lineInK(g,s,x,y,o,f,f0,m,{dur=16,budget=10,dist=1.05,ease=E.snap}={}){if(f<f0||!s)return 0;
  if(f>=f0+budget+dur)return text(g,s,x,y,o);
  const K=kern(g,s,o);g.save();clipY(g,m);
  const w=textEach(g,s,x,y,o,(q,k,n)=>{const st=f0+(n>1?budget*k/(n-1):0),t=clamp((f-st)/dur);if(t<=0)return {alpha:0};return {dx:K[k],dy:(1-ease(t))*o.size*dist}});
  g.restore();return w}
/* 글줄 퇴장(위로, 엔진 lineOut과 같음, 커닝 보정) */
export function lineOutK(g,s,x,y,o,f,f0,m,{dur=8,budget=4,dist=1.05,ease=E.accel}={}){if(!s)return 0;if(f<f0)return text(g,s,x,y,o);if(f>=f0+budget+dur)return 0;
  const K=kern(g,s,o);g.save();clipY(g,m);
  const w=textEach(g,s,x,y,o,(q,k,n)=>{const st=f0+(n>1?budget*k/(n-1):0),t=clamp((f-st)/dur);if(t>=1)return {alpha:0};return {dx:K[k],dy:-ease(t)*o.size*dist}});
  g.restore();return w}

/* 라벨 등장(엔진 trackIn · label과 같은 그림, id · tier를 넘김 — 검사 상자에 이름).
   가운뎃점 '·'은 #B5A27F(스타일 지침): 같은 글줄을 두 번 — 점 자리만 빼고 cream, 점 자리만 금(커닝 · 위치가 text()와 똑같음) */
export function trackInId(g,s,x,y,o,p){if(p<=0)return;const e=E.snap(clamp(p)),size=o.size||26,u=s.toUpperCase(),x0=x+size*2.1;
  const to={size,weight:700,track:lerp(.30,o.track??.14,e),color:o.color||C.cream,id:o.id,tier:o.tier};
  g.save();g.globalAlpha*=(o.alpha??1)*clamp(p*1.6);hline(g,x,x+size*1.5,y-size*.36,{w:2,color:C.goldHi2});
  const a=[...u],R=[],t=to.track*size,sp=measure(g,' ',to)+t;let pre='';
  for(let i=0;i<a.length;i++){if(a[i]==='·'){const xs=x0+(i?measure(g,pre,to)+t:0);R.push([xs-sp/2,xs+measure(g,'·',to)+sp/2])}pre+=a[i]}
  if(!R.length){text(g,u,x0,y,to);g.restore();return}
  const clipR=inv=>{g.beginPath();if(inv)g.rect(-1e4,-1e4,3e4,3e4);for(const [l,r] of R)g.rect(l,y-size*1.2,r-l,size*1.6);g.clip(inv?'evenodd':'nonzero')};
  g.save();clipR(true);text(g,u,x0,y,to);g.restore();
  g.save();clipR(false);textNB(g,u,x0,y,{...to,color:C.goldHi2});g.restore();
  g.restore()}
