/* 쇼릴 장면 모듈 s7-people — [716,900): S13 인재(글자 매트 → 사진 띠) · S14 엔드카드(띠 → 금선 → 로고 · 숫자) · S15 로고 퇴장 · 이음매 스캔 아래 잘림
   (스토리보드 _out/reel/plan/storyboard.md S13 · S14 · S15) — 모든 값은 f(실수)만으로 정해짐 */
import {scene,C,E,W,H,seg,clamp,rgba,lerp,trackIn,fitSize,glyphs,font,duotone,need,img} from '../engine.js';
import {scanX,BAND} from '../shared.js';
import {card,cardBg,cardGfx,bakePattern,fillH,sline,hsAt} from './s7-people-card.js';
import {lineInX,lineOutX,layerS} from './s7-people-type.js';
import {photoPlace,talentScan} from './s7-people-fx.js';

const PHOTO='/web/img/co/KAL_BI_0301.webp';need(PHOTO);
const ST={duo:null,pat:null,mat:null};
const EN=o=>o.LANG==='en';

/* ── 띠: 752~766 열림 · 797~809 y=275로 닫힘(E.inQuint) — [top,bot) ── */
const MID=275;
function bandAt(f){const c=E.inQuint(seg(f,797,809));return [lerp(BAND.y0,MID,c),lerp(BAND.y1,MID,c)]}

/* 사진 자리(켄 번스)는 s7-people-fx.js photoPlace */
/* 덮임 기울기: 위 가장자리 t0→t1(내려감) · 아래 b0→b1(올라감) 동안 화소 y가 띠 안에 있던 시간 비율 = clamp(min((y−t0)/(t1−t0), (b0−y)/(b0−b1))) — 꺾인 직선이라 색 멈춤 몇 개로 정확 */
function coverGrad(x,t0,t1,b1,b0){const dt=Math.max(t1-t0,1e-3),db=Math.max(b0-b1,1e-3),cv=y=>clamp(Math.min((y-t0)/dt,(b0-y)/db)),H0=b0-t0,gr=x.createLinearGradient(0,t0,0,b0);
  const ym=(t0*db+b0*dt)/(dt+db),ys=t0+dt<=b0-db?[t0,t0+dt,b0-db,b0]:[t0,ym,b0];ys.forEach(y=>gr.addColorStop(clamp((y-t0)/H0),rgba(C.cream,cv(y))));return gr}
function drawPhoto(x,f,top,bot){const [px,py,pw,ph]=photoPlace(f);x.save();x.beginPath();x.rect(0,top,W,bot-top);x.clip();
  x.imageSmoothingQuality='high';x.drawImage(ST.duo,px,py,pw,ph);x.restore()}

/* ── 글자 매트: Bold 190, 넓은 줄 ≤1060에 맞춘 한 크기 · 오른쪽 정렬 · 기준선 400/590 ──
   두 줄의 잉크 오른쪽 끝을 한 세로선에 맞춤(글자 폭 기준이면 끝 글자 옆 여백만큼 들쭉날쭉) — 그 선 = 1824 − (끝 여백이 가장 큰 줄의 여백):
   모든 줄의 글자 폭 상자가 SAFE(x ≤ 1824) 안에 들고 잉크도 1824를 넘지 않음 */
function matteLayout(g,S){if(ST.mat&&ST.mat.s===S['tal.matte'])return ST.mat;const L=S['tal.matte'];
  let o={size:190,weight:700,track:-.02,color:C.cream,align:'right',id:'tal.matte',tier:1};
  const k=Math.min(...L.map(s=>fitSize(g,s,o,1060).size));o={...o,size:k};
  /* 줄마다 (글자 폭 오른쪽 끝 − 잉크 오른쪽 끝) — 끝 글자 하나를 제자리에서 잼(한 자씩 그리는 lineInX와 같은 기준) */
  const rsb=L.map(s=>{const G=glyphs(g,s,o),q=G.list[G.list.length-1];g.save();g.font=font(o.size,o.weight);g.letterSpacing='0px';const r=g.measureText(q.ch).actualBoundingBoxRight;g.restore();return G.w-(q.x+r)});
  const xr=1824-Math.max(0,...rsb),x=rsb.map(d=>xr+d);
  /* 영문은 크기가 줄면 줄 간격도 비례(아래 기준선 590 고정) */
  const y2=590,y1=Math.round(y2-190*(k/190));ST.mat={s:L,o,x,y:[y1,y2],xr};return ST.mat}

