/* 쇼릴 — 장면 사이 공유 상수(순수). 경계에서 이어지는 값은 모두 여기서만 정한다(스토리보드 build plan) */
import {E,seg,lerp,loglerp} from './engine.js';
export const P={x:1216,y:468};                         /* 초점 P* */
export const SAFE={x0:96,x1:1824,y0:60,y1:1020};
export const ZOV={x1:1040,y1:560};                     /* 겹침 보험 구역: 필수 글 금지 */
export const TAG={x:120,labelY:690,l1Y:802,horY:836,l2Y:946,leadY:1000,size:112,maxW:1500};   /* 실제 기준선(s1 잉크 간격) — labelY는 s7 각주 기준선과 같음 */
/* 이음매 스캔(882~900, 오른쪽→왼쪽 등속). f<0(=882~899의 −18~0)도 받음 */
export function scanX(f){if(f<0)f+=900;return f>=882&&f<900?1960-(2032/18)*(f-882):null}
/* 787 롱테이크 LT, f∈[−18,179.5) (−18 ≡ 882) — s1과 검사 도구가 함께 씀 */
export function LT(f){
  const a=E.ioCubic(seg(f,-18,105)),sa=E.std(seg(f,-18,105)),b=E.ioCubic(seg(f,105,179.5));
  const rot=[-.36+.36*a+.04*b,.24*(1-E.outCubic(seg(f,-18,105))),.03];
  const yaw=2.00+.52*sa+.38*E.ioCubic(seg(f,105,173.5))+.10*E.inCubic(seg(f,173.5,179.5));
  const el=-.08+.20*sa+.28*b;
  const dist=f<105?loglerp(2.30,1.62,sa):loglerp(1.62,1.30,b);
  const target=[2.5*b,.4*b,-7*b];
  const roll=.10*(1-E.outCubic(seg(f,-18,42)));
  const cf=Math.min(f,105),C=[lerp(1300,1262,E.std(seg(cf,-18,105))),lerp(400,408,E.std(seg(cf,-18,105)))];   /* 105 이후 렌즈 고정 */
  return {rot,cam:{yaw,el,dist,target,roll,fov:26},C,lensFrozen:f>=105};
}
export const DISC={r:160,f:330};                       /* S06 로터 원판 = S07 레이더 셋째 고리 */
/* MRO 지도: 화면 = A + (v − Busan)·s, 회전 rot(도) · 세로 이동 ty · 배율 k(퇴장) — P* 둘레
   s4가 그리는 실제 값: 시작 s 1.1 · 부산 (760,500)(왼쪽 아래 글 묶음을 피함) · 닻은 배율과 따로 bez(.8,0,.4,1) 434–447에 P*로 와서 멈춤(450 혜성 착지)
   · 462–495 밀기는 양끝 20% 가감속 사다리꼴(끝값 같음) */
export const MAP={busan:[124.4,412],s0:1.1,a0:[760,500],s1:4.0,s2:4.3};
const MAP_ANC=E.bez(.8,0,.4,1);
export const mapAnc=f=>MAP_ANC(seg(f,434,447));
export const trap=(u,a=.2)=>{const v=1/(1-a);return u<a?v*u*u/(2*a):u>1-a?1-v*(1-u)*(1-u)/(2*a):v*(u-a/2)};
export function mapT(f){
  const e=E.ioQuint(seg(f,432,462)),a=mapAnc(f);let s=loglerp(MAP.s0,MAP.s1,e);const ax=lerp(MAP.a0[0],P.x,a),ay=lerp(MAP.a0[1],P.y,a);
  let rot=0;if(f>=462){const u=trap(seg(f,462,495));s=lerp(MAP.s1,MAP.s2,u);rot=-1*u}
  const ty=320*(1-E.outCubic(seg(f,414,432)));const k=1-.06*E.accel(seg(f,495,512));
  return {s,ax,ay,rot,ty,k};
}
export const ROUTES=[   /* web/mro.html:93–98 그대로 · 그리기 창(모두 450에 도착) */
  {k:0,d:'M106.1 388.0Q124.8 393.4 124.4 412.0',p0:[106.1,388.0],c:[124.8,393.4],f0:436},
  {k:1,d:'M156.2 425.0Q142.6 413.3 124.4 412.0',p0:[156.2,425.0],c:[142.6,413.3],f0:432},
  {k:2,d:'M113.2 522.8Q98.9 465.6 124.4 412.0',p0:[113.2,522.8],c:[98.9,465.6],f0:432},
  {k:3,d:'M243.9 342.7Q171.7 358.0 124.4 412.0',p0:[243.9,342.7],c:[171.7,358.0],f0:428},
  {k:4,d:'M827.5 585.9Q507.3 385.0 124.4 412.0',p0:[827.5,585.9],c:[507.3,385.0],f0:422},
  {k:5,d:'M931.7 41.8Q461.4 96.1 124.4 412.0',p0:[931.7,41.8],c:[461.4,96.1],f0:420},
];   /* k: mro.base 순서(한국 · 일본 본토 · 오키나와 · 미사와 · 하와이 · 알래스카) */
export const A350={pai:{yaw:4.712,el:1.50,fov:14,to:[1216,500],lenPx:860},vis:{yaw:6.893,el:.24,fov:26,to:[1180,330],k:.84}};
export const RET={x:960,y:620,box:56};
export const FRAME={x0:96,y0:60,x1:1824,y1:1020,arm:48};
export const LOGO={x:656,y:200,w:609,h:150};
export const BAND={y0:120,y1:640};
export const LIMB={cx:1216,cy:3940,R:3220};
/* s5 글 기둥(616–645 s6 스캔선이 피함): x1 기록 줄 오른끝+24 · y0 첫 줄 윗끝−10 · hx1 제목 오른끝 — s5-future-text.js futCol()로 잰 값 */
export const FUT_COL={ko:{x1:929,y0:797,hx1:623},en:{x1:1106,y0:819,hx1:733}};
