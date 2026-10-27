/* 쇼릴 장면 모듈 s3-uav — [324,420) 무인기: 고도 다이얼(S07) → 나선 목록(S08) → 위로 휙(414–420)
   330: S06 로터 원판(P*, r160)이 레이더 셋째 고리로 이어짐 · 9개 체계가 운용고도 순으로 멈춤을 넘어가 390(b13)에 고정 */
import {scene,C,E,W,H,seg,lerp,clamp,loglerp,TAU,rgba,need,img,font,text,measure,fitSize,spansLayout,odoValue,vline,hline,grid,layer} from '../engine.js';
import {P} from '../shared.js';
import {T,LOCK,stepAt,whipY,whipA,craft,HD,HX,HY,spiral,radarFill,radarLines,ladder,tickY,rowBox,RX,RULE,NM,NB,CD,CHIP,CHIP_PAD,CHIP_Y,CHIP_H,box1} from './s3-uav-kit.js';
import {sub} from './s3-uav-blur.js';
import {bandOf,clipY,lineInK,lineOutK,trackInId,textNB} from './s3-uav-type.js';

const BG='/web/img/bg/b7.webp';need(BG);
const X=120;
const O={
  h:{size:132,weight:300,color:C.cream,track:-.035,id:'uav.h',tier:1},
  num:{size:200,weight:300,color:C.cream,track:-.05,id:'uav.num',tier:1},
  cnt:{size:30,weight:700,color:C.cream,id:'uav.count',tier:1},
  ord:{size:26,weight:300,color:C.cream80,id:'uav.order',tier:2},
  fy:{size:26,weight:700,color:C.goldHi,id:'uav.fact',tier:2},
  ft:{size:26,weight:300,color:C.cream80,id:'uav.fact',tier:2},
  code:{size:96,weight:300,color:C.cream,id:'uav.code',tier:3},
};
const Y={lab:600,h:740,num:924,cnt:868,ord:910,fact:984,code:900};
const CM=[820,926];   /* 큰 코드 가림 띠(스토리보드 820–910 → 'g' 내림 때문에 926) */
/* 가림 띠 안 등장 · 퇴장(띠 아래 = 잉크 끝 + 2) */
const inM=(g,s,x,y,o,f,f0,opt={})=>f<f0||!s?0:lineInK(g,s,x,y,o,f,f0,opt.mask||bandOf(g,y,o,s),opt);
/* 퇴장 거리 = 띠 높이(글자 아래 끝이 띠 위를 완전히 넘어감 — 마지막 프레임에 조각이 남아 끊기지 않게) */
const outM=(g,s,x,y,o,f,f0,opt={})=>{const m=opt.mask||bandOf(g,y,o,s);return lineOutK(g,s,x,y,o,f,f0,m,{dist:(m[1]-m[0])/o.size,...opt})};
function whip(g,f){g.translate(0,whipY(f));g.globalAlpha*=whipA(f)}
/* 상자 둘레 F px 부드러운 띠(가장자리 4개 선형 + 모서리 4개 원형 그러데이션, smoothstep 근사) — ctx.filter blur는 그리기 이력에 따라 1 LSB가 달라져(det) 쓰지 않음 */
const FS=[[0,1],[.25,.84],[.5,.5],[.75,.16],[1,0]];
function soft(x,bx,by,bw,bh,F){const st=gr=>{for(const [t,a] of FS)gr.addColorStop(t,rgba(C.night,a));return gr};
  const lin=(x0,y0,x1,y1,rx,ry,rw,rh)=>{x.fillStyle=st(x.createLinearGradient(x0,y0,x1,y1));x.fillRect(rx,ry,rw,rh)};
  lin(bx,0,bx-F,0,bx-F,by,F,bh);lin(bx+bw,0,bx+bw+F,0,bx+bw,by,F,bh);lin(0,by,0,by-F,bx,by-F,bw,F);lin(0,by+bh,0,by+bh+F,bx,by+bh,bw,F);
  for(const [cx,cy,sx,sy] of [[bx,by,-1,-1],[bx+bw,by,1,-1],[bx,by+bh,-1,1],[bx+bw,by+bh,1,1]]){x.fillStyle=st(x.createRadialGradient(cx,cy,0,cx,cy,F));x.fillRect(sx<0?cx-F:cx,sy<0?cy-F:cy,F,F)}}
