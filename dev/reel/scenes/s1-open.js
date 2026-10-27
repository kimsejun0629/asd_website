/* 쇼릴 장면 모듈 s1-open — [−40,179.5) 태그라인 · 787 롱테이크 · X-ray 스캔 · 이음매 (스토리보드 _out/reel/plan/storyboard.md S00 · S01 · S15)
   f<0은 루프 끝(860~899)과 같다. 모든 값은 f(실수)만으로 정해짐. 카메라 · 글줄 · 설명선은 s1-open-cam.js */
import {scene,C,E,seg,clamp,hermite,textEach,measure,label,trackIn,fitSize,hline,glowLine,layer,wheel,rgba,W,H,TAU} from '../engine.js';
import {TAG,scanX} from '../shared.js';
import {blurAt} from '../blur.js';
import {cam01,tline,CO,colY,callouts} from './s1-open-cam.js';

const ST={A:null,cen:null};
const PARTS=['rake','fsf','bulk','aft'];

/* ── 배경: 격자(60 · 240) · 깊이 웅덩이 · 왼쪽 아래 가림(s2가 같은 값으로 다시 그림) ── */
function bg(g){
  g.save();g.fillStyle=C.cream;
  g.globalAlpha=.05;for(let x=0;x<W;x+=60)g.fillRect(x,0,1,H);for(let y=0;y<H;y+=60)g.fillRect(0,y,W,1);
  g.globalAlpha=.09;for(let x=0;x<W;x+=240)g.fillRect(x,0,1,H);for(let y=0;y<H;y+=240)g.fillRect(0,y,W,1);
  g.globalAlpha=1;
  let r=g.createRadialGradient(1262,420,0,1262,420,900);r.addColorStop(0,rgba(C.cblue,.35));r.addColorStop(1,rgba(C.cblue,0));g.fillStyle=r;g.fillRect(0,0,W,H);
  r=g.createRadialGradient(420,860,0,420,860,760);r.addColorStop(0,rgba(C.night,.55));r.addColorStop(1,rgba(C.night,0));g.fillStyle=r;g.fillRect(0,0,W,H);
  g.restore();
}

/* ── 787 롱테이크 자세(렌즈로 무게중심을 경로 C에 고정) ── */
function pose(f,GL){const A=ST.A,c=cam01(f),shots=[{A,rot:c.rot}];
  const lens=GL.solveLens(shots,c.cam,A,ST.cen,c.C);return {A,shots,cam:{...c.cam,lens}}}
/* 스캔선 x(105~141, 꼬리→기수): 빈 오른쪽은 80px/f로 들어와 기체(1275→150)를 114~134에 55px/f(65→42)로 건너고
   글 열 위를 줄곧 느려지며(40→22) 22~23px/f로 나감 — 왼쪽 끝에서 멈칫했다 다시 빨라지지 않음, 빛은 140.7에 화면 밖.
   금색 부위(뒤→앞)가 116~126에 차례로 켜짐 — 그동안 기준점은 ≤11px/f(카메라 t0 76) */
const scanS=hermite([[105,1960],[114,1270],[135,120],[141,-40]]);
/* 금색 스캔선(glowLine 모양). 빛(32px)만 표본 x(xs)마다 그려 누적 블러로 부드러운 자취가 되고,
   2px 심 · 눈금은 프레임 중심 xc(모든 표본 같은 자리)에 선명하게 — 빠르게 움직여도 심은 #C2A673 그대로.
   훑은 쪽(+x)엔 속도만큼 꼬리빛(α.22→0, 최대 96px). xc가 null이면 심 없음(이음매 f0). v: px/프레임 */
function scanLine(g,xs,xc,v,wk=.22){
  if(xs!=null)glowLine(g,xs,{core:0,ticks:0});
  if(xc==null)return;const X=Math.round(xc),L=wk>0?Math.min(Math.abs(v)*.6,96):0;
  g.save();
  if(L>1){const gr=g.createLinearGradient(X,0,X+L,0);gr.addColorStop(0,rgba(C.goldHi,wk));gr.addColorStop(1,rgba(C.goldHi,0));
    g.globalCompositeOperation='lighter';g.fillStyle=gr;g.fillRect(X,60,L,960);g.globalCompositeOperation='source-over'}
  g.fillStyle=C.goldHi;g.fillRect(X-1,60,2,960);
  g.fillStyle=rgba(C.cream,.5);for(let y=60;y<=1020;y+=40)g.fillRect(X+3,y,6,1);g.restore()}

