/* 쇼릴 장면 모듈 s4-mro — [414,512) MRO 태평양 수렴 · 5,500 (스토리보드 S09)
   지도(z5) · 혜성 · 본부 점 · 설명선(z20) · 글(z30). 지도 변환은 s4-mro-kit.xf(462 이후 shared.mapT), 경로는 shared.ROUTES */
import {scene,C,E,seg,clamp,lerp,rgba,hash,text,measure,trackIn,spansLayout,hline,layer,W} from '../engine.js';
import {loadLand,land} from '../kit.js';
import {B,xf,RT,partial,stroke,tail,pushBox,quiet,dither,DITH,landMask,knock,smear,outV,lin,lout,band} from './s4-mro-kit.js';
import {ink,numLay,drum,stepH} from './s4-mro-num.js';
import {graticule,comet,pulses,bases,hqRecv} from './s4-mro-fx.js';

const LAND=450;                               /* 여섯 경로 동시 도착(b15) · 첫 자리 멈춤 */
const LA={coast:.55,fill:.09,trail:.5};        /* 지도 세기: 해안 1px · 채움 · 자취(스토리보드 .30 · .05 · .35에서 올림 — 첫 프레임부터 지도가 읽히게) · 채움 .09: 대륙 깃털이 위 가운데 빛 번짐 띠로 읽히지 않게 */
const LX=120,Y0={lab:572,h:640,num:868,rule:972,ros:1004};
const O={
  h:{size:72,weight:300,color:C.cream,track:-.02,id:'mro.h',tier:1},
  num:{size:280,weight:300,color:C.cream,track:-.05,id:'mro.num',tier:1},
  unit:{size:64,weight:300,color:C.cream80,id:'mro.unit',tier:1},
  sub:{size:30,weight:300,color:C.cream80,tier:1},
  name:{size:28,weight:700,color:C.cream,id:'mro.busan',tier:1},
  tag:{size:26,weight:300,color:C.cream80,id:'mro.busanTag',tier:2},
  base:{size:26,weight:300,color:C.cream80,id:'mro.base',tier:2},
  lab:{size:26,weight:700,color:C.cream,track:.14,id:'mro.label',tier:2,dot:C.goldHi2},   /* dot: 가운뎃점 #B5A27F(엔진 label과 같게) */
  ros:{size:26,weight:700,color:C.cream,track:.14,alpha:.28,id:'mro.roster',tier:3},
};
/* 숫자: 모두 440에 굴러 450(b15) · 452 · 454 · 456에 멈춤 — 456→490 34f(0.57s) 멈춰 읽힘 */
const NUM={t0:440,lock:[450,452,454,456],R:[2,3,3,4],sep:[440,446]};
/* 퇴장(위에서 아래로 층층이, 줄마다 자기 가림 안에서): [시작, dur, budget] */
/* 라벨 · 설명선이 먼저(485) → 제목 488 → 부제 488.5 → 숫자 · 단위 490(멈춤 바닥 456+34) — 숫자 · 단위는 496(스토리보드 lineOut 끝)에, 나머지는 495.5까지 끝 */
const XT={lab:[485,7,2],name:[485,7,2],tag:[486,7,1.5],h:[488,7,.5],sub:[488.5,6.5,.5],num:[490,5.5,.5],unit:[490,6,0]};
const CO={elb:[1278,566],end:[1300,566],tx:1312,name:574,tag:612};      /* 설명선: 본부 점 → 꺾임(22px 발) → 끝, 글 잉크는 12px 띄움 — 스토리보드보다 26px 아래(일본 본토 기지 점이 이름 윗선에 닿음) */
/* 기지 이름 자리(화면 px, 사이트 mro.html 배치를 따름) */
const LBL=[{dx:-14,dy:-12,al:'right'},{dx:16,dy:30,al:'left'},{dx:16,dy:10,al:'left'},{dx:16,dy:-10,al:'left'},{dx:-14,dy:28,al:'right'},{dx:16,dy:9,al:'left'}];   /* 경로가 떠나는 반대쪽 */

