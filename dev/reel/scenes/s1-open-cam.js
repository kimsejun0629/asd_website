/* s1-open 도우미: 787 롱테이크 카메라 · 글줄(등장 · 유지 · 퇴장 한 경로) · 설명선(오른쪽 목록) */
import {C,E,seg,lerp,clamp,loglerp,textEach,rgba} from '../engine.js';
import {LT} from '../shared.js';

/* ── 카메라 ──
   S00(f<82): shared LT 그대로, 거리만 K0배(엔진 view()는 dist에 .62/tan(fov/2)를 곱해 스토리보드 크기보다 작게 나옴 → 포스터에서 가까운 날개가 오른쪽 끝에 닿게)
        + 24~120 렌즈 목표를 D만큼 왼쪽 위로 흘림(ioQuad, 최대 약 3.8px/f — 포스터 · 이음매(f≤24)는 그대로)
   S01: 76에 정지에서 출발해 150(b5)에 착지하는 큰 이동(Beta(2,4) 누적 — 앞쪽에 몰린 C1 곡선: 빔이 금색 부위를 지나는 116~123엔
        기준점 ≤11px/f, 136엔 99%) + 136부터 느린 흐름(정지 → 등속, C1) + LT의 예비 동작(173.5~179.5 yaw +0.10, inCubic)으로 컷에 들어감 */
export const K0=.5;
export const S1={t0:76,t1:150,yA:.36,eA:.26,dB:1.2,CB:[660,330],D:[-180,-15],yB:.015,eB:.045,CD:[-36,-10]};
const beta14=u=>u<=0?0:u>=1?1:1-Math.pow(1-u,5)-5*u*Math.pow(1-u,4);
/* 정지에서 출발해 k 뒤부터 등속(0→1, C1) */
const drift=(u,k)=>u<=0?0:u>=1?1:(u<k?u*u/(2*k):u-k/2)/(1-k/2);
export function cam01(f){
  const L=LT(Math.min(f,105));L.cam.dist*=K0*loglerp(1,.965,seg(f,-18,105));   /* 느린 밀기(E.lin) */
  const d=E.ioQuad(seg(f,24,120)),C0=[L.C[0]+S1.D[0]*d,L.C[1]+S1.D[1]*d];
  if(f<S1.t0)return {...L,C:C0};
  const a=beta14(seg(f,S1.t0,S1.t1)),b=drift(seg(f,136,179.5),.35),w=E.inCubic(seg(f,173.5,179.5)),c=L.cam;
  return {rot:LT(f).rot,C:[lerp(C0[0],S1.CB[0],a)+S1.CD[0]*b,lerp(C0[1],S1.CB[1],a)+S1.CD[1]*b],
    cam:{...c,yaw:c.yaw+S1.yA*a+S1.yB*b+.10*w,el:c.el+S1.eA*a+S1.eB*b,dist:loglerp(c.dist,S1.dB,a)}};
}

/* ── 글줄: 글자 k(전체 n 중 k0+k)는 i0+ib·k/(n−1)에 들어오기 시작해 idur 동안, o0+ob·k/(n−1)에 나가기 시작해 odur 동안.
   같은 textEach 경로로 등장 · 유지 · 퇴장을 모두 그려 전환 때 글자 위치가 튀지 않음.
   idist 1.15: 국문 글자 아래(기준선+.12em)까지 가림 밖에서 출발(탄생 때 조각이 비치지 않게). odist: 퇴장 끝(E.accel은 끝 기울기가 수직)
   전에 가림 안으로 다 들어가도록 — 태그라인은 1.6 ── */
function band(y,o){const cap=o.size*.92;return [y-cap*1.12,y+o.size*.3]}
/* 가림은 textEach의 clip을 쓰지 않고 g에 직접 건다(엔진 clip은 dy와 함께 움직여 가리지 못함 — engine_requests).
   글자는 상자가 가림 밖으로 완전히 나간 뒤에만 alpha 0(도중에 사라지지 않음 · 검사 상자용) */
export function tline(g,s,x,y,o,f,{i0=-1e9,idur=16,ib=10,idir='up',o0=1e9,odur=8,ob=4,odir='down',mask=null,idist=1.15,odist=1.05,k0=0,n=null,color=null}={}){
  if(!s)return 0;const N=n??[...s].length;const [m0,m1]=mask||band(y,o);const top=o.size*.92*1.12,bot=o.size*.3;
  g.save();g.beginPath();g.rect(-1e4,m0,2e4,m1-m0);g.clip();
  const w=textEach(g,s,x,y,o,(q,k)=>{const fr=N>1?(k0+k)/(N-1):0;
    const ti=clamp((f-(i0+ib*fr))/idur);if(ti<=0)return {alpha:0};
    const to=clamp((f-(o0+ob*fr))/odur);
    const dy=(idir==='down'?-1:1)*(1-E.snap(ti))*o.size*idist+(odir==='down'?1:-1)*E.accel(to)*o.size*odist;
    if(y+dy-top>=m1||y+dy+bot<=m0)return {alpha:0};
    return {dy,color:color?color(q,k):undefined}});
  g.restore();return w}

