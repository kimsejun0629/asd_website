/* s3-uav 도우미 — 시간표 · 스프라이트 굽기(채도 · 그림자) · 레이더 · 나선 · 사다리 배치(글 · 그래픽이 함께 씀)
   스토리보드 S07-uav-dial · S08-uav-index */
import {C,E,seg,lerp,clamp,loglerp,TAU,rgba,need,img,measure,layer} from '../engine.js';
import {P,DISC} from '../shared.js';

/* ── 시간표 ── */
export const T=[330,339,347,354,361,367,373,379,385],LOCK=390;   /* 다이얼 멈춤 9-8-7-7-6-6-6-6-5f · 390(b13) 고정 */
export const stepAt=f=>{let k=-1;for(let i=0;i<9;i++)if(f>=T[i])k=i;return k};
/* 다이얼 위치 s: 멈춤 k에서 k−1→k(그 칸 길이 동안 snap) — 칸 경계에서 값 · 연속 */
export function dial(f){const k=stepAt(f);if(k<0)return -1;return k-1+E.snap(seg(f,T[k],k<8?T[k+1]:LOCK))}
/* 휙(414–420): 층 전체 위로 −320·inCubic, α 416–419.5 */
export const whipY=f=>-320*E.inCubic(seg(f,414,420));
export const whipA=f=>1-seg(f,416,419.5);   /* 419.5에 0 — 420 프레임의 모든 표본이 깨끗(s4 지도 위 잔상 없음) */
/* 레이더 배율: 330–348 .5→SMAX(원판 160 = 셋째 고리) · 390–404 →.7.
   영문은 SMAX .8 — 굵은 가운데 이름(Medium-Altitude UAV 왼끝 ≈1495)이 셋째 고리 · 눈금(1478)과 17px 이상 떨어지게(편차 보고) */
export const radarS=(f,en)=>lerp(.5+((en?.8:1)-.5)*E.snap(seg(f,DISC.f,348)),.7,E.snap(seg(f,390,404)));
/* 레이더 · 나선 중심: 390–404 줌아웃과 함께 P*에서 왼쪽 80px로 — 세로는 468 유지(가로축이 목록 가운데 줄 KUS-FT 기준선으로).
   −40px로는 어떤 시작각에서도 목록 · 칩과 20px가 안 나와(최대 7.7) −80 · 시작각 73°로 국 · 영 모두 29.6px 이상(편차 보고) */
export const ctr=f=>[P.x-80*E.snap(seg(f,390,404)),P.y];

/* ── 스프라이트(고도 순, 기수 +x — web/js/uav-kit.js SPR) ── */
export const SP=['/web/img/sp/fs_top2.webp','/web/img/sp/st_top2.webp','/web/img/lw_2.webp','/web/img/sp/mlm_top3.webp','/web/img/sp/ft_top2.webp',
  '/web/img/sp/tgt_top.webp','/web/img/sp/slm_top3.webp','/web/img/sp/naval_top.webp','/web/img/sp/mro_top2.webp'];
need(SP);
const BK=new Map();
const cv=(w,h)=>Object.assign(document.createElement('canvas'),{width:w,height:h});
/* 긴 변 L로 구움: 반씩 줄여 고품질 축소 → saturate(.6) · 그림자(흐림 4 = drop-shadow 8, #141617 실루엣) */
export function bake(i,L){const key=i+'|'+L;let b=BK.get(key);if(b)return b;
  const im=img(SP[i]),k=L/Math.max(im.width,im.height),w=Math.round(im.width*k),h=Math.round(im.height*k);
  let src=im,sw=im.width,sh=im.height;
  while(sw/2>=w*1.4){const c=cv(Math.round(sw/2),Math.round(sh/2)),x=c.getContext('2d');x.imageSmoothingQuality='high';x.drawImage(src,0,0,c.width,c.height);src=c;sw=c.width;sh=c.height}
  const pad=20,c=cv(w+pad*2,h+pad*2),x=c.getContext('2d');x.imageSmoothingQuality='high';x.filter='saturate(0.6)';x.drawImage(src,pad,pad,w,h);x.filter='none';
  const s=cv(c.width,c.height),y=s.getContext('2d');y.filter='blur(4px)';y.drawImage(c,0,0);y.filter='none';
  y.globalCompositeOperation='source-in';y.fillStyle=C.uavShadow;y.fillRect(0,0,s.width,s.height);
  b={c,s,len:w,span:h,L};BK.set(key,b);return b}
