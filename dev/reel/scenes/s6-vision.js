/* 쇼릴 장면 모듈 s6-vision — [604,724.5) (스토리보드 S11 격납고 · S12 비전)
   격납고(Physical AI): A350 내려앉음 604–618 · 드론 · 로버 · 스캔 616–648 · 조준 잠금 630 · 1 mm · 단서
   비전: 조준 → 액자 645–659 · 크레인 648–690(b23 착지) · 투시 + 금색 카고 도어 · Excellence In Performance + 삼각 · 노출 페이드 706–724
   장면: s6-3d z10(격자 · 로버 + 기체, 글 보호 그늘) · s6-gfx z20(계기 · 괄호 · 가림막) · s6-text z30 */
import {scene,C,E,seg,lerp,clamp,loglerp,TAU,need,img,duotone,text,trackIn,fitSize,measure,hline,vline,layer} from '../engine.js';
import {A350} from '../shared.js';
import {UAV_TOP} from '../kit.js';
import {DRONES,dronePose,drawDrone,ROVERS,drawRover,scanLine,reticle,defectDot,crosshair,scrim,RBOX,RT,FR_T,frameRect,subBlurLin} from './s6-vision-hud.js';
import {lineIn,lineOut} from './s6-vision-text.js';
import {floorQuad,floorGrid,bakeMatte,drawGL} from './s6-vision-3d.js';
import {xrTune,fillPass} from './s6-vision-xr.js';

need(UAV_TOP.mro,UAV_TOP.rover);
const F0=604,F1=724.5,DEG=Math.PI/180;
const ST={A:null,rP:0,cen:[0,0,0],spr:null,rov:null,P:null,runs:null,mat:null};

/* ── 카메라: PAI(바로 위, 기수 위) → 영웅 3/4(앞 오른쪽) ── */
/* 내려앉기: 정규화 expo(t=1에서 정확히 1 — outExpo의 끝 0.1% 튐 없음) */
const nexpo=t=>t>=1?1:(1-2**(-10*t))/(1-2**-10);
/* 크레인: 648 출발 · 690 착지(b23). 방위 · 화각은 ioCubic 그대로(가운데가 가장 빠르고 착지가 김 — 676 뒤에도 15% 남음).
   오른쪽 아래 칸(x>1100 y>560)을 668 전에 비우는 일은 곡선이 아니라 고도 · 렌즈 · 거리가 맡음:
   고도는 1−(1−e)³ · 렌즈 세로는 1−(1−e)⁵로 앞서 가고, 거리는 가운데서 ×1.3까지 물러섰다 690에 정확히 k .86으로 돌아옴(끝 상태 · 끝 속도 0 같음) */
const PB=.3,LIFTK=2.6,DOORB=3;
/* 크레인 뒤 궤도 흐름: 676부터 속도가 0에서 올라와 690 이후 등속(C1) — 724에서 1.
   머묾(690–716)에도 기체가 글 아래서 계속 돌게: 방위 +DY · 거리 ×DK/.86(밀어 들어감) · 고도 +DE · 렌즈 중심 위로 OY px (D=1, 724) */
const drift=f=>{const v=1/41;if(f<=676)return 0;if(f<=690)return v*(f-676)**2/28;return v*7+v*(f-690)};
const DY=.6,DK=.72,DE=-.1,OY=34;
function pose(f){const pa=A350.pai,vi=A350.vis;
  if(f<648){const k=loglerp(6,1,nexpo(seg(f,604,618)));return {yaw:pa.yaw,el:pa.el,fov:pa.fov,r:ST.rP*k,to:pa.to,k}}
  const e=E.ioCubic(seg(f,648,690)),D=drift(f);const fov=lerp(pa.fov,vi.fov,e);
  const r=ST.rP*Math.tan(pa.fov/2*DEG)/Math.tan(fov/2*DEG)*loglerp(1,.86,e)*loglerp(1,DK/.86,D)*(1+PB*Math.sin(Math.PI*e));
  const ee=1-(1-e)**3,ey=1-(1-e)**5;
  return {yaw:lerp(pa.yaw,vi.yaw,e)+DY*D,el:lerp(pa.el,vi.el,ee)+DE*D,fov,r,to:[lerp(pa.to[0],vi.to[0],e),lerp(pa.to[1],vi.to[1],ey)-OY*D],k:1}}
