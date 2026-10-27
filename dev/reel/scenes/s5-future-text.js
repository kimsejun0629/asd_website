/* 쇼릴 s5-future — 글(z30) [495,646): Beyond 다리 글줄 · FUTURE 라벨 · 미래 기술 · 기록 세 줄(최신이 위, 옛 줄은 내려가며 α.6)
   글자별 등장 · 퇴장은 프레임 예산(국문 · 영문 같은 시간). 가운뎃점 '·'은 #B5A27F(스타일 가이드). 644.75에 모두 α0 */
import {scene,C,E,seg,clamp,lerp,text,textEach,measure,hline,fitSize,font} from '../engine.js';
import {blurAt} from '../blur.js';

const X=120;
/* 영문: 두 줄 제목 Light 80(폭 620에 맞춤) · 기록 폭 975(→ 26px) — s6 A350 왼쪽 날개 끝 · 수평 꼬리날개 앞전과 40px 넘게 띄움 */
const LAY={ko:{lab:600,h:[740],hs:132,hw:1e4,ht:-.035,hm:[[620,780]],rows:[830,878,926],rw:1100},
           en:{lab:584,h:[684,770],hs:80,hw:620,ht:-.02,hm:[[612,700],[700,792]],rows:[850,898,946],rw:975}};
/* 제목은 Beyond 마지막 글자가 빠진 550에 등장(겹침 0, 570 = b19에 자리) · 퇴장 636.75(6f, 예산 2) · 기록은 637.75부터 한 줄씩 .5f 늦게(5f, 예산 1)
   모두 644.75에 α0 — 645 셔터 표본(644.75–645.25)에 남는 글자 없음(646 s6 글과 겹치지 않게)
   셋째 줄(Physical AI)은 608(스토리보드 614보다 6f 앞) — A350이 나타나는 때 함께 들어와 621에 자리, 퇴장까지 16.75f 읽힘 */
const T={bIn:500,bOut:541.75,lab:[544,560],hIn:550,rows:[540,578,608],out:636.75,rOut:637.75};   /* Beyond는 549.75에 모두 빠짐(550 셔터 표본에도 겹침 없음) */
const BEY={y:740,mask:[620,780]};
const DOT=C.goldHi2;

/* 글자 윗 · 아랫 끝(마스크 밖에서 완전히 숨겨 시작 · 끝나도록 이동 거리를 잼) */
const MT=new Map();
function met(g,s,o){const k=o.size+'|'+(o.weight||300)+'|'+s;let v=MT.get(k);
  if(!v){g.save();g.font=font(o.size,o.weight||300);const m=g.measureText(s);v={a:m.actualBoundingBoxAscent,d:m.actualBoundingBoxDescent};g.restore();MT.set(k,v)}return v}
/* 글 전용 추가 표본: 엔진 표본 하나가 맡은 셔터 조각(.5/n f)을 K개로 더 쪼개 평균(결과는 f만의 함수)
   E.accel 끝(기울기 ∞) · E.snap 첫 프레임에서 큰 글자의 블러 표본 간격을 .75px 안으로(최대 32) — 줄무늬 · 등고선처럼 겹친 글자가 보이지 않게.
   평균은 선형광: 표본마다 바닥 위에 sRGB로 겹친 뒤(브라우저와 같게) 선형광으로 더해 나눔 — acc.js가 엔진 표본을 평균하는 빛 공간과 같음
   (sRGB로 더하면 블러 꼬리가 다른 모듈 글보다 어둡고 가늘어짐). 구역은 글 기둥 XR × 띠 */