/* 지도: 들어옴 · 퇴장(가속 1−t², E.accel은 끝 기울기가 무한이라 511→512 튐), ×0.94는 mapT.k
   · 493–505에 ×1→.6(ioQuad): 올린 지도 세기(LA)를 s5 고리 · 글줄이 올라올 때 예전 세기로 되돌림 — 512에 사라지는 끝 기울기도 줄어듦 */
const mapA=f=>(f<495?seg(f,414,420):1-E.inQuad(seg(f,495,512)))*lerp(1,.6,E.ioQuad(seg(f,493,505)));
const inA=f=>seg(f,414,420);
const prog=(r,f)=>E.ioQuad(seg(f,r.f0,LAND));                    /* 경로 진행: 450에 멈춤 — ioQuad(스토리보드 ioCubic보다 일찍 떠나 혜성이 기지에 머물러 보이지 않게, 도착 모양은 같음) */
const baseA=(r,f)=>seg(f,Math.min(r.f0,428),Math.min(r.f0,428)+6);   /* 기지 점 · 이름 등장 */
/* 해안선 가림 세기: 글이 다 나간 뒤에 풀림(지도는 495부터 옅어져 보이지 않음) — 설명선 · 단위 · 명단 띠 */
const coA=f=>E.snap(seg(f,456,466))*(1-seg(f,494,496));
const unA=f=>E.snap(seg(f,456,464))*(1-seg(f,494,496));
const roA=f=>.8*seg(f,440,452)*(1-seg(f,486,498));

/* Beyond 띠 가림(한 번 구움): x<1000 1 → 1100 0(선형) × y 560→620 0→1 · 780→840 1→0(smootherstep) — s5 글줄 가림 620–780을 온전히 덮음 */
const BM={y:560,w:1100,h:280};let BMC=null;
function bandMask(){if(BMC)return BMC;BMC=document.createElement('canvas');BMC.width=BM.w;BMC.height=BM.h;const x=BMC.getContext('2d'),d=x.createImageData(BM.w,BM.h),a=d.data;
  const ss=t=>t*t*t*(t*(t*6-15)+10);
  for(let py=0;py<BM.h;py++){const y=BM.y+py+.5,ay=ss(clamp((y-560)/60))*ss(clamp((840-y)/60));
    for(let px=0;px<BM.w;px++){const ax=clamp((1100-(px+.5))/100);a[(py*BM.w+px)*4+3]=Math.round(255*ax*ay)}}
  x.putImageData(d,0,0);return BMC}

/* ── 배치(언어마다 한 번): 잉크 기준 — 대시 · 제목 · 숫자 · 부제 잉크 왼끝이 모두 x=120 ── */
let LY=null,LYS=null;
function lay(g,S){if(LYS===S)return LY;LYS=S;
  const nl=numLay(g,S['mro.num'],O.num,S['mro.unit'],O.unit,LX,1100),hi=ink(g,S['mro.h'],72,300,-.02);
  const winTop=Y0.h+Math.ceil(hi.d)+4;                                      /* 드럼 창 · 제목 가림 경계(제목 잉크 아래 +4) */
  const sa=Math.max(ink(g,S['mro.subA'],30).a,ink(g,S['mro.subB'],30).a),sd=Math.max(ink(g,S['mro.subA'],30).d,ink(g,S['mro.subB'],30).d);
  const sub=Math.round(Y0.num+nl.dsc+12+sa);                                  /* 부제 기준선: 쉼표 꼬리 아래 12px(스토리보드 932 → KO 945) */
  const ni=ink(g,S['mro.busan'],28,700),ti=ink(g,S['mro.busanTag'],26),lu=S['mro.label'].toUpperCase(),li=ink(g,lu,26,700,.14);
  const str=S['mro.roster'].toUpperCase(),P=Math.round(measure(g,str+' · ',O.ros)+O.ros.track*26);
  const kb={x:CO.tx-14,y:CO.name-ni.a-14,w:Math.max(ni.r,ti.r)+28,h:CO.tag+ti.d-CO.name+ni.a+28};
  const ui=ink(g,S['mro.unit'],64),ub={x:nl.ux-12,y:Y0.num-ui.a-12,w:ui.r+24,h:ui.a+ui.d+24},rb={x:LX,y:962,w:1800-LX,h:54};   /* 단위 잉크 · 명단 띠 */
  const KS=[[kb,coA],[ub,unA],[rb,roA]].map(([b,fn])=>({x:Math.round(b.x)-10,y:Math.round(b.y)-10,c:knock(b.w,b.h,10,10),fn}));   /* 둥근 상자 r10 · 깃털 10 */
  return LY={KS,nl,winTop,sub,subM:[Y0.num+nl.dsc+3,sub+sd+4],subX:LX-ink(g,S['mro.subA'],30).l,hx:LX-hi.l,
    hDist:(Y0.h+hi.d-(Y0.lab+8)+2)/72,subDist:(sub+sd-(Y0.num+nl.dsc+3)+2)/30,
    nx:CO.tx-ni.l,tx:CO.tx-ti.l,nDist:(CO.name+ni.d-band(CO.name,O.name)[0]+2)/28,tDist:(CO.tag+ti.d-band(CO.tag,O.tag)[0]+2)/26,
    lu,lDist:(Y0.lab+li.d-542+2)/26,uDist:(Y0.num+ink(g,S['mro.unit'],64).d-band(Y0.num,O.unit)[0]+2)/64,
    str:str+' · '+str,P}}