/* 기체 하나: 그림자(화면 기준 12,16 · α.55) → 비행운 2줄(크림→금, α.5→0, 200px) → 몸체. k: 구운 크기 대비 배율 · tr: 비행운 투명도(S08 나선은 0) */
export function craft(g,i,x,y,ang,{L=240,k=1,alpha=1,tr=1}={}){if(alpha<=.002||k<=.001)return;const b=bake(i,L),u=k*L/240;
  g.save();g.globalAlpha*=alpha;g.imageSmoothingQuality='high';
  g.save();g.translate(x+12*u,y+16*u);g.rotate(ang);g.scale(k,k);g.globalAlpha*=.55;g.drawImage(b.s,-b.s.width/2,-b.s.height/2);g.restore();
  g.save();g.translate(x,y);g.rotate(ang);g.scale(k,k);const x0=-b.len*.12,tl=200*L/240,oy=b.span*.26;g.lineWidth=1/k;
  if(tr>.002)for(const sy of [-1,1]){const gr=g.createLinearGradient(x0,0,x0-tl,0);gr.addColorStop(0,rgba(C.cream,.5*tr));gr.addColorStop(1,rgba(C.goldHi,0));
    g.strokeStyle=gr;g.beginPath();g.moveTo(x0,sy*oy);g.lineTo(x0-tl,sy*oy);g.stroke()}
  g.drawImage(b.c,-b.c.width/2,-b.c.height/2);g.restore();g.restore()}

/* ── S07 현재 기체: 기수 방위 225°(화면 왼쪽 아래) · 뒤 90px에서 4f 들어오고, 다음 칸 1f 전부터 3f 앞으로 나감(2f 겹침) ── */
export const HD=135*Math.PI/180,HX=Math.cos(HD),HY=Math.sin(HD);
/* ── S08 나선: 고도 높은 것이 바깥(r 250−20i) · 41° 간격 · 392–420 +3° 회전. 시작각 TH0(목록 · 칩과 20px 이상 — 편차 보고) ── */
export const TH0=73,DTH=41,SPL=84;
export const rotF=f=>3*seg(f,392,420);
export function slot(i,f){const th=(TH0+DTH*i+rotF(f))*Math.PI/180,r=250-20*i,dr=-20/(DTH*Math.PI/180),[cx,cy]=ctr(f);
  return {x:cx+r*Math.cos(th),y:cy+r*Math.sin(th),ang:Math.atan2(dr*Math.sin(th)+r*Math.cos(th),dr*Math.cos(th)-r*Math.sin(th))}}
export const lerpAng=(a,b,t)=>{let d=((b-a)%TAU+TAU*1.5)%TAU-TAU/2;return a+d*t};
/* 나선 상태(f≥390): 8대가 392+1.5i에 8f 팝(outBack 1.6 — 마지막 410.5에 끝나 414까지 완성 화면이 쉼) + Digital MRO(P*·240 → 8번 자리, 390–400).
   r: 거리 고리(r48) 반지름 · ra: 고리 · 레이더 비움 투명도 — 고리 · 레이더 비움 · 기체가 함께 씀.
   tr: 비행운 — 나선에는 없음(고리 밖으로 뻗어 이웃 기체 · 레이더 선에 닿지 않게, 고리가 묶는 일을 함). Digital MRO는 자리로 가며 1−e로 걷힘 */
export function spiral(f){const Q=[];if(f<LOCK)return Q;
  for(let i=0;i<8;i++){const t=seg(f,392+1.5*i,400+1.5*i);if(t<=0)continue;const k=E.outBack(t,1.6),s=slot(i,f),a=clamp(t*3);Q.push({i,x:s.x,y:s.y,ang:s.ang,k,L:SPL,a,ra:a,r:48*k,tr:0})}
  const e=E.snap(seg(f,LOCK,400)),s8=slot(8,f),k8=loglerp(1,SPL/240,e);
  Q.push({i:8,x:lerp(P.x,s8.x,e),y:lerp(P.y,s8.y,e),ang:lerpAng(HD,s8.ang,e),k:f<400?k8:1,L:f<400?240:SPL,a:1,ra:e,r:48*k8*240/SPL,tr:1-e});
  return Q}

