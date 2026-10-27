/* 쇼릴 s7-people 도우미 — S14 엔드카드: 패턴 바탕 · 금선 → 로고 · 숫자 네 칸 · 각주 (스토리보드 S14 · S15)
   엔드카드는 856 이후 태그라인 자리(y>700 · x<1500)를 비워 둠 */
import {C,E,W,H,seg,clamp,lerp,smooth,measure,textEach,label,odoValue,fitSize,font,rgba} from '../engine.js';
import {logo,PATTERN} from '../kit.js';
import {LOGO,TAG} from '../shared.js';
import {blurAt} from '../blur.js';
import {lineInX,textG} from './s7-people-type.js';
import {odoWheels} from './s7-people-odo.js';
import {back,recede,lift} from './s7-people-fx.js';

/* 소수 좌표 가로 막대(움직이는 선은 반올림하지 않고 가장자리를 부드럽게) */
export function fillH(g,x0,x1,y,h,color,alpha){if(x1<=x0||alpha<=0)return;g.save();g.globalAlpha*=alpha;g.fillStyle=color;g.fillRect(x0,y,x1-x0,h);g.restore()}

/* ── 패턴: pattern2d.svg(고유 크기 없음)를 1920×1080 뷰포트로 한 번 구움 → 크림 · 방사 마스크(960,275: r420 안 0 → r900 밖 1)
   · 태그라인 자리(x<1500 · y>700)는 0(가장자리 100px 부드럽게) ── */
export async function bakePattern(){
  const t=await (await fetch(PATTERN)).text();const url=URL.createObjectURL(new Blob([t.replace('<svg ','<svg width="1920" height="1080" ')],{type:'image/svg+xml'}));
  const im=new Image();im.src=url;await im.decode();
  const c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');x.drawImage(im,0,0,W,H);URL.revokeObjectURL(url);
  x.globalCompositeOperation='source-in';x.fillStyle=C.cream;x.fillRect(0,0,W,H);
  /* 마스크는 따로 그려(오염 없는 캔버스에서 화소 계산) destination-in */
  const m=document.createElement('canvas');m.width=W;m.height=H;const mx=m.getContext('2d',{willReadFrequently:true});const d=mx.createImageData(W,H),a=d.data;
  for(let y=0;y<H;y++){const sy=1-smooth(clamp((y+.5-600)/100));
    for(let X=0;X<W;X++){const r=Math.hypot(X+.5-960,y+.5-275),rm=smooth(clamp((r-420)/480)),sx=smooth(clamp((X+.5-1500)/120));
      a[(y*W+X)*4+3]=Math.round(255*rm*Math.max(sy,sx))}}
  mx.putImageData(d,0,0);x.globalCompositeOperation='destination-in';x.drawImage(m,0,0);x.globalCompositeOperation='source-over';return c}
/* 패턴 809~821 나타남 · 정지(정수 원점) · 크림 α.035 */
export function cardBg(g,f,pat){if(f<809||!pat)return;const a=.035*E.ioCubic(seg(f,809,821));g.save();g.globalAlpha=a;g.drawImage(pat,0,0);g.restore()}

/* ── 금선 → 로고 · 칸 구분선 ── */
const CX=[420,780,1140,1500],SEP=[600,960,1320],ST0=[808,811,814,817];
/* 858~870 엔드카드(로고 · 패턴 제외)가 α.3 · 위로 10px 물러남(s7-people-fx.js back · recede · lift) — 태그라인과 두 배치가 겹쳐 읽히지 않게, 숫자는 스캔까지 옅게 남음 */
/* 표본 간격 안에서 움직인 가로 금선: 앞(a) · 뒤(b) 시각 위치 사이를 고르게 칠함 — 세로는 지나간 폭에 th px 잉크를 펴고 끝은 가로 경사.
   a = b(정지)면 fillH와 같음. 표본들이 서로 맞닿아 빗살(여러 줄로 끊긴 잔상)이 생기지 않음 */