/* 한 줄: f0 전 등장(lin), o0부터 퇴장(lout + 옅어짐, 빠른 끝은 표본 안 나눔) */
function line(g,s,x,y,o,f,f0,inO,[o0,dur,budget],outO){
  if(f<o0)return lin(g,s,x,y,o,f,f0,inO);const D=o.size*(outO.dist||1.05),n=[...s].length;
  smear(g,f,outV(n,f,o0,dur,budget,D),(c,ff)=>lout(c,s,x,y,o,ff,o0,{dur,budget,fade:true,...outO}))}

/* ── 지도(z5): 육지 · 자취 · 기지 점 ── */
scene({id:'s4-map',from:414,to:512,z:5,
  async init(){await loadLand()},
  draw(g,f,env){const T=xf(f),a=mapA(f);if(a<=0)return;
    graticule(g,f,T,a);   /* 바다 경위선(땅 아래 · 느린 시차) */
    /* 육지(층): 해안 1px .50 · 채움 .10, 가장자리는 타원 깃털(landMask). 층은 진하게, 합성에서 .50 */
    const L=layer('s4land');L.translate(T.ax,T.ay);L.rotate(T.r);L.scale(T.S,T.S*T.sy);L.translate(-B[0],-B[1]);
    L.strokeStyle=C.cream;L.lineWidth=1/T.S;L.stroke(land());
    /* 글 아래는 해안선만 걷어 냄(선이 글을 가로지르지 않게, 채움은 그대로라 상자가 보이지 않음): 설명선 · 단위 · 명단 띠 — 글 등장 · 퇴장과 함께 */
    const Y=lay(g,env.S);L.save();L.setTransform(1,0,0,1,0,0);L.globalCompositeOperation='destination-out';
    for(const K of Y.KS){const k=K.fn(f);if(k>0){L.globalAlpha=k;L.drawImage(K.c,K.x,K.y)}}L.restore();
    L.globalCompositeOperation='destination-over';L.fillStyle=rgba(C.cream,LA.fill/LA.coast);L.fill(land());   /* 채움은 선 아래로(원래 칠 순서와 같음) */
    landMask(L,T.S,(hash(Math.round(f*4096),5)-.5)*24);   /* 표본마다 깃털 위치를 ±12px 흔듦 */
    L.setTransform(1,0,0,1,0,0);L.globalCompositeOperation='destination-out';
    /* 495 이후 s5 Beyond 글줄(x≤~1000, y 560–840 띠) 뒤 대륙 해안선을 미리 걷음: 489–499 — 북쪽 육지 · 한국 해안은 그대로 */
    const w=E.ioCubic(seg(f,489,499));if(w>0){L.globalAlpha=w;L.drawImage(bandMask(),0,BM.y);L.globalAlpha=1}
    L.globalCompositeOperation='destination-in';L.drawImage(dither(),0,0);
    g.globalAlpha=a*LA.coast/(1-DITH);g.drawImage(L.canvas,0,0);g.globalAlpha=a;
    /* 자취 1px cream .5 + 기지 점(튀어나옴 · 고리 · 숨) */
    for(const r of RT)if(f>=r.f0)stroke(g,partial(r,T,prog(r,f)),1,rgba(C.cream,LA.trail));
    bases(g,f,T);
  }});