/* ── 오른쪽 열: 국문 머리글 584 · 구분선 602 · 줄 636/684/732/780(3줄이 왼쪽 라벨 기준선 732와 같음).
   영문은 한 칸(48) 위(4줄 = 732) — 제목 'Aerostructures'(윗선 ≈776) 띠를 비움 ── */
export function colY(en){const u=en?-48:0;return {head:584+u,div:602+u,rows:[636,684,732,780].map(y=>y+u)}}
/* ── 설명선: 부위 기준점의 금색 고리 → 가는 선 → 24px 수평 착지 → 오른쪽 목록 줄(같은 고리 표지 1122 · 이름 1150)
   목록 순서는 고리의 화면 x 순(오른쪽 고리가 위 줄) — 선이 서로 건너지 않음. 줄 번호는 없음(순서를 주장하지 않고, 숫자를 만들지 않음):
   줄 머리의 고리가 그 부위 고리와 짝. fsf · bulk는 날개 뒷전 아래(y 575)까지 수직으로 내려간 뒤 착지점으로 ── */
export const CO={t0:136,ex:1076,lx:1100,mx:1122,tx:1150,r:8,via:575};
export const rowOrder=['aft','rake','fsf','bulk'];
const KEY={rake:'c787.1',fsf:'c787.2',bulk:'c787.3',aft:'c787.4'},VIA={fsf:1,bulk:1},TAU_=Math.PI*2;
/* 금색 고리(밤색 테두리 5px α.7 → 2px #C2A673), 반지름 CO.r·sc */
function ring(g,x,y,sc){if(sc<=.02)return;g.save();g.beginPath();g.arc(x,y,CO.r*sc,0,TAU_);
  g.strokeStyle=rgba(C.night,.7);g.lineWidth=5*sc;g.stroke();g.strokeStyle=C.goldHi;g.lineWidth=2*sc;g.stroke();g.restore()}
/* 꺾은선 pts를 길이 비율 q만큼 */
function stroke(g,pts,q){let L=0;const d=[];for(let i=1;i<pts.length;i++){const s=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);d.push(s);L+=s}
  let T=L*q;g.beginPath();g.moveTo(pts[0][0],pts[0][1]);
  for(let i=1;i<pts.length&&T>0;i++){const t=Math.min(1,T/(d[i-1]||1));g.lineTo(lerp(pts[i-1][0],pts[i][0],t),lerp(pts[i-1][1],pts[i][1],t));T-=d[i-1]}g.stroke()}
export function callouts(g,f,proj,S,en){const R=colY(en).rows;
  rowOrder.forEach((k,i)=>{const s=CO.t0+4*i;if(f<s)return;
    const p=E.snap(seg(f,s,s+10)),[ax,ay]=proj(k),Y=R[i]-9+.5;
    /* 고리: 0→1. 금색 부위 위에서도 떨어져 보이게 밤색 테두리를 먼저 깔고 금색 */
    ring(g,ax,ay,clamp(p/.4));
    /* 선: 고리 가장자리 → (수직 다리) → 착지 끝 → 수평 24px. 수직 다리는 화소 중심에 맞춤 */
    const q=clamp((p-.15)/.85);if(q>0){let pts;
      if(VIA[k]){const X=Math.round(ax)+.5,yv=Math.max(CO.via,ay+CO.r+12);pts=[[X,ay+CO.r],[X,yv],[CO.ex,Y],[CO.lx,Y]]}
      else{const dx=CO.ex-ax,dy=Y-ay,dd=Math.hypot(dx,dy)||1;pts=[[ax+dx/dd*CO.r,ay+dy/dd*CO.r],[CO.ex,Y],[CO.lx,Y]]}
      g.save();g.globalAlpha*=.6;g.strokeStyle=C.cream;g.lineWidth=1;stroke(g,pts,q);g.restore()}
    /* 줄 머리 고리: 선 끝이 줄에 닿을 때(q .78→1, s+2.5~4) 피어남 — 금색 바깥 가장자리 1113(열 1114에 1px 광학 보정), 정수 중심(2px 고리가 화소에 맞음) · 착지선 높이 */
    ring(g,CO.mx,R[i]-9,E.snap(clamp((q-.78)/.22)));
    /* 이름(Light 30): 글자 예산 4f */
    const nm=S[KEY[k]];
    tline(g,nm,CO.tx,R[i],{size:30,weight:300,color:C.cream,id:KEY[k],tier:2},f,{i0:s+4,idur:10,ib:4,n:[...nm].length,k0:0});
  })}
