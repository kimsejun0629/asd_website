/* 쇼릴 장면 모듈 s2-lock — [179.5,329.5) 부위 고정 셔터: 737 · A320(5,000) · A330 · A350 · AH-6 → 로터 원판(스토리보드 S02–S06)
   조준선은 P*에서 움직이지 않고, 컷마다 도장 기체가 바뀌며 대한항공이 만드는 부위(금색)만 그 자리에 남는다 */
import {scene,C,E,seg,lerp,text,measure,glyphs,label,fitSize,brackets,hline,vline,rgba} from '../engine.js';
import {P,DISC} from '../shared.js';
import {blurAt} from '../blur.js';
import {linAvg} from './s2-lock-ss.js';
import {CUT,END,cutOf,bg,shot,post3d} from './s2-lock-cam.js';
import {odometer,T320,pos320} from './s2-lock-odo.js';
import {textSmear,lineSmear,span,fcOf,inkL,exitFade} from './s2-lock-smear.js';

const F0=CUT[0];
const X=120,LBL_Y=732,NAME_Y=868,PART_Y=932,FLEET_Y=1000,NUM_Y=910;
/* 글 스타일 */
const O={
  name:{size:150,weight:300,color:C.cream,track:-.03,id:'s2.name',tier:1},
  part:{size:30,weight:300,color:C.cream80,id:'s2.part',tier:2},
  year:{size:26,weight:300,color:C.cream80,id:'s2.year',tier:2},
  note:{size:26,weight:700,color:C.goldHi2,id:'s2.note',tier:2},
  fleet:{size:26,weight:700,track:.14,color:C.cream,tier:3,id:'s2.fleet'},
  num:{size:200,weight:300,color:C.cream,track:-.05,id:'s2.num',tier:1},
  kick:{size:30,weight:700,color:C.cream,id:'s2.kick',tier:1},
  anote:{size:30,weight:300,color:C.cream80,id:'s2.anote',tier:2},
  mile:{size:26,weight:700,color:C.cream,track:.04,id:'s2.mile',tier:3},
};
/* 글줄 등장 · 퇴장: 고정 띠 안에서 글자별로(엔진 lineIn · lineOut 시간표), 움직임은 이 프레임 셔터 전체의 세로 번짐(s2-lock-smear)
   퇴장 거리 1.35em: 내림(Latin 아래 꼬리 · 한글 받침)까지 띠 위로 빠진 뒤에 끝남(끝 순간 잔조각이 톡 사라지지 않게) */
const bandOf=(y,o)=>[y-o.size*.92*1.12,y+o.size*.3];
const inM=(g,s,x,y,o,f,f0,opt={})=>lineSmear(g,s,x,y,o,f,f0,{mask:bandOf(y,o),...opt,mode:'in'});
const outM=(g,s,x,y,o,f,f0,opt={})=>lineSmear(g,s,x,y,o,f,f0,{mask:bandOf(y,o),dist:1.35,...opt,mode:'out'});
const mix=(a,b,t)=>{const h=s=>{const n=parseInt(s.slice(1),16);return [n>>16&255,n>>8&255,n&255]};const p=h(a),q=h(b);return '#'+p.map((v,i)=>Math.round(lerp(v,q[i],t)).toString(16).padStart(2,'0')).join('')};   /* 두 색 사이(#rrggbb, sRGB) */

/* ── 3D: 배경 + 기체(부위 금색) + 로터 원판 ──
   표본 하나를 제 몫 구간(셔터/n) 안의 K 자세로 나눠 선형광 평균(s2-lock-ss) — 자세는 모두 f의 함수
   · 컷 뒤 c+.5 · c+1.5 · c+2.5: 카메라 펀치가 가장 빨라 표본 사이가 벌어짐 → K 3 · 3 · 2(표본 8장이 24 · 24 · 16장처럼)
   · AH-6 287–317: 로터 끝 ~87px/f, 12장이면 날 사본 간격 ~3.6px → K 2(24장처럼) */