/* ── 그래픽(z20): 혜성 · 맥동 · 본부 점(494.99까지) · 설명선 ── */
scene({id:'s4-gfx',from:414,to:495,z:20,
  draw(g,f){const T=xf(f);g.globalAlpha=inA(f);g.lineCap='round';
    /* 혜성: 금색 머리 + 빛 + 크림 꼬리(출발 5f 동안 자라고 도착 4f 전부터 줄어 점에 흡수) */
    for(const r of RT){if(f<r.f0||f>=LAND)continue;const k=clamp(Math.min((f-r.f0)/5,(LAND-f)/4));if(k*36<.5)continue;comet(g,partial(r,T,prog(r,f)),k)}
    /* 머무름 맥: 여섯 경로에서 부산으로 한 줄기씩(459–485) */
    pulses(g,f,T,1);
    const hq=T.pt(B);
    /* 맥동 두 겹(450 · 456): r 0→72, 2px, α 1→0, 12f */
    for(const t0 of [LAND,LAND+6]){const t=seg(f,t0,t0+12);if(t<=0||t>=1)continue;g.beginPath();g.arc(hq[0],hq[1],72*E.snap(t),0,Math.PI*2);g.lineWidth=2;g.strokeStyle=rgba(C.goldHi,1-t);g.stroke()}
    /* 본부 점 8px(반지름 4), 450에 8→12→8 · 머무름 맥이 닿을 때마다 살짝 받음(492까지) */
    const d=8+4*(E.snap(seg(f,LAND,LAND+3))-E.ioCubic(seg(f,LAND+3,LAND+14)))+hqRecv(f);g.beginPath();g.arc(hq[0],hq[1],d/2,0,Math.PI*2);g.fillStyle=C.goldHi;g.fill();
    /* 설명선: 살아 있는 본부 점(10px 띄움)에서 꺾임까지 · 452–462 그림, 482–490 되감음(ioCubic — 끝에서 튀지 않음, 이름이 떠나기 전 485에 대부분 걷힘) */
    const pl=E.snap(seg(f,452,462))*(1-E.ioCubic(seg(f,482,490)));
    if(pl>0){const dx=CO.elb[0]-hq[0],dy=CO.elb[1]-hq[1],dl=Math.hypot(dx,dy),s0=[hq[0]+dx/dl*10,hq[1]+dy/dl*10];
      const L1=Math.hypot(CO.elb[0]-s0[0],CO.elb[1]-s0[1]),L2=CO.end[0]-CO.elb[0],Lt=(L1+L2)*pl;
      g.beginPath();g.moveTo(s0[0],s0[1]);if(Lt<=L1)g.lineTo(lerp(s0[0],CO.elb[0],Lt/L1),lerp(s0[1],CO.elb[1],Lt/L1));else{g.lineTo(CO.elb[0],CO.elb[1]);g.lineTo(CO.elb[0]+Lt-L1,CO.end[1])}
      g.lineWidth=1;g.lineCap='butt';g.strokeStyle=rgba(C.cream,.6);g.stroke()}
  }});