export function sline(g,a,b,color,alpha,th=1){if(alpha<=0)return;
  const y0=Math.min(a.y,b.y),y1=Math.max(a.y,b.y)+th,L0=Math.min(a.x0,b.x0),L1=Math.max(a.x0,b.x0),R1=Math.min(a.x1,b.x1),R0=Math.max(a.x1,b.x1),w=R0-L0;if(w<=0||R1<=L1)return;
  const gr=g.createLinearGradient(L0,0,R0,0),k0=rgba(color,0),k1=rgba(color,1);gr.addColorStop(0,k0);gr.addColorStop((L1-L0)/w,k1);gr.addColorStop((R1-L0)/w,k1);gr.addColorStop(1,k0);
  g.save();g.globalAlpha*=alpha*th/(y1-y0);g.fillStyle=gr;g.fillRect(L0,y0,w,y1-y0);g.restore()}
/* 가운데 c에서 반높이 ha(완전히 덮임) → hb(0)로 경사진 가로 마스크를 정수 행 띠로: 덮임 1인 행은 한 띠, 경사 행은 행마다 평균 덮임(4점) — draw(y0,y1,α) */
export function rowsMask(c,ha,hb,draw){const y0=Math.floor(c-hb),y1=Math.ceil(c+hb),k=Math.max(hb-ha,1e-3);let r=null;
  const cov=y=>{let v=0;for(let j=0;j<4;j++)v+=clamp((hb-Math.abs(y+(j+.5)/4-c))/k);return v/4};
  for(let y=y0;y<y1;y++){const v=cov(y);if(v>=.999){if(r===null)r=y;continue}if(r!==null){draw(r,y,1);r=null}if(v>.001)draw(y,y+1,v)}if(r!==null)draw(r,y1,1)}
export const hsAt=f=>{const B=blurAt(f);return B.shutter/B.n};   /* 표본 간격(프레임) */

/* 809: 띠의 두 금선이 만난 2px 심(행 274~275 — 로고 가운데 275) · 809~811.5 한 줄로 머묾(히트) · 폭은 809~817 로고 폭으로(E.snap).
   811.5~821 로고 마스크가 열리고(반높이 0→80, E.snap) 심은 두 줄로 갈라져 마스크 가장자리 바로 바깥을 그대로 탐 · 812~815 사라짐(마스크가 느려지기 전 — 로고를 두르지 않게) */
const OPEN=811.5,maskH=f=>80*E.snap(seg(f,OPEN,821));
const seamAt=f=>{const c=E.snap(seg(f,809,817));return {x0:lerp(0,LOGO.x,c),x1:lerp(W,LOGO.x+LOGO.w,c),h:maskH(f)}};
export function cardGfx(g,f,env){const hs=hsAt(f);
  if(f>=809&&f<816){const al=1-smooth(seg(f,812,815));
    if(f<OPEN){const A=seamAt(f-hs/2),B=seamAt(f+hs/2);sline(g,{...A,y:274-A.h},{...B,y:274-B.h},C.goldHi,al);sline(g,{...A,y:275+A.h},{...B,y:275+B.h},C.goldHi,al)}
    else{/* 갈라진 두 줄(812~815): 프레임마다 한 자리의 정수 행에 선명한 1px(모든 표본 같은 자리 — 스캔선 심과 같은 방식).
       자리 = 이 프레임 마지막 표본의 마스크 가장자리 바로 바깥(로고 획을 가로지르지 않게). 표본마다 번지게 하면 첫 프레임(≈50px/f)에 옅은 회색 판이 로고를 둘렀음 */
      const F=Math.round(f),S=seamAt(F),h=maskH(F+.25+hs/2);fillH(g,S.x0,S.x1,Math.floor(275-h)-1,1,C.goldHi,al);fillH(g,S.x0,S.x1,Math.ceil(275+h),1,C.goldHi,al)}}
  /* 로고: 811.5~821 y=275에서 세로로 열림 + 균일 배율 1.02→1(E.outCubic) · 821부터 정확한 SVG · 878~887 사라짐(E.inQuad).
     열리는 동안 마스크 가장자리는 표본 간격 안에서 지나간 폭만큼 경사 — 화면 캔버스에 곧바로(정수 행 띠로 잘라 행마다 덮임만큼), 821 이후와 같은 래스터 */
  if(f>=OPEN&&f<887){const a=1-E.inQuad(seg(f,878,887));
    if(f<821){const ha=maskH(f-hs/2),hb=Math.max(maskH(f+hs/2),ha+1e-3),s=lerp(1.02,1,E.outCubic(seg(f,OPEN,821))),cx=LOGO.x+LOGO.w/2,cy=LOGO.y+LOGO.h/2;
      const draw=(y0,y1,al)=>{g.save();g.beginPath();g.rect(0,y0,W,y1-y0);g.clip();if(LOGO.w*(s-1)>.05){g.translate(cx,cy);g.scale(s,s);g.translate(-cx,-cy)}logo(g,LOGO.x,LOGO.y,LOGO.w,{alpha:a*al});g.restore()};
      rowsMask(275,ha,hb,draw)}
    else logo(g,LOGO.x,LOGO.y,LOGO.w,{alpha:a})}
  sep(g,f)}