/* 카메라 + 렌즈(중심을 to에) 배치 — 그리지 않음. 계기 층이 GL.project 쓰기 전에 다시 부름 */
function place(GL,f){const A=ST.A,p=pose(f),sh=[{A,pos:[0,0,0],rot:[0,0,0],scale:1}];
  const cam={yaw:p.yaw,el:p.el,fov:p.fov,r:p.r,target:[0,0,0]};const lens=GL.solveLens(sh,cam,A,ST.cen,p.to);
  const c2={...cam,lens};GL.setCam(sh,c2);return {sh,cam:c2,p}}
/* PAI 거리: 동체(기수 끝 ~ 꼬리 끝)가 화면에서 860px */
function solvePai(GL,A){const pa=A350.pai,sh=[{A,pos:[0,0,0],rot:[0,0,0],scale:1}];let r=320;
  for(let i=0;i<6;i++){GL.setCam(sh,{yaw:pa.yaw,el:pa.el,fov:pa.fov,r,target:[0,0,0]});const a=GL.project(A,[A.box0.max.x,ST.cen[1],ST.cen[2]]),b=GL.project(A,[A.box0.min.x,ST.cen[1],ST.cen[2]]);r*=Math.hypot(a[0]-b[0],a[1]-b[1])/pa.lenPx}
  return r}
/* 노출: 706–724 1→.06(inCubic, 로그) · 722–724.5 0으로(장면 끝에서 튀지 않게).
   GL 노출로 낮추면 불투명한 금색 도어가 밤색보다 어두워짐(검은 점) → 2D 불투명도로 적용해 밤색으로 가라앉힘 */
const expo=f=>loglerp(1,.06,E.inCubic(seg(f,706,724)))*(1-seg(f,722,724.5));
const floorPts=GL=>floorQuad(ST.A,ST.cen).map(p=>GL.project(ST.A,p).slice(0,2));
/* 글 보호 그늘(무리 0 제목 두 줄 · 1 삼각 세 줄 — 무리마다 한 장). 둘 다 650–655(ioCubic)에 한 번에 짙어짐 — 제목이 들어오는 중이고
   삼각 첫 글자(653)가 가운데. 2f로 켜면 동체 뒤쪽이 깜빡 지고(차이 곡선 1.8배 튐), 줄마다 켜면 동체가 먼저 지고 꼬리만 떠 보임.
   잰 값: 삼각 속은 664부터 비고 기체가 글 상자와 54px+(665) · 제목 속은 늘 비어 있고 꼬리가 660에 27px까지 스침 → 124px+(663). 그 뒤 8f에 걸쳐 걷힘 */
const MT=[[650,655,663,671],[650,655,665,673]];
const matteA=f=>MT.map(([a,b,c,d])=>E.ioCubic(seg(f,a,b))*(1-E.ioCubic(seg(f,c,d))));
/* 투시 모습: 선 밝기 XROP(1 → 흐리고 꼬리가 안 읽힘) · 수직 꼬리 ×TB · 수평 꼬리 ×TH · 벨리 페어링 ×TF · 주날개 ×TW · 도어 자체발광 EI0 + EIP·맥동 + EIB·첫 들림 · 채움 FK(s6-vision-xr.js) */
const ACT=['fcd','acd','bcd'],XROP=1.45,TB=1.8,TH=.8,TF=.55,TW=.75,EI0=.45,EIP=.35,EIB=.3,FK=[.035,.13,.075,1];