/* 광학 정렬: 첫 글자 잉크 왼쪽을 x에(큰 글자의 왼쪽 여백 보정) */
function inkX(g,x,s,o){g.save();g.font=font(o.size,o.weight||300);g.letterSpacing='0px';const m=g.measureText([...s][0]);g.restore();return x+m.actualBoundingBoxLeft}

/* ── 배경: 어두운 바다(b7, cover α.55) + 100px 격자(α.07) — 324–336 들어옴, 격자 8px/f · 그림 3px/f 위로 ── */
scene({id:'s3-bg',from:324,to:420,z:5,
  draw(g,f){const a=E.ioQuad(seg(f,324,336));if(a<=0)return;whip(g,f);g.globalAlpha*=a;
    const im=img(BG),h=im.height*W/im.width,y0=-(h-H)/2-3*(f-372);
    g.save();g.globalAlpha*=.55;g.drawImage(im,0,y0,W,h);g.restore();
    grid(g,100,{ox:16,oy:-8*(f-330),alpha:.07,y0:0,y1:H+330})}});   /* 세로선 하나가 P*.x(1216)를 지남 */

/* ── 그래픽: 레이더(글 자리 · 나선 고리 안 비움) · 고도 자 · 기체 ── */
scene({id:'s3-gfx',from:329.5,to:420,z:20,
  draw(g,f,env){sub(g,f,(x,t)=>gfx(x,t,env))}});
function gfx(g,f,env){const en=env.LANG==='en';whip(g,f);
    const rows=ladder(g,f,env.S),Q=spiral(f);
    /* 글 줄 상자 비움(쓸기 · 레이더 선 공용) */
    const cut=x=>{x.globalCompositeOperation='destination-out';x.fillStyle=C.night;
      for(const r of rows)if(r.a>.005){x.globalAlpha=r.a;const [bx,by,bw,bh]=rowBox(r);x.fillRect(bx,by,bw,bh);
        /* 칩 줄: 둘레 14px를 부드럽게 한 번 더 — 셋째 고리가 칩 앞에서 뚝 끊기지 않고 스며 사라짐(칩이 고리에 꿰인 듯 보이지 않게) */
        if(r.chip){x.globalAlpha=r.a*r.chip.a;soft(x,bx,by,bw,bh,14)}}
      x.globalAlpha=1;x.globalCompositeOperation='source-over'};
    radarFill(g,f,en,cut);const L=layer('s3R');radarLines(L,f,en);cut(L);L.globalCompositeOperation='destination-out';L.fillStyle=C.night;
    /* 레이더 선은 각 거리 고리 2px 앞에서 멈춤(고리 · 기체 위를 가로지르지 않게) */
    for(const q of Q)if(q.ra>0&&q.r>0){L.globalAlpha=q.ra;L.beginPath();L.arc(q.x,q.y,q.r+2,0,TAU);L.fill()}
    L.globalAlpha=1;L.globalCompositeOperation='source-over';g.drawImage(L.canvas,0,0);
    rule(g,f);crafts(g,f,Q)}

/* 고도 자: x=1800 1px(α.28) · 눈금 22px(이름 간격 110의 1/5 — 이름과 맞물려 굴러감) · 금색 지시선 1560–1800 @468 + 10px 삼각 */
function rule(g,f){const ein=E.snap(seg(f,330,346)),e8=E.snap(seg(f,390,400));if(ein<=0)return;
  const y0=lerp(lerp(468,150,ein),296,e8),y1=lerp(lerp(468,900,ein),616,e8);
  vline(g,RULE,y0,y1,{alpha:.28});
  const ta=.2*ein*(1-E.accel(seg(f,390,396)));
  if(ta>0){g.save();g.fillStyle=rgba(C.cream,ta);for(let j=-20;j<=60;j++){const y=tickY(j,f,e8);if(y>=y0&&y<=y1)g.fillRect(RULE-8,y,8,1)}g.restore()}
  const gl=E.snap(seg(f,334,346))*(1-E.snap(seg(f,390,395)));if(gl>0)hline(g,RULE-240*gl,RULE,468,{color:C.goldHi});   /* 목록 줄(KUS-FT)이 468에 닿기 전에 자 쪽으로 걷힘 */
  const ta2=E.snap(seg(f,336,344))*(1-seg(f,390,394));
  if(ta2>0){g.save();g.globalAlpha*=ta2;g.fillStyle=C.goldHi;g.beginPath();g.moveTo(RULE+2,468.5);g.lineTo(RULE+12,463.5);g.lineTo(RULE+12,473.5);g.closePath();g.fill();g.restore()}}