/* 층을 x=s 둘레 24px 선형 깃털로 자름: side −1 왼쪽만 · +1 오른쪽만 */
function feather(x,s,side){const gr=x.createLinearGradient(s-12,0,s+12,0);
  gr.addColorStop(0,side<0?'rgba(0,0,0,1)':'rgba(0,0,0,0)');gr.addColorStop(1,side<0?'rgba(0,0,0,0)':'rgba(0,0,0,1)');
  x.globalCompositeOperation='destination-in';x.fillStyle=gr;x.fillRect(0,0,W,H);x.globalCompositeOperation='source-over'}

/* ── 태그라인 배치(국문 · 영문 공통 크기: 두 줄 중 좁은 쪽에 맞춤) ── */
let TL=null;
function tagLayout(g,S){if(TL&&TL.l1===S['tag.l1'])return TL;
  let o1={size:TAG.size,weight:300,track:-.035,color:C.cream,id:'tag.l1',tier:1},o2={size:TAG.size,weight:700,track:-.035,color:C.cream,id:'tag.l2',tier:1};
  const k=Math.min(fitSize(g,S['tag.l1'],o1,TAG.maxW).size,fitSize(g,S['tag.l2'],o2,TAG.maxW).size);o1={...o1,size:k};o2={...o2,size:k};
  const w1=measure(g,S['tag.l1'],o1),w2=measure(g,S['tag.l2'],o2);
  const oL=fitSize(g,S['tag.lead'],{size:28,weight:300,color:C.cream80,id:'tag.lead',tier:2},TAG.maxW);
  TL={l1:S['tag.l1'],o1,o2,hw:Math.round(Math.max(w1,w2)+40),oL};return TL}

/* 태그라인 기준선(shared TAG): 1줄 802 · 2줄 946 · 라벨 690(s7 각주와 같은 기준선).
   잉크 간격(국문) 라벨→1줄 24 · 1줄→수평선 22 · 수평선→2줄 20 · 2줄→리드 19px, 영문 'y' 꼬리는 수평선 위 10px */
const L1Y=TAG.l1Y,L2Y=TAG.l2Y,LABEL_Y=TAG.labelY;
/* 접힘(94~104) 보강 표본: E.accel 끝이 수직이라 글자가 ~104px/f로 가림에 들어감 → blur.js N=8(표본 간격 6.5px)이면 겹상이 보임.
   엔진 표본 하나 안에서 K번(간격 Δ/K) 그려 더하기 합성으로 평균 → N8·K4 = 1.6px(마지막 조각 ~160px/f에서도 2.5px). blur.js가 이 구간을 N=16으로 올리면 K=2, N=32면 K=1(엔진 요청) — 어느 쪽이든 유효 32표본 */
function subK(g,f,a,b,draw){const F=Math.round(f),{n,shutter}=blurAt(F),K=F>=a&&F<=b&&n<32?Math.ceil(32/n):1;
  if(K===1){draw(g,f);return}
  const L=layer('s1Sub'),d=shutter/n;L.globalCompositeOperation='lighter';L.globalAlpha=1/K;
  for(let j=0;j<K;j++)draw(L,f+((j+.5)/K-.5)*d);
  g.drawImage(L.canvas,0,0)}