/* ── 글(z30): 기지 이름 · 왼쪽 아래 묶음 · 설명선 글 · 명단 ── */
scene({id:'s4-text',from:414,to:498,z:30,
  draw(g,f,env){const S=env.S,T=xf(f),Y=lay(g,S),nl=Y.nl,sz=nl.on.size;g.globalAlpha=inA(f);
    /* 기지 이름: 기지 점과 함께 등장(늦게 떠나는 가까운 기지도 428부터 — 읽힐 시간), 닻이 빨라지기 전 437–442 물러남(질감) */
    if(f<442){const h=stepH(f),Ta=xf(f-h/2),Tb=xf(f+h/2),v=Math.max(...RT.map(r=>Math.hypot(Tb.pt(r.p0)[0]-Ta.pt(r.p0)[0],Tb.pt(r.p0)[1]-Ta.pt(r.p0)[1])))/h;   /* 닻이 움직이면 표본 안을 나눠 겹상 없이 */
      smear(g,f,v,(c,ff)=>{const Tf=xf(ff);for(const r of RT){let a=baseA(r,ff)*(1-E.inQuad(seg(ff,437,442)));if(a<=0)continue;const o=Tf.pt(r.p0),L=LBL[r.k],s=S['mro.base'][r.k];
        const x=v>2?o[0]+L.dx:Math.round(o[0]+L.dx),y=Math.round(o[1]+L.dy),w=measure(c,s,O.base),x0=L.al==='right'?x-w:x,y0=y-26*.8;
        a*=clamp(Math.min(x0-96,1824-x0-w,y0-60,1020-y0-26)/32);if(a>0)text(c,s,x,y,{...O.base,align:L.al,alpha:a})}},.5)}   /* 멈춰 있으면 정수 화소, 움직이면 소수(나눈 사본이 겹치지 않게) · SAFE 가장자리 32px 안에서 사라짐(확대로 밖으로 나가는 알래스카) */
    /* 라벨: 자간 등장 424–442(엔진 상자는 id가 없어 직접 기록) · 퇴장 487 */
    if(f<XT.lab[0]){const p=seg(f,424,442);quiet(()=>trackIn(g,S['mro.label'],LX,Y0.lab,{size:26},p));pushBox(g,'mro.label',Y.lu,O.lab,LX,Y0.lab,26*2.1+measure(g,Y.lu,O.lab),g.globalAlpha*clamp(p*1.6),2)}
    else labelOut(g,Y,f);
    /* 제목: 가림 [라벨 아래 580, 제목 잉크 아래] — 등장 · 퇴장 모두 라벨과 숫자 창에 닿지 않음 */
    line(g,S['mro.h'],Y.hx,Y0.h,O.h,f,426,{dur:14,budget:8,mask:[Y0.lab+8,Y.winTop]},XT.h,{mask:[Y0.lab+8,Y.winTop],dist:Y.hDist});
    /* 숫자: 드럼 440–456, 퇴장 490–495.5(창 안에서 위로 .5em) */
    if(f>=NUM.t0&&f<XT.num[0]+XT.num[1]+XT.num[2]){drum(g,nl,Y0.num,f,{...NUM,out0:XT.num[0],outDur:XT.num[1],outSt:XT.num[2],outD:.5*sz,alpha:E.ioQuad(seg(f,440,447)),winTop:Y.winTop});
      pushBox(g,'mro.num',S['mro.num'],nl.on,LX,Y0.num,(nl.suf?nl.sx+ink(g,nl.suf,nl.so.size).r:nl.lastR)-LX,f<XT.num[0]?g.globalAlpha*E.ioQuad(seg(f,440,447)):0,1,[Y0.num-nl.capA,nl.capA+nl.dsc])}
    /* 단위: 456–464 */
    if(f<XT.unit[0]){const ua=E.snap(seg(f,456,464));if(ua>0)text(g,S['mro.unit'],nl.ux,Y0.num,{...O.unit,alpha:ua})}
    else line(g,S['mro.unit'],nl.ux,Y0.num,O.unit,f,0,{},XT.unit,{dist:Y.uDist});
    /* 부제: 창정비 · 성능개량 누적 | 50여 년 · 2026.09 기준 — 가림 위끝은 쉼표 꼬리 아래 */
    const sp=spansLayout(g,[{s:S['mro.subA'],o:{...O.sub,id:'mro.subA'}},{s:S['mro.subB'],o:{...O.sub,id:'mro.subB'}}],Y.subX,{gap:16,divider:'hair'});
    sp.list.forEach((it,i)=>{if(it.div){const a=1-seg(f,XT.sub[0],XT.sub[0]+6),w=24*E.snap(seg(f,458,466));if(w>0&&a>0)hline(g,it.x,it.x+w,Y.sub-O.sub.size*.34,{color:C.cream,alpha:.28*a});return}
      line(g,it.s,it.x,Y.sub,it.o,f,i?459:458,{dur:12,budget:4,mask:Y.subM},XT.sub,{mask:Y.subM,dist:Y.subDist})});   /* 두 조각 458 · 459(스토리보드 458) — 기준 문구가 숫자와 함께 읽힘 */
    /* 설명선 글(잉크 왼끝 1312) */
    line(g,S['mro.busan'],Y.nx,CO.name,O.name,f,456,{dur:14,budget:6},XT.name,{dist:Y.nDist});
    line(g,S['mro.busanTag'],Y.tx,CO.tag,O.tag,f,459,{dur:14,budget:6},XT.tag,{dist:Y.tDist});
    roster(g,Y,f);
  }});