const subK=f=>{const c=fcOf(f),d=c-CUT[cutOf(c)];return d<2?3:d<3?2:c<=317&&cutOf(c)===4?2:1};
function draw3d(g,t,GL){const s=shot(GL,t);s.A.xr(...s.xr);const undo=post3d(GL,s);g.drawImage(GL.render(s.shots,s.cam,{exposure:s.exposure}),0,0);undo();return s}
scene({id:'s2-3d',from:F0,to:END,z:10,
  draw(g,f,env){const GL=env.GL;
    bg(g,1-seg(f,321,END));   /* 329.5에 0 — 그 아래 s3 배경(324–336)과 겹쳐 바뀜 */
    const K=subK(f);let s;
    if(K===1)s=draw3d(g,f,GL);
    else{const b=blurAt(fcOf(f)),w=b.shutter/b.n;linAvg(g,K,(x,j)=>{draw3d(x,f+((j+.5)/K-.5)*w,GL)});
      s=shot(GL,f);GL.setCam(s.shots,s.cam)}   /* 원판 투영은 표본 시각 f의 자세로 */
    if(s.i===4)disc(g,f,GL,s)}});

/* 로터 원판: 투영된 로터 원(타원) → 끝에서 P* 중심 r160 원으로 정확히 맞춤(허브에서 본 화면 각도 그대로 반지름만 옮김) */
function disc(g,f,GL,s){const a=seg(f,316,326);if(a<=0)return;const A=s.A,hub=A.rotorHub,R=A.rotorR,n=120,pts=[];
  const k=E.ioCubic(seg(f,324,END)),[hx,hy]=GL.project(A,hub),cx=lerp(hx,P.x,k),cy=lerp(hy,P.y,k);
  for(let j=0;j<n;j++){const t=j/n*Math.PI*2;const [x,y]=GL.project(A,[hub[0]+R*Math.cos(t),hub[1],hub[2]+R*Math.sin(t)]);
    const dx=x-hx,dy=y-hy,d=Math.hypot(dx,dy)||1;const rr=lerp(d,DISC.r,k);pts.push([cx+dx/d*rr,cy+dy/d*rr])}
  g.save();g.beginPath();pts.forEach((p,j)=>j?g.lineTo(...p):g.moveTo(...p));g.closePath();
  g.fillStyle=rgba(C.cream,.08*a);g.fill();g.lineWidth=1;g.strokeStyle=rgba(C.cream,.5*a);g.stroke();g.restore()}

/* ── 조준선: 104×104 괄호(팔 22, 2px 금색) + 1px 눈금 ±18(가운데 10 비움) — 컷마다 1.3→1 · 8°→0(6f, snap)
   밑받침: 같은 경로에 night α.35(괄호 4px · 눈금 3px) — 회색 배 페어링 · 동체 위에서도 대비 유지
   괄호 스냅은 P* 둘레 작은 층에 이 프레임 셔터 전체를 K장 더해(lighter = 덮임 평균) 번짐 → 표본마다 같은 그림 ── */
const BR=document.createElement('canvas');BR.width=BR.height=256;const BX=BR.getContext('2d'),BO=[P.x-128,P.y-128];
const bpose=(t,c)=>{const u=E.snap(seg(t,c,c+6));return [(1-u)*8*Math.PI/180,lerp(1.3,1,u)]};   /* [회전, 배율] */
const corner=([r,k])=>[k*52*(Math.sin(r)-Math.cos(r)),-k*52*(Math.sin(r)+Math.cos(r))];   /* 왼쪽 위 모서리(P* 기준) */
function bracketLayer(g,f,c,lw,color,alpha){const fc=fcOf(f),q0=bpose(fc-.25,c),q1=bpose(fc+.25,c),[x0,y0]=corner(q0),[x1,y1]=corner(q1);
  const d=Math.hypot(x1-x0,y1-y0),K=d<.5?1:Math.min(32,Math.ceil(d/.6)+1);
  BX.setTransform(1,0,0,1,0,0);BX.clearRect(0,0,256,256);BX.globalCompositeOperation=K>1?'lighter':'source-over';
  for(let j=0;j<K;j++){const [r,k]=K>1?bpose(fc-.25+(j+.5)/K*.5,c):[(q0[0]+q1[0])/2,(q0[1]+q1[1])/2];
    BX.save();BX.translate(128,128);BX.rotate(r);BX.scale(k,k);BX.translate(-128,-128);brackets(BX,76,76,104,104,22,{lw,color:'#ffffff',alpha:1/K});BX.restore()}
  BX.globalCompositeOperation='source-in';BX.fillStyle=color;BX.fillRect(0,0,256,256);BX.globalCompositeOperation='source-over';   /* 흰 덮임 → 색(낮은 알파 누적의 색 반올림 오차 없게) */
  g.save();g.globalAlpha*=alpha;g.drawImage(BR,BO[0],BO[1]);g.restore()}