const KMAX=32,XR=[64,1344],LIN=new Float32Array(4081),ENC=new Uint8ClampedArray(16384);
for(let i=0;i<4081;i++){const c=i/4080;LIN[i]=c<=.04045?c/12.92:((c+.055)/1.055)**2.4}
for(let i=0;i<16384;i++){const v=i/16383;ENC[i]=Math.round(255*(v<=.0031308?v*12.92:1.055*v**(1/2.4)-.055))}
let SB=null;
function sub(g,f,disp,band,draw){const sp=.5/blurAt(Math.round(f)).n,K=window.__boxes?1:Math.min(KMAX,Math.ceil(disp(f,sp/2)/.75));
  if(K<=1){draw(g,f);return}
  const x0=XR[0],w=XR[1]-XR[0],y0=Math.max(0,Math.floor(band[0])),h=Math.min(1080,Math.ceil(band[1]))-y0,N=w*h;if(h<=0)return;
  if(!SB||SB.height<h){SB=document.createElement('canvas');SB.width=w;SB.height=Math.max(h,200)}
  const Y=SB.getContext('2d',{willReadFrequently:true}),bg=g.getImageData(x0,y0,w,h),B=bg.data,acc=new Float32Array(N*3),BL=new Float32Array(N*3),ga=g.globalAlpha;
  for(let i=0,j=0;i<N*4;i+=4,j+=3){BL[j]=LIN[B[i]*16];BL[j+1]=LIN[B[i+1]*16];BL[j+2]=LIN[B[i+2]*16]}
  for(let k=0;k<K;k++){Y.setTransform(1,0,0,1,0,0);Y.globalCompositeOperation='source-over';Y.globalAlpha=1;Y.clearRect(0,0,w,h);Y.translate(-x0,-y0);Y.globalAlpha=ga;
    draw(Y,f+((k+.5)/K-.5)*sp);const D=Y.getImageData(0,0,w,h).data;
    for(let i=0,j=0;i<N*4;i+=4,j+=3){const A=D[i+3];if(!A){acc[j]+=BL[j];acc[j+1]+=BL[j+1];acc[j+2]+=BL[j+2];continue}const a=A/255,q=1-a;
      acc[j]+=LIN[Math.round((D[i]*a+B[i]*q)*16)];acc[j+1]+=LIN[Math.round((D[i+1]*a+B[i+1]*q)*16)];acc[j+2]+=LIN[Math.round((D[i+2]*a+B[i+2]*q)*16)]}}
  const s=16383/K;for(let i=0,j=0;i<N*4;i+=4,j+=3){B[i]=ENC[Math.round(acc[j]*s)];B[i+1]=ENC[Math.round(acc[j+1]*s)];B[i+2]=ENC[Math.round(acc[j+2]*s)]}
  g.putImageData(bg,x0,y0)}
/* 글자 u(0~1)의 세로 이동: t<o0 E.snap 등장(아래→위), 그 뒤 E.accel 퇴장(위로). 가려진 때는 null(raw면 끝 위치 그대로) */
const mover=({i0,idur,ib,o0,odur,ob,Di,Do,oe=E.accel})=>(u,t,raw)=>{if(t<o0){const p=clamp((t-i0-ib*u)/idur);return p<=0&&!raw?null:(1-E.snap(p))*Di}
  const p=clamp((t-o0-ob*u)/odur);return p>=1&&!raw?null:-oe(p)*Do};
/* n글자 중 가장 크게 움직이는 글자의 [t−h, t+h] 이동 거리 — 조각 안에서 끝에 닿는(가장 빠른) 글자도 끝 위치로 셈 */
const dispOf=(dy,n)=>(t,h)=>{let m=0;for(let k=0;k<n;k++){const u=n>1?k/(n-1):0;m=Math.max(m,Math.abs(dy(u,t+h,1)-dy(u,t-h,1)))}return m};
/* 한 글줄: i0에 E.snap으로 아래→위 등장, o0에 E.accel로 위로 퇴장(마스크 안) */
function line(g,s,x,y,o,f,{i0,idur=14,ib=6,o0=T.out,odur=6,ob=2,mask}){if(f<i0||!s)return;
  const m=met(g,s,o),n=[...s].length,dy=mover({i0,idur,ib,o0,odur,ob,Di:mask[1]-(y-m.a)+2,Do:(y+m.d)-mask[0]+2});
  sub(g,f,dispOf(dy,n),mask,(G,t)=>clipBand(G,mask,()=>textEach(G,s,x,y,o,(q,k,nn)=>{const d=dy(nn>1?k/(nn-1):0,t);
    return d===null?{alpha:0}:{dy:d,color:q.ch==='·'?DOT:undefined}})))}
/* 마스크: 화면 좌표 띠로 자름(엔진 textEach의 clip은 글자 dy와 함께 움직여 가림이 안 됨 — 여기서 바깥에 걺) */
function clipBand(g,m,fn){g.save();g.beginPath();g.rect(0,m[0],1920,m[1]-m[0]);g.clip();fn();g.restore()}

