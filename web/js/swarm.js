/* 메인 군집 드론 모션(#swarm) — 사람(AI) 흉상 → 무인기 편대 → 항공기체(787) → 군용기(전자전기 · UH-60)
   스크롤 진행 P = 장 번호(소수 부분 = 흩어졌다 모이는 중). 처음 불러오면 흩어진 드론이 흉상으로 모임
   장 하나 = 기체 여럿(m): 드론을 몫(n)대로 나눠 각 기체 형상을 맡김. 점 구름: data/swarm.txt(이진의 base64, tools/swarm/build.py)
   그리기: swarm-gl.js(window.SW) · 순서: site → scroll-fx → index → swarm-gl → 이 파일 */
(()=>{
'use strict';
const {reduce,MQ,loop,smoothTo,HH}=window.KA;
const SW=window.SW,sec=document.getElementById('swarm');
if(!sec||!SW)return;
const stage=sec.querySelector('.sw-stage'),cv=sec.querySelector('.sw-cv');
const CH=[...sec.querySelectorAll('.sw-ch')],NS=CH.length;
const rail=sec.querySelector('.sw-rail'),rb=rail?[...rail.querySelectorAll('button')]:[];
const mark=document.getElementById('business'),mark1=document.getElementById('swarm-uav');   /* 메뉴 '사업' → 첫 장(흉상) · 첫 장 '사업 분야 보기' → 무인기 장 */
const root=document.documentElement;root.classList.add('sw-on');
/* 쪽 CSS가 옛 것(캐시)이거나 빠지면 무대가 고정되지 않음 → 캔버스 크기가 구역 높이를 다시 키우는 순환을 막고 글만 쌓아 둠 */
if(getComputedStyle(cv).position!=='absolute'){root.classList.remove('sw-on');return}
const narrow=matchMedia(MQ.narrow);

/* 장 설정 — 형상 s: 점 구름 순서(0 사람 · 1 중고도 · 2 스텔스 · 3 저피탐 · 4 자폭 · 5 787 · 6 UH-60 · 7 전자전기)
   m: 기체 [{s, n 몫, p 편대 안 위치(x 기수 · y 고도 · z 오른쪽), sc 배율, yw 기수 틀기, j 같은 기종 몇 번째, tag:'tail' 이름표를 꼬리 끝에}] · fx: 기체(of)에 딸린 연출(jam 재밍 전파면 · rope 패스트로프)
   tilt: 편대를 카메라 쪽으로 눕힘 · hd: 진행 방향 · roll: 기울임 · 화면 영역(-1~1, 위 +) — pc: PC [반폭,y0,y1](가로는 가운데 CX 기준, center()) · ph: 폰 [x0,x1,y0,y1] */
const FOV=30*Math.PI/180,D=6.2,TH=Math.tan(FOV/2);
const CFG=[
  {human:1,m:[{s:0,n:1}],pc:[.34,-.82,.8],ph:[-.82,.82,-.08,.8]},
  /* 무인기 편대: 중고도무인기가 뒤 · 높은 고도에서 감시 · 통신 중계, 다목적 스텔스기가 앞장서 침투, 저피탐 편대기 둘이 좌우 호위, 자폭무인기 셋이 앞 · 낮게 표적으로 */
  {tilt:1.12,hd:.2,roll:.03,pc:[.56,-.36,.72],ph:[-.96,.96,.02,.72],m:[
    {s:2,n:.22,p:[.2,0,0],sc:.56},
    {s:3,n:.15,p:[-.55,0,.85],sc:.42},{s:3,n:.15,p:[-.55,0,-.85],sc:.42,j:1},
    {s:4,n:.085,p:[1.05,-.2,.5],sc:.2,yw:.05},{s:4,n:.085,p:[1.25,-.24,0],sc:.2,j:1},{s:4,n:.085,p:[1.05,-.2,-.5],sc:.2,yw:-.05,j:2},
    {s:1,n:.225,p:[-1.45,.5,0],sc:.74}]},
  {tilt:.92,hd:.3,roll:.06,pc:[.55,-.42,.78],ph:[-.94,.94,.06,.76],m:[{s:5,n:1}]},
  /* 군용기: 전자전기(높이 · 멀리)는 적 방공망 밖에서 스탠드오프 재밍 — 전파면이 퍼져 나감, UH-60(낮게 · 가까이)은 특수작전 — 양쪽 문에서 대원이 패스트로프로 강하 */
  {tilt:.7,hd:0,roll:0,pc:[.5,-.74,.66],ph:[-.94,.94,-.1,.66],m:[
    {s:7,n:.38,p:[-.35,1.1,-1.3],sc:.56,yw:.45},
    {s:6,n:.44,p:[-.7,-.35,.7],sc:.74,yw:.45,rotor:1},
    {fx:'jam',of:0,n:.11,dir:.75},{fx:'rope',of:1,n:.08}]}
];
/* 팔레트(0~1): 크림 · 금색 강조(#C2A673) · 도장 하늘색(#53AAE2) · 로터(크림) · 드론 몸체 크림80 */
const COL=[[192,183,171],[194,166,115],[83,170,226],[192,183,171]].map(c=>c.map(v=>v/255)),FRAME=[161,154,145].map(v=>v/255*.85);
const SZ=.017;   /* 드론 크기(월드) — 형상 거리에서 점 약 3px */

let R=null;try{R=SW.gl(cv)}catch(e){R=null}
if(!R)R=SW.c2d(cv);
if(!R)return;
const NU=(narrow.matches||R.kind==='2d')?3072:6144;

/* 드론마다 고정 값: 흩어질 자리(화면 비율 sx,sy · 거리 d) · 흔들림 위상 · 출발 순서 잡음 */
const hash=i=>{let x=Math.sin(i*127.1+311.7)*43758.5453;return x-Math.floor(x)};
const SC=new Float32Array(NU*3),PH=new Float32Array(NU*4);
for(let i=0;i<NU;i++){
  const near=hash(i*7+1)<.075;   /* 7.5%는 카메라 가까이 스쳐 지나감 — 드론 모양이 보임 */
  SC[i*3]=(hash(i*7+2)*2-1)*(near?.85:1.2);SC[i*3+1]=(hash(i*7+3)*2-1)*(near?.7:1.05);
  SC[i*3+2]=near?.42+hash(i*7+4)*1.6:2.6+Math.pow(hash(i*7+4),.8)*8;
  PH[i*4]=hash(i*7+5)*6.283;PH[i*4+1]=.6+hash(i*7+6)*.9;PH[i*4+2]=hash(i*7+7)*6.283;PH[i*4+3]=hash(i*7+8);
}
let SH=null;   /* 형상: {P,N,T,C,n,hx,hz 로터 중심,y0 아래 끝} */
const MI=CFG.map(()=>new Uint8Array(NU)),LI=CFG.map(()=>new Uint16Array(NU));   /* 장마다 드론 → 기체 · 그 형상의 점 번호 */
const CNT=CFG.map(c=>c.m.map(()=>0));
const buf=new Float32Array(NU*SW.ST);

/* ── 행렬 ── */
const rx=a=>{const c=Math.cos(a),s=Math.sin(a);return [1,0,0, 0,c,s, 0,-s,c]};       /* 열 우선 3×3 */
const ry=a=>{const c=Math.cos(a),s=Math.sin(a);return [c,0,-s, 0,1,0, s,0,c]};
const m3=(a,b)=>{const o=new Array(9);for(let c=0;c<3;c++)for(let r=0;r<3;r++)o[c*3+r]=a[r]*b[c*3]+a[3+r]*b[c*3+1]+a[6+r]*b[c*3+2];return o};
function rotOf(k,t,idle){   /* 장 k 편대 전체의 회전(시간 t의 흔들림 포함) */
  const c=CFG[k],w=idle&&!reduce;
  if(c.human)return ry(-.32+(w?.3*Math.sin(t*.21):0));
  return m3(rx(c.tilt),m3(ry(c.hd+(w?.035*Math.sin(t*.37):0)),rx(c.roll+(w?.05*Math.sin(t*.53):0))));
}
const tf=(G,x,y,z,F,o)=>{o[0]=(G[0]*x+G[3]*y+G[6]*z)*F.s+F.x;o[1]=(G[1]*x+G[4]*y+G[7]*z)*F.s+F.y;o[2]=(G[2]*x+G[5]*y+G[8]*z)*F.s;return o};

/* ── 형상 위치 ── out: 드론마다 8칸(x y z · 밝기 · r g b · 방향) */
const FIT=CFG.map(()=>({s:1,x:0,y:0,x0:-1,x1:1})),V3=[0,0,0,0];
function formPos(k,t,out,F,idle){
  const c=CFG[k],G=rotOf(k,t,idle),mi=MI[k],li=LI[k],w=idle&&!reduce,cnt=CNT[k];
  const rot=w?t*2.6:0;
  const L=c.m.map((m,q)=>{   /* 기체마다: 편대 회전 × 자기 틀기, 위치(위아래 흔들림) */
    if(m.fx)return null;
    const M=m.yw||w?m3(G,m3(ry(m.yw||0),rx(w?.04*Math.sin(t*.7+q*1.7):0))):G;
    const p=m.p||[0,0,0],by=w?.025*Math.sin(t*.6+q*2.1):0;
    return {M,o:[G[0]*p[0]+G[3]*(p[1]+by)+G[6]*p[2],G[1]*p[0]+G[4]*(p[1]+by)+G[7]*p[2],G[2]*p[0]+G[5]*(p[1]+by)+G[8]*p[2]],sc:m.sc||1,ang:c.human?1.5708:Math.atan2(M[1],M[0])};
  });
  for(let i=0;i<NU;i++){
    const q=mi[i],m=c.m[q],o=i*8;let br;
    if(m.fx){fxPos(c,m,L[m.of],G,F,li[i],cnt[q],w?t:0,V3);
      out[o]=V3[0];out[o+1]=V3[1];out[o+2]=V3[2];const g=m.fx==='jam',cc=COL[g?1:0];out[o+3]=V3[3];out[o+4]=cc[0];out[o+5]=cc[1];out[o+6]=cc[2];out[o+7]=1.5708;continue}
    const sh=SH[m.s],e=L[q],M=e.M,j=li[i],P3=sh.P,N3=sh.N,cl=sh.C[j];
    let a=P3[j*3],b=P3[j*3+1],d=P3[j*3+2];
    if(cl===3&&m.rotor){const cs=Math.cos(rot),sn=Math.sin(rot),ax=a-sh.hx,az=d-sh.hz;a=sh.hx+ax*cs-az*sn;d=sh.hz+ax*sn+az*cs}   /* 주로터 회전 */
    a*=e.sc;b*=e.sc;d*=e.sc;
    out[o]=(M[0]*a+M[3]*b+M[6]*d+e.o[0])*F.s+F.x;out[o+1]=(M[1]*a+M[4]*b+M[7]*d+e.o[1])*F.s+F.y;out[o+2]=(M[2]*a+M[5]*b+M[8]*d+e.o[2])*F.s;
    const n0=N3[j*3],n1=N3[j*3+1],n2=N3[j*3+2];
    if(c.human){const rim=1-Math.abs(M[2]*n0+M[5]*n1+M[8]*n2),up=M[1]*n0+M[4]*n1+M[7]*n2;br=sh.T[j]*(.58+.5*rim*rim)*(.82+.28*up)}   /* 가장자리 빛 × 위에서 오는 빛 */
    else br=sh.T[j]*(.86+.14*(M[1]*n0+M[4]*n1+M[7]*n2));
    out[o+3]=Math.min(1,cl===1?br+.2:cl===2?br+.15:br);
    const cc=COL[cl];out[o+4]=cc[0];out[o+5]=cc[1];out[o+6]=cc[2];out[o+7]=e.ang;
  }
}
/* 기체에 딸린 연출 — j번째 점의 월드 좌표 · 밝기를 o[0..3]에
   jam: 전자전기에서 진행 방향 오른쪽 앞(dir)으로 아래를 향해 퍼지는 전파면 4겹(1.2rad 폭) · rope: 양쪽 문 로프(30%)와 로프를 타고 내려가는 대원 2명씩 */
const FIG=[];   /* 대원 한 명(모델 단위, 로프 잡은 손 0 → 아래 -): 위로 뻗어 로프를 잡은 두 팔 · 머리 · 몸 · 다리 */
for(let i=0;i<90;i++){const u=hash(i*3+9),v=hash(i*3+10),sd=i%2?1:-1;
  FIG.push(i<28?[sd*(.004+u*.022),-u*.05]:i<42?[Math.cos(v*6.283)*.014*Math.sqrt(u),-.035+Math.sin(v*6.283)*.014*Math.sqrt(u)]:i<66?[(u-.5)*.05,-.055-v*.065]:[sd*(.008+u*.012),-.12-u*.07])}
function fxPos(c,m,e,G,F,j,n,t,o){
  const T=c.m[m.of];
  if(m.fx==='jam'){
    const per=Math.floor(n/4),k=Math.min(3,Math.floor(j/per)),q=(j-k*per)/(per-1||1),f=((t*.32+k/4)%1+1)%1;
    const r=.14+f*1.5,a=m.dir+(q-.5)*1.2+(T.yw||0)*-1,x=T.p[0]+Math.cos(a)*r,y=T.p[1]-.05-r*.28,z=T.p[2]+Math.sin(a)*r;
    tf(G,x,y,z,F,o);o[3]=Math.pow(1-f,1.3)*Math.min(1,f/.07)*(.55+.45*Math.sin(q*Math.PI));return;
  }
  const sh=SH[T.s],half=Math.floor(n/2),side=j<half?1:-1,jj=j<half?j:j-half,nr=Math.round(half*.3),sc=e.sc,M=e.M;
  const dx=sh.hx+.02,dz=side*.125,dy=sh.y0+.04,L=1.25,sw=.04*Math.sin(t*1.3+side),G2=1.9;   /* G2: 대원은 실제보다 크게(읽히게) */
  let lx,ly,lz,b;
  if(jj<nr){const s=jj/(nr-1||1);lx=dx+sw*s*s;ly=dy-s*L;lz=dz+side*.02*s;b=.32}
  else{const p=jj-nr,per=Math.ceil((half-nr)/2),k=Math.min(1,Math.floor(p/per)),g=FIG[(p-k*per)%FIG.length],s=((t*.16+k/2+(side>0?0:.25))%1+1)%1;
    lx=dx+sw*s*s+g[0]*G2;ly=dy-s*L*.86+g[1]*G2;lz=dz+side*.02*s;b=Math.min(1,s/.06,(1-s)/.12)}
  const a=lx*sc,bb=ly*sc,d=lz*sc;
  o[0]=(M[0]*a+M[3]*bb+M[6]*d+e.o[0])*F.s+F.x;o[1]=(M[1]*a+M[4]*bb+M[7]*d+e.o[1])*F.s+F.y;o[2]=(M[2]*a+M[5]*bb+M[8]*d+e.o[2])*F.s;o[3]=b;
}
/* 화면 맞춤: 흔들림 없는 자세를 원근까지 넣어 화면에 투영한 상자를 장 영역에 맞춰 배율 · 위치를 정함(창 크기가 바뀔 때) */
let asp=1.6,cssW=1,cssH=1,dpr=1,CX=0;
/* PC 형상 가운데(화면 비율): 화면 가운데(65%)와, 왼쪽 글 블록 · 오른쪽 카드 사이 빈 곳 가운데(35%)를 섞음 — 창 너비에 따라 따라감 */
function center(){
  const sr=stage.getBoundingClientRect();let tr=0,cl=cssW;
  CH.forEach(c=>{const t=c.querySelector('.sw-tx'),d=c.querySelector('.sw-card');if(t&&t.offsetWidth)tr=Math.max(tr,t.getBoundingClientRect().right-sr.left);if(d&&d.offsetWidth)cl=Math.min(cl,d.getBoundingClientRect().left-sr.left)});
  CX=Math.max(-.2,Math.min(.25,((cssW/2)*.65+((tr+cl)/2)*.35)/cssW*2-1));stage.style.setProperty('--cx',(50+CX*50).toFixed(1)+'%');
}
const TMP=new Float32Array(NU*8);
function fit(){
  if(!SH)return;
  const ph=narrow.matches||asp<.9,hw=D*TH*asp,hh=D*TH;
  CFG.forEach((c,k)=>{
    formPos(k,0,TMP,{s:1,x:0,y:0},false);
    const r=ph?c.ph:[Math.max(-.98,CX-c.pc[0]),Math.min(.98,CX+c.pc[0]),c.pc[1],c.pc[2]],F={s:1,x:0,y:0};
    for(let pass=0;pass<4;pass++){   /* 투영 상자(-1~1)를 재고 → 배율 · 위치를 고침(원근 때문에 몇 번 되풀이) */
      let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;
      for(let i=0;i<NU;i++){const o=i*8,w=pass?D/(D-TMP[o+2]*F.s):1,x=(TMP[o]*F.s+F.x)*w/hw,y=(TMP[o+1]*F.s+F.y)*w/hh;if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y}
      const q=Math.min((r[1]-r[0])/(x1-x0),(r[3]-r[2])/(y1-y0));
      F.s*=q;F.x=F.x*q+((r[0]+r[1])/2-(x0+x1)/2*q)*hw;F.y=F.y*q+((r[2]+r[3])/2-(y0+y1)/2*q)*hh;
    }
    let x0=1e9,x1=-1e9;for(let i=0;i<NU;i++){const x=TMP[i*8]*F.s+F.x;if(x<x0)x0=x;if(x>x1)x1=x}
    F.x0=x0;F.x1=x1;FIT[k]=F;
  });
}

/* ── 데이터 ── 'SWM2' · uint16 S · uint16 점 수 × S · 형상마다 (int16 xyz · int8 nxyz · uint8 속성) × 점 수 */
/* swarm.txt → 이진(게시 호스트가 .bin을 서비스하지 않아 base64로 둠) */
const unb64=t=>{const s=atob(t.replace(/\s+/g,'')),u=new Uint8Array(s.length);for(let i=0;i<s.length;i++)u[i]=s.charCodeAt(i);return u.buffer};
function parse(ab){
  const dv=new DataView(ab);
  if(String.fromCharCode(dv.getUint8(0),dv.getUint8(1),dv.getUint8(2),dv.getUint8(3))!=='SWM2')throw new Error('swarm.txt');
  const S=dv.getUint16(4,true),out=[];let o=6+S*2;
  for(let s=0;s<S;s++){
    const n=dv.getUint16(6+s*2,true),P=new Float32Array(n*3),Nn=new Float32Array(n*3),T=new Float32Array(n),C=new Uint8Array(n);let hx=0,hz=0,hn=0;
    for(let i=0;i<n;i++,o+=10){
      for(let a=0;a<3;a++){P[i*3+a]=dv.getInt16(o+a*2,true)/32767;Nn[i*3+a]=dv.getInt8(o+6+a)/127}
      const at=dv.getUint8(o+9);T[i]=(at&15)/15;C[i]=at>>4;if(C[i]===3){hx+=P[i*3];hz+=P[i*3+2];hn++}}
    let y0=1;for(let i=0;i<n;i++)if(C[i]!==3&&P[i*3+1]<y0)y0=P[i*3+1];
    out.push({P,N:Nn,T,C,n,hx:hn?hx/hn:0,hz:hn?hz/hn:0,y0});
  }
  return out;
}
/* 장마다 드론을 기체 몫대로 나눔 — 같은 기종 여러 대(j)는 형상 점을 겹치지 않게 이어서 씀 */
function assign(){
  CFG.forEach((c,k)=>{
    let i=0;const tot=c.m.reduce((a,m)=>a+m.n,0);
    c.m.forEach((m,q)=>{
      const cnt=q===c.m.length-1?NU-i:Math.round(m.n/tot*NU),n=m.fx?cnt:SH[m.s].n;CNT[k][q]=cnt;
      for(let j=0;j<cnt&&i<NU;j++,i++){MI[k][i]=q;LI[k][i]=m.fx?j:(j+(m.j||0)*cnt)%n}
    });
  });
}

/* ── 스크롤 → 진행 ── */
let U=1,vh=1;
const HOLD=.38;   /* 한 장 거리(U) 가운데 형상이 머무는 몫 — 나머지에서 흩어졌다 모임 */
function measure(){
  vh=Math.min(stage.offsetHeight||innerHeight,innerHeight*1.5);
  U=Math.max(1,(sec.offsetHeight-vh)/(NS-.5));
  if(mark)mark.style.top=Math.round(HH())+'px';if(mark1)mark1.style.top=Math.round(U*(1+HOLD*.5)+HH())+'px';   /* anchorTop이 머리글 높이를 빼므로 그만큼 더함 */
  cssW=stage.clientWidth||innerWidth;cssH=vh;asp=cssW/cssH;
  dpr=Math.min(devicePixelRatio||1,narrow.matches?1.75:2);
  R.size(Math.round(cssW*dpr),Math.round(cssH*dpr));
  center();fit();tagK=-1;
}
const sstep=t=>t*t*t*(t*(t*6-15)+10);
function target(){
  const s=Math.max(0,-sec.getBoundingClientRect().top/U),k=Math.floor(s),f=s-k;
  if(k>=NS-1)return NS-1;
  return f<HOLD?k:k+sstep((f-HOLD)/(1-HOLD));
}

/* ── 한 프레임 ── */
let P=0,PT=0,t0=0,last=0,intro=reduce?1:0,vis=true,mx=0,my=0,cmx=0,cmy=0,act=-2,vp=null;
const eio=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
const FA=new Float32Array(NU*8),FB=new Float32Array(NU*8);
function frame(now){
  if(!SH)return false;
  if(!t0)t0=now;
  const t=(now-t0)/1000,dt=last?Math.min(.05,(now-last)/1000):1/60;last=now;
  PT=target();
  P+=(PT-P)*(1-Math.exp(-dt*(reduce?60:7)));if(Math.abs(PT-P)<1e-4)P=PT;
  if(intro<1)intro=Math.min(1,t/2.8);
  cmx+=(mx-cmx)*(1-Math.exp(-dt*3));cmy+=(my-cmy)*(1-Math.exp(-dt*3));
  /* 카메라: 마우스로 조금 돎 */
  const yw=reduce?0:cmx*.07,pt=reduce?0:cmy*.045;
  vp=SW.mul(SW.persp(FOV,asp,.1,40),SW.lookAt([Math.sin(yw)*Math.cos(pt)*D,Math.sin(pt)*D,Math.cos(yw)*Math.cos(pt)*D],[0,0,0],[0,1,0]));
  const k=Math.min(NS-1,Math.floor(P)),u=k>=NS-1?0:P-k;
  formPos(k,t,FA,FIT[k],true);if(u>0)formPos(k+1,t,FB,FIT[k+1],true);
  const hw=TH*asp,sk=k*1013,W0=COL[0],FK=FIT[k],xw=FK.x1-FK.x0||1;
  for(let i=0;i<NU;i++){
    const o=i*8,b=i*SW.ST,ph=i*4,j=((i+sk)%NU)*3;
    /* 흩어질 자리(카메라 기준 → 월드) — 전환마다 다른 자리 */
    const dd=SC[j+2],cx=SC[j]*dd*hw,sy=SC[j+1]*dd*TH,cz=D-dd;
    let x,y,z,br,cr,cg,cb,ang,e=0;
    if(u<=0){x=FA[o];y=FA[o+1];z=FA[o+2];br=FA[o+3];cr=FA[o+4];cg=FA[o+5];cb=FA[o+6];ang=FA[o+7]}
    else if(reduce){const q=u<.5?FA:FB;x=q[o];y=q[o+1];z=q[o+2];br=q[o+3]*Math.abs(1-2*u);cr=q[o+4];cg=q[o+5];cb=q[o+6];ang=q[o+7]}
    else{
      /* 왼쪽부터 차례로 떠남 · 앞 반: 형상 → 흩어진 자리(터져 나가 멈칫) · 뒤 반: 새 형상으로(천천히 떠나 내려앉음) · 옆으로 휘어 감 */
      const dl=.3*Math.min(1,Math.max(0,(FA[o]-FK.x0)/xw)*.8+PH[ph+3]*.2);
      const tau=Math.min(1,Math.max(0,(u-dl)/.7)),out=tau<.5,q=out?FA:FB,sg=PH[ph+3]<.5?-1:1;
      let f,x0,y0,z0,x1,y1,z1;
      if(out){const v=tau*2;f=1-(1-v)*(1-v)*(1-v);x0=FA[o];y0=FA[o+1];z0=FA[o+2];x1=cx;y1=sy;z1=cz}
      else{f=eio(tau*2-1);x0=cx;y0=sy;z0=cz;x1=FB[o];y1=FB[o+1];z1=FB[o+2]}
      const dx=x1-x0,dy=y1-y0,bd=Math.sin(Math.PI*f)*.2*sg,bv=Math.cos(Math.PI*f)*.63*sg;
      x=x0+dx*f-dy*bd;y=y0+dy*f+dx*bd;z=z0+(z1-z0)*f;
      ang=Math.atan2(dy+dx*bv,dx-dy*bv);e=tau;
      const g=out?f:1-f;   /* 날아가는 동안 밝은 크림 */
      br=q[o+3]+(1-q[o+3])*g;cr=q[o+4]+(W0[0]-q[o+4])*g;cg=q[o+5]+(W0[1]-q[o+5])*g;cb=q[o+6]+(W0[2]-q[o+6])*g;
    }
    /* 처음: 흩어진 자리에서 모여듦 */
    if(intro<1){
      const ti=eio(Math.min(1,Math.max(0,(intro-PH[ph+3]*.35)/.65))),m=1-ti;
      const fx=cx*1.4,fy=sy*1.4,fz=Math.min(D-.4,cz);
      const p2x=x+(cx-x)*.35,p2y=y+(sy-y)*.35,p2z=z+(cz-z)*.35;
      const A=m*m*m,B=3*m*m*ti,C=3*m*ti*ti,E=ti*ti*ti;
      const nx=A*fx+B*fx+C*p2x+E*x,ny=A*fy+B*fy+C*p2y+E*y;z=A*fz+B*fz+C*p2z+E*z;
      if(ti<1)ang=Math.atan2(ny-y,nx-x)+Math.PI;
      x=nx;y=ny;br=br*(.35+.65*ti)+(1-ti)*.5;
    }
    /* 제자리 비행 흔들림 */
    if(!reduce){const am=.006*(1-Math.sin(Math.PI*e)*.5);x+=Math.sin(t*PH[ph+1]+PH[ph])*am;y+=Math.sin(t*PH[ph+1]*1.3+PH[ph+2])*am;z+=Math.sin(t*PH[ph+1]*.7+PH[ph]*1.7)*am}
    buf[b]=x;buf[b+1]=y;buf[b+2]=z;buf[b+3]=SZ;buf[b+4]=ang;buf[b+5]=br;buf[b+6]=1;buf[b+7]=cr;buf[b+8]=cg;buf[b+9]=cb;
  }
  R.draw(buf,NU,{vp,sh:[0,0],f:(cssH/2)/TH,dpr,frame:FRAME});
  ui(t);
  return vis&&!document.hidden&&(!reduce||P!==PT);
}

/* ── 글 · 목차 · 기체 이름표 ── */
const FL=CH.map(c=>[...c.querySelectorAll('.sw-flow li')]),TG=CH.map(c=>[...c.querySelectorAll('.sw-tags li')]);
/* 기체 이름표 — 빈 자리 찾기: 이름표마다 8방향 × 3거리 후보(기준점 = 그 방향으로 가장 바깥 드론, 로터 제외)를 두고
   후보 상자 안 드론 수 · 다른 이름표 · 본문 글 · 카드 · 도는 로터 범위 · 화면 밖을 점수로 매겨 가장 빈 곳에 둠. 1초마다 다시 재되 확실히 나을 때만 옮김(흔들림 방지)
   매 프레임은 고른 기준 드론을 투영해 이름 · 지시선만 따라가게 함 */
const SP=new Float32Array(NU*2),DIRS=[[0,-1,0],[-.707,-.707,2],[.707,-.707,2],[-1,0,4],[1,0,4],[-.707,.707,7],[.707,.707,7],[0,1,9]];
let tagK=-1,tagN=0;
const prj=(Q,i,o)=>{const x=Q[i*8],y=Q[i*8+1],z=Q[i*8+2],w=vp[3]*x+vp[7]*y+vp[11]*z+vp[15];o[0]=((vp[0]*x+vp[4]*y+vp[8]*z+vp[12])/w*.5+.5)*cssW;o[1]=(.5-(vp[1]*x+vp[5]*y+vp[9]*z+vp[13])/w*.5)*cssH;return o};
const ovl=(a,b)=>Math.max(0,Math.min(a[2],b[2])-Math.max(a[0],b[0]))*Math.max(0,Math.min(a[3],b[3])-Math.max(a[1],b[1]));
function placeTags(k,Q){
  const c=CFG[k],mi=MI[k],li=LI[k],q2=[0,0];
  for(let i=0;i<NU;i++){prj(Q,i,q2);SP[i*2]=q2[0];SP[i*2+1]=q2[1]}
  const sr=stage.getBoundingClientRect(),obs=[...CH[k].querySelectorAll('.sw-tx,.sw-card')].map(e=>{const r=e.getBoundingClientRect();return [r.left-sr.left-8,r.top-sr.top-8,r.right-sr.left+8,r.bottom-sr.top+8]});
  c.m.forEach((m,q)=>{if(!m.rotor)return;const sh=SH[m.s],B=m._rb||(m._rb=[1e9,1e9,-1e9,-1e9]);   /* 로터가 돈 범위(장이 켜진 뒤 합침) */
    for(let i=0;i<NU;i++)if(mi[i]===q&&sh.C[li[i]]===3){const x=SP[i*2],y=SP[i*2+1];if(x<B[0])B[0]=x;if(y<B[1])B[1]=y;if(x>B[2])B[2]=x;if(y>B[3])B[3]=y}
    obs.push(B)});
  const y0=HH()+8,y1=cssH-56,placed=[];
  TG[k].forEach(e=>{
    const q=+e.dataset.m,m=c.m[q],sh=SH[m.s],sp=e.firstElementChild,w=sp.offsetWidth+12,h=sp.offsetHeight+12;
    let cx=0,cy=0,n=0;for(let i=0;i<NU;i++)if(mi[i]===q){cx+=SP[i*2];cy+=SP[i*2+1];n++}cx/=n||1;cy/=n||1;
    const score=(i,D,d)=>{const ax=SP[i*2],ay=SP[i*2+1],nx=ax+D[0]*d,ny=ay+D[1]*d,x=nx+D[0]*w/2,y=ny+D[1]*h/2,R=[x-w/2,y-h/2,x+w/2,y+h/2];
      let sc=D[2]+d*.06;for(let j=0;j<NU;j++){const px=SP[j*2],py=SP[j*2+1];if(px>R[0]&&px<R[2]&&py>R[1]&&py<R[3])sc+=12}
      obs.forEach(O=>{if(ovl(R,O)>0)sc+=900});placed.forEach(O=>{if(ovl(R,O)>0)sc+=2000});
      if(R[0]<8||R[2]>cssW-8||R[1]<y0||R[3]>y1)sc+=3000;return {i,D,d,sc,R}};
    let best=null;
    DIRS.forEach(D=>{let bi=-1,bv=-1e9;
      for(let i=0;i<NU;i++){if(mi[i]!==q||(m.rotor&&sh.C[li[i]]===3))continue;const v=(SP[i*2]-cx)*D[0]+(SP[i*2+1]-cy)*D[1];if(v>bv){bv=v;bi=i}}
      if(bi<0)return;[22,48,84].forEach(d=>{const r=score(bi,D,d);if(!best||r.sc<best.sc)best=r})});
    const cur=e._p?score(e._p.i,e._p.D,e._p.d):null;
    if(best&&(!cur||best.sc<cur.sc*.7-4))e._p=best;
    if(e._p)placed.push(score(e._p.i,e._p.D,e._p.d).R);
  });
}
function tags(k,Q){
  if(tagK!==k){tagK=k;tagN=0;CFG[k].m.forEach(m=>{m._rb=null});TG[k].forEach(e=>{e._p=null})}
  if(tagN++%60===0)placeTags(k,Q);
  const q2=[0,0];
  TG[k].forEach(e=>{
    const p=e._p;if(!p)return;prj(Q,p.i,q2);
    const ax=q2[0],ay=q2[1],vx=p.D[0]*p.d,vy=p.D[1]*p.d;
    const st=`transform:translate(${ax.toFixed(1)}px,${ay.toFixed(1)}px);--lx:${vx.toFixed(1)}px;--ly:${vy.toFixed(1)}px;--len:${p.d}px;--ang:${(Math.atan2(vy,vx)*57.2958).toFixed(1)}deg;--dx:${p.D[0]};--dy:${p.D[1]}`;
    if(e._s!==st){e.style.cssText=st;e._s=st}
  });
}
let fs=-1;
function ui(t){
  const k=Math.floor(P),f=P-k;let a=f<.1?k:f>.9?k+1:-1;
  if(intro<.45&&a===0&&!reduce)a=-1;   /* 첫 화면 글은 드론이 거의 모인 뒤에 */
  if(a!==act){act=a;tagK=-1;CH.forEach((c,i)=>c.classList.toggle('on',i===a));rb.forEach((b,i)=>b.toggleAttribute('aria-current',i===Math.round(P)))}
  if(rail)rail.style.setProperty('--p',(P/(NS-1)).toFixed(4));
  if(a>=0&&TG[a].length)tags(a,a===Math.floor(P)?FA:FB);
  /* 카드의 임무 흐름: 1.5초마다 한 단계씩(지난 단계는 채움) */
  const L=a>=0?FL[a]:null;
  if(L&&L.length){const n=reduce?L.length-1:Math.floor(t/1.5)%(L.length+1);if(n!==fs||L._s!==n){fs=n;L._s=n;L.forEach((li,i)=>{li.classList.toggle('run',i===n);li.classList.toggle('done',i<n)})}}
}

/* ── 시작 ── */
const wake=loop(frame,()=>{last=0});
measure();
addEventListener('resize',()=>{measure();wake()});
addEventListener('scroll',wake,{passive:true});
document.addEventListener('visibilitychange',wake);
new IntersectionObserver(es=>{vis=es.some(e=>e.isIntersecting);if(vis)wake()}).observe(stage);
new ResizeObserver(()=>{measure();wake()}).observe(sec);
addEventListener('pointermove',e=>{if(e.pointerType!=='mouse')return;mx=e.clientX/innerWidth*2-1;my=-(e.clientY/innerHeight*2-1);wake()},{passive:true});
const go=i=>smoothTo(sec.getBoundingClientRect().top+scrollY+(i?U*(i+HOLD*.5):0),Math.min(2.4,.9+Math.abs(i-P)*.45));   /* 장 i가 머무는 가운데로 부드럽게(흩어졌다 모이는 모습이 보이게) */
rb.forEach((b,i)=>b.addEventListener('click',()=>go(i)));
sec.querySelectorAll('a[href="#swarm-uav"]').forEach(a=>a.addEventListener('click',e=>{if(e.button||e.metaKey||e.ctrlKey||e.shiftKey)return;e.preventDefault();e.stopPropagation();go(1)}));   /* site.js의 가렸다 옮기기 대신 */
/* 스크롤 안내(다른 쪽 히어로와 같은 .scue — site.css 14): 누르면 무인기 장으로 · 조금 내리면 사라짐(사라지는 전환이 끝나면 빛 줄기도 멈춤) */
{const cue=document.createElement('button');cue.type='button';cue.className='scue';cue.setAttribute('aria-label',document.documentElement.lang==='en'?'Scroll down':'아래로 스크롤');
  cue.innerHTML='<span class="scue-t" aria-hidden="true">Scroll</span><span class="scue-l" aria-hidden="true"><i></i></span>';stage.appendChild(cue);
  cue.addEventListener('click',()=>go(1));
  let zt=0;const rest=()=>{clearTimeout(zt);if(cue.classList.contains('off'))cue.classList.add('idle')};
  cue.addEventListener('transitionend',e=>{if(e.target===cue&&e.propertyName==='opacity')rest()});
  const hide=()=>{const o=scrollY>40;if(o===cue.classList.contains('off'))return;cue.classList.toggle('off',o);clearTimeout(zt);if(o)zt=setTimeout(()=>{if(getComputedStyle(cue).opacity==='0')rest()},700);else cue.classList.remove('idle')};
  addEventListener('scroll',hide,{passive:true});hide()}
SW.run=1;   /* 시작함 — 없으면 머리 인라인 스크립트가 DOMContentLoaded에 sw-on을 뗌(index*.html) */
fetch('data/swarm.txt?v=3a40d855').then(r=>{if(!r.ok)throw new Error(r.status);return r.text()}).then(t=>{SH=parse(unb64(t));assign();fit();t0=0;wake()})
  .catch(e=>{console.warn('swarm',e);root.classList.add('sw-nodata');CH.forEach((c,i)=>c.classList.toggle('on',i===0))});
})();