/* 라벨 퇴장: 대시는 줄고 글은 자기 띠 [542,578] 안에서 위로 */
function labelOut(g,Y,f){const [o0,dur,budget]=XT.lab,e=E.accel(seg(f,o0,o0+dur));if(e<1)hline(g,LX+39*e,LX+39,Y0.lab-26*.36,{w:2,color:C.goldHi2,alpha:1-e});
  const x=LX+26*2.1,D=26*Y.lDist,opt={dur,budget,mask:[542,578],dist:Y.lDist,fade:true};
  smear(g,f,outV(Y.lu.length,f,o0,dur,budget,D),(c,ff)=>lout(c,Y.lu,x,Y0.lab,O.lab,ff,o0,opt))}
/* 명단: 위 가는 선 + 15기종을 ' · '로 이은 고리(두 벌), −3px/f 정수 흐름. 글은 선 끝을 따라 드러남(40px 깃털) · 양끝 깃털(층)
   이음매(… CH-46 · F-16 …)가 470에 x≈1200 — 목록이 끝나지 않고 돈다. 창 1680px + 흐름 174px < 고리 2041px(EN 2153)라 ~190px(EN ~300)는 끝내 안 보임(질감) */
function roster(g,Y,f){const rl=E.snap(seg(f,440,456)),ra=1-seg(f,486,498),re=lerp(LX,1800,rl);if(rl>0&&ra>0)hline(g,LX,re,Y0.rule,{color:C.cream,alpha:.12*ra});
  const a=seg(f,440,452)*ra;if(a<=0)return;const o=O.ros,x0=Math.round(1200-Y.P+54)-3*(f-452);
  const L=layer('s4ros');quiet(()=>text(L,Y.str,x0,Y0.ros,{...o,alpha:1}));
  L.globalCompositeOperation='destination-in';const gr=L.createLinearGradient(LX,0,1800,0);[[0,0],[.03,1],[.97,1],[1,0]].forEach(([t,v])=>gr.addColorStop(t,rgba(C.night,v)));
  L.fillStyle=gr;L.fillRect(0,Y0.ros-40,W,60);
  if(rl<1){const gr2=L.createLinearGradient(re,0,re+40,0);gr2.addColorStop(0,rgba(C.night,1));gr2.addColorStop(1,rgba(C.night,0));L.fillStyle=gr2;L.fillRect(0,Y0.ros-40,W,60)}   /* 선 끝까지만 */
  g.save();g.globalAlpha*=a*o.alpha;g.drawImage(L.canvas,0,0);g.restore();
  pushBox(g,'mro.roster',Y.str,o,LX,Y0.ros,Math.min(1800,re+40)-LX,g.globalAlpha*a*o.alpha,3)}