/* 기록 줄 배치: 날짜 · 분야 · 가는 선 · 내용을 세 줄 공통 열에 맞춤(표처럼). 넓으면 세 줄을 같은 크기로 줄임(열 사이 .72em 비율 유지, 바닥 26 — 그래도 넓으면 열 사이 .55em) */
function rowLayout(g,S,maxW){const R=['fut.r1','fut.r2','fut.r3'].map(k=>S[k]);
  const lay=(s,gk)=>{const od={size:s,weight:700,color:C.goldHi},ot={size:s,weight:700,color:C.cream},of={size:s,weight:300,color:C.cream80};
    const dW=Math.max(...R.map(r=>measure(g,r[0],od))),tW=Math.max(...R.map(r=>measure(g,r[1],ot))),gap=Math.round(s*gk);
    const x1=Math.round(X+dW+gap),x2=Math.round(x1+tW+gap*.8),x3=x2+Math.round(s*.86)+Math.round(gap*.8);
    return {od,ot,of,x1,x2,x3,dv:Math.round(s*.86),w:x3+Math.max(...R.map(r=>measure(g,r[2],of)))-X,sz:s}};
  let L=lay(28,.72);for(let s=27;L.w>maxW&&s>=26;s--)L=lay(s,.72);if(L.w>maxW)L=lay(26,.55);return {R,...L}}
/* 한 기록 줄(글자 전체에 하나의 예산) — 등장 f0(10f, 예산 3) · 퇴장 o0(5f, 예산 1, E.accel) */
function row(g,L,r,id,y,f,f0,o0,alpha){if(f<f0)return;const s=L.sz,m0=y-Math.ceil(s*.95),m1=y+Math.ceil(s*.34);
  const P=[{s:r[0],x:X,o:{...L.od,id,tier:1}},{s:r[1],x:L.x1,o:{...L.ot,id,tier:1}},{div:1,x:L.x2},{s:r[2],x:L.x3,o:{...L.of,id,tier:1}}];
  const n=P.reduce((a,p)=>a+(p.div?1:[...p.s].length),0);
  /* 이동 거리는 가장 큰 글자(m0 위로 완전히 · m1 아래로 완전히) 기준 하나 — 같은 줄 글자가 같은 속도로 */
  const T2=P.filter(p=>!p.div).map(p=>met(g,p.s,p.o)),Di=m1-(y-Math.max(...T2.map(m=>m.a)))+2,Do=(y+Math.max(...T2.map(m=>m.d)))-m0+2;
  const dy=mover({i0:f0,idur:10,ib:3,o0,odur:5,ob:1,Di,Do});
  g.save();g.globalAlpha*=alpha;
  sub(g,f,dispOf(dy,n),[m0,m1],(G,t)=>{let k0=0;
    for(const p of P){const u0=n>1?k0/(n-1):0;
      /* 가는 선: 등장은 폭이 자라고(E.snap) 퇴장은 옅어짐(E.accel) — 글자와 같은 진행 */
      if(p.div){const e=dy(u0,t);if(e!==null){const w=t<o0?L.dv*(1-e/Di):L.dv,al=t<o0?1:1+e/Do;
        if(w>0&&al>0)hline(G,p.x,p.x+w,y-s*.34,{color:C.cream,alpha:.28*al})}k0++;continue}
      const base=k0;
      clipBand(G,[m0,m1],()=>textEach(G,p.s,p.x,y,p.o,(q,k)=>{const e=dy(n>1?(base+k)/(n-1):0,t);return e===null?{alpha:0}:{dy:e,color:q.ch==='·'?DOT:undefined}}));
      k0+=[...p.s].length}});
  g.restore()}

let RL=null;
/* 글 기둥 끝(다른 모듈이 비켜 가도록 잼 — 공유 상수 FUT_COL 제안값의 근거): x1 기록 가장 넓은 줄 오른끝 +24 · y0 첫 줄 글자 윗끝 −10 · hx1 제목 가장 넓은 줄 오른끝 */
export function futCol(g,S,lang){const Y=LAY[lang]||LAY.ko,L=rowLayout(g,S,Y.rw);
  const a=Math.max(...L.R.flatMap(r=>[met(g,r[0],L.od).a,met(g,r[1],L.ot).a,met(g,r[2],L.of).a]));
  const hs=Math.min(...S['fut.h'].map(s=>fitSize(g,s,{size:Y.hs,weight:300,track:Y.ht},Y.hw).size));
  const hw=Math.max(...S['fut.h'].map(s=>measure(g,s,{size:hs,weight:300,track:Y.ht})));
  return {x1:Math.ceil(X+L.w)+24,y0:Math.floor(Y.rows[0]-a)-10,hx1:Math.ceil(X+hw),rowR:X+L.w,size:L.sz,hs}}