/* ── 레이더: 원판 채움은 바로 g에, 쓸기는 층에(cut: 글 자리 비움), 선(고리 · 축 · 방위 눈금)은 층에 — 선의 글 자리 비움은 호출한 쪽 ── */
export function radarFill(g,f,en,cut){const r3=320*radarS(f,en),[cx,cy]=ctr(f);
  /* S06 원판 채움 이어받기 α.08→0 */
  const fa=.08*(1-seg(f,330,338));if(fa>0){g.fillStyle=rgba(C.cream,fa);g.beginPath();g.arc(cx,cy,r3,0,TAU);g.fill()}
  /* 30° 쓸기(시계 방향 6°/f, 앞끝 α.20 → 뒤 0) — 400–406 걷힘(목록 · 편대만 남는 쉼) · 글 상자 뒤는 비움(금색 칩 밑을 금색 쐐기가 지나지 않게) */
  const sa=E.std(seg(f,334,346))*(1-E.ioQuad(seg(f,400,406)));if(sa>0){const a=(-90+6*(f-DISC.f))*Math.PI/180,w=30/360,x=layer('s3S');
    const gr=x.createConicGradient(a-w*TAU,cx,cy);gr.addColorStop(0,rgba(C.goldHi,0));gr.addColorStop(w,rgba(C.goldHi,.2*sa));gr.addColorStop(w+1e-4,rgba(C.goldHi,0));gr.addColorStop(1,rgba(C.goldHi,0));
    x.fillStyle=gr;x.beginPath();x.moveTo(cx,cy);x.arc(cx,cy,r3,0,TAU);x.fill();if(cut)cut(x);g.drawImage(x.canvas,0,0)}}
export function radarLines(x,f,en){const s=radarS(f,en),r1=110*s,r2=220*s,r3=320*s,[cx,cy]=ctr(f);
  const a12=E.std(seg(f,330,340)),a3=lerp(.5,.18,seg(f,330,342));
  x.lineWidth=1;const ring=(r,a)=>{if(a<=0)return;x.strokeStyle=rgba(C.cream,a);x.beginPath();x.arc(cx,cy,r,0,TAU);x.stroke()};
  ring(r1,.18*a12);ring(r2,.18*a12);ring(r3,a3);
  /* 축(α.10) — 가운데에서 바깥으로 그려짐. S07 오른쪽 끝 = 금색 지시선 시작(1560): 국문은 r3+24 = 344 그대로, 영문(작은 레이더)은 1560까지 곧장 → S08에서 대칭으로 */
  const ea=E.snap(seg(f,332,346)),ax=ea*(r3+24),axR=en?ea*lerp(1560-P.x,r3+24,E.snap(seg(f,390,404))):ax;
  if(ax>0){x.fillStyle=rgba(C.cream,.10);x.fillRect(cx-ax,cy,ax+axR,1);x.fillRect(cx,cy-ax,1,ax*2)}
  /* 방위 눈금 10°마다 6px(α.3) */
  const ta=.3*a12;if(ta>0){x.strokeStyle=rgba(C.cream,ta);x.beginPath();for(let d=0;d<360;d+=10){const t=d*Math.PI/180,c=Math.cos(t),sn=Math.sin(t);x.moveTo(cx+c*r3,cy+sn*r3);x.lineTo(cx+c*(r3+6),cy+sn*(r3+6))}x.stroke()}}

/* ── 사다리 · 목록 배치(순수: f → 줄마다 기준선 · 투명도 · 굵기 섞음 · 칩) ──
   S07: 이름 기준선 = y_i − 10, y_i = 468 + 110·(i − s) · α = 1 − |y−468|/330 · 가운데 줄 Bold cream(Light와 교차 — 폭이 달라 왼쪽 끝이 튀지 않게)
   S08(390–400): 보이던 6 · 7 · 8번은 390의 S07 기준선 → 332 + 34i, 이름 x도 같은 e8로 코드 폭+12만큼 왼쪽 — 한 매개변수라 곧은 선(휘지 않음)
     안 보이던 0–5번은 처음부터 최종 x에서 10px 위 → 제자리 · α0→1(5f): 6번 줄 잉크가 그 자리를 지나간 순간(6번 기준선 = 제자리 + 26)에 시작
     — 내려가는 6번을 뒤따라 위에서부터 차례로 펼쳐짐(글끼리 겹치지 않음) · 코드는 394–400 제자리 흐림 + 3px 솟음(글 쪽) · 칩 395–403 */