/* s1-tag: 860~898 탄생(−40~−2) · 0~92 정지 · 92~106 접힘 */
scene({id:'s1-tag',from:-40,to:106,z:50,
  draw(g,f,env){const S=env.S,T=tagLayout(g,S),x=TAG.x;
    /* 금색 수평선: −40~−28 오른쪽으로 그려짐(E.snap), 96~106 왼쪽으로 거둠(E.accel) */
    const hp=E.snap(seg(f,-40,-28))*(1-E.accel(seg(f,96,106)));
    if(hp>0)hline(g,x,x+T.hw*hp,TAG.horY,{w:2,color:C.goldHi});
    /* 1줄: 수평선 위로 솟음 → 수평선으로 가라앉음 / 2줄: 수평선 아래로 떨어짐 → 수평선으로 올라감 */
    subK(g,f,94,104,(c,t)=>{
      tline(c,S['tag.l1'],x,L1Y,T.o1,t,{i0:-36,idur:16,ib:10,idir:'up',o0:92,odur:8,ob:4,odir:'down',mask:[0,834],odist:1.6});
      tline(c,S['tag.l2'],x,L2Y,T.o2,t,{i0:-32,idur:16,ib:10,idir:'down',o0:92,odur:8,ob:4,odir:'up',mask:[838,H],odist:1.6})});
    /* 라벨: 자간 등장 878~894(s7 '1977' 열이 닦이는 ≈895에 맞춰 늦춤 — 두 '1977'이 겹쳐 보이는 시간을 줄임) · 94~102 8px 내려가며 사라짐 */
    const out=E.accel(seg(f,94,102)),la=1-out,dy=8*out;
    const pl=seg(f,-22,-6);
    if(la>0&&pl>0){g.save();g.globalAlpha*=la;trackIn(g,S['tag.label'],x,LABEL_Y+dy,{color:C.cream80,id:'tag.label',tier:2},pl);g.restore()}
    /* 리드: 874~890 12px 올라오며 나타남 · 가운뎃점은 금색 */
    const pe=seg(f,-26,-10);
    if(pe>0&&la>0){const oL={...T.oL,alpha:clamp(pe*1.4)*la};const yy=TAG.leadY+12*(1-E.snap(pe))+dy;
      textEach(g,S['tag.lead'],x,yy,oL,q=>q.ch==='·'?{color:C.goldHi2}:{})}
  }});

/* s1-world: 격자 · 웅덩이 · 가림 · 787 LT. f<0은 x>scanX만(이음매 닦아내기). 105~141 두 번 그려 스캔 경계에서 도장 → X-ray */
scene({id:'s1-world',from:-18,to:179.5,z:10,
  init(env){ST.A=env.GL.craft('787');const A=ST.A;ST.cen=[A.center.x,A.center.y,A.center.z]},
  draw(g,f,env){const GL=env.GL;
    if(f<0){const sx=scanX(f);g.beginPath();g.rect(sx,0,W-sx,H);g.clip();g.fillStyle=C.night;g.fillRect(0,0,W,H)}
    bg(g);
    const {A,shots,cam}=pose(f,GL);
    if(f<105){A.xr(0);g.drawImage(GL.render(shots,cam),0,0);return}
    const pulse=.5+.5*Math.sin(TAU*(f-141)/30);
    if(f>=141){A.xr(1,PARTS,{pulse});g.drawImage(GL.render(shots,cam),0,0);return}
    const s=scanS(f);
    if(s>-12){const lp=layer('s1P');A.xr(0);lp.drawImage(GL.render(shots,cam),0,0);feather(lp,s,-1);g.drawImage(lp.canvas,0,0)}
    if(s<W+12){const lx=layer('s1X');A.xr(1,PARTS,{pulse});lx.drawImage(GL.render(shots,cam),0,0);feather(lx,s,1);g.drawImage(lx.canvas,0,0)}
  }});

/* s1-scan: 이음매 스캔선(882~900 ≡ −18~0). 꼬리빛 없음 — 899에만 있고 f0엔 없는 몫이 이음매 MAD(899→0)를 1.03×→1.6×로 키움(α.06도 1.19×) */
const SEAM_WK=0;
scene({id:'s1-scan',from:-18,to:0,z:40,
  draw(g,f){scanLine(g,scanX(f),scanX(Math.round(f)),-2032/18,SEAM_WK)}});   /* Math.round(−0.25) = −0 → null: f0엔 심 없음 */

/* s1-hud: HDG 16~28 나타남 · 170~178 사라짐 */
scene({id:'s1-hud',from:16,to:178.5,z:30,
  draw(g,f,env){const a=E.snap(seg(f,16,28))*(1-E.accel(seg(f,170,178)));if(a<=0)return;
    const o={size:26,weight:700,track:.14,color:C.cream80,alpha:a,id:'hud',tier:2};
    /* 1의 자리는 멈춤쇠: 눈금 사이 마지막 30%에서만 굴러 다음 숫자에 선다(정지 화면에서 반쯤 굴러간 숫자가 안 보이게) */
    const v=cam01(f).cam.yaw*180/Math.PI,b=Math.floor(v),deg=b+E.ioCubic(clamp((v-b-.7)/.3));
    const w=wheel(g,deg,1800,1000,{...o,align:'right'});
    textEach(g,env.S['hud.hdg'],1800-w-16,1000,{...o,align:'right'},()=>({}))}});