/* 기체: S07 현재 기체(P*, 긴 변 240) → S08 나선(84) — 마지막(Digital MRO)은 390에 고정된 뒤 제자리(나선 8번)로 줄어듦 */
function crafts(g,f,Q){if(f<T[0])return;
  for(let i=0;i<9;i++){if(f<T[i])break;const nx=i<8?T[i+1]:null;if(nx!==null&&f>=nx+2)continue;if(i===8&&f>=LOCK)break;
    const ei=E.snap(seg(f,T[i],T[i]+4));let d=-90*(1-ei),a=ei;
    if(nx!==null){const xs=seg(f,nx-1,nx+2),xo=E.accel(xs);d+=90*xo;a*=1-E.outCubic(xs)}   /* 나가는 기체는 빨리 흐려져 겹침(2f)이 어지럽지 않게 */
    craft(g,i,P.x+HX*d,P.y+HY*d,HD,{alpha:a})}
  if(!Q.length)return;
  /* 거리 고리(r48, α.30)는 합집합 윤곽으로 — 이웃 고리끼리 가로지르지 않게(층에 긋고 모든 원판 안쪽을 지움) */
  const R=layer('s3ring');R.lineWidth=1;
  for(const q of Q){const a=.3*q.ra;if(a<=0||q.r<=0)continue;R.strokeStyle=rgba(C.cream,a);R.beginPath();R.arc(q.x,q.y,q.r,0,TAU);R.stroke()}
  R.globalCompositeOperation='destination-out';R.fillStyle=C.night;
  for(const q of Q)if(q.r>1){R.beginPath();R.arc(q.x,q.y,q.r-.5,0,TAU);R.fill()}
  g.drawImage(R.canvas,0,0);
  for(const q of Q)craft(g,q.i,q.x,q.y,q.ang,{L:q.L,k:q.k,alpha:q.a,tr:q.tr})}

/* ── 글 ── */
scene({id:'s3-text',from:330,to:420,z:30,
  draw(g,f,env){sub(g,f,(x,t)=>txt(x,t,env))}});
function txt(g,f,env){const S=env.S,EN=env.LANG==='en';whip(g,f);
    trackInId(g,S['uav.label'],X,Y.lab,{id:'uav.label',tier:2},seg(f,332,350));
    /* 휙(416–) 동안 제목 · '9' · 캡션은 검사 tier 3(질감) — 흐려지며(α≤.43) 번져 Z-OV를 지나가는 퇴장이라 읽는 글이 아님(움직이는 사다리 이름과 같은 규칙) */
    const tw=o=>f>=416?{...o,tier:3}:o,ho=tw(EN?fitSize(g,S['uav.h'],{...O.h,track:-.02},720,72):O.h),on=tw(O.num);
    /* 영문: 줄인 제목(79px)을 라벨과 '9' 사이에 — 라벨 기준선 → 대문자 위 55px(아래 '9'까지 ≈68px), 기준선 712(편차 보고) */
    const yh=EN?Y.lab+55+Math.round(.72*ho.size):Y.h;
    inM(g,S['uav.h'],inkX(g,X,S['uav.h'],ho),yh,ho,f,334,{dur:16,budget:6});
    /* '9': 390–402 cream→금→cream(고정 강조) — 글자색을 매 표본 바꾸지 않고 금색 '9'를 α tn으로 겹침
       (바뀌는 색의 200px 글자는 그리기 이력에 따라 1 LSB가 달라졌음 — det) · 겹친 것은 검사 상자 없이 */
    const tn=Math.sin(Math.PI*seg(f,390,402)),x9=inkX(g,X,S['uav.num'],O.num),y9=Y.num;
    inM(g,S['uav.num'],x9,y9,on,f,338,{dur:12,budget:0});
    if(tn>0)textNB(g,S['uav.num'],x9,y9,{...O.num,color:C.goldHi,alpha:tn});
    const xc=Math.round(x9+measure(g,S['uav.num'],O.num)+28);
    inM(g,S['uav.count'],xc,Y.cnt,tw(O.cnt),f,342,{dur:14,budget:8});
    inM(g,S['uav.order'],xc,Y.ord,O.ord,f,346,{dur:14,budget:8});
    fact(g,f,S);code(g,f,S);rows(g,f,S)}