scene({id:'s6-3d',from:F0,to:F1,z:10,
  init(env){const A=env.GL.craft('a350');ST.A=A;ST.cen=[A.center.x,A.center.y,A.center.z];ST.rP=solvePai(env.GL,A);
    place(env.GL,630);ST.P=floorPts(env.GL)},   /* PAI에 선 카메라의 바닥 네 점 = 격자 기준 */
  ready(env){const D=[[0,C.smoke],[.5,C.cream80],[1,C.cream]];ST.spr=duotone(img(UAV_TOP.mro),D);ST.rov=duotone(img(UAV_TOP.rover),D);   /* 스프라이트 파랑 → 밝은 두 색조(흰 날개 · 밤 바닥 모두에서 읽힘) */
    const g=env.g;ST.mat=bakeMatte(matteRuns(g,env.S),(s,o)=>measure(g,s,o))},
  draw(g,f,env){const GL=env.GL,A=ST.A;
    /* 바닥 격자 610–620 나타남 · 648–660 사라짐 — PAI에선 화소 격자, 내려앉기 · 크레인 동안은 카메라를 따름 */
    const ga=seg(f,610,620)*(1-E.ioCubic(seg(f,648,660)));
    if(ga>.002){if(f>=618&&f<=648)floorGrid(g,ga);else{place(GL,f);floorGrid(g,ga,ST.P,floorPts(GL))}}
    /* 로버: 날개 뒤 바닥 — 기체보다 먼저(가려지면 가려짐) */
    if(f>=616&&f<650){place(GL,f);const c=ST.cen,fo=1-E.accel(seg(f,640,650));
      ROVERS.forEach((r,i)=>{const z=lerp(r.z0,r.z1,seg(f,614,650));const [X,Y]=GL.project(A,[c[0]+r.x,A.box0.min.y,c[2]+z]);drawRover(g,ST.rov,X,Y,seg(f,616+i*2,624+i*2)*fo)})}
    /* 투시: 660–684 · 도어 들림 676–690 · 맥동 30f. 들림 곡선은 스토리보드 그대로(outBack 1.5), 폭은 엔진 기본(.38)의 LIFTK배
       (1배는 화면에서 3–5px라 안 읽힘). 첫 들림(676–690)에만 빛을 한 번 더 올림 — 한 번 부풀고 690에 0, 그 뒤 깜빡임 없음 */
    const gx=E.ioCubic(seg(f,660,684)),lift=f<676?0:LIFTK*E.outBack(seg(f,676,690),1.5),p01=.5+.5*Math.sin(TAU*(f-660)/30),bump=Math.sin(Math.PI*seg(f,676,690))**2;
    A.xr(gx,ACT,{lift,pulse:p01+DOORB*bump,dimOthers:.1,xrOp:XROP,goldOp:0});xrTune(A,ACT,{tb:TB,th:TH,tf:TF,tw:TW,ei:EI0+EIP*p01+EIB*bump});
    const a=seg(f,604,610)*expo(f);
    if(a>.001){const {sh,cam}=place(GL,f);
      if(gx>.002){const L=layer('s6xr');fillPass(GL,A,sh,cam,L,gx,FK);L.drawImage(GL.render(sh,cam,{exposure:1}),0,0);drawGL(g,L.canvas,a,ST.mat,matteA(f))}   /* 채움 위에 투시 */
      else drawGL(g,GL.render(sh,cam,{exposure:1}),a,ST.mat,matteA(f))}
    A.xr(0);   /* 공유 캐시: 다음 장면을 위해 도장 상태로(op · 자체발광 · 보이기 모두) */
  }});

/* ── 계기 층 ── */
/* 괄호 빛 꼬리(645–659): 표본 시각 u∈[−.25,.25]를 머리(fc+.125, 90° 셔터 끝) 쪽으로 몰아(밀도 ∝ δ^−¾) 앞 L은 또렷하고 뒤 TR프레임은 실처럼 옅은 꼬리.
   균일 상자 번짐은 대각선으로 움직이는 L을 반투명 각기둥처럼 보이게 함. fc는 표본의 프레임(|u|≤.25라 반올림이 안전) */
const TR=.3,sx=f=>clamp((f-Math.round(f)+.25)/.5),streakT=f=>Math.round(f)+.125-TR*(1-sx(f))**4;
/* 꼬리 쪽 표본은 투명도도 낮춤(머리 1 → 꼬리 끝 1−s): L 안쪽을 채우는 번짐이 끝 가장자리 없이 사라짐.
   s는 속도 비율(ioQuad 속도 — 645 · 659 멈춤에서 0)이라 멈춘 괄호의 밝기는 reticle()과 같음(경계에서 튀지 않음) */
const streakW=f=>{const t=seg(f,FR_T[0],FR_T[1]),s=clamp(4*Math.min(t,1-t));return 1-s*(1-sx(f))};
/* 모서리마다 200px 구역(겹치지 않을 때) · 상자가 작을 땐 한 구역 — 겹친 구역은 괄호를 두 번 더하므로 */
function streakRet(g,f){const fn=(c,ff)=>{c.globalAlpha=streakW(ff);reticle(c,streakT(ff))},[x0,y0,x1,y1]=frameRect(E.ioQuad(seg(streakT(f),FR_T[0],FR_T[1]))),M=100;
  const box=(a,b,c,d)=>{a=Math.max(0,Math.floor(a));b=Math.max(0,Math.floor(b));c=Math.min(1920,Math.ceil(c));d=Math.min(1080,Math.ceil(d));if(c>a&&d>b)subBlurLin(g,f,fn,6,[a,b,c-a,d-b])};
  if(x1-x0<2*M+8||y1-y0<2*M+8)box(x0-M,y0-M,x1+M,y1+M);else [[x0,y0],[x1,y0],[x0,y1],[x1,y1]].forEach(([cx,cy])=>box(cx-M,cy-M,cx+M,cy+M))}