/* s1-ui: X-ray 스캔선(105~141) · 설명선(136~, 살아 있는 3D 기준점) */
scene({id:'s1-ui',from:105,to:179.5,z:20,
  draw(g,f,env){if(f<141){const fc=Math.round(f);scanLine(g,scanS(f),scanS(fc),scanS(fc+.5)-scanS(fc-.5))}
    /* 기준점은 프레임 중심 자세로 투영 — 고리 · 선이 표본마다 같은 자리(예비 동작 휙에서도 1px 선명, 흐린 부위의 가운데에 앉음) */
    if(f<CO.t0)return;const GL=env.GL,p=pose(Math.round(f),GL);GL.setCam(p.shots,p.cam);
    callouts(g,f,k=>GL.project(p.A,p.A.anchor(k)),env.S,env.LANG==='en')}});

/* s1-text: 라벨 · 제목 · 국제공동개발 줄 · 오른쪽 머리글 */
let TX=null;
function txLayout(g,S,en){if(TX&&TX.h===S['aero.h'])return TX;
  const oh=fitSize(g,S['aero.h'],{size:132,weight:300,track:en?-.02:-.035,color:C.cream,id:'aero.h',tier:1},1100,72);
  let ok={size:30,weight:700,color:C.cream,id:'aero.codevK',tier:2},ot={size:30,weight:300,color:C.cream80,id:'aero.codevT',tier:2};
  const tot=measure(g,S['aero.codevK'],ok)+16+24+16+measure(g,S['aero.codevT'],ot);
  if(tot>1100){const s=Math.max(26,Math.floor(30*1100/tot));ok={...ok,size:s};ot={...ot,size:s}}
  const xk=120,xd=Math.round(xk+measure(g,S['aero.codevK'],ok)+16),xt=xd+24+16;
  const on={size:26,weight:300,color:C.cream80,id:'t787.name',tier:2},xs=Math.round(1114+measure(g,S['t787.name'],on)+24);
  const orow={size:30,weight:300};const dw=Math.round(Math.max(xs-1114+measure(g,S['t787.since'],on),...['c787.1','c787.2','c787.3','c787.4'].map(k=>CO.tx-1114+measure(g,S[k],orow))));
  TX={h:S['aero.h'],oh,ok,ot,xk,xd,xt,on,xs,dw,nk:[...S['aero.codevK']].length,nt:[...S['aero.codevT']].length,
    nn:[...S['t787.name']].length,ns:[...S['t787.since']].length};return TX}
scene({id:'s1-text',from:105,to:179.5,z:30,
  draw(g,f,env){const S=env.S,T=txLayout(g,S,env.LANG==='en');
    /* 라벨 106~124 자간 등장 → 이후 s2와 같은 호출(컷 양쪽 화소 동일) */
    if(f<124)trackIn(g,S['aero.label'],120,732,{id:'aero.label',tier:2},seg(f,106,124));else label(g,S['aero.label'],120,732,{id:'aero.label',tier:2});
    tline(g,S['aero.h'],120,868,T.oh,f,{i0:108,idur:16,ib:8});
    /* 국제공동개발 | 본문: 한 줄처럼 글자 예산 6f 공유, 가는 선은 그 자리 차례에 그려짐 */
    const n=T.nk+T.nt,cd={i0:120,idur:12,ib:6,n},fd=120+6*(T.nk-.5)/(n-1);
    tline(g,S['aero.codevK'],T.xk,932,T.ok,f,{...cd,k0:0});
    const dv=E.snap(seg(f,fd,fd+12));
    if(dv>0)hline(g,T.xd,T.xd+24*dv,932-Math.round(T.ok.size*.34),{color:C.cream,alpha:.28});
    tline(g,S['aero.codevT'],T.xt,932,T.ot,f,{...cd,k0:T.nk,color:q=>q.ch==='·'?C.goldHi2:undefined});   /* 가운뎃점 금색(스타일 가이드) */
    /* 오른쪽 머리글: 787 드림라이너 · 2005 ~ (국문 596 · 영문 548) */
    const m=T.nn+T.ns,hd={i0:130,idur:10,ib:6,n:m},Y=colY(env.LANG==='en');
    tline(g,S['t787.name'],1114,Y.head,T.on,f,{...hd,k0:0});
    tline(g,S['t787.since'],T.xs,Y.head,{...T.on,id:'t787.since'},f,{...hd,k0:T.nn});
    /* 머리글 아래 가는 구분선(크림 α.16): 132~146 왼쪽에서 그려짐 */
    const dp=E.snap(seg(f,132,146));if(dp>0)hline(g,1114,1114+T.dw*dp,Y.div,{color:C.cream,alpha:.16});
  }});
