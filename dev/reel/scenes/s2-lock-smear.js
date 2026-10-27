/* s2-lock 도우미 — 세로 상자 번짐(열마다 누적합 띠)
   한 프레임의 표본은 모두 같은 그림(프레임 가운데 기준 · 셔터 전체 번짐)을 그린다 → 선형광 평균이 곧 정확한 상자 번짐.
   (표본마다 제 몫 1/n만 번지게 그리면 sRGB 합성 뒤 선형 평균이라 타일 경계마다 어두운 윤곽이 생김) */
import {E,W,clamp,seg,measure,glyphs,text,layer} from '../engine.js';
import {blurAt} from '../blur.js';

/* 값 v(f)의 이 프레임 셔터 구간 [v(fc−h), v(fc+h)] — 표본이 달라도 같은 값 */
export const span=(v,f)=>{const c=Math.round(f),h=blurAt(c).shutter/2;return [v(c-h),v(c+h)]};
export const fcOf=f=>Math.round(f);

/* 퇴장 흐림: 진행 u(프레임 가운데 기준 — 표본마다 같은 값) .3→.75에 1→0(빨라지기 전에 사라짐). 끝 반 프레임의 긴 번짐(E.accel 끝 기울기)이 띠 끝에 잘려 판처럼 남지 않게 */
export const exitFade=u=>1-seg(clamp(u),.3,.75);

/* 광학 정렬: 첫 글자 잉크 왼쪽이 x에 오도록 더할 값(= actualBoundingBoxLeft, 보통 음수). 글자 · 크기 · 굵기별 캐시 */
const IC=new Map(),IX=document.createElement('canvas').getContext('2d');
export function inkL(s,o){const ch=[...s][0],k=ch+'|'+o.size+'|'+(o.weight||300);let v=IC.get(k);
  if(v===undefined){measure(IX,ch,o);v=IX.measureText(ch).actualBoundingBoxLeft;IC.set(k,v)}return v}

const CACHE=new Map();
/* 띠: 투명 캔버스 SW×SH(화면 x = X0부터)에 draw(ctx) → 열마다 세로 누적합. per: 세로로 SH 주기 반복(숫자 바퀴) */
export function strip(key,SW,SH,X0,draw,per=false){let S=CACHE.get(key);if(S)return S;
  const c=document.createElement('canvas');c.width=SW;c.height=SH;const x=c.getContext('2d',{willReadFrequently:true});draw(x);
  const a=x.getImageData(0,0,SW,SH).data,pre=new Float64Array(SW*(SH+1));
  for(let i=0;i<SW;i++){let t=0;const b0=i*(SH+1);for(let j=0;j<SH;j++){t+=a[(j*SW+i)*4+3];pre[b0+j+1]=t}}
  S={X0,SW,SH,pre,per,cv:null,im:null,wh:0,last:''};CACHE.set(key,S);return S}

/* 띠를 화면 행 wy0..wy0+wh에: 띠 y=0이 화면 top(소수)에 오고, 위치가 길이 L(px)에 고르게 퍼진 평균. L<1이면 1(소수 위치 보간) */
export function smear(g,S,top,L,wy0,wh,color){L=Math.max(1,L);const key=top.toFixed(4)+'|'+L.toFixed(4)+'|'+wy0+'|'+wh+'|'+color;
  if(S.last!==key){   /* 한 프레임의 표본은 같은 그림 → 한 번만 계산 */
    if(!S.cv||S.wh!==wh){S.cv=document.createElement('canvas');S.cv.width=S.SW;S.cv.height=wh;S.im=S.cv.getContext('2d').createImageData(S.SW,wh);S.wh=wh}
    const d=S.im.data,n=parseInt(color.slice(1),16),cr=n>>16&255,cg=n>>8&255,cb=n&255,SH=S.SH,pre=S.pre,SW=S.SW,per=S.per;
    const P=(b0,t)=>{let base=0;if(per){const q=Math.floor(t/SH);base=q*pre[b0+SH];t-=q*SH}else{if(t<=0)return 0;if(t>=SH)return pre[b0+SH]}
      const j=Math.min(SH-1,Math.max(0,Math.floor(t)));return base+pre[b0+j]+(t-j)*(pre[b0+j+1]-pre[b0+j])};
    for(let r=0;r<wh;r++){const c0=wy0+r+.5-top,a0=c0-L/2,a1=c0+L/2;
      for(let i=0;i<SW;i++){const b0=i*(SH+1),q=(r*SW+i)*4;d[q]=cr;d[q+1]=cg;d[q+2]=cb;d[q+3]=(P(b0,a1)-P(b0,a0))/L}}
    S.cv.getContext('2d').putImageData(S.im,0,0);S.last=key}
  g.drawImage(S.cv,S.X0,wy0)}