scene({id:'s6-gfx',from:F0,to:F1,z:20,
  draw(g,f,env){const GL=env.GL,A=ST.A;
    /* 비전 글 뒤 가림막(괄호보다 먼저 — 네 모서리 괄호가 같은 밝기) */
    scrim(g,seg(f,646,662)*(1-seg(f,714,724.5)));
    if(f<650){place(GL,f);const c=ST.cen;const fo=1-E.accel(seg(f,640,650));
      /* 드론(기체 위 5 m) */
      DRONES.forEach(d=>{const q=dronePose(d,f);const [X,Y]=GL.project(A,[c[0]+q.x,c[1]+5,c[2]+q.z]);const p=seg(f,d.f0,d.f0+6);drawDrone(g,ST.spr,X,Y,q.h,p,clamp(p*2.5)*fo,f,d.ph)});
      scanLine(g,f);defectDot(g,f);
      crosshair(g,f);
    }
    if(f>=FR_T[0]&&f<FR_T[1])streakRet(g,f);else reticle(g,f);   /* 괄호가 액자로 벌어질 때 ≈120px/f — 빛 꼬리 + 선형광 표본 6배 */
  }});

/* ── 글 ── */
const ST_L1={size:120,weight:300,color:C.cream,track:-.02},ST_L2={size:120,weight:700,color:C.cream,track:-.02};
/* 비전 배치: 삼각 이름 기준선을 왼쪽 세 줄(라벨 · Excellence · In Performance)에 맞춤 — 626 / 760 / 894 */
const VL={x:120,lab:626,l1:760,l2:894},VT={dx:1114,x:1156,y:[VL.lab,VL.l1,VL.l2],d:[38,72]};
/* 삼각 줄 등장 653/655/657(스토리보드 650/653/656에서 늦춤 — 제목 두 줄 다음 박자로), 이름 dur 8 · 항목 +1/+2f → 667에 모두 자리 잡음.
   'In Performance'는 dur 12로 666에 자리 → 715 퇴장까지 48f(0.8 s) 멈춤 */
const XR=[96,576,1560,420];   /* 퇴장 글 구역(띠 가림 안이라 글이 여기를 벗어나지 않음) */
const TIN=[653,655,657],XO=715,XD={dur:6.5,budget:0,ease:E.accel,fade:true};   /* 퇴장: 모두 715 · 6.5f 가속 + 글자 투명도 1−t² — 721.5에 끝 */
/* 글 한 벌(그늘 굽기와 공용): {grp,s,x,y,o,f0,inOpt} — grp 0 제목 · 1 삼각 */
function runs(g,S){if(ST.runs)return ST.runs;const R=[];
  R.push({grp:0,s:S['vis.l1'],x:VL.x,y:VL.l1,o:{...ST_L1,id:'vis.l1',tier:1},f0:646,inOpt:{dur:14,budget:6}});
  R.push({grp:0,s:S['vis.l2'],x:VL.x,y:VL.l2,o:{...ST_L2,id:'vis.l2',tier:1},f0:648,inOpt:{dur:12,budget:6}});
  ['vis.p1','vis.p2','vis.p3'].forEach((k,i)=>{const [nm,a,b]=S[k];const y=VT.y[i],f0=TIN[i],oi={size:26,weight:300,color:C.cream80,tier:1};
    R.push({grp:1,s:nm,x:VT.x,y,o:{size:36,weight:700,color:C.cream,id:k,tier:1},f0,inOpt:{dur:8,budget:2}});
    R.push({grp:1,s:a,x:VT.x,y:y+VT.d[0],o:fitSize(g,a,{...oi,id:k+'a'},650,26),f0:f0+1,inOpt:{dur:8,budget:1}});
    R.push({grp:1,s:b,x:VT.x,y:y+VT.d[1],o:fitSize(g,b,{...oi,id:k+'b'},650,26),f0:f0+2,inOpt:{dur:8,budget:0}})});
  return ST.runs=R}