export const RX=1776,RULE=1800;
export const NM={size:26,weight:300,color:C.cream80,id:'uav.name',tier:3};
export const NB={...NM,weight:700,color:C.cream};
export const CD={size:26,weight:700,color:C.cream,id:'uav.idx',tier:1};
export const CHIP={size:26,weight:700,color:C.goldHi,id:'uav.chip',tier:1};
/* 칩: 좌우 11px · 30px 상자(기준선 −23 — 잉크 위아래 여백 같음, 34px 간격 목록에서 이웃 줄 잉크와 7px 이상) */
export const CHIP_PAD=11,CHIP_GAP=12,CHIP_Y=23,CHIP_H=30;
const a7=y=>clamp(1-Math.abs(y-468)/330);
const sstep=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t)};
export const idxB=i=>332+34*i;
/* E.snap의 역(이분법) — 6번 줄이 v만큼 갔을 때의 프레임 */
const invSnap=v=>{let a=0,b=1;for(let k=0;k<40;k++){const m=(a+b)/2;if(E.snap(m)<v)a=m;else b=m}return (a+b)/2};
const B6=[468+110*(6-8)-10,idxB(6)];
const F0=[0,1,2,3,4,5].map(i=>LOCK+10*invSnap((idxB(i)+26-B6[0])/(B6[1]-B6[0])));
export function ladder(g,f,S){const fin=E.std(seg(f,330,340)),nm=S['uav.name'],cd=S['uav.code'],rows=[];
  const e8=E.snap(seg(f,LOCK,400)),eK=f<LOCK?0:E.snap(seg(f,394,400)),eChip=E.snap(seg(f,395,403)),s=f<LOCK?dial(f):8;
  for(let i=0;i<9;i++){let y,b,a;const b1=idxB(i);
    if(f<LOCK){y=468+110*(i-s);b=y-10;a=a7(y)*fin}
    else if(i<6){const u=E.outCubic(seg(f,F0[i],F0[i]+5));b=b1-10*(1-u);a=u;y=b}
    else{const y0=468+110*(i-8);b=lerp(y0-10,b1,e8);a=lerp(a7(y0),1,e8);y=b+10*(1-e8)}
    /* Bold 비중: 가운데 40px 안 1 → 70px 밖 0 · 390 뒤엔 고정된 8번만 시간으로 390–393 ioQuad
       (첫 프레임 68px 이동에 굵기가 튀지 않게 · 오른쪽 맞춤이라 두 굵기의 왼끝이 달라 줄이 아직 빠를 때 끝냄 — 멈춘 뒤 겹상이 보이지 않게) */
    const wB=f<LOCK?sstep(70,40,Math.abs(y-468)):i===8?1-E.ioQuad(seg(f,LOCK,393)):0;
    const nwM=measure(g,nm[i],NM),nwB=measure(g,nm[i],NB),nw=wB>0?Math.max(nwM,nwB):nwM,cw=measure(g,cd[i],CD);
    const eC=f<LOCK?0:i<6?1:e8,nr=RX-eC*(cw+CHIP_GAP);let left=nr-nw,chip=null;
    /* 칩: 이름 왼쪽 12px — 오른쪽 6px에서 흐리며 들어옴 */
    if(i===7&&eChip>0){const w=measure(g,S['uav.chip'],CHIP)+CHIP_PAD*2,x0=left-CHIP_GAP-w;chip={x:x0+6*(1-eChip),w,a:eChip};left=lerp(left,x0,eChip)}
    rows.push({i,y,b,a,wB,name:nm[i],code:cd[i],nr,nw,cw,eC,eK,left,chip})}
  return rows}
export const ladderF0=F0;
/* 자 눈금 y(22px 간격, 이름과 맞물려 굴러감) — 390–400은 S07 자리 → S08 자리(6.8px 간격, 가운데 4) 곧게 */
export const tickY=(j,f,e8)=>lerp(468+22*j-110*(f<LOCK?dial(f):8),468+6.8*j-136,e8);
/* 줄 상자(레이더 비움용, 여백 10) */
export const rowBox=r=>[r.left-10,r.b-28,RX-r.left+20,38];
/* 1px 상자(분수 위치 유지 — 정지 시 정수) */
export function box1(g,x,y,w,h,color,a){if(a<=0)return;g.save();g.globalAlpha*=a;g.strokeStyle=color;g.lineWidth=1;g.strokeRect(x+.5,y+.5,w-1,h-1);g.restore()}