scene({id:'s2-ui',from:F0,to:END,z:20,
  draw(g,f){const a=1-E.accel(seg(f,316,322));if(a<=0)return;const c=CUT[cutOf(f)];
    g.save();g.globalAlpha=a;
    bracketLayer(g,f,c,4,C.night,.35);bracketLayer(g,f,c,2,C.goldHi,1);
    const ticks=(w,o,e)=>{hline(g,P.x-18-e,P.x-5+e,P.y,{w,...o});hline(g,P.x+5-e,P.x+18+e,P.y,{w,...o});vline(g,P.x,P.y-18-e,P.y-5+e,{w,...o});vline(g,P.x,P.y+5-e,P.y+18+e,{w,...o})};
    ticks(3,{color:C.night,alpha:.35},1);ticks(1,{color:C.cream,alpha:.6},0);
    g.restore()}});

/* ── 글 ── */
const TYPE=[   /* 컷별: 이름 · 부위 · 연도 · 덧붙임 */
  {name:'t737.name',part:'t737.part',year:'t737.since'},
  {year:'a320.since'},
  {name:'a330.name',part:'a330.part',year:'a330.since'},
  {name:'a350.name',part:'a350.part',year:'a350.since',note:'a350.note'},
  {name:'ah6.name',part:'ah6.part',year:'ah6.since'},
];
const rise=(f,c,o)=>(1-E.snap(seg(f,c,c+4)))*.35*o.size*.72;   /* 컷 순간 4f 미세 상승(캡 높이 .35) */

scene({id:'s2-text',from:F0,to:END,z:30,
  draw(g,f,env){const S=env.S,i=cutOf(f),c=CUT[i],T=TYPE[i],c0=Math.ceil(c);
    /* 끝(AH-6): 320–327.5 퇴장 — 328 프레임(표본 327.75~)엔 남지 않게 */
    const out=seg(f,320,327.5),outA=1-E.accel(out);
    /* 라벨 줄: AEROSTRUCTURES(s1과 같은 자리) + 연도(컷마다 바로 바뀜) + A350 비고. 퇴장은 이름과 같은 방향(위로 8px) */
    g.save();if(out>0){g.globalAlpha=outA;g.translate(0,-8*E.accel(out))}
    const ls=S['aero.label'];label(g,ls,X,LBL_Y,{id:'aero.label',tier:2});
    const le=X+26*2.1+measure(g,ls.toUpperCase(),{size:26,weight:700,track:.14});
    const yx=le+32,yw=text(g,S[T.year],yx,LBL_Y,O.year);
    if(T.note)text(g,S[T.note],yx+yw+24,LBL_Y,O.note);
    g.restore();
    /* 편대 줄(179.5–326): 활성 기종만 금색 */
    fleet(g,f,S,i);
    if(i===1){a320(g,f,S);return}
    const nm=S[T.name],pt=S[T.part],no=fitSize(g,nm,O.name,1100),po=fitSize(g,pt,O.part,1100);
    const nx=X+inkL(nm,no),px=X+inkL(pt,po);   /* 광학 정렬: 잉크 왼쪽이 모든 컷에서 x 120(자리 고정) */
    if(i===4&&fcOf(f)>=320){   /* 프레임 단위로 갈래(한 프레임의 표본이 같은 경로) */
      outM(g,nm,nx,NAME_Y,no,f,320,{dur:5.5,budget:2,dist:1.2,mask:[LBL_Y+14,NAME_Y+no.size*.3]});outM(g,pt,px,PART_Y,po,f,320,{dur:5.5,budget:2});return}
    /* 이름: 미세 상승은 이 프레임 셔터 전체의 세로 번짐으로(표본 수와 무관하게 매끈) — 멈춘 뒤에도 같은 경로(AA 동일) */
    const [r0,r1]=span(t=>rise(t,c,no),f);textSmear(g,nm,nx,NAME_Y+r0,NAME_Y+r1,no);
    /* 부위 줄: 15f 컷은 +1f · 6f · 예산 2(c+8에 다 서고 ~7f 머묾), AH-6은 +2f · 8f · 예산 4 */
    inM(g,pt,px,PART_Y,po,f,c0+(i===4?2:1),i===4?{dur:8,budget:4}:{dur:6,budget:2});
  }});