function sep(g,f){
  /* 칸 구분선: 1px 크림 α.16, y 524~652 — 오른쪽 칸이 들어올 때 위에서 아래로 */
  const rc=recede(f),dy=lift(f);SEP.forEach((x,i)=>{const p=E.snap(seg(f,ST0[i+1]-1,ST0[i+1]+11));if(p<=0)return;
    g.save();g.globalAlpha*=.16*rc;g.fillStyle=C.cream;g.fillRect(x,524+dy,1,128*p);g.restore()});
}

/* ── 글: 절 라벨(가운데 960 · 488) · 네 칸(라벨 552 · 값 636) · 각주(오른쪽 = 넷째 칸 값 묶음 오른쪽 끝 · 690) ── */
function labelC(g,s,cx,y,o,p){if(p<=0)return;const e=E.snap(clamp(p)),tr=lerp(.30,.14,e),S=s.toUpperCase();
  const w=26*2.1+measure(g,S,{size:26,weight:700,track:tr});label(g,s,Math.round(cx-w/2),y,{...o,track:tr,alpha:(o.alpha??1)*clamp(p*1.6)})}
/* 값 문자열 → 수 · 소수 자리 */
const num=s=>({v:parseFloat(s.replace(/,/g,'')),dec:(s.split('.')[1]||'').length,grp:s.includes(',')});
let LAY=null;
function layout(g,env){if(LAY&&LAY.lang===env.LANG)return LAY;const S=env.S,en=env.LANG==='en';
  const cols=[1,2,3,4].map((k,i)=>{const [lab,pre,val,unit]=S['end.s'+k];
    let vs=en?64:72,us=32;const gap=unit&&!unit.startsWith(' ')?Math.round(.12*vs):0;
    const ov={size:vs,weight:300,track:-.02,color:C.cream,id:'end.v',tier:1},ou={size:us,weight:300,color:C.cream80,id:'end.u',tier:2};
    const wp=pre?measure(g,pre,ou):0,wv=measure(g,val,ov),wu=unit?measure(g,unit,ou):0,tot=wp+wv+gap+wu;
    const k2=Math.min(1,330/tot);const x0=Math.round(CX[i]-tot*k2/2);
    return {lab,pre,val,unit,ov:{...ov,size:vs*k2},ou:{...ou,size:Math.max(26,us*k2)},x0,x1:Math.round(x0+tot*k2),xv:Math.round(x0+wp*k2),xu:Math.round(x0+(wp+wv+gap)*k2),n:num(val),roll:i>0}});
  const of=fitSize(g,S['end.foot'],{size:26,weight:300,color:C.cream80,alpha:.7,align:'right',id:'end.foot',tier:2},1100);
  /* 각주 잉크 오른쪽 끝 = 넷째 칸 값 묶음 잉크 오른쪽 끝(글자 옆 여백 차이까지 맞춤) */
  const inkR=(s,o)=>{g.save();g.font=font(o.size,o.weight||300);g.letterSpacing=((o.track||0)*o.size).toFixed(2)+'px';const r=g.measureText(s).actualBoundingBoxRight;g.restore();return r};
  const c4=cols[3],r4=c4.unit?c4.xu+inkR(c4.unit,c4.ou):c4.xv+inkR(c4.val,c4.ov),sf=S['end.foot'];
  LAY={lang:env.LANG,cols,of,footX:Math.round(r4+measure(g,sf,of)-inkR(sf,of))};return LAY}