/* 글줄 세로 번짐: 기준선이 [y0,y1]에 고르게 퍼진 평균(한 프레임 동안의 움직임). o.alpha 반영 */
export function textSmear(g,s,x,y0,y1,o,box=true){if(!s)return 0;
  const w=measure(g,s,o),X0=Math.floor(x)-8,SW=Math.ceil(x+w)+8-X0,B=Math.ceil(o.size*1.05),SH=B+Math.ceil(o.size*.35);
  const S=strip(['t',s,o.size,o.weight||300,o.track||0,x.toFixed(3)].join('|'),SW,SH,X0,c=>{measure(c,s,o);c.fillStyle='#fff';c.fillText(s,x-X0,B)});
  const lo=Math.min(y0,y1),hi=Math.max(y0,y1),top=(lo+hi)/2-B,wy0=Math.floor(lo-B-1),wh=Math.ceil(hi-B+SH+1)-wy0;
  if(box&&window.__boxes)text(layer('s2box'),s,x,(lo+hi)/2,o);   /* 검사 상자만 */
  g.save();g.globalAlpha*=o.alpha??1;smear(g,S,top,hi-lo,wy0,wh,o.color);g.restore();return w}

/* 글줄 등장 · 퇴장(엔진 lineIn · lineOut과 같은 시간표 · 거리 · 곡선)을 글자별 세로 번짐으로. 띠 [m0,m1] 밖은 잘림
   in: 글자 k는 st=f0+budget·k/(n−1)에 dist·size 아래에서 올라와 dur 뒤 제자리(st 전엔 없음) / out: 같은 시간표로 위로 빠지고 끝나면 없음
   셔터가 st(또는 끝)를 걸치면 보이는 구간만 번지고 그 비율만큼 투명도 */
export function lineSmear(g,s,x,y,o,f,f0,{mode='in',dur=8,budget=4,dist=1.05,ease=mode==='in'?E.snap:E.accel,mask}={}){
  if(!s)return 0;const G=glyphs(g,s,o),n=G.list.length,[m0,m1]=mask,c=Math.round(f),h=blurAt(c).shutter/2;
  if(mode==='in'?c+h<=f0:c-h>=f0+budget+dur)return G.w;
  if(window.__boxes)text(layer('s2box'),s,x,y,o);   /* 검사 상자(글줄 하나) */
  g.save();g.beginPath();g.rect(0,m0,W,m1-m0);g.clip();
  G.list.forEach((q,k)=>{if(q.ch===' ')return;const st=f0+(n>1?budget*k/(n-1):0);let a=c-h,b=c+h;
    if(mode==='in')a=Math.max(a,st);else b=Math.min(b,st+dur);if(b<=a)return;
    const dy=t=>{const u=clamp((t-st)/dur);return mode==='in'?(1-ease(u))*o.size*dist:-ease(u)*o.size*dist},d0=dy(a),d1=dy(b);
    if(y+Math.min(d0,d1)-o.size*1.05>=m1||y+Math.max(d0,d1)+o.size*.35<=m0)return;   /* 띠 밖 */
    const fade=mode==='out'?exitFade((c-st)/dur):1;
    if(fade<=0)return;
    textSmear(g,q.ch,x+q.x,y+d0,y+d1,{...o,alpha:(o.alpha??1)*fade*(b-a)/(2*h)},false)});
  g.restore();return G.w}