function fleet(g,f,S,i){const a=1-E.accel(seg(f,320,326));if(a<=0)return;const L=S['fleet'],act=i+1,o=O.fleet,x0=X+inkL(L[0],o);let pre='';
  const at=s=>s?measure(g,s,o)+o.track*o.size:0;
  L.forEach((s,k)=>{if(k){const x=x0+at(pre);text(g,'·',x+at(' '),FLEET_Y,{...o,color:C.goldHi2,alpha:.55*a,id:''});pre+=' · '}
    text(g,s,x0+at(pre),FLEET_Y,k===act?{...o,color:C.goldHi,alpha:a,tier:2}:{...o,alpha:.40*a});pre+=s})}

/* ── A320: 5,000 주행거리계 + 오른쪽 쌓음(계열 · 비고 · 이정표) ──
   퇴장은 모두 249.5에 시작해 253.5까지 끝(254 프레임 표본 253.75~엔 A320 글이 없음, 컷 254.5) */
const V320=f=>5000*T320(f);   /* 210(b7)에 5,000 */
const EX0=249.5,EX1=253.5;
function a320(g,f,S){const c=CUT[1],fc=fcOf(f),num=S['a320.num'];
  /* 금색: 착지하며 207–210에 금색 → 216–224에 크림으로. 프레임 단위(표본마다 같은 색 = 두 팔레트 색의 sRGB 섞임) */
  const tint=fc<216?E.snap(seg(fc,207,210)):1-E.std(seg(fc,216,224));
  const q0=glyphs(g,num,O.num).list[0],ix=X+inkL(num,O.num)-(q0.w-measure(g,q0.ch,O.num))/2;   /* 잉크 왼쪽 120(바퀴는 자리 가운데에 그림 → 음의 자간 절반만큼 더 옮김) */
  const nw=measure(g,num,O.num),sx=Math.round(ix+nw+36);   /* 쌓음은 숫자와 36px(같이 옮김) */
  /* 숫자: 퇴장은 자리 창 안에서 위로(창 위 깃털) + 퇴장 흐림(exitFade) */
  const oa=exitFade(seg(fc,EX0,EX1));g.save();g.globalAlpha*=oa;
  if(oa>0)odometer(g,num,ix,NUM_Y,{...O.num,color:mix(C.cream,C.goldHi,tint)},f,pos320([...num].filter(c=>/\d/.test(c)).map(Number)),t=>-E.accel(seg(t,EX0,EX1))*O.num.size*1.05);
  g.restore();
  const k=S['a320.kicker'],n=S['a320.note'],ko=O.kick,no=fitSize(g,n,O.anote,1240-sx);   /* 비고는 30 유지(국문 · 영문 같은 위계) — 이 컷 3D는 y 530 위 */
  const [r0,r1]=span(t=>rise(t,c,{size:48}),f);   /* 컷 미세 상승(계열 · 이정표) — 셔터 전체 번짐 */
  const go=fc+.25>EX0;   /* 퇴장 갈래도 프레임 단위 */
  if(go){outM(g,k,sx,820,ko,f,EX0,{dur:3,budget:1});outM(g,n,sx,862,no,f,EX0,{dur:3,budget:1})}
  else{textSmear(g,k,sx,820+r0,820+r1,ko);inM(g,n,sx,862,no,f,200,{dur:10,budget:6})}
  /* 이정표: v가 1,000 · 3,000 · 5,000을 지나는 프레임에 금색(프레임 단위) */
  const M=S['a320.m'],thr=[1000,3000,5000],v=V320(fc),o=O.mile,row=[];let x=sx;
  M.forEach((y,j)=>{if(j){x+=12;row.push({s:'·',x,o:{...o,color:C.goldHi2,alpha:.7,id:''}});x+=measure(g,'·',o)+12}
    const on=v>=thr[j]-1e-6,oo=on?{...o,color:C.goldHi}:{...o,alpha:.45};row.push({s:y,x,o:oo});x+=measure(g,y,oo)});
  if(go){const w=x-sx;row.forEach(q=>outM(g,q.s,q.x,NUM_Y,q.o,f,EX0+(q.x-sx)/w,{dur:3,budget:measure(g,q.s,q.o)/w}))}   /* 왼→오 한 물결 */
  else row.forEach(q=>textSmear(g,q.s,q.x,NUM_Y+r0,NUM_Y+r1,q.o))}