/* s7-photo z5: 매트 → 사진 띠 → 닫힘, 809부터 패턴(엔드카드 바탕) */
scene({id:'s7-photo',from:716,to:900,z:5,
  async init(){ST.pat=await bakePattern()},
  ready(){ST.duo=duotone(img(PHOTO),[[0,C.night],[.5,C.smoke],[1,C.cream]],{gamma:.9})},
  draw(g,f,env){const sx=scanX(f);if(sx!==null){g.beginPath();g.rect(0,0,Math.max(0,sx),H);g.clip()}
    cardBg(g,f,ST.pat);
    if(f<722||f>=809)return;
    const [top,bot]=bandAt(f);if(bot-top<=0)return;
    /* 사진은 언제나 같은 소프트웨어 층에 그려 1:1로 옮김 — 매트 · 띠 · 닫힘 사이에 보간 방식이 바뀌지 않고 그린 순서와 무관 */
    const ar=E.ioCubic(seg(f,752,766)),P=layerS('s7ph');
    if(ar>=1){if(f<797)drawPhoto(P,f,top,bot);
      else{/* 닫힘: 표본 간격 안에서 가장자리가 지나간 폭은 덮인 시간 비율만큼 경사(destination-in) — 빠른 가장자리가 빗살로 끊기지 않게 */
        const hs=hsAt(f),[t0,b0]=bandAt(f-hs/2),[t1,b1]=bandAt(f+hs/2);if(b0-t0<=0)return;
        drawPhoto(P,f,t0,b0);P.globalCompositeOperation='destination-in';P.fillStyle=coverGrad(P,t0,t1,b1,b0);P.fillRect(0,t0,W,b0-t0);P.globalCompositeOperation='source-over'}
      g.drawImage(P.canvas,0,0);return}
    /* 마스크 = 글자 ∪ (띠 × αr) — 사진은 글자 안에서만, 열리면서 띠 전체로. 줄마다 자기 잉크 띠 안에서 올라옴 */
    const M=layerS('s7mask'),T=matteLayout(g,env.S);
    lineInX(M,T.s[0],T.x[0],T.y[0],T.o,f,722,{dur:14,budget:6});
    lineInX(M,T.s[1],T.x[1],T.y[1],T.o,f,725,{dur:14,budget:6});
    if(ar>0){M.globalAlpha=ar;M.fillStyle=C.cream;M.fillRect(0,top,W,bot-top);M.globalAlpha=1}
    drawPhoto(P,f,top,bot);
    /* 글자 안 검은 쪽만 바닥 올림(lighten · ink80): 획 윤곽이 바탕에 묻히지 않게, 중간 · 밝은 톤은 듀오톤 대비 그대로 — 띠가 열리며 0으로(766에 원본과 같음) */
    const lift=.7*(1-ar);if(lift>0){P.globalCompositeOperation='lighten';P.globalAlpha=lift;P.fillStyle=C.ink80;P.fillRect(0,top,W,bot-top);P.globalAlpha=1}
    P.globalCompositeOperation='destination-in';P.drawImage(M.canvas,0,0);P.globalCompositeOperation='source-over';
    g.drawImage(P.canvas,0,0)}});

/* s7-gfx z20: 띠 금선(752~766 가운데서 바깥으로) → 모서리를 타고 닫힘 → 809 한 줄 → 로고 폭으로 줄며 로고 마스크 가장자리로 갈라져 사라짐 · 로고 · 칸 구분선 */
scene({id:'s7-gfx',from:716,to:900,z:20,
  draw(g,f,env){const sx=scanX(f);if(sx!==null){g.beginPath();g.rect(0,0,Math.max(0,sx),H);g.clip()}
    if(f>=752&&f<809){const hs=hsAt(f),at=t=>{const [top,bot]=bandAt(t),h=960*E.snap(seg(t,752,766));return {top,bot,x0:960-h,x1:960+h}},A=at(f-hs/2),B=at(f+hs/2);
      /* 1px 금선: 띠 바로 바깥(위 [top−1,top) · 아래 [bot,bot+1)) — 닫히면 둘이 붙어 y=275 가운데 2px 심. 표본 간격 안에서 지나간 폭에 고르게(sline) */
      sline(g,{...A,y:A.top-1},{...B,y:B.top-1},C.goldHi,1);sline(g,{...A,y:A.bot},{...B,y:B.bot},C.goldHi,1);
      /* 띠 스캔선 768~792(두 금선 사이) */
      if(f<797)talentScan(g,f,BAND.y0,BAND.y1)}
    cardGfx(g,f,env)}});