export function card(g,f,env){const S=env.S,L=layout(g,env);g.save();g.globalAlpha*=recede(f);const dy=lift(f);if(dy)g.translate(0,dy);
  labelC(g,S['end.label'],960,488,{color:C.cream80,id:'end.label',tier:2},seg(f,806,824));
  const r1=lerp(1,.75,back(f));   /* 첫 칸은 α.225까지 — 바로 아래 태그라인 'SINCE 1977'이 왼쪽 단의 주인이 되게 */
  L.cols.forEach((c,i)=>{const st=ST0[i];if(f<st)return;const cx=CX[i];g.save();if(!i)g.globalAlpha*=r1;
    lineInX(g,c.lab,cx,552,{size:26,weight:300,color:C.cream80,align:'center',id:'end.l',tier:2},f,st,{dur:12,budget:4});
    /* 값 묶음: 한 띠 [m0,m1) 안에서 함께 솟음(st+1~st+13, E.snap) · 값은 st+2~st+14에 0부터 굴러 멈춤(E.outQuart), 1977은 세지 않고 솟기만 */
    const vs=c.ov.size,cap=vs*.92,m0=636-cap*1.12,m1=636+vs*.3,D=vs*1.05,dyAt=t0=>{const t=seg(f,t0,t0+12);return t>0?(1-E.snap(t))*D:-1};
    const band=(dy,fn)=>{if(dy<0)return;g.save();g.beginPath();g.rect(0,m0,W,m1-m0);g.clip();g.translate(0,dy);fn();g.restore()};
    band(dyAt(st+1),()=>{if(c.pre)textG(g,c.pre,c.x0,636,c.ou);if(!c.roll)return;
      if(c.unit)textG(g,c.unit,c.xu,636,c.ou);
      const e=s=>E.outQuart(seg(s,st+2,st+14)),opt={target:c.n.v,grouping:c.n.grp,decimals:c.n.dec};
      if(window.__boxes)odoValue(g,c.n.v*e(f),c.xv,636,c.ov,opt);else odoWheels(g,c.xv,636,c.ov,{value:c.n.v,decimals:c.n.dec,grouping:c.n.grp},e,f)});
    /* 1977: 같은 띠(절대 좌표) 안에서 글자별로(1f 간격) — 이동 거리는 묶음과 같게 · '년'은 넷째 숫자 다음 차례(st+5)에 솟아 왼쪽→오른쪽으로 읽힘 */
    if(!c.roll){lineInX(g,c.val,c.xv,636,c.ov,f,st+1,{dur:12,budget:3,band:[m0,m1],dist:D});if(c.unit)band(dyAt(st+5),()=>textG(g,c.unit,c.xu,636,c.ou))}
    g.restore()});
  /* 각주: 822~832 나타남 · 가운뎃점 금색. 영문은 857~867에 사라짐(E.accel) — 긴 각주(x 815~)가 태그라인 1줄(864~ 솟음) 바로 위에 붙어 한 덩이로 읽히지 않게 */
  const fo=env.LANG==='en'?1-E.accel(seg(f,857,867)):1;
  if(dy&&env.LANG!=='en')g.translate(0,-dy);   /* 통합: 국문 각주는 물러남의 10px 들림에서 빼서 기준선 690(TAG.labelY, 'SINCE 1977')에 고정 · α는 그대로 · 영문 경로는 손대지 않음 */
  const fa=E.ioCubic(seg(f,822,832))*fo;if(fa>0)textEach(g,S['end.foot'],L.footX,TAG.labelY,{...L.of,alpha:.7*fa},q=>q.ch==='·'?{color:C.goldHi2}:{});
  g.restore()}