/* 그늘 속: 글줄 + 삼각 대시 */
const matteRuns=(g,S)=>runs(g,S).concat(VT.y.map((y,i)=>({grp:1,box:[VT.dx,y-14,VT.dx+28,y-12]})));

scene({id:'s6-text',from:F0,to:F1,z:30,
  draw(g,f,env){const S=env.S;
    /* 단서: 616–626 나타남 · 648–656 사라짐 */
    {const a=seg(f,616,626)*(1-seg(f,648,656));if(a>0)text(g,S['fut.caveat'],1800,1000,{size:26,weight:300,color:C.cream80,align:'right',alpha:a,id:'fut.caveat',tier:2})}
    /* 1 mm 표지: 630 등장(10f) · 646–654 퇴장 */
    if(f>=630&&f<656)mmLabel(g,f,S,env.LANG);
    /* 비전 */
    if(f>=646&&f<XO)vision(g,f,S);
    else if(f>=XO&&f<XO+XD.dur)subBlurLin(g,f,(x,ff)=>vision(x,ff,S),6,XR);   /* 퇴장 빠른 끝: 선형광으로 표본 6배(글 구역만) */
  }});

/* 1 mm + 결함 탐지 — 조준 아래 가운데 두 줄, 조준 아래 변에서 1px 크림 α.6 지시선.
   (스토리보드 x=740 오른쪽 맞춤은 s5 제목과 겹쳐 옮김) 둘째 줄은 s5 제목 마지막 기준선과 같은 선(국문 740 · 영문 760, 스토리보드 S11) — 36px 위에 1 mm */
const mmY=L=>{const y2=L==='en'?760:740;return {y1:y2-36,y2}};
function mmLabel(g,f,S,L){const [s1,s2]=S['fut.mm'],MM=mmY(L);const o1={size:44,weight:700,color:C.goldHi,align:'center',id:'fut.mm',tier:2},o2={size:30,weight:300,color:C.cream,align:'center',id:'fut.mm2',tier:2};
  const lk=E.snap(seg(f,628,636))*(1-E.accel(seg(f,645,651)));const y0=RT.y+RBOX(f)/2+8,y1=MM.y1-44*.72-12;
  if(lk>0)vline(g,RT.x,y0,lerp(y0,y1,lk),{color:C.cream,alpha:.6});
  const x=RT.x;
  if(f<646){lineIn(g,s1,x,MM.y1,o1,f,630,{dur:8,budget:2});lineIn(g,s2,x,MM.y2,o2,f,631,{dur:8,budget:2})}   /* 640 · 641에 자리 → 646까지 읽힘 */
  else{lineOut(g,s1,x,MM.y1,o1,f,646,{dur:6,budget:1});lineOut(g,s2,x,MM.y2,o2,f,647,{dur:6,budget:1})}}

/* 비전 글: 왼쪽 아래(본부 비전 · Excellence · In Performance) + 오른쪽 삼각(대시 x 1114 · 글 x 1156) */
function vision(g,f,S){const out=f>=XO,lb=VL.lab,xa=1-E.inQuad(seg(f,XO,XO+XD.dur));   /* 대시 · 라벨 대시도 글과 같은 곡선으로 사라짐 */
  /* 라벨 */
  if(!out)trackIn(g,S['vis.label'],VL.x,lb,{size:26,color:C.cream,id:'vis.label',tier:2},seg(f,646,660));
  else{lineOut(g,S['vis.label'].toUpperCase(),VL.x+26*2.1,lb,{size:26,weight:700,color:C.cream,track:.14,id:'vis.label'},f,XO,XD);
    if(xa>0)hline(g,VL.x,VL.x+39,lb-26*.36,{w:2,color:C.goldHi2,alpha:xa})}
  /* 삼각 대시 28×2 */
  TIN.forEach((f0,i)=>{const dp=E.snap(seg(f,f0,f0+8));if(dp>0&&xa>0)hline(g,VT.dx,VT.dx+28*dp,VT.y[i]-13,{w:2,color:C.goldHi2,alpha:xa})});
  runs(g,S).forEach(r=>{if(f<XO)lineIn(g,r.s,r.x,r.y,r.o,f,r.f0,r.inOpt);else lineOut(g,r.s,r.x,r.y,r.o,f,XO,XD)});
}