scene({id:'s5-text',from:495,to:646,z:30,
  draw(g,f,env){const S=env.S,Y=LAY[env.LANG]||LAY.ko;
    const ob=fitSize(g,S['beyond'],{size:88,weight:300,color:C.cream,track:-.02,id:'beyond',tier:1},1100);
    /* 금색 대시 39×2: Beyond의 라벨 자리(글 윗끝 36px 위)에서 그려져, 글줄이 굴러 바뀔 때 FUTURE 라벨의 대시 자리로 올라감
       498–508 그림 · 541.75–551.75 올라감(E.snap) · 636.75–643.75 줄어듦(라벨과 함께) */
    const yB=BEY.y-met(g,S['beyond'],ob).a-36-26*.36,yL=Y.lab-26*.36,dashY=lerp(yB,yL,E.snap(seg(f,T.bOut,T.bOut+10)));
    const di=E.snap(seg(f,498,508)),dq=E.accel(seg(f,T.out,T.out+7));
    if(di>0&&dq<1)hline(g,X+39*dq,X+39*di,dashY,{w:2,color:C.goldHi2,alpha:1-dq});
    /* Beyond: Light 88, 500 등장(14f, 예산 6) → 541.75 위로 퇴장(6f, 예산 2) */
    line(g,S['beyond'],X,BEY.y,ob,f,{i0:T.bIn,idur:14,ib:6,o0:T.bOut,odur:6,ob:2,mask:BEY.mask});
    /* FUTURE 라벨: 544–560 자간 모음(대시는 위에서 이미 있음) → 636.75 퇴장 */
    const lo={size:26,weight:700,track:.14,color:C.cream,id:'fut.label',tier:2};
    /* 엔진 trackIn(label)과 같은 그림(자간 .30→.14em E.snap, α p·1.6) — 검사 상자에 id가 붙도록 text로 직접 */
    const pl=seg(f,T.lab[0],T.lab[1]);
    if(f<T.out){if(pl>0)text(g,S['fut.label'].toUpperCase(),X+26*2.1,Y.lab,{...lo,track:lerp(.30,.14,E.snap(pl)),alpha:clamp(pl*1.6)})}
    else line(g,S['fut.label'].toUpperCase(),X+26*2.1,Y.lab,lo,f,{i0:0,mask:[Y.lab-26,Y.lab+8]});
    /* 제목 '미래 기술' 550(14f, 예산 6) — 영문 둘째 줄 552(예산 4): 두 줄 모두 570에 자리. 영문은 두 줄 같은 크기(넓은 줄을 hw에 맞춤) */
    const hs=Math.min(...S['fut.h'].map(s=>fitSize(g,s,{size:Y.hs,weight:300,track:Y.ht},Y.hw).size));
    S['fut.h'].forEach((s,i)=>line(g,s,X,Y.h[i],{size:hs,weight:300,color:C.cream,track:Y.ht,id:'fut.h',tier:1},f,{i0:T.hIn+2*i,idur:14,ib:6-2*i,mask:Y.hm[i]}));
    /* 기록: 최신이 맨 위(첫 줄 자리), 새 줄이 오면 옛 줄은 48px 내려가며(E.std 10f, 새 줄 시작 가운데) α.6. 퇴장은 위 줄부터 .5f씩
       읽히던 줄을 옮기는 일이라 미끄러지듯(E.snap은 첫 프레임에 20px 떠밀림) — 새 줄 시작에 이미 ≈.7(33px): 옛 줄 윗끝이 새 줄 마스크 아래 */
    const L=RL&&RL.lang===env.LANG?RL.L:(RL={lang:env.LANG,L:rowLayout(g,S,Y.rw)}).L;
    for(let r=0;r<3;r++){let sl=0;for(let j=r+1;j<3;j++)sl+=E.std(seg(f,T.rows[j]-5,T.rows[j]+5));
      row(g,L,L.R[r],'fut.r'+(r+1),Y.rows[0]+48*sl,f,T.rows[r],T.rOut+.5*(2-r),1-.4*clamp(sl))}
  }});