/* 사실 줄: 연도(Bold 금) + 글 — A 344 → 385–391에 B로. 연도는 '20' 그대로 주행거리계 2014→2026(385–391, outQuart).
   글은 차례로: A 퇴장 385(3f · 물결 .5f, inQuad — 388.5에 다 나감) → B 등장 388.5(8f · 물결 2f — 398.5에 앉음)
   — 어느 x에서나 A 글자가 띠를 떠난 뒤 B 글자가 들어옴(겹침 없음) · B 읽는 시간을 2f 더 벌어 둠 */
const FA=385,FB=388.5;
function fact(g,f,S){const lay=v=>spansLayout(g,[{s:v[0],o:O.fy},{s:v[1],o:O.ft}],X,{gap:14}).list;
  const A=lay(S['uav.factA']),B=lay(S['uav.factB']),m=bandOf(g,Y.fact,O.ft,[A[1].s,B[1].s]);
  if(f<FA){inM(g,A[0].s,A[0].x,Y.fact,O.fy,f,344,{dur:10,budget:2,mask:m});inM(g,A[1].s,A[1].x,Y.fact,O.ft,f,346,{dur:10,budget:6,mask:m});return}
  /* 연도: 고정폭 숫자라 2014 · 2026 자리가 같음 — 바뀌는 두 자리만 굴러감, 다 돈 뒤엔 text() */
  const y0=+S['uav.factA'][0],y1=+S['uav.factB'][0],ey=seg(f,FA,FA+6);
  if(ey<1)odoValue(g,lerp(y0,y1,E.outQuart(ey)),A[0].x,Y.fact,O.fy,{target:y1,grouping:false});else text(g,B[0].s,B[0].x,Y.fact,O.fy);
  outM(g,A[1].s,A[1].x,Y.fact,O.ft,f,FA,{dur:3,budget:.5,ease:E.inQuad,mask:m});
  inM(g,B[1].s,B[1].x,Y.fact,O.ft,f,FB,{dur:8,budget:2,mask:m})}

/* 큰 코드: 칸마다 드럼처럼(옛것 위로 · 새것 아래에서, 5f snap) · Shipborne은 오른쪽 16px에 칩 · 390–398 위로 퇴장 */
const CX=P.x,D=104;
function chip(g,s,x,b,a){const w=measure(g,s,CHIP)+CHIP_PAD*2;box1(g,x,b-CHIP_Y,w,CHIP_H,C.goldHi,a);text(g,s,x+CHIP_PAD,b,{...CHIP,alpha:a});return w}
function codeAt(g,S,i,y,a=1){const s=S['uav.code'][i],o={...O.code,align:'center'};text(g,s,CX,y,{...o,alpha:a});
  if(i===7)chip(g,S['uav.chip'],Math.round(CX+measure(g,s,o)/2+16),y,a)}
function code(g,f,S){const k=stepAt(f);if(k<0)return;
  if(f>=LOCK){outM(g,S['uav.code'][8],CX,Y.code,{...O.code,align:'center'},f,LOCK,{dur:6,budget:2,mask:CM});return}   /* 398에 다 빠짐 */
  g.save();clipY(g,CM);const u=E.snap(seg(f,T[k],T[k]+5));   /* 가림 가장자리에서 조각이 떠 보이지 않게 위치와 함께 살짝 흐림 */
  if(k>0&&u<1)codeAt(g,S,k-1,Y.code-u*D,clamp((1-u)*2));codeAt(g,S,k,Y.code+(1-u)*D,clamp(u*2));g.restore()}

/* 사다리 이름(S07, Bold ↔ Light 교차) → 목록(S08: 이름 + 12 + 코드, Shipborne은 이름 왼쪽에 칩) */
function rows(g,f,S){const tier=f>=400?1:3;for(const r of ladder(g,f,S)){if(r.a<=.005)continue;
  /* 굵기 교차: 한 글이므로 검사 상자는 짙은 쪽만 */
  const aB=r.a*r.wB,aM=r.a*(1-r.wB);
  if(r.wB>0)(aB>=aM?text:textNB)(g,r.name,r.nr,r.b,{...NB,align:'right',alpha:aB,tier});
  if(r.wB<1)(aM>aB?text:textNB)(g,r.name,r.nr,r.b,{...NM,align:'right',alpha:aM,tier});
  if(r.eK>0)text(g,r.code,RX,r.b+3*(1-r.eK),{...CD,align:'right',alpha:r.a*r.eK});   /* 코드: 제자리 흐림 + 3px 솟음(394–400) */
  if(r.chip)chip(g,S['uav.chip'],r.chip.x,r.b,r.chip.a*r.a)}}