/* s7-text z30: 인재 글(722~804) · 엔드카드 글(806~) */
scene({id:'s7-text',from:716,to:900,z:30,
  draw(g,f,env){const sx=scanX(f);if(sx!==null){g.beginPath();g.rect(0,0,Math.max(0,sx),H);g.clip()}
    if(f>=722&&f<808)talent(g,f,env);
    if(f>=806)card(g,f,env)}});

/* ── 인재 글: 라벨 700 · 헤드라인 Light 110 @808 · 부제 Bold 34 @868 · 네 부문(국문 라벨+제목 944/984, 영문 이름 964) ── */
const XO=[120,540,960,1380];
const OUT={lab:795,h:795.5,sub:796,fn:796.5,dur:6,budget:1};   /* 퇴장: 줄마다 .5f — 띠가 닫히기(805~809) 전 804에 모두 빠짐 */
function talent(g,f,env){const S=env.S,en=EN(env);
  /* 라벨: 자간 등장 722~738 · 795~801 8px 오르며 사라짐 */
  const lo=E.accel(seg(f,OUT.lab,OUT.lab+6));
  if(lo<1){g.save();g.globalAlpha*=1-lo;trackIn(g,S['tal.label'],120,700-8*lo,{color:C.cream80,id:'tal.label',tier:2},seg(f,722,738));g.restore()}
  /* 헤드라인 */
  const oh=fitSize(g,S['tal.h'],{size:110,weight:300,track:en?-.02:-.035,color:C.cream,id:'tal.h',tier:1},1500);
  inout(g,S['tal.h'],120,808,oh,f,724,{dur:16,budget:8},OUT.h);
  /* 부제 */
  const os=fitSize(g,S['tal.sub'],{size:34,weight:700,color:C.cream,id:'tal.sub',tier:1},1500);
  inout(g,S['tal.sub'],120,868,os,f,732,{dur:14,budget:8},OUT.sub);
  /* 네 부문: 740/743/746/749에 10f씩 */
  S['tal.fn'].forEach((it,c)=>{const x=XO[c],f0=740+3*c;if(f<f0)return;
    const dp=E.snap(seg(f,f0,f0+10))*(1-E.accel(seg(f,OUT.fn,OUT.fn+OUT.dur)));
    if(en){const y=964,ok={size:30,weight:300,color:C.cream,id:'tal.fn',tier:2};
      fillH(g,x,x+39*dp,Math.round(y-30*.36)-1,2,C.goldHi2,1);
      inout(g,it[0],x+26*2.1,y,ok,f,f0,{dur:10,budget:3},OUT.fn)}
    else{const y=944,ok={size:26,weight:700,track:.14,color:C.cream80,id:'tal.fn',tier:2};   /* 라벨 체계 = cream80 */
      fillH(g,x,x+39*dp,Math.round(y-26*.36)-1,2,C.goldHi2,1);
      inout(g,it[0].toUpperCase(),x+26*2.1,y,ok,f,f0,{dur:10,budget:3},OUT.fn);
      inout(g,it[1],x,984,{size:26,weight:300,color:C.cream80,id:'tal.fn2',tier:2},f,f0+2,{dur:10,budget:3},OUT.fn)}});
}
/* 한 줄 등장 → 유지 → 퇴장(같은 잉크 띠 안에서 — s7-people-type.js) */
function inout(g,s,x,y,o,f,f0,opt,fo){if(f<fo)return lineInX(g,s,x,y,o,f,f0,opt);return lineOutX(g,s,x,y,o,f,fo,{dur:OUT.dur,budget:OUT.budget})}
